// Deletion Recovery & Trash Manager for Tree Style History
// Safely stores deleted history items and allows immediate Undo and Recycle Bin restore

import { escapeHtmlText } from './helpers.js';

const STORAGE_KEY = 'tsh-trash-items';
const MAX_TRASH_ITEMS = 500;

/**
 * Retrieve all items from the Trash Bin
 * @returns {Array} List of deleted history items
 */
export function getTrashItems() {
    try {
        const store = typeof localStorage !== 'undefined' ? localStorage : window.localStorage;
        if (!store) return [];
        const raw = store.getItem(STORAGE_KEY);
        if (!raw) return [];
        const items = JSON.parse(raw);
        return Array.isArray(items) ? items : [];
    } catch (e) {
        console.warn('[TrashManager] Failed to read trash items:', e);
        return [];
    }
}

/**
 * Save items into Trash Bin storage
 * @param {Array} items
 */
function saveTrashItems(items) {
    try {
        const store = typeof localStorage !== 'undefined' ? localStorage : window.localStorage;
        if (!store) return;
        const trimmed = items.slice(0, MAX_TRASH_ITEMS);
        store.setItem(STORAGE_KEY, JSON.stringify(trimmed));
        // Broadcast custom event for any open UI
        window.dispatchEvent(new CustomEvent('tsh-trash-updated', { detail: { count: trimmed.length } }));
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'tsh-trash-updated', count: trimmed.length }, '*');
        }
    } catch (e) {
        console.warn('[TrashManager] Failed to save trash items:', e);
    }
}

/**
 * Move history item(s) to the Trash Bin and show Undo prompt
 * @param {Object|Array} records Single item or array of items to delete
 * @param {string} source Deletion origin ('tree', 'linear', 'range', 'popup')
 * @returns {Array} Newly deleted items in trash
 */
export function moveToTrash(records, source = 'general') {
    const list = Array.isArray(records) ? records : [records];
    if (list.length === 0) return [];

    const now = Date.now();
    const existing = getTrashItems();

    const newTrashEntries = list.map((item, idx) => ({
        id: 'trash_' + now + '_' + idx + '_' + Math.random().toString(36).slice(2, 6),
        deletedAt: now,
        title: item.title || item.name || item.url || 'Untitled',
        url: item.url || item.t || '',
        visitTime: item.visitTime || item.time || now,
        visitId: item.visitId || item.id || null,
        referringVisitId: item.referringVisitId || item.pId || 0,
        transition: item.transition || 'link',
        source: source
    }));

    const combined = [...newTrashEntries, ...existing];
    saveTrashItems(combined);

    return newTrashEntries;
}

/**
 * Restore an individual item from Trash back to History / IndexedDB
 * @param {string} trashId
 * @returns {Promise<Object|null>} Restored record
 */
export async function restoreTrashItem(trashId) {
    const items = getTrashItems();
    const idx = items.findIndex((it) => it.id === trashId);
    if (idx === -1) return null;

    const [item] = items.splice(idx, 1);
    saveTrashItems(items);

    // 1. Restore to IndexedDB if dbManager is available
    if (typeof dbManager !== 'undefined' && dbManager.getDB) {
        try {
            const db = await dbManager.getDB();
            if (db.objectStoreNames.contains('VisitItem')) {
                const tx = db.transaction(['VisitItem'], 'readwrite');
                const store = tx.objectStore('VisitItem');
                store.put({
                    visitId: item.visitId || Date.now(),
                    referringVisitId: item.referringVisitId || 0,
                    title: item.title,
                    url: item.url,
                    visitTime: item.visitTime || Date.now(),
                    transition: item.transition || 'link'
                });
            }
        } catch (e) {
            console.warn('[TrashManager] IndexedDB restore warning:', e);
        }
    }

    // 2. Restore to browser chrome.history if polyfill or native chrome API exists
    if (typeof chrome !== 'undefined' && chrome.history && chrome.history.addUrl && item.url) {
        try {
            chrome.history.addUrl({ url: item.url });
        } catch {
            // Ignore
        }
    }

    // Broadcast reload event
    window.dispatchEvent(new CustomEvent('tsh-history-restored', { detail: item }));
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'tsh-history-restored', item }, '*');
    }

    return item;
}

/**
 * Restore multiple items or all items from Trash
 * @param {Array<string>} [trashIds] If omitted, restores everything
 * @returns {Promise<number>} Number of restored records
 */
