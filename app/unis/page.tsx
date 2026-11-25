"use client";

import React, { useState, useEffect } from "react";
import {
  pdf,
  Document,
  Page as PdfPage,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardFooter,
} from "@/components/ui/card";
import { University } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { renderRichHtmlToPdfNodes } from "@/lib/renderer";
import ViewDetailsModal from "./components/ViewDetailsModal";
import EditSupplementalsModal from "./components/EditSupplementalsModal";
import AddUniversityModal from "./components/AddUniversityModal";

const allUniversitiesPdfStyles = StyleSheet.create({
  page: {
    padding: 64,
    fontSize: 11,
    lineHeight: 1.5,
    fontFamily: "Helvetica",
  },
  docTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  universitySection: {
    marginBottom: 24,
    paddingBottom: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: "#cbd5e1",
  },
  universityHeading: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 30,
  },
  universityMeta: {
    fontSize: 10,
    color: "#6b7280",
    marginBottom: 12,
  },
  questionBlock: {
    marginBottom: 14,
    paddingLeft: 6,
  },
  questionText: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 11,
    color: "#6b7280",
    fontStyle: "italic",
  },
});

function getTodayDeadlineNumber(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return Number(`${year}${month}${day}`);
}

function parseDeadlineNumber(input: string): number | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length !== 8) return null;

  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const checkDate = new Date(Date.UTC(year, month - 1, day));
  if (
    checkDate.getUTCFullYear() !== year ||
    checkDate.getUTCMonth() !== month - 1 ||
    checkDate.getUTCDate() !== day
  ) {
    return null;
  }

  return Number(digits);
}

