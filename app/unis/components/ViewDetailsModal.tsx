"use client";

import React, { useState } from "react";
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
import { pdf, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { renderRichHtmlToPdfNodes } from "@/lib/renderer";

interface ModalProps {
  university: University;
}

const styles = StyleSheet.create({
  page: { padding: 64 },
  headerTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 30 },
  headerSub: { fontSize: 11, color: "#6b7280", marginBottom: 20 },
  questionBlock: {
    marginBottom: 10,
    paddingBottom: 5,
  },
  question: { fontSize: 12, fontWeight: "bold", marginBottom: 8 },
});

export default function ViewDetailsModal({ university }: ModalProps) {
  const supplementalQuestions = Object.keys(university.supplementals ?? {});
  const [isExportingAll, setIsExportingAll] = useState(false);

  const slug = university.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  async function generateResponsePdf(
    universityName: string,
    htmlContent: string
  ): Promise<Blob> {
    const responseNodes = renderRichHtmlToPdfNodes(htmlContent);

    const SupplementalDoc = () => (
      <Document title={`${universityName} - Supplemental`}>
        <Page size="A4" style={styles.page}>
          <View>{responseNodes}</View>
        </Page>
      </Document>
    );

    return await pdf(<SupplementalDoc />).toBlob();
  }

  async function exportAllSupplementals() {
    setIsExportingAll(true);
    try {
      const AllSupplementalsDoc = () => (
        <Document title={`${university.name} - Supplementals`}>
          <Page size="A4" style={styles.page}>
            <Text style={styles.headerTitle}>{university.name}</Text>

            {supplementalQuestions.map((question, index) => (
              <View key={question} style={styles.questionBlock}>
                <Text style={styles.question}>
                  {index + 1}. {question}
                </Text>
                <View>
                  {renderRichHtmlToPdfNodes(
                    university.supplementals?.[question] ?? ""
                  )}
                </View>
              </View>
            ))}
          </Page>
        </Document>
      );

      const blob = await pdf(<AllSupplementalsDoc />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug || "university"}-supplementals.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExportingAll(false);
    }
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button>Export Details</Button>} />
      <DialogContent className="w-[90vw] !max-w-3xl sm:!max-w-3xl">
        <DialogHeader>
          <DialogTitle>{university.name}</DialogTitle>
          <DialogDescription>{university.country}</DialogDescription>
          <h2 className="pt-2 text-base font-semibold">Supplementals</h2>
        </DialogHeader>
        <hr />
        <div className="-mx-4 no-scrollbar flex max-h-[50vh] flex-col gap-10 overflow-y-auto px-4">
          {supplementalQuestions.length > 0 ? (
            supplementalQuestions.map((question, idx) => (
              <div
                key={question}
                className="flex flex-row items-center justify-between gap-3"
              >
                <p className="m-0 flex-1 text-sm leading-snug italic">
                  {question}
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  {/* View in new tab */}
                  <Button
                    onClick={async () => {
                      const html = university.supplementals?.[question] ?? "";
                      const blob = await generateResponsePdf(
                        university.name,
                        html
                      );
                      const url = URL.createObjectURL(blob);
                      window.open(url, "_blank");
                    }}
                  >
                    View
                  </Button>

                  {/* Download single PDF */}
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const html = university.supplementals?.[question] ?? "";
                      const blob = await generateResponsePdf(
                        university.name,
                        html
                      );
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${slug || "university"}-q${idx + 1}.pdf`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Export
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">
              No supplemental questions listed.
            </p>
          )}
        </div>
        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={exportAllSupplementals}
            disabled={isExportingAll || supplementalQuestions.length === 0}
          >
            {isExportingAll ? "Exporting..." : "Export All"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}