export async function restoreAllTrash(trashIds) {
    const items = getTrashItems();
    if (items.length === 0) return 0;

    let toRestore = [];
    let remaining = [];

    if (Array.isArray(trashIds) && trashIds.length > 0) {
        const idSet = new Set(trashIds);
        for (const it of items) {
            if (idSet.has(it.id)) toRestore.push(it);
            else remaining.push(it);
        }
    } else {
        toRestore = [...items];
        remaining = [];
    }

    saveTrashItems(remaining);

    if (toRestore.length > 0 && typeof dbManager !== 'undefined' && dbManager.getDB) {
        try {
            const db = await dbManager.getDB();
            if (db.objectStoreNames.contains('VisitItem')) {
                const tx = db.transaction(['VisitItem'], 'readwrite');
                const store = tx.objectStore('VisitItem');
                for (const it of toRestore) {
                    store.put({
                        visitId: it.visitId || Date.now(),
                        referringVisitId: it.referringVisitId || 0,
                        title: it.title,
                        url: it.url,
                        visitTime: it.visitTime || Date.now(),
                        transition: it.transition || 'link'
                    });
                }
            }
        } catch (e) {
            console.warn('[TrashManager] Batch restore warning:', e);
        }
    }

    // Broadcast reload
    window.dispatchEvent(new CustomEvent('tsh-history-restored', { detail: { count: toRestore.length } }));
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'tsh-history-restored', count: toRestore.length }, '*');
    }

    return toRestore.length;
}

/**
 * Permanently remove an item from the Trash Bin
 * @param {string} trashId
 */
export function deleteTrashPermanently(trashId) {
    const items = getTrashItems();
    const filtered = items.filter((it) => it.id !== trashId);
    saveTrashItems(filtered);
    return true;
}

/**
 * Empty the entire Trash Bin permanently
 */
export function emptyTrash() {
    saveTrashItems([]);
    return true;
}

/**
 * Displays an interactive Undo Toast banner
 * @param {string} text Message text (e.g. "Deleted 5 items")
 * @param {Function} onUndo Callback executed when user clicks Undo
 * @param {number} [durationMs=8000]
 */
export function showUndoToast(text, onUndo, durationMs = 8000) {
    let container = document.getElementById('tsh-undo-toast');
    if (!container) {
        container = document.createElement('div');
        container.id = 'tsh-undo-toast';
        container.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 99999;
            background: #0f172a;
            color: #f8fafc;
            border: 1px solid #334155;
            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5), 0 8px 10px -6px rgba(0,0,0,0.3);
            border-radius: 8px;
            padding: 12px 18px;
            display: flex;
            align-items: center;
            gap: 14px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 13px;
            transition: opacity 0.3s, transform 0.3s;
            max-width: 420px;
        `;
        document.body.appendChild(container);
    }

    const currentLang = (typeof localStorage !== 'undefined' && localStorage.getItem('tsh-lang')) || 'th';
    const undoLabel = currentLang === 'th' ? '↩ กู้คืน (Undo)' : (currentLang === 'zh_CN' ? '↩ 撤销' : '↩ Undo');

    container.innerHTML = `
        <span style="display:flex; align-items:center; gap:6px;">
            <span>🗑️</span>
            <span>${escapeHtmlText(text)}</span>
        </span>
        <button type="button" id="tsh-btn-undo" style="
            background: #2563eb;
            color: white;
            border: none;
            padding: 5px 12px;
            border-radius: 4px;
            font-weight: 550;
            cursor: pointer;
            font-size: 12px;
            white-space: nowrap;
        ">${undoLabel}</button>
        <button type="button" id="tsh-btn-toast-close" style="
            background: transparent;
            color: #94a3b8;
            border: none;
            cursor: pointer;
            font-size: 14px;
            padding: 2px 4px;
        ">✕</button>
    `;

    container.style.opacity = '1';
    container.style.transform = 'translateY(0)';
    container.style.display = 'flex';

    let timer = null;

    const closeToast = () => {
        if (timer) clearTimeout(timer);
        container.style.opacity = '0';
        container.style.transform = 'translateY(10px)';
        setTimeout(() => { container.style.display = 'none'; }, 300);
    };

    const undoBtn = container.querySelector('#tsh-btn-undo');
    if (undoBtn) {
        undoBtn.onclick = async () => {
            closeToast();
            if (onUndo) await onUndo();
        };
    }

    const closeBtn = container.querySelector('#tsh-btn-toast-close');
    if (closeBtn) {
        closeBtn.onclick = closeToast;
    }

    timer = setTimeout(closeToast, durationMs);
}

/**
 * Open parent window's Deletion Recovery modal
 */
export function openParentTrashModal() {
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'tsh-open-trash' }, '*');
    }
}
