import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { University } from "@/lib/types"
import { Textarea } from "@/components/ui/textarea"
import { Dispatch, SetStateAction, useState } from "react"
import TextEditor from "./TextEditor"

interface ModalProps {
  university: University;
  universities: University[];
  setUniversities: Dispatch<SetStateAction<University[]>>;
}

export default function EditSupplementalsModal({university, universities, setUniversities}:ModalProps) {
  const supplementalQuestions = Object.keys(university.supplementals ?? {});
  const [questionResponse, setQuestionResponse] = useState("");
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);

  const handleSave = (question: string) => {
    setUniversities((prev) =>
      prev.map((uni) =>
        uni.name === university.name
          ? {
              ...uni,
              supplementals: {
                ...(uni.supplementals ?? {}),
                [question]: questionResponse,
              },
            }
          : uni
      )
    );
    setEditingQuestion(null);
  };

  return (
    <Dialog>
      <DialogTrigger render={<Button variant={"outline"}>Edit Supplementals</Button>} />
      <DialogContent className="w-[90vw] !max-w-3xl sm:!max-w-3xl">
        <DialogHeader>
          <DialogTitle>{university.name}</DialogTitle>
          <DialogDescription>
            {university.country}
          </DialogDescription>
          <h1>Supplementals</h1>
          <hr />
        </DialogHeader>
        <div className="-mx-4 no-scrollbar flex max-h-[50vh] flex-col gap-10 overflow-y-auto px-4">
          {supplementalQuestions.length > 0 ? (
            supplementalQuestions.map((question) => (
              <div key={question} className="flex flex-row items-center justify-between gap-3">
                <p className="m-0 flex-1 text-sm leading-snug italic">
                  {question}
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  <Dialog
                  open={editingQuestion === question}
                    onOpenChange={(isOpen) => {
                      if (isOpen) {
                        setQuestionResponse(university.supplementals?.[question] ?? "");
                        setEditingQuestion(question);
                      } else if (editingQuestion === question) {
                        setEditingQuestion(null);
                      }
                    }}
                  >
                    <DialogTrigger render={<Button>Edit</Button>} />
                    <DialogContent className="w-[100vw] !max-w-3xl sm:!max-w-3xl">
                      <DialogHeader>
                        <DialogTitle>Edit Response</DialogTitle>
                        <DialogDescription>
                          {question}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="-mx-4 no-scrollbar max-h-[50vh] overflow-y-auto px-4">
                        {/* <Textarea 
                          placeholder="Enter response..." 
                          value={questionResponse} 
                          onChange={(e) => {
                            setQuestionResponse(e.target.value);
                          }} 
                        /> */}
                        <TextEditor/>
                      </div>
                      <DialogFooter>
                        <Button onClick={() => handleSave(question)}>Save</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">
              No supplemental questions listed.
            </p>
          )}
        </div>
        <hr />
      </DialogContent>
    </Dialog>
  )
}