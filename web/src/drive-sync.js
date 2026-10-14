// Google Drive Backup & Sync for Tree Style History
// Integrates Firebase Auth with Google Drive v3 API

import { initializeApp } from 'firebase/app';
import {
    getAuth,
    signInWithPopup,
    GoogleAuthProvider,
    onAuthStateChanged,
    signOut
} from 'firebase/auth';

let app = null;
let auth = null;
let provider = null;
let cachedAccessToken = null;
let currentUser = null;
let isSigningIn = false;

// Initialize Firebase Auth
export async function initFirebase(config) {
    if (!config) {
        try {
            const resp = await fetch('/firebase-applet-config.json');
            config = await resp.json();
        } catch (e) {
            console.error('[DriveSync] Could not load firebase-applet-config.json', e);
            return null;
        }
    }

    if (!app) {
        app = initializeApp(config);
        auth = getAuth(app);
        provider = new GoogleAuthProvider();
        provider.addScope('https://www.googleapis.com/auth/drive.file');
        provider.setCustomParameters({
            prompt: 'consent select_account',
            access_type: 'offline'
        });
    }

    return auth;
}

export function initAuthListener(onSuccess, onSignOut) {
    if (!auth) return () => {};
    return onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        if (user) {
            if (cachedAccessToken) {
                if (onSuccess) onSuccess(user, cachedAccessToken);
            } else if (!isSigningIn) {
                // If token expired or reloaded, user can click to reconnect
                if (onSuccess) onSuccess(user, null);
            }
        } else {
            cachedAccessToken = null;
            currentUser = null;
            if (onSignOut) onSignOut();
        }
    });
}

export async function signInWithGoogle(forceConsent = true) {
    if (!auth || !provider) {
        await initFirebase();
    }
    try {
        isSigningIn = true;
        provider.setCustomParameters({
            prompt: forceConsent ? 'consent select_account' : 'select_account',
            access_type: 'offline'
        });
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (!credential?.accessToken) {
            throw new Error('No access token returned from Google Sign-In.');
        }
        cachedAccessToken = credential.accessToken;
        currentUser = result.user;
        return { user: result.user, accessToken: cachedAccessToken };
    } catch (err) {
        console.error('[DriveSync] Sign-in failed:', err);
        throw err;
    } finally {
        isSigningIn = false;
    }
}

export async function signOutGoogle() {
    if (auth) {
        try {
            await signOut(auth);
        } catch (e) {
            console.warn('[DriveSync] Sign-out warning:', e);
        }
    }
    cachedAccessToken = null;
    currentUser = null;
}

export function getAccessToken() {
    return cachedAccessToken;
}

export function getCurrentUser() {
    return currentUser;
}

// ---------------------------------------------------------------------------
// IndexedDB and LocalStorage Backup Helpers
// ---------------------------------------------------------------------------

function openIndexedDB() {
    return new Promise((resolve, reject) => {
        const idb = typeof indexedDB !== 'undefined' ? indexedDB : window.indexedDB;
        if (!idb) return reject(new Error('IndexedDB not supported in this environment'));
        const req = idb.open('testDB', 6);
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = (e) => reject(e);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('VisitItem')) {
                db.createObjectStore('VisitItem', { keyPath: 'visitId' });
            }
            if (!db.objectStoreNames.contains('urls')) {
                db.createObjectStore('urls', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('closed')) {
                db.createObjectStore('closed', { keyPath: 'id' });
            }
        };
    });
}

function getAllFromStore(db, storeName) {
    return new Promise((resolve) => {
        if (!db.objectStoreNames.contains(storeName)) {
            return resolve([]);
        }
        try {
            const tx = db.transaction([storeName], 'readonly');
            const store = tx.objectStore(storeName);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
        } catch (e) {
            console.warn(`[DriveSync] Error reading ${storeName}:`, e);
            resolve([]);
        }
    });
}

function putAllToStore(db, storeName, records) {
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

/**
 * Gather complete backup package (IndexedDB history + localStorage settings)
 */
export async function exportAllData() {
    const db = await openIndexedDB();
    const visits = await getAllFromStore(db, 'VisitItem');
    const urls = await getAllFromStore(db, 'urls');
    const closed = await getAllFromStore(db, 'closed');
    db.close();

    // Collect settings
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
    } catch (e) {
        console.warn('[DriveSync] localStorage export warning:', e);
    }

    const payload = {
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

    return payload;
}

/**
 * Restore complete backup package into IndexedDB and settings
 */
export async function importAllData(payload) {
    if (!payload || !payload.data) {
        throw new Error('Invalid backup file format: missing payload data.');
    }

    const db = await openIndexedDB();
    const { VisitItem, urls, closed, settings } = payload.data;

    let restoredVisits = 0;
    let restoredUrls = 0;
    let restoredClosed = 0;

    if (Array.isArray(VisitItem) && VisitItem.length > 0) {
        await putAllToStore(db, 'VisitItem', VisitItem);
        restoredVisits = VisitItem.length;
    }
    if (Array.isArray(urls) && urls.length > 0) {
        await putAllToStore(db, 'urls', urls);
        restoredUrls = urls.length;
    }
    if (Array.isArray(closed) && closed.length > 0) {
        await putAllToStore(db, 'closed', closed);
        restoredClosed = closed.length;
    }
    db.close();

    // Restore settings
    if (settings && typeof settings === 'object') {
        try {
            const store = typeof localStorage !== 'undefined' ? localStorage : window.localStorage;
            if (store) {
                for (const [k, v] of Object.entries(settings)) {
                    if (v !== null && v !== undefined && !k.startsWith('firebase:')) {
                        store.setItem(k, String(v));
                    }
                }
            }
        } catch (e) {
            console.warn('[DriveSync] localStorage restore warning:', e);
        }
    }

    // Broadcast reload event to window and parent
    try {
        window.dispatchEvent(new CustomEvent('tsh-backup-restored', { detail: payload.stats }));
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'tsh-backup-restored', stats: payload.stats }, '*');
        }
    } catch (e) {
        // Ignore
    }

    return {
        success: true,
        restoredVisits,
        restoredUrls,
        restoredClosed
    };
}

