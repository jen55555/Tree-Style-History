// Tree Style History - tree renderer
//
// Both tree pages (history2.html and closed.html) used to render through
// jQuery + zTree, plus a locally patched exhide extension and fuzzysearch.js
// for filtering. That was ~2.6k lines of third-party code for one widget, and
// zTree's async loader shipped a runtime compiler that MV3's CSP forbids.
// All four files are gone from the repo; this module renders both pages.
//
// This module does what the page actually uses: build a tree out of flat
// `{ id, pId }` nodes, expand/collapse, filter by keyword (keeping the
// ancestor chain of every match), and report clicks. It emits the same element
// classes zTree did, so css/zTreeStyle.css still applies — the icons, the
// connector line and the indentation are that stylesheet's, not zTree's.
//
// A node's `name` is PLAIN TEXT (a page title as the browser reported it) and
// is escaped here, at the one place that knows it is writing text content.

import { escapeHtmlAttr, escapeHtmlText, escapeRegExp } from './helpers.js';

// zTree's class vocabulary, kept so the stylesheet keeps working:
//   switch  root_/center_/bottom_ × open/close/docu
//   ico     ico_open / ico_close / ico_docu
function switchClass(level, isLast, hasChildren, open) {
    const shape = level === 0 ? 'root' : (isLast ? 'bottom' : 'center');
    if (!hasChildren) return `${shape}_docu`;
    return `${shape}_${open ? 'open' : 'close'}`;
}

function icoClass(hasChildren, open) {
    if (!hasChildren) return 'ico_docu';
    return open ? 'ico_open' : 'ico_close';
}

/**
 * Escape a favicon URL for the CSS `url('…')` inside a style attribute.
 *
 * Two escapings, in this order, because two parsers read the value: the HTML
 * parser decodes entities FIRST, so `escapeHtmlAttr()` alone turns `'` into
 * `&#39;` and the CSS tokenizer then decodes it straight back and closes the
 * url() string — the icon silently disappears. Escaping the quote for CSS
 * keeps it literal there, and `escapeHtmlAttr()` keeps the attribute intact.
 */
