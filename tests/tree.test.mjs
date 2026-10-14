// Behaviour tests for modules/tree.js — the native tree renderer that replaced
// jQuery + zTree on history2.html.
//
// The pure function (treeHtml) is imported statically: neither it nor the
// escaping helpers it pulls in from modules/helpers.js touches a browser global
// at import time. The stateful half (createTree / bindTreeSearch) needs an
// element to render into, so those tests install the DOM stand-in from ./dom.mjs.

import test from 'node:test';
import assert from 'node:assert/strict';

import { createDom } from './dom.mjs';

import { treeHtml, createTree, bindTreeSearch } from '../chrome/scripts/modules/tree.js';

const dom = createDom();

const NODES = [
    { id: 1, pId: 0, name: 'Root', t: 'https://root.test/' },
    { id: 2, pId: 1, name: 'Child', t: 'https://root.test/child' },
    { id: 3, pId: 2, name: 'Grandchild', t: 'https://root.test/child/deep' },
];

/** Let a debounced filter fire. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

/**
 * A tree rendered into a container element, with every node click recorded.
 *
 * `container.id` has to be set: createTree() derives the element-id prefix
 * from it, which is also what ties a rendered row back to its node.
 */
function treeFixture(nodes) {
    const container = dom.el('treeDemo');
    container.id = 'treeDemo';
    container.innerHTML = '';

    const clicked = [];
    const tree = createTree(container, { onClick: (_event, _treeId, node) => clicked.push(node) });
    if (nodes) tree.setNodes(nodes);
    return { container, tree, clicked };
}

/**
 * A `<li data-tid>` row good enough for the delegated click handler.
 *
 * `closest()` in the shim resolves through `parentNode` and matches on
 * attributes, so both the id and `dataset` have to be populated: the former is
 * what `closest('li[data-tid]')` sees, the latter is what the handler reads.
 * `inSwitch` returns the switch span inside the row instead of the row itself.
 */
function row(tid, inSwitch) {
    const li = dom.makeEl('li');
    li.setAttribute('data-tid', String(tid));
    li.dataset.tid = String(tid);

    if (!inSwitch) return li;
    const span = dom.makeEl('span');
    span.className = 'button switch root_open';
    span.parentNode = li;
    return span;
}

test('a flat id/pId list renders as nested list items', () => {
    const html = treeHtml(NODES, { treeId: 'tree' });

    // The whole point of the page: a child lives inside its parent's <ul>.
    assert.match(html, /<ul id="tree_1_ul"[^>]*><li id="tree_2"/,
        'the child must be nested in its parent, or the tree is a flat list');
    assert.match(html, /<ul id="tree_2_ul"[^>]*><li id="tree_3"/);

    // Only one root: ids 2 and 3 have parents that exist.
    assert.equal((html.match(/class="level0"/g) || []).length, 2, 'one root li and its anchor');
});

test('a node whose parent is missing is treated as a root', () => {
    // Real data does this: the parent visit has aged out of the range the page
    // loaded, so the child arrives with a pId nobody can answer for.
    const html = treeHtml([{ id: 7, pId: 404, name: 'Orphan', t: 'https://x/' }], { treeId: 'tree' });

    assert.match(html, /<li id="tree_1"[^>]*class="level0"/, 'an orphan must still be rendered');
});

test('a pId cycle terminates instead of hanging', () => {
    const loop = [
        { id: 1, pId: 2, name: 'A', t: '' },
        { id: 2, pId: 1, name: 'B', t: '' },
    ];
    const html = treeHtml(loop, { treeId: 'tree', keyword: 'A' });
    assert.match(html, /<li id="tree_1"/, 'the ancestor walk must not loop forever');
});

test('filtering keeps the match and the chain above it', () => {
    const html = treeHtml(NODES, { treeId: 'tree', keyword: 'Grand' });

    // Matched by name — though the hit is wrapped in a highlight span, so the
    // assertion is on the row, not on the literal text.
    assert.match(html, /data-tid="3"/);
    // Ancestors are shown even though they do not match: a match buried under
    // a hidden branch is unreachable.
    assert.match(html, /data-tid="1"/);
    assert.match(html, /data-tid="2"/);
});

