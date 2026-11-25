"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
    supplementals: Record<string, string>
  ) => void;
}

export default function AddUniversityModal({addUniversity}: AddUniversityModalProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [questions, setQuestions] = useState<string[]>([""]);

  const resetForm = () => {
    setName("");
    setCountry("");
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

    const supplementals: Record<string, string> = {};
    for (const q of questions) {
      const trimmedQ = q.trim();
      if (trimmedQ) {
        supplementals[trimmedQ] = "";
      }
    }

    addUniversity(trimmedName, trimmedCountry, supplementals);
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