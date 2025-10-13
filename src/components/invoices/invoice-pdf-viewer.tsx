"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, Loader2, RefreshCw, ExternalLink } from "lucide-react"
import { toast } from "sonner"

interface InvoicePDFViewerProps {
  invoiceId: string
  invoiceNumber: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function InvoicePDFViewer({
  invoiceId,
  invoiceNumber,
  open = false,
  onOpenChange
}: InvoicePDFViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch PDF URL when dialog opens
  useEffect(() => {
    if (open && !pdfUrl) {
      fetchPDFUrl()
    }
  }, [open, invoiceId])

  const fetchPDFUrl = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/invoices/${invoiceId}/download-pdf`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to load PDF")
      }

      setPdfUrl(data.downloadUrl)
    } catch (error) {
      console.error("Error fetching PDF:", error)
      setError(error instanceof Error ? error.message : "Failed to load PDF")
      toast.error("Failed to load PDF", {
        description: "Please try generating the PDF first"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = () => {
    if (pdfUrl) {
      window.open(pdfUrl, "_blank")
    }
  }

  const handleRefresh = () => {
    setPdfUrl(null)
    fetchPDFUrl()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Invoice PDF - {invoiceNumber}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2 py-2">
          <div className="flex gap-2">
            <Button
              onClick={handleDownload}
              disabled={!pdfUrl || isLoading}
              size="sm"
              variant="outline"
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button
              onClick={handleRefresh}
              disabled={isLoading}
              size="sm"
              variant="outline"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            {pdfUrl && (
              <Button
                onClick={() => window.open(pdfUrl, "_blank")}
                size="sm"
                variant="outline"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open in New Tab
              </Button>
            )}
          </div>
        </div>

        {/* PDF Preview */}
        <div className="flex-1 border rounded-lg overflow-hidden bg-gray-100">
          {isLoading && (
            <div className="flex items-center justify-center h-full min-h-[500px]">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-sm text-muted-foreground">Loading PDF...</p>
              </div>
            </div>
          )}

          {error && !isLoading && (
            <div className="flex items-center justify-center h-full min-h-[500px]">
              <div className="text-center">
                <p className="text-sm text-destructive mb-4">{error}</p>
                <Button onClick={fetchPDFUrl} variant="outline" size="sm">
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {pdfUrl && !isLoading && !error && (
            <iframe
              src={pdfUrl}
              className="w-full h-full min-h-[500px]"
              title={`Invoice ${invoiceNumber} PDF`}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