function formatDeadline(deadline?: number): string {
  const target =
    typeof deadline === "number" && Number.isFinite(deadline)
      ? deadline
      : getTodayDeadlineNumber();
  const str = String(Math.trunc(target));
  if (str.length !== 8) return str;

  const year = Number(str.slice(0, 4));
  const month = Number(str.slice(4, 6));
  const day = Number(str.slice(6, 8));

  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return str;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function Page() {
  const [universities, setUniversities] = useState<Array<University>>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isExportingAll, setIsExportingAll] = useState(false);

  const [editingDeadlineFor, setEditingDeadlineFor] = useState<string | null>(
    null
  );
  const [deadlineDraft, setDeadlineDraft] = useState<string>("");
  const [deadlineError, setDeadlineError] = useState<string | null>(null);

  const statusButtonClasses: Record<string, string> = {
    Considering:
      "bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950 dark:text-purple-300 dark:hover:bg-purple-900",
    Applying:
      "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900",
    Applied:
      "bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950 dark:text-green-300 dark:hover:bg-green-900",
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem("university_list");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const todayNum = getTodayDeadlineNumber();
          const normalized: University[] = parsed.map((uni: University) => ({
            ...uni,
            deadline:
              typeof uni.deadline === "number" && Number.isFinite(uni.deadline)
                ? uni.deadline
                : todayNum,
          }));
          setUniversities(normalized);
        }
      }
    } catch (err) {
      console.error("Failed to read universities from localStorage:", err);
    } finally {
      setHasLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoaded) return;
    try {
      localStorage.setItem("university_list", JSON.stringify(universities));
    } catch (err) {
      console.error("Failed to save universities to localStorage:", err);
    }
  }, [universities, hasLoaded]);

  function addUniversity(
    name: string,
    country: string,
    deadline: number,
    supplementals: Record<string, string>
  ) {
    setUniversities((prev) => [
      ...prev,
      {
        name,
        country,
        status: "Considering",
        deadline,
        supplementals,
      },
    ]);
  }

  function startEditingDeadline(uni: University) {
    setEditingDeadlineFor(uni.name);
    setDeadlineDraft(String(uni.deadline ?? getTodayDeadlineNumber()));
    setDeadlineError(null);
  }

  function saveDeadline(uniName: string) {
    const parsed = parseDeadlineNumber(deadlineDraft);
    if (parsed === null) {
      setDeadlineError("Use YYYYMMDD (e.g., 20261027)");
      return;
    }

    setUniversities((prev) =>
      prev.map((uni) =>
        uni.name === uniName ? { ...uni, deadline: parsed } : uni
      )
    );
    setEditingDeadlineFor(null);
    setDeadlineDraft("");
    setDeadlineError(null);
  }

  async function handleExportAllUniversities() {
    if (universities.length === 0) return;
    setIsExportingAll(true);

    try {
      const AllUniversitiesDoc = () => (
        <Document title="All University Supplementals">
          <PdfPage size="A4" style={allUniversitiesPdfStyles.page}>
            {universities.map((uni) => {
              const questions = Object.keys(uni.supplementals ?? {});

              return (
                <View
                  key={uni.name}
                  style={allUniversitiesPdfStyles.universitySection}
                >
                  <Text style={allUniversitiesPdfStyles.universityHeading}>
                    {uni.name}
                  </Text>

                  {questions.length > 0 ? (
                    questions.map((question, qIdx) => (
                      <View
                        key={`${uni.name}-${question}`}
                        style={allUniversitiesPdfStyles.questionBlock}
                      >
                        <Text style={allUniversitiesPdfStyles.questionText}>
                          {qIdx + 1}. {question}
                        </Text>
                        <View>
                          {renderRichHtmlToPdfNodes(
                            uni.supplementals?.[question] ?? ""
                          )}
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={allUniversitiesPdfStyles.emptyText}>
                      No supplemental questions listed.
                    </Text>
                  )}
                </View>
              );
            })}
          </PdfPage>
        </Document>
      );

      const blob = await pdf(<AllUniversitiesDoc />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "all-universities-supplementals.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExportingAll(false);
    }
  }

  return (
    <div className="flex min-h-svh p-6 w-full">
      <div className="flex w-full gap-2 min-w-0 flex-col leading-loose">
        <div className="flex flex-row items-center justify-between">
          <h1>Universities ({universities.length})</h1>
          <div className="flex flex-row items-center gap-2">
            <AddUniversityModal addUniversity={addUniversity} />
            <Button
              variant="outline"
              onClick={handleExportAllUniversities}
              disabled={isExportingAll || universities.length === 0}
            >
              {isExportingAll ? "Exporting..." : "Export All"}
            </Button>
          </div>
        </div>
        <Input
          type="text"
          placeholder="Search University..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="flex flex-col gap-4 mt-3">
          {universities
            .filter((university) =>
              (university.name + university.country)
                .toLowerCase()
                .includes(searchQuery.toLowerCase())
            ).sort((a:University, b: University) => a.deadline - b.deadline)
            .map((university: University) => {
              const isEditingDeadline = editingDeadlineFor === university.name;

              return (
                <Card className="w-full" key={university.name}>
                  <CardHeader>
                    <CardTitle>{university.name}</CardTitle>
                    <CardDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>{university.country}</span>
                      <span>•</span>
                      {isEditingDeadline ? (
                        <span className="inline-flex flex-wrap items-center gap-1.5">
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={deadlineDraft}
                            onChange={(e) => {
                              setDeadlineDraft(e.target.value);
                              if (deadlineError) setDeadlineError(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                saveDeadline(university.name);
                              } else if (e.key === "Escape") {
                                setEditingDeadlineFor(null);
                                setDeadlineError(null);
                              }
                            }}
                            className="h-7 w-28 px-2 text-xs"
                            placeholder="YYYYMMDD"
                            autoFocus
                          />
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => saveDeadline(university.name)}
                          >
                            Save
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            onClick={() => {
                              setEditingDeadlineFor(null);
                              setDeadlineError(null);
                            }}
                          >
                            Cancel
                          </Button>
                          {deadlineError && (
                            <span className="text-destructive text-xs">
                              {deadlineError}
                            </span>
                          )}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEditingDeadline(university)}
                          title="Click to edit deadline"
                          className="text-foreground/80 hover:text-foreground cursor-pointer underline-offset-4 hover:underline"
                        >
                          Deadline: {formatDeadline(university.deadline)}
                        </button>
                      )}
                    </CardDescription>
                    <CardAction>
                      <Badge
                        className={
                          university.status == "Considering"
                            ? "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                            : university.status == "Applying"
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                              : university.status == "Applied"
                                ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                                : ""
                        }
                      >
                        {university.status}
                      </Badge>
                    </CardAction>
                  </CardHeader>
                  <CardFooter className="flex flex-row flex-wrap gap-2">
                    {"supplementals" in university ? (
                      <EditSupplementalsModal
                        university={university}
                        universities={universities}
                        setUniversities={setUniversities}
                      />
                    ) : (
                      ""
                    )}

                    {(["Considering", "Applying", "Applied"] as const)
                      .filter((status) => status !== university.status)
                      .map((status) => (
                        <Button
                          onClick={() => {
                            setUniversities((prev) =>
                              prev.map((uni) =>
                                uni.name === university.name
                                  ? { ...uni, status }
                                  : uni
                              )
                            );
                          }}
                          key={status}
                          className={statusButtonClasses[status]}
                        >
                          Set as {status}
                        </Button>
                      ))}

                    <div className="ml-auto flex flex-row gap-4">
                      <Dialog>
                        <DialogTrigger>
                          <Button variant="destructive">
                            Remove University
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Remove {university.name}?</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to remove {university.name}{" "}
                              from your university list?
                            </DialogDescription>
                          </DialogHeader>
                          <Button
                            variant="destructive"
                            onClick={() => {
                              setUniversities((prev) =>
                                prev.filter(
                                  (uni) => uni.name !== university.name
                                )
                              );
                            }}
                          >
                            Confirm Remove
                          </Button>
                        </DialogContent>
                      </Dialog>
                      <ViewDetailsModal university={university} />
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
        </div>
      </div>
    </div>
  );
}