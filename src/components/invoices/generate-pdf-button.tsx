"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FileText, Loader2, Download } from "lucide-react"
import { toast } from "sonner"

interface GeneratePDFButtonProps {
  invoiceId: string
  invoiceNumber: string
  existingPdfUrl?: string | null
  onSuccess?: (pdfUrl: string) => void
  variant?: "default" | "outline" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
}

export function GeneratePDFButton({
  invoiceId,
  invoiceNumber,
  existingPdfUrl,
  onSuccess,
  variant = "default",
  size = "default"
}: GeneratePDFButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGeneratePDF = async () => {
    try {
      setIsGenerating(true)

      // Show loading toast
      const loadingToast = toast.loading("Generating PDF...", {
        description: "This may take a few seconds"
      })

      // Call generate API
      const response = await fetch(`/api/invoices/${invoiceId}/generate-pdf`, {
        method: "POST"
      })

      const data = await response.json()

      // Dismiss loading toast
      toast.dismiss(loadingToast)

      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to generate PDF")
      }

      // Show success toast
      toast.success("PDF generated successfully!", {
        description: `Invoice: ${invoiceNumber}`,
        action: {
          label: "Download",
          onClick: () => {
            if (data.pdf?.downloadUrl) {
              window.open(data.pdf.downloadUrl, "_blank")
            }
          }
        }
      })

      // Call onSuccess callback
      if (onSuccess && data.invoice?.pdfUrl) {
        onSuccess(data.invoice.pdfUrl)
      }

      // Open PDF in new tab
      if (data.pdf?.downloadUrl) {
        window.open(data.pdf.downloadUrl, "_blank")
      }

    } catch (error) {
      console.error("Error generating PDF:", error)
      toast.error("Failed to generate PDF", {
        description: error instanceof Error ? error.message : "Unknown error occurred"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownloadExisting = async () => {
    try {
      setIsGenerating(true)

      const response = await fetch(`/api/invoices/${invoiceId}/download-pdf`)
      const data = await response.json()

      if (!response.ok) {
        // If PDF doesn't exist, offer to generate it
        if (data.needsGeneration) {
          toast.info("PDF not generated yet", {
            description: "Click 'Generate PDF' to create it",
            action: {
              label: "Generate",
              onClick: handleGeneratePDF
            }
          })
          return
        }

        throw new Error(data.message || "Failed to get download URL")
      }

      // Open download URL in new tab
      if (data.downloadUrl) {
        window.open(data.downloadUrl, "_blank")
        toast.success("Opening PDF...")
      }

    } catch (error) {
      console.error("Error downloading PDF:", error)
      toast.error("Failed to download PDF", {
        description: error instanceof Error ? error.message : "Unknown error occurred"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // If PDF exists, show download button
  if (existingPdfUrl) {
    return (
      <div className="flex gap-2">
        <Button
          onClick={handleDownloadExisting}
          disabled={isGenerating}
          variant={variant}
          size={size}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </>
          )}
        </Button>
        <Button
          onClick={handleGeneratePDF}
          disabled={isGenerating}
          variant="outline"
          size={size}
        >
          Regenerate
        </Button>
      </div>
    )
  }

  // If no PDF exists, show generate button
  return (
    <Button
      onClick={handleGeneratePDF}
      disabled={isGenerating}
      variant={variant}
      size={size}
    >
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating PDF...
        </>
      ) : (
        <>
          <FileText className="mr-2 h-4 w-4" />
          Generate PDF
        </>
      )}
    </Button>
  )
}
