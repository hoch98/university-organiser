"use client";

import React, { useRef, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const pages = {
  Universities: "/unis",
  Documents: "/docs",
};

interface BackupPayload {
  version: 1;
  exportedAt: string;
  localStorage: Record<string, string>;
  indexedDB: Record<
    string,
    {
      version: number;
      stores: Record<string, unknown[]>;
    }
  >;
}

function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function encodeRecordForBackup(value: unknown): unknown {
  if (value instanceof Uint8Array) {
    return { __base64: bytesToBase64(value) };
  }

  if (ArrayBuffer.isView(value)) {
    const view = new Uint8Array(
      value.buffer,
      value.byteOffset,
      value.byteLength
    );
    return { __base64: bytesToBase64(view) };
  }

  if (value instanceof ArrayBuffer) {
    return { __base64: bytesToBase64(new Uint8Array(value)) };
  }

  if (Array.isArray(value)) {
    return value.map(encodeRecordForBackup);
  }

  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      // Skip legacy Blob fields that serialize as {}
      if (v instanceof Blob) continue;
      out[k] = encodeRecordForBackup(v);
    }
    return out;
  }

  return value;
}

function decodeRecordFromBackup(value: unknown): unknown {
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;

    if (typeof obj.__base64 === "string") {
      return base64ToBytes(obj.__base64);
    }

    if (Array.isArray(value)) {
      return value.map(decodeRecordFromBackup);
    }

    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === "bytes" && v && typeof v === "object" && !Array.isArray(v)) {
        const inner = v as Record<string, unknown>;
        if (typeof inner.__base64 === "string") {
          out[k] = base64ToBytes(inner.__base64);
          continue;
        }
        // Backwards compatibility for legacy numeric-keyed Uint8Array objects
        const numericValues = Object.values(inner);
        if (
          numericValues.length > 0 &&
          typeof numericValues[0] === "number"
        ) {
          out[k] = new Uint8Array(numericValues as number[]);
          continue;
        }
      }
      out[k] = decodeRecordFromBackup(v);
    }
    return out;
  }

  return value;
}

async function dumpAllIndexedDB(): Promise<BackupPayload["indexedDB"]> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return {};
  }

  const databasesFn = (
    indexedDB as IDBFactory & {
      databases?: () => Promise<Array<{ name?: string; version?: number }>>;
    }
  ).databases;

  if (typeof databasesFn !== "function") {
    return {};
  }

  const dbInfos = await databasesFn.call(indexedDB);
  const result: BackupPayload["indexedDB"] = {};

  for (const info of dbInfos) {
    if (!info.name) continue;
    const dbName = info.name;

    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open(dbName);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result;
        const storeNames = Array.from(db.objectStoreNames);
        if (storeNames.length === 0) {
          result[dbName] = { version: db.version, stores: {} };
          db.close();
          resolve();
          return;
        }

        const tx = db.transaction(storeNames, "readonly");
        const storesData: Record<string, unknown[]> = {};
        let completed = 0;

        for (const storeName of storeNames) {
          const store = tx.objectStore(storeName);
          const getAllReq = store.getAll();
          getAllReq.onsuccess = () => {
            const rawRecords = getAllReq.result ?? [];
            storesData[storeName] = rawRecords.map(encodeRecordForBackup);
            completed += 1;
            if (completed === storeNames.length) {
              result[dbName] = { version: db.version, stores: storesData };
              db.close();
              resolve();
            }
          };
          getAllReq.onerror = () => {
            db.close();
            reject(getAllReq.error);
          };
        }
      };
    });
  }

  return result;
}

async function restoreAllIndexedDB(
  dump: BackupPayload["indexedDB"] | undefined
): Promise<void> {
  if (!dump || typeof window === "undefined" || !("indexedDB" in window)) {
    return;
  }

  for (const [dbName, dbSpec] of Object.entries(dump)) {
    const targetVersion = Math.max(1, Number(dbSpec.version) || 1);
    const storeEntries = Object.entries(dbSpec.stores ?? {});

    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open(dbName, targetVersion);
      req.onerror = () => reject(req.error);

      req.onupgradeneeded = () => {
        const db = req.result;
        for (const [storeName] of storeEntries) {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { autoIncrement: true });
          }
        }
      };

      req.onsuccess = () => {
        const db = req.result;
        const existingStores = Array.from(db.objectStoreNames);
        const toPopulate = storeEntries.filter(([name]) =>
          existingStores.includes(name)
        );

        if (toPopulate.length === 0) {
          db.close();
          resolve();
          return;
        }

        const tx = db.transaction(
          toPopulate.map(([name]) => name),
          "readwrite"
        );
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };

        for (const [storeName, records] of toPopulate) {
          const store = tx.objectStore(storeName);
          store.clear();
          for (const item of records ?? []) {
            const decodedItem = decodeRecordFromBackup(item);
            try {
              store.put(decodedItem);
            } catch {
              // Skip records whose inline keyPath doesn't match auto-generated keys
            }
          }
        }
      };
    });
  }
}

export function AppSidebar() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function handleExport() {
    setIsBusy(true);
    setStatusMessage(null);
    try {
      const lsData: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key !== null) {
          lsData[key] = localStorage.getItem(key) ?? "";
        }
      }

      const idbData = await dumpAllIndexedDB();

      const payload: BackupPayload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        localStorage: lsData,
        indexedDB: idbData,
      };

      const blob = new Blob([JSON.stringify(payload)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `uni-organiser-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setStatusMessage("Exported localStorage & IndexedDB.");
    } catch (err) {
      console.error("Export failed:", err);
      setStatusMessage("Export failed.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsBusy(true);
    setStatusMessage(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<BackupPayload>;

      if (parsed.localStorage && typeof parsed.localStorage === "object") {
        for (const [key, value] of Object.entries(parsed.localStorage)) {
          localStorage.setItem(key, String(value));
        }
      }

      await restoreAllIndexedDB(parsed.indexedDB);
      setStatusMessage("Imported backup. Refreshing...");
      window.location.reload();
    } catch (err) {
      console.error("Import failed:", err);
      setStatusMessage("Invalid backup file.");
      setIsBusy(false);
    }
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <a style={{ textAlign: "center" }} href="/">
          Uni Organiser
        </a>
      </SidebarHeader>
      <SidebarContent>
        {Object.keys(pages).map((obj) => {
          return (
            <SidebarMenuButton
              key={obj}
              render={<a href={pages[obj as keyof typeof pages]} />}
            >
              <span>{obj}</span>
            </SidebarMenuButton>
          );
        })}
      </SidebarContent>
      <SidebarFooter className="flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleImportFile}
        />
        <div className="flex flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleExport}
            disabled={isBusy}
          >
            Export
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy}
          >
            Import
          </Button>
        </div>
        {statusMessage && (
          <p className="text-muted-foreground m-0 text-xs">{statusMessage}</p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}