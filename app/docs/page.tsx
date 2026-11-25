"use client";

import React, { useState, useEffect, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const DB_NAME = "uni_organiser_db";
const DB_VERSION = 1;
const STORE_NAME = "documents";

interface StoredDocument {
  id: string;
  name: string;
  fileName: string;
  mimeType: string;
  size: number;
  updatedAt: string;
  blob: Blob;
}

function openDocsDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB is not available in this environment."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function getAllDocumentsFromDB(): Promise<StoredDocument[]> {
  const db = await openDocsDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
    req.onsuccess = () => {
      const items = (req.result ?? []) as StoredDocument[];
      items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      db.close();
      resolve(items);
    };
  });
}

async function putDocumentInDB(doc: StoredDocument): Promise<void> {
  const db = await openDocsDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(doc);
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
    req.onsuccess = () => {
      db.close();
      resolve();
    };
  });
}

async function deleteDocumentFromDB(id: string): Promise<void> {
  const db = await openDocsDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
    req.onsuccess = () => {
      db.close();
      resolve();
    };
  });
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const idx = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024))
  );
  const val = bytes / Math.pow(1024, idx);
  return `${val >= 10 || idx === 0 ? val.toFixed(0) : val.toFixed(1)} ${units[idx]}`;
}

function isPdfFile(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

function ensurePdfFilename(label: string): string {
  const sanitized = label.trim().replace(/[<>:"/\\|?*]+/g, "_") || "document";
  return sanitized.toLowerCase().endsWith(".pdf")
    ? sanitized
    : `${sanitized}.pdf`;
}

export default function DocsPage() {
  const [docs, setDocs] = useState<StoredDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Add document modal state
  const [addOpen, setAddOpen] = useState(false);
  const [docName, setDocName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Merge documents modal state
  const [mergeOpen, setMergeOpen] = useState(false);
  const [selectedMergeIds, setSelectedMergeIds] = useState<string[]>([]);
  const [mergedFileName, setMergedFileName] = useState("merged-documents");
  const [isMerging, setIsMerging] = useState(false);

  // Replace file input ref
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const [replacingDoc, setReplacingDoc] = useState<StoredDocument | null>(null);

  // In-browser viewer modal state
  const [viewingDoc, setViewingDoc] = useState<StoredDocument | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  async function refreshDocs() {
    try {
      const loaded = await getAllDocumentsFromDB();
      setDocs(loaded);
    } catch (err) {
      console.error("Failed to load documents from IndexedDB:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refreshDocs();
  }, []);

  useEffect(() => {
    if (!viewingDoc) {
      setViewerUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }

    const url = URL.createObjectURL(viewingDoc.blob);
    setViewerUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [viewingDoc]);

  function handleDownloadDoc(doc: StoredDocument) {
    const url = URL.createObjectURL(doc.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = ensurePdfFilename(doc.name);
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleAddDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) return;

    if (!isPdfFile(selectedFile)) {
      setUploadError("Only PDF (.pdf) files are allowed.");
      return;
    }

    setIsSaving(true);
    setUploadError(null);
    try {
      const trimmedName =
        docName.trim() || selectedFile.name.replace(/\.pdf$/i, "");
      const newDoc: StoredDocument = {
        id: crypto.randomUUID(),
        name: trimmedName,
        fileName: selectedFile.name,
        mimeType: "application/pdf",
        size: selectedFile.size,
        updatedAt: new Date().toISOString(),
        blob: selectedFile,
      };

      await putDocumentInDB(newDoc);
      await refreshDocs();

      setDocName("");
      setSelectedFile(null);
      setAddOpen(false);
    } catch (err) {
      console.error("Failed to save document:", err);
      setUploadError("Failed to save PDF to IndexedDB.");
    } finally {
      setIsSaving(false);
    }
  }

  function triggerReplaceFile(doc: StoredDocument) {
    setReplacingDoc(doc);
    replaceInputRef.current?.click();
  }

  async function handleReplaceFileChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !replacingDoc) return;

    if (!isPdfFile(file)) {
      alert("Only PDF (.pdf) files are allowed.");
      setReplacingDoc(null);
      return;
    }

    try {
      const updated: StoredDocument = {
        ...replacingDoc,
        fileName: file.name,
        mimeType: "application/pdf",
        size: file.size,
        updatedAt: new Date().toISOString(),
        blob: file,
      };

      await putDocumentInDB(updated);
      await refreshDocs();
    } catch (err) {
      console.error("Failed to replace document:", err);
    } finally {
      setReplacingDoc(null);
    }
  }

  async function handleRemoveDocument(id: string) {
    try {
      await deleteDocumentFromDB(id);
      if (viewingDoc?.id === id) {
        setViewingDoc(null);
      }
      setSelectedMergeIds((prev) => prev.filter((item) => item !== id));
      await refreshDocs();
    } catch (err) {
      console.error("Failed to remove document:", err);
    }
  }

  function toggleMergeSelection(id: string) {
    setSelectedMergeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function moveMergeOrder(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= selectedMergeIds.length) return;
    setSelectedMergeIds((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  async function handleMergeAndExport() {
    if (selectedMergeIds.length < 2) return;

    setIsMerging(true);
    try {
      const mergedPdf = await PDFDocument.create();

      for (const id of selectedMergeIds) {
        const doc = docs.find((d) => d.id === id);
        if (!doc) continue;

        const arrayBuffer = await doc.blob.arrayBuffer();
        const sourcePdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(
          sourcePdf,
          sourcePdf.getPageIndices()
        );
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedBytes = await mergedPdf.save();
      const pdfBytes = new Uint8Array(mergedBytes);
      const mergedBlob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(mergedBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = ensurePdfFilename(mergedFileName || "merged-documents");
      link.click();
      URL.revokeObjectURL(url);

      setMergeOpen(false);
    } catch (err) {
      console.error("Failed to merge PDFs:", err);
      alert("Failed to merge one or more selected PDFs.");
    } finally {
      setIsMerging(false);
    }
  }

  const filteredDocs = docs.filter((doc) =>
    `${doc.name} ${doc.fileName}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex min-h-svh p-6 w-full">
      <div className="flex w-full gap-2 min-w-0 flex-col leading-loose">
        <div className="flex flex-row items-center justify-between">
          <h1>Documents ({docs.length})</h1>

          <div className="flex flex-row items-center gap-2">
            {/* Upload PDF Modal */}
            <Dialog
              open={addOpen}
              onOpenChange={(open) => {
                setAddOpen(open);
                if (!open) {
                  setUploadError(null);
                  setSelectedFile(null);
                  setDocName("");
                }
              }}
            >
              <DialogTrigger render={<Button>Upload Document</Button>} />
              <DialogContent className="w-[90vw] !max-w-lg sm:!max-w-lg">
                <form
                  onSubmit={handleAddDocument}
                  className="flex flex-col gap-4"
                >
                  <DialogHeader>
                    <DialogTitle>Upload Document</DialogTitle>
                    <DialogDescription>
                      Give your PDF document a name and store it locally in
                      IndexedDB.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="doc-name">Document Name</Label>
                    <Input
                      id="doc-name"
                      type="text"
                      placeholder="e.g., Transcript, Passport Scan, CV"
                      value={docName}
                      onChange={(e) => setDocName(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="doc-file">PDF File</Label>
                    <Input
                      id="doc-file"
                      type="file"
                      accept="application/pdf,.pdf"
                      required
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        if (file && !isPdfFile(file)) {
                          setUploadError("Only PDF (.pdf) files are allowed.");
                          setSelectedFile(null);
                          e.target.value = "";
                          return;
                        }
                        setUploadError(null);
                        setSelectedFile(file);
                        if (file && !docName.trim()) {
                          setDocName(file.name.replace(/\.pdf$/i, ""));
                        }
                      }}
                    />
                    {uploadError && (
                      <p className="text-destructive text-xs">{uploadError}</p>
                    )}
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAddOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={!selectedFile || isSaving}>
                      {isSaving ? "Saving..." : "Save Document"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Merge Documents Modal */}
            <Dialog
              open={mergeOpen}
              onOpenChange={(open) => {
                setMergeOpen(open);
                if (open) {
                  setSelectedMergeIds([]);
                }
              }}
            >
              <DialogTrigger
                render={
                  <Button variant="outline" disabled={docs.length < 2}>
                    Merge Documents
                  </Button>
                }
              />
              <DialogContent className="w-[90vw] !max-w-xl sm:!max-w-xl">
                <DialogHeader>
                  <DialogTitle>Merge Documents</DialogTitle>
                  <DialogDescription>
                    Select two or more PDFs and adjust their order before
                    exporting a single merged PDF.
                  </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="merged-name">Output File Name</Label>
                  <Input
                    id="merged-name"
                    type="text"
                    placeholder="merged-documents"
                    value={mergedFileName}
                    onChange={(e) => setMergedFileName(e.target.value)}
                  />
                </div>

                <div className="-mx-4 no-scrollbar flex max-h-[45vh] flex-col gap-2 overflow-y-auto px-4">
                  {docs.map((doc) => {
                    const orderIdx = selectedMergeIds.indexOf(doc.id);
                    const isSelected = orderIdx !== -1;

                    return (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between gap-3 rounded-md border p-3"
                      >
                        <label className="flex flex-1 cursor-pointer items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleMergeSelection(doc.id)}
                            className="h-4 w-4"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="m-0 truncate text-sm font-medium">
                              {isSelected ? `${orderIdx + 1}. ` : ""}
                              {doc.name}
                            </p>
                            <p className="text-muted-foreground m-0 truncate text-xs">
                              {doc.fileName} • {formatFileSize(doc.size)}
                            </p>
                          </div>
                        </label>

                        {isSelected && (
                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={orderIdx === 0}
                              onClick={() => moveMergeOrder(orderIdx, -1)}
                            >
                              ↑
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={
                                orderIdx === selectedMergeIds.length - 1
                              }
                              onClick={() => moveMergeOrder(orderIdx, 1)}
                            >
                              ↓
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setMergeOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleMergeAndExport}
                    disabled={selectedMergeIds.length < 2 || isMerging}
                  >
                    {isMerging
                      ? "Merging..."
                      : `Merge & Export (${selectedMergeIds.length})`}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <input
          ref={replaceInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={handleReplaceFileChange}
        />

        <Input
          type="text"
          placeholder="Search Documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <div className="flex flex-col gap-4 mt-3">
          {isLoading ? (
            <p className="text-muted-foreground text-sm">
              Loading documents...
            </p>
          ) : filteredDocs.length > 0 ? (
            filteredDocs.map((doc) => (
              <Card className="w-full" key={doc.id}>
                <CardHeader>
                  <CardTitle>{doc.name}</CardTitle>
                  <CardDescription>
                    {doc.fileName} • {formatFileSize(doc.size)} • Updated{" "}
                    {new Date(doc.updatedAt).toLocaleDateString()}
                  </CardDescription>
                  <CardAction>
                    <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      PDF
                    </Badge>
                  </CardAction>
                </CardHeader>

                <CardFooter className="flex flex-row flex-wrap gap-2">
                  <Button onClick={() => setViewingDoc(doc)}>View</Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDownloadDoc(doc)}
                  >
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => triggerReplaceFile(doc)}
                  >
                    Reupload File
                  </Button>

                  <div className="ml-auto flex flex-row gap-4">
                    <Dialog>
                      <DialogTrigger
                        render={<Button variant="destructive">Remove</Button>}
                      />
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Remove {doc.name}?</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to delete {doc.name} (
                            {doc.fileName}) from local storage?
                          </DialogDescription>
                        </DialogHeader>
                        <Button
                          variant="destructive"
                          onClick={() => handleRemoveDocument(doc.id)}
                        >
                          Confirm Remove
                        </Button>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardFooter>
              </Card>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">
              No documents uploaded yet.
            </p>
          )}
        </div>

        {/* In-browser Viewer Modal */}
        <Dialog
          open={Boolean(viewingDoc)}
          onOpenChange={(open) => {
            if (!open) setViewingDoc(null);
          }}
        >
          <DialogContent className="w-[92vw] !max-w-4xl sm:!max-w-4xl">
            <DialogHeader>
              <DialogTitle>{viewingDoc?.name}</DialogTitle>
              <DialogDescription>{viewingDoc?.fileName}</DialogDescription>
            </DialogHeader>

            <div className="h-[65vh] w-full overflow-hidden rounded-md border">
              {viewerUrl && viewingDoc ? (
                <iframe
                  src={viewerUrl}
                  title={viewingDoc.name}
                  className="h-full w-full border-0"
                />
              ) : null}
            </div>

            <DialogFooter>
              {viewingDoc && (
                <Button
                  variant="outline"
                  onClick={() => handleDownloadDoc(viewingDoc)}
                >
                  Download
                </Button>
              )}
              <Button onClick={() => setViewingDoc(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}