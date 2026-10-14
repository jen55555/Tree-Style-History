// Backup Helper for Tree Style History pages (Options & History views)
// Interacts with IndexedDB, localStorage, and parent Google Drive sync

function openDB() {
    return new Promise((resolve, reject) => {
        const idb = typeof indexedDB !== 'undefined' ? indexedDB : window.indexedDB;
        if (!idb) return reject(new Error('IndexedDB not supported'));
        const req = idb.open('testDB', 6);
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = (e) => reject(e);
    });
}

function getAllRecords(db, storeName) {
    return new Promise((resolve) => {
        if (!db.objectStoreNames.contains(storeName)) return resolve([]);
        try {
            const tx = db.transaction([storeName], 'readonly');
            const store = tx.objectStore(storeName);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
        } catch {
            resolve([]);
        }
    });
}

function putAllRecords(db, storeName, records) {
    return new Promise((resolve, reject) => {
        if (!records || records.length === 0) return resolve();
        if (!db.objectStoreNames.contains(storeName)) return resolve();
        try {
            const tx = db.transaction([storeName], 'readwrite');
            const store = tx.objectStore(storeName);
            for (const r of records) {
                store.put(r);
            }
            tx.oncomplete = () => resolve();
            tx.onerror = (e) => reject(e);
            tx.onabort = (e) => reject(e);
        } catch (e) {
            reject(e);
        }
    });
}

export async function gatherBackupPayload() {
    const db = await openDB();
    const visits = await getAllRecords(db, 'VisitItem');
    const urls = await getAllRecords(db, 'urls');
    const closed = await getAllRecords(db, 'closed');
    db.close();

    const settings = {};
    try {
        const store = typeof localStorage !== 'undefined' ? localStorage : window.localStorage;
        if (store) {
            for (let i = 0; i < store.length; i++) {
                const k = store.key(i);
                if (k && !k.startsWith('firebase:') && !k.startsWith('@@')) {
                    settings[k] = store.getItem(k);
                }
            }
        }
    } catch {
        // Ignore
    }

    return {
        app: 'Tree Style History',
        version: 1,
        exportedAt: new Date().toISOString(),
        timestamp: Date.now(),
        stats: {
            visitsCount: visits.length,
            urlsCount: urls.length,
            closedCount: closed.length
        },
        data: {
            VisitItem: visits,
            urls: urls,
            closed: closed,
            settings: settings
        }
    };
}

export async function restoreBackupPayload(payload) {
    if (!payload || !payload.data) {
        throw new Error('Invalid backup file payload format');
    }

    const db = await openDB();
    const { VisitItem, urls, closed, settings } = payload.data;

    if (Array.isArray(VisitItem) && VisitItem.length > 0) {
        await putAllRecords(db, 'VisitItem', VisitItem);
    }
    if (Array.isArray(urls) && urls.length > 0) {
        await putAllRecords(db, 'urls', urls);
    }
    if (Array.isArray(closed) && closed.length > 0) {
        await putAllRecords(db, 'closed', closed);
    }
    db.close();

    if (settings && typeof settings === 'object') {
        const store = typeof localStorage !== 'undefined' ? localStorage : window.localStorage;
        if (store) {
            for (const [k, v] of Object.entries(settings)) {
                if (v !== null && v !== undefined && !k.startsWith('firebase:')) {
                    store.setItem(k, String(v));
                }
            }
        }
    }

    return payload.stats || {};
}

export async function downloadLocalJson() {
    const payload = await gatherBackupPayload();
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `tree-style-history-backup-${dateStr}.json`;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 200);
    return { fileName, stats: payload.stats };
}

export function readAndRestoreJsonFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const payload = JSON.parse(e.target.result);
                const stats = await restoreBackupPayload(payload);
                resolve({ stats, payload });
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

export function openParentDriveModal() {
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'tsh-open-backup' }, '*');
    }
}
