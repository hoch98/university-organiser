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
import React from 'react';
import { pdf, Document, Page, Text, StyleSheet } from '@react-pdf/renderer';

interface ModalProps {
  university: University
}

const styles = StyleSheet.create({
  page: { padding: 80 },
  text: { fontSize: 12 }
});

export default function ViewDetailsModal({university}:ModalProps) {
  const supplementalQuestions = Object.keys(university.supplementals ?? {});

  return (
    <Dialog>
      <DialogTrigger render={<Button >Export Details</Button>} />
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
                  <Button onClick={async () => {
                    const MyDocument = () => (
                      <Document>
                        <Page size="A4" style={styles.page}>
                          <Text style={styles.text}>{university.supplementals![question]}</Text>
                        </Page>
                      </Document>
                    );

                    const blob = await pdf(<MyDocument />).toBlob();
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                  }}>View</Button>
                  <Button>Export</Button>
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