function cssUrl(icon) {
    return escapeHtmlAttr(String(icon).replace(/[\\']/g, '\\$&'));
}

const HIGHLIGHT = 'color: whitesmoke;background-color: darkred;';

/**
 * True if following `pId` from this node leads back to somewhere already seen.
 *
 * A cycle would otherwise leave every member of it with a resolvable parent and
 * therefore no root at all — the whole tree would silently render as nothing.
 * Treating the members as roots renders them (duplicated, once per member)
 * instead of dropping them.
 */
function inCycle(node, byId, cache) {
    if (cache.has(node)) return cache.get(node);
    const seen = new Set();
    let cur = node;
    let cyclic = false;
    while (cur) {
        if (seen.has(cur)) { cyclic = true; break; }
        seen.add(cur);
        cur = byId.get(String(cur.pId));
    }
    for (const n of seen) cache.set(n, cyclic);
    cache.set(node, cyclic);
    return cyclic;
}

/** Parent lookup, plus the children of each node, both in insertion order. */
function indexNodes(nodes) {
    const byId = new Map();
    for (const n of nodes) byId.set(String(n.id), n);
    const children = new Map();
    const roots = [];
    const cycleCache = new Map();
    for (const n of nodes) {
        const parent = byId.get(String(n.pId));
        if (parent && parent !== n && !inCycle(n, byId, cycleCache)) {
            if (!children.has(parent)) children.set(parent, []);
            children.get(parent).push(n);
        } else {
            roots.push(n);
        }
    }
    return { byId, children, roots };
}

/**
 * Render flat nodes as the nested `<li>`/`<ul>` markup zTree produced.
 *
 * Exported as a pure function — no DOM, no state — so the shape of the tree
 * can be asserted without a browser. createTree() is the stateful wrapper that
 * puts this into an element and handles clicks.
 *
 * @param {Array}  nodes flat `{ id, pId, name, t, icon, open }`
 * @param {object} [opts]
 * @param {string} [opts.treeId]  prefix for element ids
 * @param {string} [opts.keyword]  filter; empty shows everything
 * @param {string} [opts.urlKey]   node field holding the URL (default `t`)
 * @param {Map}    [opts.ids]      node -> stable element id, kept by the caller
 */
function treeHtml(nodes, opts) {
    const options = opts || {};
    const treeId = options.treeId || 'tree';
    const keyword = options.keyword ? String(options.keyword).trim() : '';
    const source = options.source ? String(options.source).trim() : '';
    const destination = options.destination ? String(options.destination).trim() : '';
    const transition = options.transition ? String(options.transition).trim() : '';
    const startDateStr = options.startDate ? String(options.startDate).trim() : '';
    const endDateStr = options.endDate ? String(options.endDate).trim() : '';
    const startTimestamp = startDateStr ? new Date(startDateStr + 'T00:00:00').getTime() : 0;
    const endTimestamp = endDateStr ? new Date(endDateStr + 'T23:59:59.999').getTime() : Infinity;
    const hasDateFilter = Boolean(startDateStr || endDateStr);
    const urlKey = options.urlKey || 't';
    const ids = options.ids || new Map();

    const tId = function (node) {
        if (!ids.has(node)) ids.set(node, ids.size + 1);
        return ids.get(node);
    };

    const matchesNeedle = function (node, needle) {
        if (!needle) return true;
        const q = needle.toLowerCase();
        const name = node.name == null ? '' : String(node.name);
        const url = node[urlKey] == null ? '' : String(node[urlKey]);
        return name.toLowerCase().indexOf(q) !== -1 || url.toLowerCase().indexOf(q) !== -1;
    };

    const matchesTransition = function (node, trans) {
        if (!trans) return true;
        if (node.transition && String(node.transition).toLowerCase() === trans.toLowerCase()) return true;
        if (node.name && node.name.indexOf(trans) !== -1) return true;
        return false;
    };

    const matchesDate = function (node) {
        if (!hasDateFilter) return true;
        if (node.visitTime === undefined || node.visitTime === null) return false;
        return node.visitTime >= startTimestamp && node.visitTime <= endTimestamp;
    };

    const matches = function (node) {
        return matchesNeedle(node, keyword) && matchesTransition(node, transition) && matchesDate(node);
    };

    const sourceNodes = new Set();
    const destNodes = new Set();
    const pathNodes = new Set();

    /** Matches plus their ancestors: a match buried in a branch is no use if
     *  the branch above it is hidden. */
    const visibleSet = function (idx) {
        const hasAdvanced = Boolean(source || destination || transition || hasDateFilter);
        if (!keyword && !hasAdvanced) return null;

        const visible = new Set();

        // Case 1: Both source and destination specified -> trace origin-to-destination paths
        if (source && destination) {
            for (const d of nodes) {
                if (!matchesNeedle(d, destination) || !matchesTransition(d, transition) || !matchesDate(d)) continue;

                // Walk up ancestor chain looking for a node matching source
                const chain = [];
                let cur = d;
                let foundSource = null;
                for (let guard = 0; cur && guard < nodes.length; guard++) {
                    chain.push(cur);
                    if (cur !== d && matchesNeedle(cur, source) && (!hasDateFilter || cur.visitTime == null || matchesDate(cur))) {
                        foundSource = cur;
                        break;
                    }
                    cur = idx.byId.get(String(cur.pId));
                }

                if (foundSource) {
                    destNodes.add(d);
                    sourceNodes.add(foundSource);
                    for (const n of chain) {
                        visible.add(n);
                        if (n !== d && n !== foundSource) {
                            pathNodes.add(n);
                        }
                    }
                    let p = idx.byId.get(String(foundSource.pId));
                    for (let guard = 0; p && guard < nodes.length; guard++) {
                        visible.add(p);
                        p = idx.byId.get(String(p.pId));
                    }
                }
            }
            return visible;
        }

        // Case 2: Only source specified -> show source nodes and all their descendants
        if (source && !destination) {
            for (const s of nodes) {
                if (!matchesNeedle(s, source) || !matchesTransition(s, transition) || !matchesDate(s)) continue;
                sourceNodes.add(s);
                visible.add(s);

                let p = idx.byId.get(String(s.pId));
                for (let guard = 0; p && guard < nodes.length; guard++) {
                    visible.add(p);
                    p = idx.byId.get(String(p.pId));
                }

                const queue = (idx.children.get(s) || []).slice();
                while (queue.length > 0) {
                    const child = queue.shift();
                    visible.add(child);
                    const grandKids = idx.children.get(child);
                    if (grandKids) {
                        for (const gk of grandKids) queue.push(gk);
                    }
                }
            }
            return visible;
        }

        // Case 3: Only destination specified -> show destination and its origin ancestors
        if (!source && destination) {
            for (const d of nodes) {
                if (!matchesNeedle(d, destination) || !matchesTransition(d, transition) || !matchesDate(d)) continue;
                destNodes.add(d);
                visible.add(d);

                let p = idx.byId.get(String(d.pId));
                for (let guard = 0; p && guard < nodes.length; guard++) {
                    visible.add(p);
                    p = idx.byId.get(String(p.pId));
                }
            }
            return visible;
        }

        // Case 4: Standard keyword and/or transition/date filter
        for (const n of nodes) {
            if (!matches(n)) continue;
            visible.add(n);
            let parent = idx.byId.get(String(n.pId));
            for (let guard = 0; parent && guard < nodes.length; guard++) {
                visible.add(parent);
                parent = idx.byId.get(String(parent.pId));
            }
        }
        return visible;
    };

    /**
     * Escape the name and wrap hits in highlight spans and badges.
     */
    const nameHtml = function (node) {
        const name = node.name == null ? '' : String(node.name);
        let badges = '';
        if (sourceNodes.has(node)) {
            badges += '<span class="badge-source" style="background:#1d4ed8;color:#ffffff;padding:1px 5px;border-radius:3px;font-size:11px;margin-right:4px;font-weight:bold;">[ต้นทาง]</span>';
        }
        if (destNodes.has(node)) {
            badges += '<span class="badge-dest" style="background:#047857;color:#ffffff;padding:1px 5px;border-radius:3px;font-size:11px;margin-right:4px;font-weight:bold;">[ปลายทาง]</span>';
        }
        if (pathNodes.has(node) && !sourceNodes.has(node) && !destNodes.has(node)) {
            badges += '<span class="badge-path" style="background:#b45309;color:#ffffff;padding:1px 4px;border-radius:3px;font-size:10px;margin-right:4px;font-weight:600;">[ทางผ่าน]</span>';
        }

        const activeKeyword = keyword || (sourceNodes.has(node) ? source : (destNodes.has(node) ? destination : ''));
        if (!activeKeyword) {
            return badges + escapeHtmlText(name);
        }

        const re = new RegExp(escapeRegExp(activeKeyword), 'gi');
        let out = '';
        let last = 0;
        let hit;
        while ((hit = re.exec(name)) !== null) {
            out += escapeHtmlText(name.slice(last, hit.index));
            out += `<span style="${HIGHLIGHT}">${escapeHtmlText(hit[0])}</span>`;
            last = hit.index + hit[0].length;
            if (hit[0] === '') re.lastIndex++;
        }
        return badges + out + escapeHtmlText(name.slice(last));
    };

    const nodeHtml = function (node, level, isLast, idx, visible) {
        if (visible && !visible.has(node)) return '';

        const tid = tId(node);
        const kids = idx.children.get(node) || [];
        const shown = kids.filter(function (k) { return !visible || visible.has(k); });
        const hasChildren = shown.length > 0;
        const open = node.open !== false;
        const prefix = `${treeId}_${tid}`;

        const icoStyle = node.icon
            ? ` style="background:url('${cssUrl(node.icon)}') 0 0 no-repeat;"` : '';

        const deleteBtn = (options.showDelete && node.id > 3)
            ? `<span class="node-delete-btn" title="Move to Recycle Bin">✕</span>`
            : '';

        let html = `<li id="${prefix}" class="level${level}" data-tid="${tid}">`
            + `<span id="${prefix}_switch" class="button switch ${switchClass(level, isLast, hasChildren, open)}"></span>`
            + `<a id="${prefix}_a" class="level${level}" title="${escapeHtmlAttr(node[urlKey])}">`
            + `<span id="${prefix}_ico" class="button ico ${icoClass(hasChildren, open)}"${icoStyle}></span>`
            + `<span id="${prefix}_span">${nameHtml(node)}</span>`
            + deleteBtn
            + '</a>';

        if (hasChildren) {
            const inner = shown.map(function (kid, i) {
                return nodeHtml(kid, level + 1, i === shown.length - 1, idx, visible);
            }).join('');
            html += `<ul id="${prefix}_ul" class="level${level} line"`
                + ` style="display:${open ? 'block' : 'none'}">${inner}</ul>`;
        }
        return html + '</li>';
    };

    const idx = indexNodes(nodes);
    const visible = visibleSet(idx);
    return idx.roots.map(function (root, i) {
        return nodeHtml(root, 0, i === idx.roots.length - 1, idx, visible);
    }).join('');
}

/**
 * @param {HTMLElement} container the <ul> to render into
 * @param {object} [opts]
 * @param {Function} [opts.onClick] (event, treeId, node)
 * @param {Function} [opts.onDelete] (event, treeId, node)
 * @param {boolean}  [opts.showDelete] whether to render the delete button
 * @param {string}   [opts.urlKey]  node field holding the URL (default `t`)
 */
function createTree(container, opts) {
    const options = opts || {};
    const onClick = options.onClick || function () {};
    const onDelete = options.onDelete || null;
    const showDelete = Boolean(options.showDelete || options.onDelete);
    const urlKey = options.urlKey || 't';
    const treeId = container.id || 'tree';

    let nodes = [];
    let keyword = '';
    let filterOpts = {};
    const ids = new Map();
    let index = indexNodes(nodes);

    function byTid(tid) {
        for (const [node, id] of ids) if (id === tid) return node;
        return undefined;
    }

    function render() {
        index = indexNodes(nodes);
        container.innerHTML = treeHtml(nodes, Object.assign({ treeId, keyword, urlKey, ids, showDelete }, filterOpts));
    }

    container.addEventListener('click', function (event) {
        const row = event.target.closest ? event.target.closest('li[data-tid]') : null;
        if (!row) return;
        const node = byTid(Number(row.dataset.tid));
        if (!node) return;

        if (event.target.closest && event.target.closest('.node-delete-btn')) {
            event.stopPropagation();
            event.preventDefault();
            if (onDelete) onDelete(event, treeId, node);
            return;
        }

        if (event.target.closest && event.target.closest('.switch')) {
            toggle(node);
            return;
        }
        onClick(event, treeId, node);
    });

    function toggle(node) {
        const open = node.open === false;
        node.open = open;
        const prefix = `${treeId}_${ids.get(node)}`;
        const list = document.getElementById(`${prefix}_ul`);
        const sw = document.getElementById(`${prefix}_switch`);
        if (list) list.style.display = open ? 'block' : 'none';
        if (sw) {
            sw.className = sw.className.replace(/_open|_close/, open ? '_open' : '_close');
        }
    }

    return {
        setNodes(list) {
            nodes = Array.from(list || []);
            render();
        },
        addNodes(list) {
            nodes = nodes.concat(Array.from(list || []));
            render();
        },
        getNodes() {
            return index.roots;
        },
        childrenOf(node) {
            return index.children.get(node) || [];
        },
        removeNode(node) {
            nodes = nodes.filter(function (n) { return n !== node; });
            render();
        },
        clear() {
            nodes = [];
            render();
        },
        filter(text) {
            if (typeof text === 'object' && text !== null) {
                filterOpts = text;
                keyword = filterOpts.keyword || '';
            } else {
                filterOpts = {};
                keyword = text == null ? '' : String(text);
            }
            render();
        },
        filterAdvanced(adv) {
            filterOpts = adv || {};
            keyword = filterOpts.keyword || '';
            render();
        },
        getKeyword() {
            return keyword;
        },
        getFilter() {
            return Object.assign({ keyword }, filterOpts);
        },
    };
}

/**
 * Wire the filter box, advanced origin/dest inputs, date range, and transition tags to a tree.
 */
function bindTreeSearch(tree, opts) {
    const input = document.querySelector(opts.input);
    const sourceInput = opts.sourceInput ? document.querySelector(opts.sourceInput) : null;
    const destInput = opts.destInput ? document.querySelector(opts.destInput) : null;
    const transSelect = opts.transitionSelect ? document.querySelector(opts.transitionSelect) : null;
    const startDateInput = opts.startDateInput ? document.querySelector(opts.startDateInput) : null;
    const endDateInput = opts.endDateInput ? document.querySelector(opts.endDateInput) : null;
    const presetBtns = opts.presetBtns ? Array.from(document.querySelectorAll(opts.presetBtns)) : [];
    const clearBtn = opts.clearBtn ? document.querySelector(opts.clearBtn) : null;
    const toggleBtn = opts.toggleBtn ? document.querySelector(opts.toggleBtn) : null;
    const drawerEl = opts.drawer ? document.querySelector(opts.drawer) : null;
    const statusEl = opts.statusEl ? document.querySelector(opts.statusEl) : null;
    const tags = opts.tags ? Array.from(document.querySelectorAll(opts.tags)) : [];
    const delay = opts.delay === undefined ? 500 : opts.delay;

    let timer = null;
    let last = '';
    let lastStartDate = '';
    let lastEndDate = '';

    function getCriteria() {
        const text = input ? input.value : '';
        const src = sourceInput ? sourceInput.value : '';
        const dst = destInput ? destInput.value : '';
        const trans = transSelect ? transSelect.value : '';
        const sDate = startDateInput ? startDateInput.value : '';
        const eDate = endDateInput ? endDateInput.value : '';
        return {
            keyword: text,
            source: src,
            destination: dst,
            transition: trans,
            startDate: sDate,
            endDate: eDate
        };
    }

    function formatDateIso(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    function runSearch(immediate) {
        if (opts.onStart) opts.onStart();
        if (timer) clearTimeout(timer);

        const execute = function () {
            timer = null;
            const crit = getCriteria();
            const key = JSON.stringify(crit);
            if (key === last) return;
            last = key;

            if (crit.source || crit.destination || crit.transition || crit.startDate || crit.endDate) {
                tree.filterAdvanced(crit);
            } else {
                tree.filter(crit.keyword);
            }

            if (clearBtn) {
                const hasAny = Boolean(crit.keyword || crit.source || crit.destination || crit.transition || crit.startDate || crit.endDate);
                clearBtn.style.display = hasAny ? 'inline-block' : 'none';
            }

            if (statusEl) {
                const parts = [];
                if (crit.source && crit.destination) {
                    parts.push(`เส้นทาง: "${crit.source}" ➔ "${crit.destination}"`);
                } else if (crit.source) {
                    parts.push(`ต้นทาง: "${crit.source}"`);
                } else if (crit.destination) {
                    parts.push(`ปลายทาง: "${crit.destination}"`);
                }
                if (crit.startDate || crit.endDate) {
                    const s = crit.startDate || 'ก่อนหน้า';
                    const e = crit.endDate || 'ปัจจุบัน';
                    parts.push(`ช่วงเวลา: ${s} ถึง ${e}`);
                }
                if (crit.transition) {
                    parts.push(`ประเภท: ${crit.transition}`);
                }
                if (parts.length > 0) {
                    statusEl.textContent = 'ผลการค้นหาแบบละเอียด ➔ ' + parts.join(' | ');
                    statusEl.style.display = 'block';
                } else {
                    statusEl.style.display = 'none';
                }
            }

            if (opts.onDateRangeChange && (crit.startDate !== lastStartDate || crit.endDate !== lastEndDate)) {
                lastStartDate = crit.startDate;
                lastEndDate = crit.endDate;
                opts.onDateRangeChange(crit.startDate, crit.endDate);
            }

            if (opts.onEnd) opts.onEnd();
        };

        if (immediate) {
            execute();
        } else {
            timer = setTimeout(execute, delay);
        }
    }

    if (input) {
        input.addEventListener('input', function () { runSearch(false); });
    }
    if (sourceInput) {
        sourceInput.addEventListener('input', function () { runSearch(false); });
    }
    if (destInput) {
        destInput.addEventListener('input', function () { runSearch(false); });
    }
    if (transSelect) {
        transSelect.addEventListener('change', function () { runSearch(true); });
    }
    if (startDateInput) {
        startDateInput.addEventListener('change', function () {
            presetBtns.forEach(function (b) { b.classList.remove('active'); });
            runSearch(true);
        });
    }
    if (endDateInput) {
        endDateInput.addEventListener('change', function () {
            presetBtns.forEach(function (b) { b.classList.remove('active'); });
            runSearch(true);
        });
    }

    for (let pIdx = 0; pIdx < presetBtns.length; pIdx++) {
        (function (btn) {
            btn.addEventListener('click', function () {
                const preset = btn.dataset.preset;
                const now = new Date();
                presetBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');

                if (preset === 'today') {
                    const todayStr = formatDateIso(now);
                    if (startDateInput) startDateInput.value = todayStr;
                    if (endDateInput) endDateInput.value = todayStr;
                } else if (preset === 'yesterday') {
                    const yest = new Date(now.getTime() - 86400000);
                    const yestStr = formatDateIso(yest);
                    if (startDateInput) startDateInput.value = yestStr;
                    if (endDateInput) endDateInput.value = yestStr;
                } else if (preset === '7days') {
                    const start = new Date(now.getTime() - 7 * 86400000);
                    if (startDateInput) startDateInput.value = formatDateIso(start);
                    if (endDateInput) endDateInput.value = formatDateIso(now);
                } else if (preset === '30days') {
                    const start = new Date(now.getTime() - 30 * 86400000);
                    if (startDateInput) startDateInput.value = formatDateIso(start);
                    if (endDateInput) endDateInput.value = formatDateIso(now);
                } else if (preset === 'all') {
                    if (startDateInput) startDateInput.value = '';
                    if (endDateInput) endDateInput.value = '';
                    btn.classList.remove('active');
                }
                runSearch(true);
            });
        })(presetBtns[pIdx]);
    }

    if (toggleBtn && drawerEl) {
        toggleBtn.addEventListener('click', function () {
            const isOpen = drawerEl.style.display !== 'none';
            drawerEl.style.display = isOpen ? 'none' : 'block';
            toggleBtn.classList.toggle('active', !isOpen);
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', function () {
            if (input) input.value = '';
            if (sourceInput) sourceInput.value = '';
            if (destInput) destInput.value = '';
            if (transSelect) transSelect.value = '';
            if (startDateInput) startDateInput.value = '';
            if (endDateInput) endDateInput.value = '';
            presetBtns.forEach(function (b) { b.classList.remove('active'); });
            runSearch(true);
        });
    }

    for (const tag of tags) {
        tag.addEventListener('click', function () {
            let text = tag.textContent || '';
            const crit = getCriteria();
            if (crit.keyword.indexOf(text) >= 0) text = '';
            if (input) input.value = text;
            runSearch(false);
        });
    }
}

// One `export {}` block rather than three inline `export function`s:
// tests/static.test.mjs reads this block to cross-check the module's public
// API, and it cannot see the inline form.
export { treeHtml, createTree, bindTreeSearch };
