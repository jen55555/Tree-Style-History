/**
 * Web Polyfill for Tree Style History (Chrome Extension)
 * Simulates Chrome MV3 Extension APIs in a standard browser environment.
 */
(function() {
    'use strict';

    const globalObj = typeof window !== 'undefined' ? window : globalThis;

    // Default configuration values matching chrome/scripts/modules/shared/config-defaults.js
    const defaultValues = {
        "rh-itemsno": "16",
        "rct-itemsno": "4",
        "rt-itemsno": "6",
        "mv-itemsno": "0",
        "rb-itemsno": "3",
        "mv-blocklist": "false",
        "rh-historypage": "yes",
        "rh-date": "mm/dd/yyyy",
        "rh-width": "275px",
        "load-range": "7",
        "load-range2": "3",
        "load-range3": "120",
        "load-range4": "150",
        "less-item": "no",
        "rh-search": "yes",
        "rh-list-order": "rh-order,rct-order,rb-order,mv-order,rt-order",
        "rh-time": "yes",
        "rh-group": "yes",
        "rh-orderby": "date",
        "rh-order": "desc",
        "rh-timeformat": "24",
        "rh-click": "newtab",
        "rm-click": "default",
        "rm-path": "yes",
        "use-contextmenu": "yes",
        "rh-share": "yes",
        "rh-filtered": "false",
        "rh-pinned": "false",
        "rhs-showurl": "no",
        "rhs-showsep": "no",
        "rhs-showext": "no",
        "rhs-showbg": "no",
        "show-popup": "yes",
        "favicon-service": "duckduckgo",
        "share-favicon-cache": "yes",
        "favicon-service-fallback": "",
        "popup-zoom": "100",
        "page-zoom": "100",
        "rh-version-3.3.1": "true"
    };

    // Seed localStorage with defaults if missing
    try {
        for (const [k, v] of Object.entries(defaultValues)) {
            if (globalObj.localStorage.getItem(k) === null) {
                globalObj.localStorage.setItem(k, v);
            }
        }
    } catch (e) {
        console.warn('localStorage init error', e);
    }

    // Storage backing
    function createStorageArea(isSession) {
        const store = isSession ? (globalObj.sessionStorage || {}) : globalObj.localStorage;
        const memoryFallback = new Map();

        const getItem = (k) => {
            try { return store.getItem ? store.getItem(k) : memoryFallback.get(k); }
            catch { return memoryFallback.get(k); }
        };
        const setItem = (k, v) => {
            try { if (store.setItem) store.setItem(k, String(v)); else memoryFallback.set(k, String(v)); }
            catch { memoryFallback.set(k, String(v)); }
        };
        const removeItem = (k) => {
            try { if (store.removeItem) store.removeItem(k); else memoryFallback.delete(k); }
            catch { memoryFallback.delete(k); }
        };
        const getAllKeys = () => {
            try { return Object.keys(store); }
            catch { return Array.from(memoryFallback.keys()); }
        };

        return {
            get: function(keys, callback) {
                const out = {};
                if (keys === null || keys === undefined) {
                    const all = getAllKeys();
                    for (const k of all) {
                        const val = getItem(k);
                        if (val !== null && val !== undefined) out[k] = val;
                    }
                } else if (typeof keys === 'string') {
                    const val = getItem(keys);
                    if (val !== null && val !== undefined) out[keys] = val;
                } else if (Array.isArray(keys)) {
                    for (const k of keys) {
                        const val = getItem(k);
                        if (val !== null && val !== undefined) out[k] = val;
                    }
                } else if (typeof keys === 'object') {
                    for (const [k, defVal] of Object.entries(keys)) {
                        const val = getItem(k);
                        out[k] = (val !== null && val !== undefined) ? val : defVal;
                    }
                }
                if (callback) setTimeout(() => callback(out), 0);
                return Promise.resolve(out);
            },
            set: function(items, callback) {
                if (items && typeof items === 'object') {
                    for (const [k, v] of Object.entries(items)) {
                        setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
                    }
                }
                if (callback) setTimeout(() => callback(), 0);
                return Promise.resolve();
            },
            remove: function(keys, callback) {
                const list = Array.isArray(keys) ? keys : [keys];
                for (const k of list) removeItem(k);
                if (callback) setTimeout(() => callback(), 0);
                return Promise.resolve();
            },
            clear: function(callback) {
                try { if (store.clear) store.clear(); else memoryFallback.clear(); }
                catch { memoryFallback.clear(); }
                if (callback) setTimeout(() => callback(), 0);
                return Promise.resolve();
            }
        };
    }

    // Locale messages
    const currentLocale = (globalObj.localStorage.getItem('tsh-lang') || (navigator.language && navigator.language.startsWith('zh') ? 'zh_CN' : 'en'));
    let localeMessages = (globalObj.__TSH_MESSAGES__ && globalObj.__TSH_MESSAGES__[currentLocale]) || {};

    const chromeStub = {
        runtime: {
            id: 'tree-style-history-web',
            lastError: undefined,
            getManifest: function() {
                return {
                    name: 'Tree Style History',
                    version: '3.3.1',
                    manifest_version: 3,
                    description: 'Tree Style History Chrome extension web viewer'
                };
            },
            getURL: function(path) {
                return '/' + (path.startsWith('/') ? path.slice(1) : path);
            },
            sendMessage: function(msg, callback) {
                if (callback) setTimeout(() => callback({ success: true }), 0);
                return Promise.resolve({ success: true });
            },
            onMessage: {
                addListener: function() {},
                removeListener: function() {}
            },
            onInstalled: {
                addListener: function() {}
            }
        },
        i18n: {
            getMessage: function(key) {
                if (key === '@@bidi_dir') return 'ltr';
                if (key === '@@ui_locale') return currentLocale;
                if (localeMessages[key] && localeMessages[key].message) {
                    return localeMessages[key].message;
                }
                return key;
            },
            getUILanguage: function() {
                return currentLocale;
            }
        },
        storage: {
            local: createStorageArea(false),
            sync: createStorageArea(false),
            session: createStorageArea(true),
            onChanged: {
                addListener: function() {},
                removeListener: function() {}
            }
        },
        tabs: {
            query: function(queryInfo, callback) {
                const now = Date.now();
                const tabs = [
                    { id: 1, title: 'Tree Style History', url: window.location.href, active: true, windowId: 1, favIconUrl: '/images/tree-16.png' },
                    { id: 2, title: 'Google Search - Tree Style History', url: 'https://www.google.com/search?q=tree+style+history', active: false, windowId: 1, lastAccessed: now - 60000 },
                    { id: 3, title: 'GitHub - tumuyan/Tree-Style-History', url: 'https://github.com/tumuyan/Tree-Style-History', active: false, windowId: 1, lastAccessed: now - 180000 },
                    { id: 4, title: 'MDN Web Docs - IndexedDB API', url: 'https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API', active: false, windowId: 1, lastAccessed: now - 360000 }
                ];
                if (callback) setTimeout(() => callback(tabs), 0);
                return Promise.resolve(tabs);
            },
            update: function(tabId, props, callback) {
                if (props && props.url) {
                    window.open(props.url, '_blank');
                }
                if (callback) setTimeout(() => callback({ id: tabId, ...props }), 0);
                return Promise.resolve({ id: tabId, ...props });
            },
            create: function(props, callback) {
                if (props && props.url) {
                    window.open(props.url, '_blank');
                }
                const res = { id: Date.now(), ...props };
                if (callback) setTimeout(() => callback(res), 0);
                return Promise.resolve(res);
            }
        },
        windows: {
            update: function(winId, props, callback) {
                if (callback) setTimeout(() => callback(), 0);
                return Promise.resolve();
            }
        },
        history: {
            search: function(query, callback) {
                const now = Date.now();
                const allItems = [
                    { id: '1', url: 'https://www.google.com/search?q=tree+style+history', title: 'Google Search - Tree Style History', lastVisitTime: now - 3600000 * 4, visitCount: 8, typedCount: 3 },
                    { id: '2', url: 'https://github.com/tumuyan/Tree-Style-History', title: 'GitHub - tumuyan/Tree-Style-History', lastVisitTime: now - 3600000 * 3.8, visitCount: 15, typedCount: 1 },
                    { id: '3', url: 'https://github.com/tumuyan/Tree-Style-History/releases', title: 'Releases · tumuyan/Tree-Style-History', lastVisitTime: now - 3600000 * 3.5, visitCount: 5, typedCount: 0 },
                    { id: '4', url: 'https://github.com/tumuyan/Tree-Style-History/issues', title: 'Issues · tumuyan/Tree-Style-History', lastVisitTime: now - 3600000 * 3.2, visitCount: 4, typedCount: 0 },
                    { id: '5', url: 'https://microsoftedge.microsoft.com/addons/detail/tree-style-history/gfmkhnaldbgcpoddmapciblllofekbpn', title: 'Tree Style History - Microsoft Edge Addons', lastVisitTime: now - 3600000 * 3.0, visitCount: 3, typedCount: 0 },
                    { id: '6', url: 'https://news.ycombinator.com/', title: 'Hacker News', lastVisitTime: now - 3600000 * 2.5, visitCount: 22, typedCount: 10 },
                    { id: '7', url: 'https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API', title: 'IndexedDB API - Web APIs | MDN', lastVisitTime: now - 3600000 * 2.1, visitCount: 12, typedCount: 2 },
                    { id: '8', url: 'https://developer.mozilla.org/en-US/docs/Web/API/IDBObjectStore', title: 'IDBObjectStore - Web APIs | MDN', lastVisitTime: now - 3600000 * 1.8, visitCount: 6, typedCount: 0 },
                    { id: '9', url: 'https://vite.dev/', title: 'Vite | Next Generation Frontend Tooling', lastVisitTime: now - 3600000 * 1.5, visitCount: 9, typedCount: 1 },
                    { id: '10', url: 'https://vite.dev/guide/', title: 'Getting Started | Vite', lastVisitTime: now - 3600000 * 1.2, visitCount: 7, typedCount: 0 },
                    { id: '11', url: 'https://en.wikipedia.org/wiki/Tree_structure', title: 'Tree structure - Wikipedia', lastVisitTime: now - 3600000 * 0.9, visitCount: 4, typedCount: 0 },
                    { id: '12', url: 'https://en.wikipedia.org/wiki/Breadth-first_search', title: 'Breadth-first search - Wikipedia', lastVisitTime: now - 3600000 * 0.6, visitCount: 3, typedCount: 0 },
                    { id: '13', url: 'https://en.wikipedia.org/wiki/Depth-first_search', title: 'Depth-first search - Wikipedia', lastVisitTime: now - 3600000 * 0.3, visitCount: 3, typedCount: 0 }
                ];
                let results = allItems;
                if (query && query.text) {
                    const q = query.text.toLowerCase();
                    results = results.filter(item => item.url.toLowerCase().includes(q) || item.title.toLowerCase().includes(q));
                }
                if (query && query.startTime) {
                    results = results.filter(item => item.lastVisitTime >= query.startTime);
                }
                if (query && query.endTime) {
                    results = results.filter(item => item.lastVisitTime <= query.endTime);
                }
                results.sort((a, b) => b.lastVisitTime - a.lastVisitTime);
                const limit = (query && query.maxResults) ? query.maxResults : 100;
                results = results.slice(0, limit);
                if (callback) setTimeout(() => callback(results), 0);
                return Promise.resolve(results);
            },
            getVisits: function(details, callback) {
                const now = Date.now();
                const visits = [
                    { visitId: '1', visitTime: now - 3600000 * 4, transition: 'typed' }
                ];
                if (callback) setTimeout(() => callback(visits), 0);
                return Promise.resolve(visits);
            },
            deleteUrl: function(details, callback) {
                if (callback) setTimeout(() => callback(), 0);
                return Promise.resolve();
            },
            deleteRange: function(range, callback) {
                if (callback) setTimeout(() => callback(), 0);
                return Promise.resolve();
            }
        },
        sessions: {
            getRecentlyClosed: function(filter, callback) {
                const now = Date.now();
                const sessions = [
                    {
                        lastModified: Math.floor((now - 1000 * 60 * 25) / 1000),
                        tab: {
                            sessionId: 's1',
                            url: 'https://stackoverflow.com/questions/indexeddb-best-practices',
                            title: 'IndexedDB best practices in modern web extensions - Stack Overflow',
                            windowId: 1
                        }
                    },
                    {
                        lastModified: Math.floor((now - 1000 * 60 * 40) / 1000),
                        tab: {
                            sessionId: 's2',
                            url: 'https://css-tricks.com/snippets/css/a-guide-to-flexbox/',
                            title: 'A Complete Guide to Flexbox | CSS-Tricks',
                            windowId: 1
                        }
                    },
                    {
                        lastModified: Math.floor((now - 1000 * 60 * 75) / 1000),
                        tab: {
                            sessionId: 's3',
                            url: 'https://developer.chrome.com/docs/extensions/mv3/intro/',
                            title: 'Welcome to Manifest V3 - Chrome Developers',
                            windowId: 1
                        }
                    }
                ];
                if (callback) setTimeout(() => callback(sessions), 0);
                return Promise.resolve(sessions);
            },
            restore: function(sessionId, callback) {
                if (callback) setTimeout(() => callback({}), 0);
                return Promise.resolve({});
            }
        },
        bookmarks: {
            getTree: function(callback) {
                const now = Date.now();
                const tree = [
                    {
                        id: '0',
                        title: '',
                        children: [
                            {
                                id: '1',
                                title: 'Bookmarks bar',
                                children: [
                                    {
                                        id: '10',
                                        title: 'GitHub - Tree-Style-History',
                                        url: 'https://github.com/tumuyan/Tree-Style-History',
                                        dateAdded: now - 86400000 * 5
                                    },
                                    {
                                        id: '11',
                                        title: 'MDN Web Docs',
                                        url: 'https://developer.mozilla.org',
                                        dateAdded: now - 86400000 * 10
                                    },
                                    {
                                        id: '12',
                                        title: 'Developer Tools',
                                        children: [
                                            {
                                                id: '121',
                                                title: 'Vite Documentation',
                                                url: 'https://vite.dev',
                                                dateAdded: now - 86400000 * 3
                                            },
                                            {
                                                id: '122',
                                                title: 'Chrome Extension Docs (MV3)',
                                                url: 'https://developer.chrome.com/docs/extensions/mv3/',
                                                dateAdded: now - 86400000 * 7
                                            }
                                        ]
                                    },
                                    {
                                        id: '13',
                                        title: 'Hacker News',
                                        url: 'https://news.ycombinator.com',
                                        dateAdded: now - 86400000 * 15
                                    }
                                ]
                            },
                            {
                                id: '2',
                                title: 'Other bookmarks',
                                children: [
                                    {
                                        id: '20',
                                        title: 'Tree structure - Wikipedia',
                                        url: 'https://en.wikipedia.org/wiki/Tree_structure',
                                        dateAdded: now - 86400000 * 2
                                    }
                                ]
                            }
                        ]
                    }
                ];
                if (callback) setTimeout(() => callback(tree), 0);
                return Promise.resolve(tree);
            },
            getRecent: function(count, callback) {
                const now = Date.now();
                const items = [
                    { id: '10', title: 'GitHub - Tree-Style-History', url: 'https://github.com/tumuyan/Tree-Style-History', dateAdded: now - 86400000 * 5 },
                    { id: '11', title: 'MDN Web Docs', url: 'https://developer.mozilla.org', dateAdded: now - 86400000 * 10 },
                    { id: '121', title: 'Vite Documentation', url: 'https://vite.dev', dateAdded: now - 86400000 * 3 },
                    { id: '122', title: 'Chrome Extension Docs (MV3)', url: 'https://developer.chrome.com/docs/extensions/mv3/', dateAdded: now - 86400000 * 7 }
                ].slice(0, count || 10);
                if (callback) setTimeout(() => callback(items), 0);
                return Promise.resolve(items);
            },
            search: function(query, callback) {
                const results = [
                    { id: '10', title: 'GitHub - Tree-Style-History', url: 'https://github.com/tumuyan/Tree-Style-History' },
                    { id: '11', title: 'MDN Web Docs', url: 'https://developer.mozilla.org' }
                ];
                if (callback) setTimeout(() => callback(results), 0);
                return Promise.resolve(results);
            },
            remove: function(id, callback) {
                if (callback) setTimeout(() => callback(), 0);
                return Promise.resolve();
            },
            update: function(id, changes, callback) {
                if (callback) setTimeout(() => callback({ id, ...changes }), 0);
                return Promise.resolve({ id, ...changes });
            }
        }
    };

    // Store in global
    globalObj.chrome = Object.assign(chromeStub, globalObj.chrome || {});

    // Seed tab list snapshot into session storage
    chromeStub.tabs.query({}, function(tabList) {
        chromeStub.storage.session.set({ tabListSnapshot: tabList });
    });

    // Seed IndexedDB testDB
    function seedIndexedDB() {
        if (typeof indexedDB === 'undefined') return;
        try {
            const req = indexedDB.open('testDB', 6);
            req.onupgradeneeded = function(e) {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('VisitItem')) {
                    const vs = db.createObjectStore('VisitItem', { keyPath: 'visitId' });
                    vs.createIndex('url', 'url', { unique: false });
                    vs.createIndex('visitTime', 'visitTime', { unique: false });
                    vs.createIndex('referringVisitId', 'referringVisitId', { unique: false });
                    vs.createIndex('title', 'title', { unique: false });
                    vs.createIndex('transition', 'transition', { unique: false });
                }
                if (!db.objectStoreNames.contains('urls')) {
                    const us = db.createObjectStore('urls', { keyPath: 'id' });
                    us.createIndex('url', 'url', { unique: false });
                    us.createIndex('lastVisitTime', 'lastVisitTime', { unique: false });
                    us.createIndex('title', 'title', { unique: false });
                    us.createIndex('from_to', ['loadfrom', 'loadto'], { unique: false });
                }
                if (!db.objectStoreNames.contains('closed')) {
                    const cs = db.createObjectStore('closed', { keyPath: 'id' });
                    cs.createIndex('url', 'url', { unique: false });
                    cs.createIndex('title', 'title', { unique: false });
                    cs.createIndex('closeTime', 'closeTime', { unique: false });
                    cs.createIndex('close', 'close', { unique: false });
                }
            };
            req.onsuccess = function(e) {
                const db = e.target.result;
                try {
                    const tx = db.transaction(['VisitItem'], 'readwrite');
                    const store = tx.objectStore('VisitItem');
                    const countReq = store.count();
                    countReq.onsuccess = function() {
                        if (countReq.result === 0) {
                            const now = Date.now();
                            const visits = [
                                { visitId: 100, referringVisitId: 0, url: 'https://www.google.com/search?q=tree+style+history', title: 'Google Search - Tree Style History', visitTime: now - 3600000 * 4, transition: 'typed' },
                                { visitId: 101, referringVisitId: 100, url: 'https://github.com/tumuyan/Tree-Style-History', title: 'GitHub - tumuyan/Tree-Style-History: Recent history in tree style', visitTime: now - 3600000 * 3.8, transition: 'link' },
                                { visitId: 102, referringVisitId: 101, url: 'https://github.com/tumuyan/Tree-Style-History/releases', title: 'Releases · tumuyan/Tree-Style-History', visitTime: now - 3600000 * 3.5, transition: 'link' },
                                { visitId: 103, referringVisitId: 101, url: 'https://github.com/tumuyan/Tree-Style-History/issues', title: 'Issues · tumuyan/Tree-Style-History', visitTime: now - 3600000 * 3.2, transition: 'link' },
                                { visitId: 104, referringVisitId: 100, url: 'https://microsoftedge.microsoft.com/addons/detail/tree-style-history/gfmkhnaldbgcpoddmapciblllofekbpn', title: 'Tree Style History - Microsoft Edge Addons', visitTime: now - 3600000 * 3.0, transition: 'link' },
                                { visitId: 200, referringVisitId: 0, url: 'https://news.ycombinator.com/', title: 'Hacker News', visitTime: now - 3600000 * 2.5, transition: 'typed' },
                                { visitId: 201, referringVisitId: 200, url: 'https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API', title: 'IndexedDB API - Web APIs | MDN', visitTime: now - 3600000 * 2.1, transition: 'link' },
                                { visitId: 202, referringVisitId: 201, url: 'https://developer.mozilla.org/en-US/docs/Web/API/IDBObjectStore', title: 'IDBObjectStore - Web APIs | MDN', visitTime: now - 3600000 * 1.8, transition: 'link' },
                                { visitId: 203, referringVisitId: 200, url: 'https://vite.dev/', title: 'Vite | Next Generation Frontend Tooling', visitTime: now - 3600000 * 1.5, transition: 'link' },
                                { visitId: 204, referringVisitId: 203, url: 'https://vite.dev/guide/', title: 'Getting Started | Vite', visitTime: now - 3600000 * 1.2, transition: 'link' },
                                { visitId: 300, referringVisitId: 0, url: 'https://en.wikipedia.org/wiki/Tree_structure', title: 'Tree structure - Wikipedia', visitTime: now - 3600000 * 0.9, transition: 'auto_bookmark' },
                                { visitId: 301, referringVisitId: 300, url: 'https://en.wikipedia.org/wiki/Breadth-first_search', title: 'Breadth-first search - Wikipedia', visitTime: now - 3600000 * 0.6, transition: 'link' },
                                { visitId: 302, referringVisitId: 301, url: 'https://en.wikipedia.org/wiki/Depth-first_search', title: 'Depth-first search - Wikipedia', visitTime: now - 3600000 * 0.3, transition: 'link' }
                            ];
                            for (const v of visits) {
                                store.put(v);
                            }
                        }
                    };
                } catch (err) {
                    console.warn('Error seeding VisitItem', err);
                }

                try {
                    const tx2 = db.transaction(['closed'], 'readwrite');
                    const cStore = tx2.objectStore('closed');
                    const countC = cStore.count();
                    countC.onsuccess = function() {
                        if (countC.result === 0) {
                            const now = Date.now();
                            const closedItems = [
                                { id: 1, url: 'https://stackoverflow.com/questions/indexeddb-best-practices', title: 'IndexedDB best practices in modern web extensions - Stack Overflow', closeTime: now - 1000 * 60 * 25, close: 1, oid: 1 },
                                { id: 2, url: 'https://css-tricks.com/snippets/css/a-guide-to-flexbox/', title: 'A Complete Guide to Flexbox | CSS-Tricks', closeTime: now - 1000 * 60 * 40, close: 1, oid: 1 },
                                { id: 3, url: 'https://developer.chrome.com/docs/extensions/mv3/intro/', title: 'Welcome to Manifest V3 - Chrome Developers', closeTime: now - 1000 * 60 * 75, close: 1, oid: 2 },
                                { id: 4, url: 'https://developer.chrome.com/docs/extensions/reference/storage/', title: 'chrome.storage - Chrome Developers', closeTime: now - 1000 * 60 * 90, close: 1, oid: 2 }
                            ];
                            for (const ci of closedItems) {
                                cStore.put(ci);
                            }
                        }
                    };
                } catch (err) {
                    console.warn('Error seeding closed', err);
                }
            };
        } catch (e) {
            console.warn('IndexedDB seed failed', e);
        }
    }

    seedIndexedDB();
})();
