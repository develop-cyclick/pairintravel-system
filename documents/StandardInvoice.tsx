import React from 'react'
import { Document, Page, Head, Footer } from '@htmldocs/react'
import { format } from 'date-fns'

interface InvoiceProps {
  type: 'group' | 'individual'
  invoiceNumber: string
  poNumber: string
  totalAmount: number
  tax: number
  amount: number
  qrCode?: string
  createdAt: Date
  department?: {
    nameEn: string
    nameTh?: string
    code: string
    phone?: string
    email?: string
    address?: string
    taxId?: string
  }
  customer?: {
    firstName: string
    lastName: string
    email: string
    phone?: string
    address?: string
  }
  mainCustomer?: {
    firstName: string
    lastName: string
  }
  passenger?: {
    title?: string
    firstName: string
    lastName: string
    email: string
    phone?: string
    passportNo?: string
    nationalId?: string
  }
  bookings?: Array<{
    bookingRef: string
    totalAmount: number
    passengers?: any[]
  }>
  tourBookings?: Array<{
    tourPackage?: {
      name: string
    }
    totalAmount: number
    passengers?: any[]
    departureDate?: string
    returnDate?: string
    pickupLocation?: string
    pickupTime?: string
    tourProgramDetails?: string
  }>
  passengers?: any[]
}

