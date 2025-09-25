'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, FileSpreadsheet, Loader2, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ValidationUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploadComplete: () => void
}

export function ValidationUploadDialog({
  open,
  onOpenChange,
  onUploadComplete
}: ValidationUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [mappingType, setMappingType] = useState<string>('auto')
  const [customMapping, setCustomMapping] = useState({
    pnr: '',
    ticketNumber: '',
    passengerName: '',
    flightNumber: '',
    flightDate: '',
    amount: ''
  })
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      const fileName = selectedFile.name.toLowerCase()
      if (fileName.endsWith('.csv') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        setFile(selectedFile)
      } else {
        toast({
          title: 'Invalid file type',
          description: 'Please upload a CSV or Excel file',
          variant: 'destructive'
        })
      }
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    if (mappingType === 'custom') {
      formData.append('columnMapping', JSON.stringify(customMapping))
    }

    try {
      const response = await fetch('/api/validation/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Upload successful',
          description: `Report ${data.report.reportNumber} is being processed`
        })
        onUploadComplete()
        onOpenChange(false)
        setFile(null)
        setMappingType('auto')
      } else {
        toast({
          title: 'Upload failed',
          description: data.error || 'Something went wrong',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: 'Upload error',
        description: 'Failed to upload file',
        variant: 'destructive'
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Airline Validation Report</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file from the airline to validate bookings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
            <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <Label htmlFor="file-upload" className="cursor-pointer">
              <span className="text-primary hover:underline">Choose file</span>
              <span className="text-muted-foreground"> or drag and drop</span>
            </Label>
            <Input
              id="file-upload"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <p className="text-xs text-muted-foreground mt-2">
              CSV or Excel files up to 50MB
            </p>
            {file && (
              <div className="mt-4 p-2 bg-muted rounded">
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="mapping">Column Mapping</Label>
            <Select value={mappingType} onValueChange={setMappingType}>
              <SelectTrigger id="mapping">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Automatic Detection</SelectItem>
                <SelectItem value="thai_airways">Thai Airways Format</SelectItem>
                <SelectItem value="bangkok_airways">Bangkok Airways Format</SelectItem>
                <SelectItem value="airasia">AirAsia Format</SelectItem>
                <SelectItem value="custom">Custom Mapping</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mappingType === 'custom' && (
            <div className="space-y-3 p-4 border rounded-lg">
              <h4 className="font-medium text-sm">Custom Column Mapping</h4>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Enter the exact column names from your CSV/Excel file
                </AlertDescription>
              </Alert>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="pnr" className="text-xs">PNR/Booking Ref Column</Label>
                  <Input
                    id="pnr"
                    value={customMapping.pnr}
                    onChange={(e) => setCustomMapping({ ...customMapping, pnr: e.target.value })}
                    placeholder="e.g., PNR, BookingRef"
                    className="h-8"
                  />
                </div>
                <div>
                  <Label htmlFor="ticket" className="text-xs">Ticket Number Column</Label>
                  <Input
                    id="ticket"
                    value={customMapping.ticketNumber}
                    onChange={(e) => setCustomMapping({ ...customMapping, ticketNumber: e.target.value })}
                    placeholder="e.g., TicketNo"
                    className="h-8"
                  />
                </div>
                <div>
                  <Label htmlFor="passenger" className="text-xs">Passenger Name Column</Label>
                  <Input
                    id="passenger"
                    value={customMapping.passengerName}
                    onChange={(e) => setCustomMapping({ ...customMapping, passengerName: e.target.value })}
                    placeholder="e.g., PassengerName"
                    className="h-8"
                  />
                </div>
                <div>
                  <Label htmlFor="flight" className="text-xs">Flight Number Column</Label>
                  <Input
                    id="flight"
                    value={customMapping.flightNumber}
                    onChange={(e) => setCustomMapping({ ...customMapping, flightNumber: e.target.value })}
                    placeholder="e.g., FlightNo"
                    className="h-8"
                  />
                </div>
                <div>
                  <Label htmlFor="date" className="text-xs">Flight Date Column</Label>
                  <Input
                    id="date"
                    value={customMapping.flightDate}
                    onChange={(e) => setCustomMapping({ ...customMapping, flightDate: e.target.value })}
                    placeholder="e.g., DepartureDate"
                    className="h-8"
                  />
                </div>
                <div>
                  <Label htmlFor="amount" className="text-xs">Amount Column</Label>
                  <Input
                    id="amount"
                    value={customMapping.amount}
                    onChange={(e) => setCustomMapping({ ...customMapping, amount: e.target.value })}
                    placeholder="e.g., TotalAmount"
                    className="h-8"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload & Validate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}