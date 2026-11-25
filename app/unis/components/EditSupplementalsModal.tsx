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
import { University } from "@/lib/types";
import { Dispatch, SetStateAction, useState } from "react";
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

  const startEditing = (question: string) => {
    setQuestionResponse(university.supplementals?.[question] ?? "");
    setEditingQuestion(question);
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
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline">Edit Supplementals</Button>} />
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
            <hr />
            <div className="-mx-4 no-scrollbar flex max-h-[50vh] flex-col gap-6 overflow-y-auto px-4">
              {supplementalQuestions.length > 0 ? (
                supplementalQuestions.map((question) => (
                  <div
                    key={question}
                    className="flex flex-row items-center justify-between gap-3"
                  >
                    <p className="m-0 flex-1 text-sm leading-snug italic">
                      {question}
                    </p>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button onClick={() => startEditing(question)}>Edit</Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">
                  No supplemental questions listed.
                </p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}