export default function StandardInvoice(props: InvoiceProps) {
  const formatCurrency = (amount: number) => {
    return `฿${amount.toLocaleString('en-US')}`
  }

  return (
    <Document>
      <Head>
        {/* Import Thai fonts from Google Fonts */}
        <link
          href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          body {
            font-family: 'Sarabun', 'Arial', sans-serif;
            font-size: 14px;
            line-height: 1.6;
            color: #333;
          }

          .page {
            padding: 30mm 20mm;
            background: white;
            min-height: 297mm;
          }

          .header {
            text-align: center;
            margin-bottom: 30px;
          }

          .title {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #000;
          }

          .badge {
            display: inline-block;
            padding: 4px 12px;
            background: #f0f0f0;
            border-radius: 4px;
            font-size: 12px;
            color: #666;
            margin-bottom: 20px;
          }

          .invoice-info {
            margin-bottom: 30px;
          }

          .info-row {
            margin-bottom: 8px;
            font-size: 14px;
          }

          .info-label {
            font-weight: bold;
            display: inline-block;
            width: 140px;
          }

          .bill-to {
            margin: 30px 0;
          }

          .section-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
            border-bottom: 2px solid #333;
            padding-bottom: 5px;
          }

          .customer-info {
            background: #f9f9f9;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 10px;
          }

          .table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
          }

          .table th {
            background: #f0f0f0;
            padding: 12px;
            text-align: left;
            font-weight: bold;
            border-bottom: 2px solid #ddd;
          }

          .table td {
            padding: 10px 12px;
            border-bottom: 1px solid #eee;
          }

          .table .text-right {
            text-align: right;
          }

          .table .text-center {
            text-align: center;
          }

          .booking-item {
            margin-bottom: 8px;
          }

          .booking-ref {
            font-weight: bold;
            color: #0066cc;
          }

          .passenger-count {
            color: #666;
            font-size: 13px;
            margin-left: 10px;
          }

          .summary {
            margin-left: auto;
            width: 350px;
            margin-top: 30px;
          }

          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 14px;
          }

          .summary-row.subtotal {
            border-bottom: 1px solid #ddd;
          }

          .summary-row.total {
            border-top: 2px solid #333;
            margin-top: 10px;
            padding-top: 15px;
            font-size: 18px;
            font-weight: bold;
          }

          .qr-section {
            margin-top: 40px;
            padding: 20px;
            background: #f9f9f9;
            border-radius: 8px;
            text-align: center;
          }

          .qr-title {
            font-size: 14px;
            margin-bottom: 15px;
            color: #666;
          }

          .qr-code {
            width: 150px;
            height: 150px;
            margin: 0 auto;
            padding: 10px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 4px;
          }

          .qr-code img {
            width: 100%;
            height: 100%;
          }

          .footer {
            margin-top: 60px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 12px;
            color: #666;
          }

          .footer-text {
            margin-bottom: 5px;
          }

          .tour-details {
            background: #f0f8ff;
            padding: 12px;
            border-radius: 6px;
            margin: 8px 0;
            font-size: 13px;
          }

          .tour-name {
            font-weight: bold;
            color: #0066cc;
            margin-bottom: 5px;
          }

          .tour-info {
            color: #555;
            line-height: 1.4;
          }

          @page {
            size: A4;
            margin: 10mm;
          }
        `}</style>
      </Head>

      <Page>
        <div className="page">
          {/* Header */}
          <div className="header">
            <h1 className="title">INVOICE</h1>
            <div className="badge">
              {props.type === 'group' ? 'GROUP INVOICE' : 'INDIVIDUAL INVOICE'}
            </div>
          </div>

          {/* Invoice Information */}
          <div className="invoice-info">
            <div className="info-row">
              <span className="info-label">Invoice Number:</span>
              <span>{props.invoiceNumber}</span>
            </div>
            <div className="info-row">
              <span className="info-label">PO Number:</span>
              <span>{props.poNumber}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Date:</span>
              <span>{format(new Date(props.createdAt), 'dd MMM yyyy')}</span>
            </div>
          </div>

          {/* Bill To Section */}
          <div className="bill-to">
            <h2 className="section-title">BILL TO:</h2>

            {props.type === 'group' ? (
              <div className="customer-info">
                {props.department ? (
                  <>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
                      {props.department.nameEn}
                    </div>
                    {props.department.nameTh && (
                      <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                        {props.department.nameTh}
                      </div>
                    )}
                    <div>Code: {props.department.code}</div>
                    {props.department.phone && <div>Phone: {props.department.phone}</div>}
                    {props.department.email && <div>Email: {props.department.email}</div>}
                    {props.department.address && (
                      <div style={{ marginTop: '8px' }}>{props.department.address}</div>
                    )}
                  </>
                ) : props.customer ? (
                  <>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
                      {props.customer.firstName} {props.customer.lastName}
                    </div>
                    <div>Email: {props.customer.email}</div>
                    {props.customer.phone && <div>Phone: {props.customer.phone}</div>}
                  </>
                ) : null}
              </div>
            ) : (
              <div>
                {props.passenger && (
                  <div className="customer-info">
                    <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
                      {props.passenger.title} {props.passenger.firstName} {props.passenger.lastName}
                    </div>
                    <div>Email: {props.passenger.email}</div>
                    {props.passenger.phone && <div>Phone: {props.passenger.phone}</div>}
                    {props.passenger.passportNo && <div>Passport: {props.passenger.passportNo}</div>}
                    {props.passenger.nationalId && <div>National ID: {props.passenger.nationalId}</div>}
                  </div>
                )}

                {(props.department || props.mainCustomer) && (
                  <div style={{ marginTop: '15px', fontSize: '13px', color: '#666' }}>
                    {props.department ? (
                      <div>Organization: {props.department.nameEn}</div>
                    ) : props.mainCustomer ? (
                      <div>Main Contact: {props.mainCustomer.firstName} {props.mainCustomer.lastName}</div>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Items Table */}
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '60%' }}>Description</th>
                <th className="text-right" style={{ width: '40%' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {props.type === 'group' ? (
                <>
                  {props.bookings && props.bookings.length > 0 && (
                    <>
                      <tr>
                        <td colSpan={2} style={{ fontWeight: 'bold', background: '#f9f9f9' }}>
                          Flight Bookings:
                        </td>
                      </tr>
                      {props.bookings.map((booking, index) => (
                        <tr key={index}>
                          <td>
                            <div className="booking-item">
                              <span className="booking-ref">Booking Ref: {booking.bookingRef}</span>
                              <span className="passenger-count">
                                Passengers: {booking.passengers?.length || 0}
                              </span>
                            </div>
                          </td>
                          <td className="text-right">
                            {formatCurrency(booking.totalAmount || 0)}
                          </td>
                        </tr>
                      ))}
                    </>
                  )}

                  {props.tourBookings && props.tourBookings.length > 0 && (
                    <>
                      <tr>
                        <td colSpan={2} style={{ fontWeight: 'bold', background: '#f9f9f9', paddingTop: '15px' }}>
                          Tour Package Bookings:
                        </td>
                      </tr>
                      {props.tourBookings.map((booking, index) => (
                        <tr key={index}>
                          <td>
                            <div className="tour-details">
                              <div className="tour-name">
                                {booking.tourPackage?.name || 'Tour Package'}
                              </div>
                              <div className="tour-info">
                                <div>Passengers: {booking.passengers?.length || 0}</div>
                                {booking.departureDate && booking.returnDate && (
                                  <div>
                                    Dates: {format(new Date(booking.departureDate), 'dd MMM yyyy')} - {' '}
                                    {format(new Date(booking.returnDate), 'dd MMM yyyy')}
                                  </div>
                                )}
                                {booking.pickupLocation && booking.pickupTime && (
                                  <div>Pickup: {booking.pickupLocation} at {booking.pickupTime}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="text-right" style={{ verticalAlign: 'middle' }}>
                            {formatCurrency(booking.totalAmount || 0)}
                          </td>
                        </tr>
                      ))}
                    </>
                  )}

                  {props.passengers && (
                    <tr>
                      <td style={{ paddingTop: '15px' }}>
                        <strong>Total Passengers: {props.passengers.length}</strong>
                      </td>
                      <td></td>
                    </tr>
                  )}
                </>
              ) : (
                <tr>
                  <td>
                    Travel Service for {props.passenger?.firstName} {props.passenger?.lastName}
                  </td>
                  <td className="text-right">{formatCurrency(props.amount)}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Summary Section */}
          <div className="summary">
            <div className="summary-row subtotal">
              <span>Subtotal:</span>
              <span>{formatCurrency(props.amount)}</span>
            </div>
            <div className="summary-row">
              <span>VAT (7%):</span>
              <span>{formatCurrency(props.tax)}</span>
            </div>
            <div className="summary-row total">
              <span>Total Amount:</span>
              <span>{formatCurrency(props.totalAmount)}</span>
            </div>
          </div>

          {/* QR Code Section */}
          {props.qrCode && (
            <div className="qr-section">
              <div className="qr-title">Payment QR Code</div>
              <div className="qr-code">
                <img src={props.qrCode} alt="Payment QR Code" />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="footer">
            <div className="footer-text">
              This is a computer-generated invoice. No signature required.
            </div>
            <div className="footer-text">
              Generated on {format(new Date(), 'dd MMM yyyy HH:mm')}
            </div>
          </div>
        </div>
      </Page>
    </Document>
  )
}