"use client";

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
import { University } from "@/lib/types";
import { Dispatch, FormEvent, SetStateAction, useState } from "react";
import { TextEditor } from "./TextEditor";

interface ModalProps {
  university: University;
  universities: University[];
  setUniversities: Dispatch<SetStateAction<University[]>>;
}

export default function EditSupplementalsModal({
  university,
  setUniversities,
}: ModalProps) {
  const supplementalQuestions = Object.keys(university.supplementals ?? {});
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [questionResponse, setQuestionResponse] = useState("");
  const [newQuestion, setNewQuestion] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [confirmingQuestion, setConfirmingQuestion] = useState<string | null>(
    null
  );

  const startEditing = (question: string) => {
    setConfirmingQuestion(null);
    setQuestionResponse(university.supplementals?.[question] ?? "");
    setEditingQuestion(question);
  };

  const handleAddQuestion = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = newQuestion.trim();
    if (!trimmed) {
      setAddError("Please enter a supplemental question.");
      return;
    }

    if (
      supplementalQuestions.some(
        (q) => q.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      setAddError("That question already exists for this university.");
      return;
    }

    setAddError(null);
    setUniversities((prev) =>
      prev.map((uni) =>
        uni.name === university.name
          ? {
              ...uni,
              supplementals: {
                ...(uni.supplementals ?? {}),
                [trimmed]: "",
              },
            }
          : uni
      )
    );
    setNewQuestion("");
  };

  const handleRemoveQuestion = (questionToRemove: string) => {
    setUniversities((prev) =>
      prev.map((uni) => {
        if (uni.name !== university.name) return uni;
        const nextSupplementals = { ...(uni.supplementals ?? {}) };
        delete nextSupplementals[questionToRemove];
        return {
          ...uni,
          supplementals: nextSupplementals,
        };
      })
    );

    if (confirmingQuestion === questionToRemove) {
      setConfirmingQuestion(null);
    }
    if (editingQuestion === questionToRemove) {
      setEditingQuestion(null);
    }
  };

  const handleSave = () => {
    if (!editingQuestion) return;

    setUniversities((prev) =>
      prev.map((uni) =>
        uni.name === university.name
          ? {
              ...uni,
              supplementals: {
                ...(uni.supplementals ?? {}),
                [editingQuestion]: questionResponse,
              },
            }
          : uni
      )
    );
    setEditingQuestion(null);
  };

  return (
    <Dialog
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setEditingQuestion(null);
          setNewQuestion("");
          setAddError(null);
          setConfirmingQuestion(null);
        }
      }}
    >
      <DialogTrigger
        render={<Button variant="outline">Edit Supplementals</Button>}
      />
      <DialogContent className="w-[90vw] !max-w-3xl sm:!max-w-3xl">
        {editingQuestion ? (
          <>
            <DialogHeader>
              <DialogTitle>Edit Response</DialogTitle>
              <DialogDescription>{editingQuestion}</DialogDescription>
            </DialogHeader>
            <div className="-mx-4 no-scrollbar max-h-[50vh] overflow-y-auto px-4">
              <TextEditor
                content={questionResponse}
                onChange={setQuestionResponse}
              />
            </div>
            <DialogFooter className="mt-4 flex justify-between sm:justify-between">
              <Button variant="outline" onClick={() => setEditingQuestion(null)}>
                Back to Questions
              </Button>
              <Button onClick={handleSave}>Save</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{university.name}</DialogTitle>
              <DialogDescription>{university.country}</DialogDescription>
              <h2 className="pt-2 text-base font-semibold">Supplementals</h2>
            </DialogHeader>

            <form
              onSubmit={handleAddQuestion}
              className="flex flex-col gap-1.5"
            >
              <div className="flex flex-row items-center gap-2">
                <Input
                  type="text"
                  placeholder="Add new supplemental question..."
                  value={newQuestion}
                  onChange={(e) => {
                    setNewQuestion(e.target.value);
                    if (addError) setAddError(null);
                  }}
                />
                <Button type="submit" className="shrink-0">
                  Add Question
                </Button>
              </div>
              {addError && (
                <p className="text-destructive m-0 text-xs">{addError}</p>
              )}
            </form>

            <hr />
            <div className="-mx-4 no-scrollbar flex max-h-[45vh] flex-col gap-6 overflow-y-auto px-4">
              {supplementalQuestions.length > 0 ? (
                supplementalQuestions.map((question) => {
                  const isConfirming = confirmingQuestion === question;

                  return (
                    <div
                      key={question}
                      className="flex flex-row items-center justify-between gap-3"
                    >
                      <p className="m-0 flex-1 text-sm leading-snug italic">
                        {question}
                      </p>
                      <div className="flex shrink-0 items-center gap-2">
                        {isConfirming ? (
                          <>
                            <Button
                              type="button"
                              variant="destructive"
                              onClick={() => handleRemoveQuestion(question)}
                            >
                              Confirm Delete
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setConfirmingQuestion(null)}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              type="button"
                              variant="destructive"
                              onClick={() => setConfirmingQuestion(question)}
                            >
                              Remove
                            </Button>
                            <Button onClick={() => startEditing(question)}>
                              Edit
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-muted-foreground text-sm">
                  No supplemental questions listed.
                </p>
              )}
            </div>
            <hr />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}