"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { University } from "@/lib/types";

const STORAGE_KEY = "university_list";
const MS_PER_DAY = 86_400_000;

function parseDeadlineDate(deadline?: number): Date | null {
  if (typeof deadline !== "number" || !Number.isFinite(deadline)) {
    return null;
  }

  const str = String(Math.trunc(deadline));
  if (str.length !== 8) return null;

  const year = Number(str.slice(0, 4));
  const month = Number(str.slice(4, 6));
  const day = Number(str.slice(6, 8));

  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function formatDeadline(deadline?: number): string {
  if (typeof deadline !== "number" || !Number.isFinite(deadline)) {
    return "No deadline";
  }

  const date = parseDeadlineDate(deadline);
  if (!date) return String(Math.trunc(deadline));

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatDaysFromToday(deadline?: number): string | null {
  const targetDate = parseDeadlineDate(deadline);
  if (!targetDate) return null;

  const now = new Date();
  const todayUtcMidnight = Date.UTC(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const diffDays = Math.round(
    (targetDate.getTime() - todayUtcMidnight) / MS_PER_DAY
  );

  if (diffDays === 0) return "(today)";
  if (diffDays === 1) return "(in 1 day)";
  if (diffDays > 1) return `(in ${diffDays} days)`;
  if (diffDays === -1) return "(1 day ago)";
  return `(${Math.abs(diffDays)} days ago)`;
}

function loadUniversitiesFromStorage(): University[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is University =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as University).name === "string" &&
        typeof (item as University).status === "string"
    );
  } catch {
    return [];
  }
}

export default function Page() {
  const [universities, setUniversities] = useState<University[]>([]);

  useEffect(() => {
    setUniversities(loadUniversitiesFromStorage());

    function handleStorage(e: StorageEvent) {
      if (!e.key || e.key === STORAGE_KEY) {
        setUniversities(loadUniversitiesFromStorage());
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const appliedCount = universities.filter(
    (u) => u.status === "Applied"
  ).length;

  const sortedUniversities = [...universities].sort(
    (a, b) =>
      (a.deadline ?? Number.MAX_SAFE_INTEGER) -
      (b.deadline ?? Number.MAX_SAFE_INTEGER)
  );

  return (
    <div className="flex min-h-svh p-6">
      <div className="flex w-full min-w-0 flex-col gap-6 text-sm leading-loose">
        <div>
          <h1>Welcome to Uni Organiser</h1>
          <p>
            idk i just got kinda pissed off with the amount of documents you have
            to handle during college apps, different portals needing differnet
            documents merged different ways, different, just gets super messy
          </p>
          <p>
            head to the Universities page to get started, you can add unis and
            add your supplementals, you can easily view and manage added
            supplemental questions
          </p>
          <p>
            then you can go to the documents tab to store and manage your files,
            you can view/download them, or easily merge them together
          </p>
          <Button className="mt-2" render={<Link href="/unis" />}>
            Go to Universities
          </Button>
        </div>

        <div className="flex w-full flex-col gap-2 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium">
              Universities ({appliedCount}/{universities.length})
            </h2>
          </div>

          {sortedUniversities.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              no universities added.
            </p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {sortedUniversities.map((uni) => {
                const isApplied = uni.status === "Applied";
                const daysLabel = formatDaysFromToday(uni.deadline);
                return (
                  <li
                    key={uni.name}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex min-w-0 flex-wrap items-baseline gap-2">
                      <span
                        className={
                          isApplied
                            ? "text-muted-foreground line-through"
                            : "font-medium"
                        }
                      >
                        {isApplied ? "☑ " : "☐ "}
                        {uni.name}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {formatDeadline(uni.deadline)}
                        {daysLabel ? ` ${daysLabel}` : ""}
                      </span>
                    </div>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {uni.status}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}