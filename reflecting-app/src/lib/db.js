// ── IndexedDB helpers for Names of Allah app ─────────────────────────────────
const DB_NAME = "AllahNamesDB";
const DB_VERSION = 2;
const REFLECTIONS_STORE = "reflections";
const BOOKMARKS_STORE   = "bookmarks";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(REFLECTIONS_STORE)) {
        const s = db.createObjectStore(REFLECTIONS_STORE, { keyPath: "nameId" });
        s.createIndex("updatedAt", "updatedAt", { unique: false });
      }
      if (!db.objectStoreNames.contains(BOOKMARKS_STORE)) {
        db.createObjectStore(BOOKMARKS_STORE, { keyPath: "nameId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror  = () => reject(req.error);
  });
}

// ── Reflections ───────────────────────────────────────────────────────────────

/** Get a single reflection by nameId. Returns null if not found. */
export async function dbGetReflection(nameId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(REFLECTIONS_STORE, "readonly");
    const req = tx.objectStore(REFLECTIONS_STORE).get(nameId);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror   = () => reject(req.error);
  });
}

/** Save (upsert) a reflection record. */
export async function dbSaveReflection(record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(REFLECTIONS_STORE, "readwrite");
    const req = tx.objectStore(REFLECTIONS_STORE).put({
      ...record,
      updatedAt: new Date().toISOString(),
    });
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

/** Get ALL reflections (for the journal view). */
export async function dbGetAllReflections() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(REFLECTIONS_STORE, "readonly");
    const req = tx.objectStore(REFLECTIONS_STORE).getAll();
    req.onsuccess = () =>
      resolve(req.result.sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1)));
    req.onerror = () => reject(req.error);
  });
}

/** Delete a reflection. */
export async function dbDeleteReflection(nameId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(REFLECTIONS_STORE, "readwrite");
    const req = tx.objectStore(REFLECTIONS_STORE).delete(nameId);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

/** Clear ALL reflections. */
export async function dbClearAll() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(REFLECTIONS_STORE, "readwrite");
    const req = tx.objectStore(REFLECTIONS_STORE).clear();
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

// ── Bookmarks ─────────────────────────────────────────────────────────────────

export async function dbGetAllBookmarks() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(BOOKMARKS_STORE, "readonly");
    const req = tx.objectStore(BOOKMARKS_STORE).getAll();
    req.onsuccess = () => resolve(req.result.map(r => r.nameId));
    req.onerror   = () => reject(req.error);
  });
}

export async function dbToggleBookmark(nameId) {
  const db = await openDB();
  return new Promise(async (resolve, reject) => {
    const tx    = db.transaction(BOOKMARKS_STORE, "readwrite");
    const store = tx.objectStore(BOOKMARKS_STORE);
    const existing = await new Promise((r, e) => {
      const g = store.get(nameId);
      g.onsuccess = () => r(g.result);
      g.onerror   = () => e(g.error);
    });
    const req = existing ? store.delete(nameId) : store.put({ nameId });
    req.onsuccess = () => resolve(!existing);
    req.onerror   = () => reject(req.error);
  });
}
