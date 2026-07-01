export type HistoryRecord = {
  id: string;
  timestamp: number;
  peakFreq: number;
  loudnessDb: number;
  confidence: number;
  aiLabel: string | null;
  feedback?: "false_positive" | null;
};

const DB_NAME = "siren-watch";
const STORE_NAME = "detections";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function addDetection(
  record: Omit<HistoryRecord, "id" | "timestamp"> & {
    id?: string;
    timestamp?: number;
  }
): Promise<HistoryRecord> {
  const entry: HistoryRecord = {
    id: record.id ?? crypto.randomUUID(),
    timestamp: record.timestamp ?? Date.now(),
    peakFreq: record.peakFreq,
    loudnessDb: record.loudnessDb,
    confidence: record.confidence,
    aiLabel: record.aiLabel,
  };

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(entry);
    tx.oncomplete = () => {
      db.close();
      resolve(entry);
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function getRecentDetections(
  limit = 50
): Promise<HistoryRecord[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("timestamp");
    const request = index.openCursor(null, "prev");
    const results: HistoryRecord[] = [];

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor && results.length < limit) {
        results.push(cursor.value as HistoryRecord);
        cursor.continue();
      }
    };
    tx.oncomplete = () => {
      db.close();
      resolve(results);
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearDetections(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function markFalsePositive(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const record = getReq.result as HistoryRecord | undefined;
      if (!record) {
        resolve();
        return;
      }
      store.put({ ...record, feedback: "false_positive" });
    };
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export function exportHistoryCsv(records: HistoryRecord[]): string {
  const header = "timestamp,peak_hz,loudness_db,confidence,ai_label,feedback";
  const rows = records.map((r) => {
    const label = r.aiLabel ? `"${r.aiLabel.replace(/"/g, '""')}"` : "";
    return [
      new Date(r.timestamp).toISOString(),
      r.peakFreq,
      r.loudnessDb,
      r.confidence.toFixed(3),
      label,
      r.feedback ?? "",
    ].join(",");
  });
  return [header, ...rows].join("\n");
}

export function downloadCsv(records: HistoryRecord[], filename?: string) {
  const csv = exportHistoryCsv(records);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    filename ?? `siren-watch-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