test('filtering drops branches that hold no match', () => {
    const html = treeHtml([
        { id: 1, pId: 0, name: 'Root', t: 'https://a/' },
        { id: 2, pId: 1, name: 'Other', t: 'https://b/' },
    ], { treeId: 'tree', keyword: 'nomatchhere' });

    assert.equal(html, '', 'nothing matched, so nothing is shown');
});

test('a keyword matches the URL as well as the name', () => {
    const html = treeHtml(NODES, { treeId: 'tree', keyword: 'child/deep' });
    assert.match(html, /Grandchild/, 'the filter box filters on URL too');
});

test('a keyword with regex metacharacters does not throw', () => {
    // `a(` is what broke updateFilter() the same way: a user-typed string fed
    // to new RegExp. Here it must simply not match.
    assert.doesNotThrow(() => treeHtml(NODES, { treeId: 'tree', keyword: 'a(' }));
    assert.doesNotThrow(() => treeHtml(NODES, { treeId: 'tree', keyword: '\\' }));
    // ...and it must not terminate the render loop either.
    assert.doesNotThrow(() => treeHtml(NODES, { treeId: 'tree', keyword: '{' }));
});

test('the matched text is highlighted and the name is otherwise intact', () => {
    const html = treeHtml(NODES, { treeId: 'tree', keyword: 'child' });
    assert.match(html, /<span style="color: whitesmoke;background-color: darkred;">Child<\/span>/);
    // Case-insensitive, and the rest of the name is untouched.
    assert.match(html, /Grand<span style="[^"]*">child<\/span>/);
});

test('a node title is escaped before it reaches an attribute', () => {
    const html = treeHtml(
        [{ id: 1, pId: 0, name: 'x', t: 'https://a/?q=" onclick="alert(1)' }],
        { treeId: 'tree' },
    );
    assert.ok(!html.includes('onclick="alert'), 'the URL must not close the title attribute');
    assert.match(html, /title="https:\/\/a\/\?q=&quot; onclick=&quot;alert\(1\)"/);
});

test('a custom icon replaces the folder glyph', () => {
    const html = treeHtml(
        [{ id: 1, pId: 0, name: 'x', t: 'https://a/', icon: 'https://a/favicon.ico' }],
        { treeId: 'tree' },
    );
    assert.match(html, /background:url\('https:\/\/a\/favicon\.ico'\)/);
});

