"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AddUniversityModalProps {
  addUniversity: (
    name: string,
    country: string,
    deadline: number,
    supplementals: Record<string, string>
  ) => void;
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

export default function AddUniversityModal({
  addUniversity,
}: AddUniversityModalProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [deadlineInput, setDeadlineInput] = useState("");
  const [deadlineError, setDeadlineError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<string[]>([""]);

  const resetForm = () => {
    setName("");
    setCountry("");
    setDeadlineInput("");
    setDeadlineError(null);
    setQuestions([""]);
  };

  const handleAddQuestion = () => {
    setQuestions((prev) => [...prev, ""]);
  };

  const handleQuestionChange = (index: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? value : q))
    );
  };

  const handleRemoveQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedCountry = country.trim();
    if (!trimmedName || !trimmedCountry) return;

    const parsedDeadline = parseDeadlineNumber(deadlineInput);
    if (parsedDeadline === null) {
      setDeadlineError("Enter a valid date as YYYYMMDD (e.g., 20261027).");
      return;
    }

    setDeadlineError(null);

    const supplementals: Record<string, string> = {};
    for (const q of questions) {
      const trimmedQ = q.trim();
      if (trimmedQ) {
        supplementals[trimmedQ] = "";
      }
    }

    addUniversity(trimmedName, trimmedCountry, parsedDeadline, supplementals);
    resetForm();
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) resetForm();
      }}
    >
      <DialogTrigger render={<Button>Add University</Button>} />
      <DialogContent className="w-[90vw] !max-w-3xl sm:!max-w-3xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add University</DialogTitle>
          </DialogHeader>

          <div className="-mx-4 no-scrollbar mt-4 flex max-h-[55vh] flex-col gap-5 overflow-y-auto px-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="uni-name" className="text-sm font-medium">
                University Name
              </label>
              <Input
                id="uni-name"
                placeholder="Enter university name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="uni-country" className="text-sm font-medium">
                Country
              </label>
              <Input
                id="uni-country"
                placeholder="Enter university country..."
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="uni-deadline" className="text-sm font-medium">
                Deadline (YYYYMMDD)
              </label>
              <Input
                id="uni-deadline"
                type="text"
                inputMode="numeric"
                placeholder="e.g., 20261027"
                value={deadlineInput}
                onChange={(e) => {
                  setDeadlineInput(e.target.value);
                  if (deadlineError) setDeadlineError(null);
                }}
                required
              />
              {deadlineError && (
                <p className="text-destructive m-0 text-xs">{deadlineError}</p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Supplemental Questions
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddQuestion}
                >
                  Add Question
                </Button>
              </div>

              {questions.length === 0 ? (
                ""
              ) : (
                questions.map((question, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder={`Enter prompt...`}
                      value={question}
                      onChange={(e) =>
                        handleQuestionChange(index, e.target.value)
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveQuestion(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit">Add University</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}