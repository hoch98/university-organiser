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
            storesData[storeName] = getAllReq.result ?? [];
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
            try {
              store.put(item);
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

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
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