// ---------------------------------------------------------------------------
// Google Drive API v3 Calls
// ---------------------------------------------------------------------------

/**
 * Upload backup payload to Google Drive
 */
export async function uploadBackupToDrive() {
    let token = getAccessToken();
    if (!token) {
        const res = await signInWithGoogle();
        token = res.accessToken;
    }

    const payload = await exportAllData();
    const dateStr = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const fileName = `tree-style-history-backup-${dateStr}.json`;
    const fileContent = JSON.stringify(payload, null, 2);

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
        name: fileName,
        mimeType: 'application/json',
        description: `Tree Style History backup created on ${new Date().toLocaleString()} (${payload.stats.visitsCount} visits)`
    };

    const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        fileContent +
        closeDelimiter;

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartRequestBody
    });

    if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 403 || errorText.includes('insufficientPermissions') || errorText.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT')) {
            cachedAccessToken = null;
            const scopeErr = new Error('Insufficient Google Drive permissions (403). Please re-authorize and check the box to grant Google Drive file access.');
            scopeErr.code = 403;
            scopeErr.isScopeError = true;
            scopeErr.raw = errorText;
            throw scopeErr;
        }
        throw new Error(`Google Drive upload failed (${response.status}): ${errorText}`);
    }

    const uploadedFile = await response.json();
    return {
        file: uploadedFile,
        fileName,
        stats: payload.stats
    };
}

/**
 * List existing Tree Style History backups in Google Drive
 */
export async function listDriveBackups() {
    let token = getAccessToken();
    if (!token) {
        const res = await signInWithGoogle(true);
        token = res.accessToken;
    }

    const query = encodeURIComponent("name contains 'tree-style-history-backup' and trashed = false");
    const fields = encodeURIComponent('files(id,name,size,createdTime,modifiedTime,description)');
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&spaces=drive&orderBy=modifiedTime%20desc&pageSize=20`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        const err = await response.text();
        if (response.status === 403 || err.includes('insufficientPermissions') || err.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT')) {
            cachedAccessToken = null;
            const scopeErr = new Error('Insufficient Google Drive permissions (403). Please re-authorize and check the box to grant Google Drive file access.');
            scopeErr.code = 403;
            scopeErr.isScopeError = true;
            scopeErr.raw = err;
            throw scopeErr;
        }
        throw new Error(`Failed to list Google Drive files: ${err}`);
    }

    const data = await response.json();
    return data.files || [];
}

/**
 * Download a backup file from Google Drive and restore it
 */
export async function restoreBackupFromDrive(fileId) {
    let token = getAccessToken();
    if (!token) {
        const res = await signInWithGoogle(true);
        token = res.accessToken;
    }

    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        const err = await response.text();
        if (response.status === 403 || err.includes('insufficientPermissions') || err.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT')) {
            cachedAccessToken = null;
            const scopeErr = new Error('Insufficient Google Drive permissions (403). Please re-authorize and check the box to grant Google Drive file access.');
            scopeErr.code = 403;
            scopeErr.isScopeError = true;
            scopeErr.raw = err;
            throw scopeErr;
        }
        throw new Error(`Failed to download backup from Google Drive: ${err}`);
    }

    const payload = await response.json();
    const result = await importAllData(payload);
    return { result, payload };
}

/**
 * Delete a backup from Google Drive
 */
export async function deleteBackupFromDrive(fileId) {
    let token = getAccessToken();
    if (!token) {
        const res = await signInWithGoogle(true);
        token = res.accessToken;
    }

    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok && response.status !== 204) {
        const err = await response.text();
        if (response.status === 403 || err.includes('insufficientPermissions') || err.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT')) {
            cachedAccessToken = null;
            const scopeErr = new Error('Insufficient Google Drive permissions (403). Please re-authorize and check the box to grant Google Drive file access.');
            scopeErr.code = 403;
            scopeErr.isScopeError = true;
            scopeErr.raw = err;
            throw scopeErr;
        }
        throw new Error(`Failed to delete backup: ${err}`);
    }

    return true;
}

// ---------------------------------------------------------------------------
// Local File JSON Export / Import
// ---------------------------------------------------------------------------

export async function exportLocalBackup() {
    const payload = await exportAllData();
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

export function importLocalBackup(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const payload = JSON.parse(e.target.result);
                const result = await importAllData(payload);
                resolve({ result, payload });
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file.'));
        reader.readAsText(file);
    });
}

// Mount to window for global access
if (typeof window !== 'undefined') {
    window.GoogleDriveSync = {
        initFirebase,
        initAuthListener,
        signInWithGoogle,
        signOutGoogle,
        getAccessToken,
        getCurrentUser,
        exportAllData,
        importAllData,
        uploadBackupToDrive,
        listDriveBackups,
        restoreBackupFromDrive,
        deleteBackupFromDrive,
        exportLocalBackup,
        importLocalBackup
    };
}
