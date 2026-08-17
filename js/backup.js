import { db } from "./db.js";
import { APP_VERSION } from "./version.js";

const STORES = ["exercises", "programs", "logs", "bodyweight"];

async function buildBackupPayload() {
  const data = {};
  for (const store of STORES) {
    data[store] = await db.getAll(store);
  }
  return {
    app: "FitTrack",
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

/**
 * Exports all local data as a JSON file. Tries the native share sheet
 * first (lets the user save straight to iCloud Drive, Files, email,
 * AirDrop, etc. — the reliable path on iOS), falling back to a plain
 * browser download if the Web Share API or file sharing isn't
 * available. Returns which path was used so the caller can tailor
 * its confirmation message.
 */
export async function exportBackup() {
  const payload = await buildBackupPayload();
  const json = JSON.stringify(payload, null, 2);
  const filename = `fittrack-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([json], filename, { type: "application/json" });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return "share";
    } catch (err) {
      if (err && err.name === "AbortError") return "cancelled";
      // Fall through to the download fallback on any other failure.
    }
  }

  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return "download";
}

export function readFileAsJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error || new Error("Could not read file"));
    reader.readAsText(file);
  });
}

export function isValidBackupPayload(payload) {
  return Boolean(
    payload &&
      payload.app === "FitTrack" &&
      payload.data &&
      STORES.every((s) => Array.isArray(payload.data[s]))
  );
}

/** Replaces ALL local data with what's in the backup payload. */
export async function restoreBackup(payload) {
  for (const store of STORES) {
    const records = payload.data[store];
    try {
      await db.clear(store);
      if (records.length > 0) {
        await db.putAll(store, records);
      }
    } catch (err) {
      const message = err && err.message ? err.message : String(err);
      throw new Error(`Failed writing "${store}" (${records.length} records): ${message}`);
    }
  }
}
