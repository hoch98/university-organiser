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
import { pdf, Document, Page, Text, StyleSheet } from '@react-pdf/renderer';
import { renderRichHtmlToPdfNodes } from "@/lib/renderer";
import { View } from "@react-pdf/renderer";

interface ModalProps {
  university: University
}

const styles = StyleSheet.create({
  page: { padding: 64 },
  text: { fontSize: 12 }
});

export default function ViewDetailsModal({university}:ModalProps) {
  const supplementalQuestions = Object.keys(university.supplementals ?? {});

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
                  {/* View in new tab */}
                  <Button
                    onClick={async () => {
                      const html = university.supplementals?.[question] ?? "";
                      const blob = await generateResponsePdf(university.name, html);
                      const url = URL.createObjectURL(blob);
                      window.open(url, "_blank");
                    }}
                  >
                    View
                  </Button>

                  {/* Download PDF */}
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const html = university.supplementals?.[question] ?? "";
                      const blob = await generateResponsePdf(university.name, html);
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${university.name.toLowerCase().replace(/\s+/g, "-")}-supplemental.pdf`;
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
        <hr />
      </DialogContent>
    </Dialog>
  )
}