test('a quote in a favicon URL cannot close the url() string', () => {
    // The icon sits in a style attribute, so two parsers read it. Escaping for
    // HTML alone is not enough: the entity is decoded before the CSS tokenizer
    // runs, so `'` still terminates url() and the icon silently disappears.
    const html = treeHtml(
        [{ id: 1, pId: 0, name: 'x', t: 'https://a/', icon: "https://a/b'c" }],
        { treeId: 'tree' },
    );
    const style = /style="([^"]*)"/.exec(html)[1];
    // What the CSS tokenizer actually sees: the HTML parser decodes entities
    // FIRST, so an entity-escaped quote arrives at CSS as a bare quote again.
    const seenByCss = style.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

    assert.match(seenByCss, /url\('https:\/\/a\/b\\'c'\)/, 'the quote reaches CSS escaped');
    assert.doesNotMatch(seenByCss, /url\('https:\/\/a\/b'c'\)/, 'an unescaped quote would end the url() early');
});

test('a closed node renders its children hidden', () => {
    const open = treeHtml([{ id: 1, pId: 0, name: 'a', open: true }, { id: 2, pId: 1, name: 'b' }], { treeId: 't' });
    const shut = treeHtml([{ id: 1, pId: 0, name: 'a', open: false }, { id: 2, pId: 1, name: 'b' }], { treeId: 't' });
    assert.match(open, /<ul id="t_1_ul"[^>]*style="display:block"/);
    assert.match(shut, /<ul id="t_1_ul"[^>]*style="display:none"/);
    assert.match(shut, /class="button switch root_close"/);
});

test('element ids stay attached to the same node across renders', () => {
    const ids = new Map();
    const first = treeHtml(NODES, { treeId: 'tree', ids });
    const second = treeHtml(NODES, { treeId: 'tree', ids });
    assert.equal(first, second, 'a re-render must not renumber the rows');
});

// ---------------------------------------------------------------------------
// The rows carry zTree's class vocabulary
//
// history2.html keeps css/zTreeStyle.css and drops the library, so the icons,
// the connector line and the indentation all hang on these class names. A
// rename here loses them silently — the page still renders, just unstyled — so
// the contract is asserted rather than assumed.
// ---------------------------------------------------------------------------

test('the rows carry the class names zTreeStyle.css draws', () => {
    const html = treeHtml([
        { id: 1, pId: 0, name: 'root' },
        { id: 2, pId: 1, name: 'first' },
        { id: 3, pId: 1, name: 'last' },
    ], { treeId: 't' });

    assert.match(html, /class="button switch root_open"/, 'an open root with children');
    assert.match(html, /class="button ico ico_open"/);
    assert.match(html, /class="button switch center_docu"/, 'a child that is not the last one');
    assert.match(html, /class="button switch bottom_docu"/, 'the last child of a branch');
    assert.match(html, /<ul id="t_1_ul" class="level0 line"/, 'the connector line comes from .line');
});

// ---------------------------------------------------------------------------
// Escaping: the node name
//
// `name` is the page title as the browser reported it, i.e. attacker-controlled.
// It reaches the DOM as TEXT CONTENT, so it is escaped here — after the
// highlight, or a keyword can land inside an entity.
// ---------------------------------------------------------------------------

test('a node name is escaped, not executed', () => {
    const html = treeHtml(
        [{ id: 1, pId: 0, name: '<img src=x onerror=alert(1)>', t: 'https://a/' }],
        { treeId: 't' },
    );
    assert.ok(!html.includes('<img src=x'), 'the markup in the title became a real element');
    assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/, 'the markup must be shown, not run');
});

test('a node name keeps the characters that belong to the title', () => {
    // escapeHtmlText(), not escapeHtmlAttr(): in a text position a quote needs
    // no escaping, and escaping it would rewrite what the user actually wrote.
    const html = treeHtml([{ id: 1, pId: 0, name: 'Docs / API "v2"', t: 'u' }], { treeId: 't' });
    assert.match(html, /Docs \/ API "v2"/);
});

test('a highlight cannot cut an HTML entity in half', () => {
    // The reason escaping has to happen after the match rather than before:
    // replacing over already-escaped text turns `&amp;` into
    // `&<span…>amp</span>;` and prints a mangled row.
    const html = treeHtml([{ id: 1, pId: 0, name: 'Tom & Jerry', t: 'u' }], { treeId: 't', keyword: '&' });

    assert.match(html, /<span style="[^"]*">&amp;<\/span>/, 'the ampersand is highlighted as itself');
    assert.ok(!html.includes('&<span'), 'the highlight must not start inside the entity');
    assert.match(html, /Tom <span[^>]*>&amp;<\/span> Jerry/, 'and the rest of the name survives');
});

test('a highlight search matches what the user typed, not the escaped form', () => {
    // Searching for `<` finds the raw character in the title; the escaped text
    // it is rendered as contains no `<` at all.
    const html = treeHtml([{ id: 1, pId: 0, name: 'a < b', t: 'u' }], { treeId: 't', keyword: '<' });
    assert.match(html, /<span style="[^"]*">&lt;<\/span>/);
});

// ---------------------------------------------------------------------------
// createTree — the stateful half
// ---------------------------------------------------------------------------

test('createTree renders its nodes into the container', () => {
    const { container, tree } = treeFixture();
    tree.setNodes(NODES);

    assert.match(container.innerHTML, /<li id="treeDemo_1"/);
    assert.equal(tree.getNodes().length, 1, 'three nodes, one root');
});

test('clicking a row reports the node it was rendered from', () => {
    const { container, clicked } = treeFixture(NODES);

    container.dispatch('click', { target: row(2) });

    assert.deepEqual(clicked, [NODES[1]], 'the click maps back to the node, not to the row');
});

test('clicking the switch collapses the node in place', () => {
    const { container, clicked } = treeFixture([{ id: 1, pId: 0, name: 'a' }, { id: 2, pId: 1, name: 'b' }]);

    // The shim registers the ids out of innerHTML but parses neither class nor
    // style out of it, so the two elements it created get what the browser
    // would have given them: an open node draws its <ul> expanded.
    const list = document.getElementById('treeDemo_1_ul');
    const sw = document.getElementById('treeDemo_1_switch');
    sw.className = 'button switch root_open';
    list.style.display = 'block';

    const drawn = container.innerHTML;
    container.dispatch('click', { target: row(1, true) });

    assert.equal(list.style.display, 'none', 'the children are hidden');
    assert.match(sw.className, /root_close/, 'and the switch shows the closed glyph');
    assert.deepEqual(clicked, [], 'a switch click is not a node click');
    assert.equal(container.innerHTML, drawn,
        'no re-render: re-rendering to collapse would lose the scroll position');
});

test('addNodes appends without dropping what is already there', () => {
    const { container, tree } = treeFixture([{ id: 1, pId: 0, name: 'a' }]);
    tree.addNodes([{ id: 2, pId: 1, name: 'b' }]);

    assert.match(container.innerHTML, /data-tid="1"/);
    assert.match(container.innerHTML, /data-tid="2"/);
});

test('removeNode drops one row and clear empties the tree', () => {
    const { container, tree } = treeFixture(NODES);

    tree.removeNode(NODES[2]);
    assert.doesNotMatch(container.innerHTML, /data-tid="3"/, 'the grandchild is gone');
    assert.match(container.innerHTML, /data-tid="2"/, 'the rest of the branch stays');

    tree.clear();
    assert.equal(container.innerHTML, '');
    assert.deepEqual(tree.getNodes(), []);
});

test('childrenOf reports the direct children in insertion order', () => {
    // closed.js walks it to reopen every page under the group that was clicked.
    // It has to survive a re-render (the index is rebuilt, not cached from the
    // first one) and to report the data's order rather than the markup's.
    const branching = [
        { id: 'g', pId: 0, name: 'group', t: '#' },
        { id: 'b', pId: 'g', name: 'burst', t: '#' },
        { id: 'p2', pId: 'b', name: 'second page', t: 'https://two.test/' },
        { id: 'p1', pId: 'b', name: 'first page', t: 'https://one.test/' },
    ];
    const { tree } = treeFixture(branching);

    const group = tree.getNodes()[0];
    assert.deepEqual(tree.childrenOf(group).map((n) => n.id), ['b']);
    assert.deepEqual(tree.childrenOf(branching[1]).map((n) => n.id), ['p2', 'p1'],
        'insertion order, not the order the rows happen to be drawn in');

    tree.setNodes(branching.slice(0, 2));
    assert.deepEqual(tree.childrenOf(group).map((n) => n.id), ['b'],
        'the index follows setNodes(), otherwise a click would reopen stale rows');
    assert.deepEqual(tree.childrenOf(branching[2]), [], 'a node that is no longer in the tree has no children');
});

test('filter() narrows the tree and getKeyword() reports what is applied', () => {
    const { container, tree } = treeFixture(NODES);

    tree.filter('Grand');
    assert.equal(tree.getKeyword(), 'Grand');
    assert.match(container.innerHTML, /data-tid="3"/, 'the match is still shown');

    tree.filter('nomatchatall');
    assert.equal(container.innerHTML, '', 'a branch with no match is not shown');

    tree.filter('');
    assert.match(container.innerHTML, /data-tid="3"/, 'an empty keyword shows everything again');
});

// ---------------------------------------------------------------------------
// bindTreeSearch — the filter box and the transition tags
// ---------------------------------------------------------------------------

test('the filter box drives the tree once the debounce elapses', async () => {
    const { tree } = treeFixture(NODES);
    const input = dom.el('rh-search');
    input.value = 'Grand';

    const events = [];
    bindTreeSearch(tree, {
        input: '#rh-search',
        delay: 1,
        onStart: () => events.push('start'),
        onEnd: () => events.push('end'),
    });

    input.dispatch('input');

    assert.deepEqual(events, ['start'], 'the first keystroke announces the search too');
    assert.equal(tree.getKeyword(), '', 'and nothing is filtered before the debounce');

    await settle();

    assert.equal(tree.getKeyword(), 'Grand');
    assert.deepEqual(events, ['start', 'end']);
});

test('typing the same keyword again does not re-filter', async () => {
    const { tree } = treeFixture(NODES);
    const input = dom.el('rh-search');
    const events = [];
    bindTreeSearch(tree, { input: '#rh-search', delay: 1, onEnd: () => events.push('end') });

    input.value = 'Grand';
    input.dispatch('input');
    await settle();
    input.dispatch('input');
    await settle();

    assert.equal(tree.getKeyword(), 'Grand');
    assert.deepEqual(events, ['end'], 'the second keystroke changed nothing, so onEnd fires once');
});

test('a filter tag is a toggle: clicking it again clears the box', async () => {
    const { tree } = treeFixture(NODES);
    const input = dom.el('rh-search');
    input.value = '';

    const holder = dom.el('search-tag');
    holder.innerHTML = '';
    const tag = dom.makeEl('a');
    tag.textContent = '🔗';
    holder.appendChild(tag);

    bindTreeSearch(tree, { input: '#rh-search', tags: '#search-tag a', delay: 1 });

    tag.dispatch('click');
    await settle();
    assert.equal(input.value, '🔗', 'the tag fills the filter box');
    assert.equal(tree.getKeyword(), '🔗');

    tag.dispatch('click');
    await settle();
    assert.equal(input.value, '', 'clicking it again clears it');
    assert.equal(tree.getKeyword(), '');
});

test('advanced search filters by source and destination path', () => {
    const nodes = [
        { id: 1, pId: 0, name: 'Google Search', t: 'https://google.com/search' },
        { id: 2, pId: 1, name: 'Documentation Index', t: 'https://docs.site/index' },
        { id: 3, pId: 2, name: 'API Reference Target', t: 'https://docs.site/api' },
        { id: 4, pId: 0, name: 'Other Source', t: 'https://other.com/' },
        { id: 5, pId: 4, name: 'Other Child', t: 'https://other.com/child' },
    ];
    // Path from Google to API Reference
    const html = treeHtml(nodes, { treeId: 'tree', source: 'Google', destination: 'API' });
    assert.match(html, /data-tid="1"/, 'source node is included');
    assert.match(html, /data-tid="2"/, 'intermediate path node is included');
    assert.match(html, /data-tid="3"/, 'destination node is included');
    assert.doesNotMatch(html, /data-tid="4"/, 'unrelated branch is excluded');
    assert.doesNotMatch(html, /data-tid="5"/, 'unrelated branch child is excluded');
    assert.match(html, /\[ต้นทาง\]/, 'source badge is rendered');
    assert.match(html, /\[ปลายทาง\]/, 'destination badge is rendered');
    assert.match(html, /\[ทางผ่าน\]/, 'intermediate path badge is rendered');
});

test('advanced search filters by source only (shows origin and all its subbranches)', () => {
    const nodes = [
        { id: 1, pId: 0, name: 'Root Source', t: 'https://source.com/' },
        { id: 2, pId: 1, name: 'Branch 1', t: 'https://source.com/b1' },
        { id: 3, pId: 2, name: 'Branch 1 Sub', t: 'https://source.com/b1/sub' },
        { id: 4, pId: 0, name: 'Ignored Root', t: 'https://ignored.com/' },
    ];
    const html = treeHtml(nodes, { treeId: 'tree', source: 'Root Source' });
    assert.match(html, /data-tid="1"/);
    assert.match(html, /data-tid="2"/);
    assert.match(html, /data-tid="3"/);
    assert.doesNotMatch(html, /data-tid="4"/);
    assert.match(html, /\[ต้นทาง\]/);
});

test('advanced search filters by destination only (shows target and ancestor origin chain)', () => {
    const nodes = [
        { id: 1, pId: 0, name: 'Root A', t: 'https://a.com/' },
        { id: 2, pId: 1, name: 'Target Destination', t: 'https://target.com/' },
        { id: 3, pId: 0, name: 'Root B', t: 'https://b.com/' },
        { id: 4, pId: 3, name: 'Child B', t: 'https://b.com/child' },
    ];
    const html = treeHtml(nodes, { treeId: 'tree', destination: 'Target' });
    assert.match(html, /data-tid="1"/, 'ancestor is preserved');
    assert.match(html, /data-tid="2"/, 'destination is shown');
    assert.doesNotMatch(html, /data-tid="3"/, 'unrelated root is excluded');
    assert.doesNotMatch(html, /data-tid="4"/, 'unrelated child is excluded');
    assert.match(html, /\[ปลายทาง\]/);
});

test('advanced search filters by start date and end date', () => {
    const nodes = [
        { id: 1, pId: 0, name: 'Old Visit', t: 'https://old.com/', visitTime: new Date('2026-10-01T12:00:00').getTime() },
        { id: 2, pId: 0, name: 'Target Day Visit', t: 'https://target-day.com/', visitTime: new Date('2026-10-10T14:30:00').getTime() },
        { id: 3, pId: 2, name: 'Target Day Child', t: 'https://target-day.com/child', visitTime: new Date('2026-10-10T15:00:00').getTime() },
        { id: 4, pId: 0, name: 'Future Visit', t: 'https://future.com/', visitTime: new Date('2026-10-25T10:00:00').getTime() },
    ];
    const html = treeHtml(nodes, { treeId: 'tree', startDate: '2026-10-09', endDate: '2026-10-11' });
    assert.doesNotMatch(html, /Old Visit/, 'visit before start date is excluded');
    assert.match(html, /Target Day Visit/, 'visit in range is included');
    assert.match(html, /Target Day Child/, 'child visit in range is included');
    assert.doesNotMatch(html, /Future Visit/, 'visit after end date is excluded');
});

test('advanced search combines source, destination, start date, and end date', () => {
    const nodes = [
        // Path in target date range
        { id: 1, pId: 0, name: 'Google Search October', t: 'https://google.com/search', visitTime: new Date('2026-10-14T10:00:00').getTime() },
        { id: 2, pId: 1, name: 'GitHub Repo October', t: 'https://github.com/project', visitTime: new Date('2026-10-14T10:05:00').getTime() },
        { id: 3, pId: 2, name: 'Releases Target October', t: 'https://github.com/project/releases', visitTime: new Date('2026-10-14T10:10:00').getTime() },
        // Same source/dest path but outside target date range
        { id: 4, pId: 0, name: 'Google Search September', t: 'https://google.com/search', visitTime: new Date('2026-09-01T10:00:00').getTime() },
        { id: 5, pId: 4, name: 'GitHub Repo September', t: 'https://github.com/project', visitTime: new Date('2026-09-01T10:05:00').getTime() },
        { id: 6, pId: 5, name: 'Releases Target September', t: 'https://github.com/project/releases', visitTime: new Date('2026-09-01T10:10:00').getTime() },
    ];
    const html = treeHtml(nodes, {
        treeId: 'tree',
        source: 'Google',
        destination: 'Releases',
        startDate: '2026-10-10',
        endDate: '2026-10-15',
    });
    assert.match(html, /data-tid="1"/, 'source in date range is included');
    assert.match(html, /data-tid="2"/, 'path node in date range is included');
    assert.match(html, /data-tid="3"/, 'destination in date range is included');
    assert.doesNotMatch(html, /data-tid="4"/, 'out-of-range path is excluded');
    assert.doesNotMatch(html, /data-tid="5"/);
    assert.doesNotMatch(html, /data-tid="6"/);
    assert.match(html, /\[ต้นทาง\]/, 'source badge is rendered');
    assert.match(html, /\[ปลายทาง\]/, 'destination badge is rendered');
    assert.match(html, /\[ทางผ่าน\]/, 'intermediate path badge is rendered');
});
