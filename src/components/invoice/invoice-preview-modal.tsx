"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Eye,
  Download,
  Printer,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Users,
  User,
  Loader2,
  FileText,
  AlertCircle,
} from "lucide-react";

interface InvoicePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  type: "group" | "individual";
  passengerIds?: string[];
  onConfirmPrint?: () => void;
}

export function InvoicePreviewModal({
  open,
  onOpenChange,
  invoiceId,
  type,
  passengerIds,
  onConfirmPrint,
}: InvoicePreviewModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [previews, setPreviews] = useState<
    Array<{ html: string; metadata: any }>
  >([]);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchPreview();
    } else {
      // Reset state when modal closes
      setPreviews([]);
      setActivePreviewIndex(0);
      setZoomLevel(100);
      setIsFullscreen(false);
      setError(null);
    }
  }, [open, type, passengerIds]);

  const fetchPreview = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          type,
          passengerIds,
          format: "html",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPreviews(data.previews);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to generate preview");
        toast.error("Failed to generate preview");
      }
    } catch (error) {
      console.error("Error fetching preview:", error);
      setError("Failed to generate preview. Please try again.");
      toast.error("Failed to generate preview");
    } finally {
      setIsLoading(false);
    }
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 10, 200));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 10, 50));
  };

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handlePrint = () => {
    if (previews.length > 0) {
      const iframe = document.getElementById(
        `preview-iframe-${activePreviewIndex}`
      ) as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.print();
      }
    }
  };

  const handleDownload = () => {
    if (onConfirmPrint) {
      onConfirmPrint();
      onOpenChange(false);
    }
  };

  const activePreview = previews[activePreviewIndex];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${
          isFullscreen
            ? "min-w-[95vw] h-[95vh]"
            : "min-w-[55vw] w-full max-h-[90vh]"
        } p-0 flex flex-col`}
      >
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Invoice Preview
                {activePreview && (
                  <Badge variant="outline" className="ml-2">
                    {activePreview.metadata.type === "group" ? (
                      <>
                        <Users className="h-3 w-3 mr-1" />
                        Group
                      </>
                    ) : (
                      <>
                        <User className="h-3 w-3 mr-1" />
                        Individual
                      </>
                    )}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="mt-1">
                Review the invoice before generating the final PDF
                {activePreview && (
                  <span className="ml-2 font-medium">
                    #{activePreview.metadata.invoiceNumber}
                  </span>
                )}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* Zoom Controls */}
              <div className="flex items-center gap-1 border rounded-lg px-2 py-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 50}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium px-2 min-w-[50px] text-center">
                  {zoomLevel}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 200}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="ghost" size="icon" onClick={handleFullscreen}>
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Preview Tabs (for multiple individual invoices) */}
        {previews.length > 1 && (
          <div className="px-6 py-2 border-b">
            <Tabs
              value={activePreviewIndex.toString()}
              onValueChange={(v) => setActivePreviewIndex(parseInt(v))}
            >
              <TabsList className="w-full justify-start">
                {previews.map((preview, index) => (
                  <TabsTrigger
                    key={index}
                    value={index.toString()}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-3 w-3" />
                    {preview.metadata.passengerName || `Invoice ${index + 1}`}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        )}

        {/* Preview Content */}
        <div className="flex-1 overflow-hidden bg-gray-100">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                <p className="mt-4 text-muted-foreground">
                  Generating preview...
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
                <p className="mt-4 text-muted-foreground">{error}</p>
                <Button onClick={fetchPreview} className="mt-4">
                  Retry
                </Button>
              </div>
            </div>
          ) : activePreview ? (
            <ScrollArea className="h-full w-full">
              <div className="flex justify-center p-4 w-full">
                <div
                  className="bg-white shadow-xl mx-auto"
                  style={{
                    transform: `scale(${zoomLevel / 100})`,
                    transformOrigin: "top center",
                    transition: "transform 0.2s",
                    width: "fit-content",
                  }}
                >
                  <iframe
                    id={`preview-iframe-${activePreviewIndex}`}
                    srcDoc={activePreview.html}
                    className="w-[210mm] min-h-[297mm]"
                    style={{
                      border: "none",
                      background: "white",
                      display: "block",
                    }}
                  />
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No preview available</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <DialogFooter className="px-6 py-4 border-t">
          <div className="flex items-center justify-between w-full">
            {activePreview && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>
                  Total: ฿{activePreview.metadata.totalAmount?.toLocaleString()}
                </span>
                {type === "individual" && (
                  <span>{previews.length} invoice(s)</span>
                )}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                <X className="mr-2 h-4 w-4" />
                Close
              </Button>
              <Button
                variant="outline"
                onClick={handlePrint}
                disabled={!activePreview}
              >
                <Printer className="mr-2 h-4 w-4" />
                Print Preview
              </Button>
              <Button onClick={handleDownload} disabled={!activePreview}>
                <Download className="mr-2 h-4 w-4" />
                Generate PDF
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
