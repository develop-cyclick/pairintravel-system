import React from 'react'
import { Document, Page, Head, Footer, Spacer } from '@htmldocs/react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

interface InvoiceProps {
  type: 'group' | 'individual'
  invoiceNumber: string
  poNumber: string
  bcNumber: string
  docDate: Date
  dueDate: Date
  creditTerms: number
  owner: string
  issuer: string

  // Company Info
  companyName: string
  companyNameTh: string
  companyAddress: string
  companyPhone: string
  companyEmail: string
  companyTaxId: string

  // Customer Info
  customerName: string
  customerNameTh?: string
  customerAddress: string
  customerTaxId?: string
  customerPhone?: string
  customerEmail?: string

  // Items
  items: Array<{
    type: string
    description?: string
    passengerName?: string
    flightDetails?: Array<{
      airline: string
      flightNumber: string
      departure: string
      arrival: string
      departureDate: string
      arrivalDate: string
    }>
    quantity: number
    unitPrice: number
    totalPrice: number
  }>

  // Financial
  subtotal: number
  tax: number
  airportTax: number
  totalAmount: number
  baggageCharge: number
  mealCharge: number
  seatSelectionCharge: number

  // Payment
  paymentMethod?: string
  bankName?: string
  bankAccountNumber?: string
  bankAccountName?: string
  qrCode?: string
  receivedBy?: string

  // Footer
  termsTh?: string
  remarks?: string[]
}

export default function PTSystemInvoice(props: InvoiceProps) {
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const formatThaiDate = (date: Date) => {
    return format(new Date(date), 'dd-MM-yyyy', { locale: th })
  }

  return (
    <Document>
      <Head>
        {/* Import Thai fonts from Google Fonts */}
        <link
          href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&family=Kanit:wght@400;600&display=swap"
          rel="stylesheet"
        />
        <style>{`
          body {
            font-family: 'Sarabun', sans-serif;
            font-size: 14px;
            line-height: 1.4;
          }

          .thai-text {
            font-family: 'Sarabun', sans-serif;
          }

          .english-text {
            font-family: 'Arial', sans-serif;
          }

          .page {
            padding: 20mm;
            background: white;
          }

          .header {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
          }

          .logo-box {
            width: 60px;
            height: 60px;
            border: 1px solid #ccc;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            color: #999;
          }

          .company-info {
            flex: 1;
          }

          .company-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
          }

          .company-details {
            font-size: 12px;
            color: #333;
            line-height: 1.6;
          }

          .customer-label {
            text-align: right;
            font-size: 12px;
            margin-top: -40px;
          }

          .invoice-title {
            text-align: center;
            margin: 20px 0;
          }

          .invoice-title-main {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
          }

          .invoice-title-sub {
            font-size: 14px;
            font-weight: bold;
          }

          .info-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            font-size: 12px;
          }

          .customer-info {
            width: 60%;
          }

          .document-info {
            width: 35%;
          }

          .info-row {
            display: flex;
            margin-bottom: 3px;
          }

          .info-label {
            width: 100px;
            font-weight: normal;
          }

          .info-value {
            flex: 1;
          }

          .table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 12px;
          }

          .table th {
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 8px 4px;
            text-align: left;
            font-weight: bold;
          }

          .table td {
            padding: 4px;
            vertical-align: top;
          }

          .table .text-center {
            text-align: center;
          }

          .table .text-right {
            text-align: right;
          }

          .item-header {
            font-weight: bold;
            padding-top: 8px;
          }

          .item-detail {
            padding-left: 20px;
            font-size: 11px;
            color: #555;
            font-style: italic;
          }

          .flight-detail {
            display: flex;
            gap: 40px;
            padding-left: 40px;
            font-size: 11px;
          }

          .summary-section {
            margin-left: auto;
            width: 300px;
            margin-top: 20px;
          }

          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            font-size: 12px;
          }

          .summary-row.total {
            border-top: 1px solid #000;
            margin-top: 5px;
            padding-top: 8px;
            font-weight: bold;
            font-size: 14px;
          }

          .amount-words {
            margin: 20px 0;
            font-size: 12px;
          }

          .remarks {
            margin: 20px 0;
            font-size: 12px;
          }

          .payment-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-top: 30px;
          }

          .payment-info {
            flex: 1;
            font-size: 12px;
          }

          .qr-section {
            width: 120px;
            height: 120px;
            border: 1px solid #ccc;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .qr-image {
            max-width: 100%;
            max-height: 100%;
          }

          .checkbox-group {
            display: flex;
            gap: 20px;
            margin: 10px 0;
            font-size: 12px;
          }

          .checkbox-item {
            display: flex;
            align-items: center;
            gap: 5px;
          }

          .checkbox {
            width: 12px;
            height: 12px;
            border: 1px solid #000;
            display: inline-block;
          }

          .checkbox.checked::after {
            content: '✓';
            display: block;
            text-align: center;
            line-height: 12px;
          }

          .bank-details {
            margin-top: 10px;
            padding-left: 20px;
            font-size: 12px;
          }

          .footer-terms {
            text-align: center;
            margin-top: 40px;
            font-size: 11px;
            color: #666;
            line-height: 1.6;
          }

          @page {
            size: A4;
            margin: 10mm;
          }
        `}</style>
      </Head>

      <Page>
        <div className="page">
          {/* Header Section */}
          <div className="header">
            <div className="logo-box">LOGO</div>
            <div className="company-info">
              <div className="company-name thai-text">{props.companyName}</div>
              <div className="company-details thai-text">
                <div>{props.companyAddress}</div>
                <div>โทร {props.companyPhone} Email: {props.companyEmail}</div>
                <div>เลขประจำตัวผู้เสียภาษีอากร {props.companyTaxId}</div>
              </div>
            </div>
          </div>

          <div className="customer-label thai-text">สำหรับลูกค้า</div>

          {/* Invoice Title */}
          <div className="invoice-title">
            <div className="invoice-title-main thai-text">ใบแจ้งหนี้/ใบเสร็จรับเงิน</div>
            <div className="invoice-title-sub">INVOICE/RECEIPT</div>
          </div>

          {/* Customer and Document Info */}
          <div className="info-section">
            <div className="customer-info">
              <div className="info-row">
                <span className="info-label">Dep.</span>
                <span className="info-value">{props.customerName}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Address :</span>
                <span className="info-value thai-text">{props.customerAddress}</span>
              </div>
              {props.customerTaxId && (
                <div className="info-row">
                  <span className="info-label thai-text">เลขประจำตัวผู้เสียภาษี</span>
                  <span className="info-value">{props.customerTaxId}</span>
                </div>
              )}
            </div>

            <div className="document-info">
              <div className="info-row">
                <span className="info-label">page</span>
                <span className="info-value">:1 of 1</span>
              </div>
              <div className="info-row">
                <span className="info-label">Doc NO.</span>
                <span className="info-value">:{props.invoiceNumber}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Type</span>
                <span className="info-value">:Credit</span>
              </div>
              <div className="info-row">
                <span className="info-label">Doc Date</span>
                <span className="info-value">:{formatThaiDate(props.docDate)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Credit Terms</span>
                <span className="info-value">:{props.creditTerms} Days</span>
              </div>
              <div className="info-row">
                <span className="info-label">Due Date</span>
                <span className="info-value">:{formatThaiDate(props.dueDate)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Bc No.</span>
                <span className="info-value">:{props.bcNumber}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Owner</span>
                <span className="info-value">:{props.owner}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Issuer</span>
                <span className="info-value">:{props.issuer}</span>
              </div>
            </div>
          </div>

          {/* Service Table */}
          <div style={{ marginTop: '20px' }}>
            <div style={{ marginBottom: '10px', fontSize: '12px' }}>
              For the following item(s) as below
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '50%' }}>Passenger/Service</th>
                  <th className="text-center" style={{ width: '15%' }}>Record</th>
                  <th className="text-right" style={{ width: '15%' }}>Selling</th>
                  <th className="text-right" style={{ width: '20%' }}>Total(THB)</th>
                </tr>
              </thead>
              <tbody>
                {props.items.map((item, index) => (
                  <React.Fragment key={index}>
                    <tr>
                      <td className="item-header">{item.type}</td>
                      <td className="text-center">{item.quantity}</td>
                      <td className="text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="text-right">{formatCurrency(item.totalPrice)}</td>
                    </tr>
                    {item.passengerName && (
                      <tr>
                        <td colSpan={4} className="item-detail">
                          {item.passengerName}
                        </td>
                      </tr>
                    )}
                    {item.flightDetails && item.flightDetails.length > 0 && (
                      <>
                        <tr>
                          <td colSpan={4} className="item-detail">
                            Flight Detail ({item.flightDetails[0].airline})
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={4}>
                            <div className="flight-detail">
                              <div>Departure</div>
                              <div>Arrivals</div>
                            </div>
                          </td>
                        </tr>
                        {item.flightDetails.map((flight, fIndex) => (
                          <tr key={fIndex}>
                            <td colSpan={4}>
                              <div className="flight-detail">
                                <div>{flight.departure}</div>
                                <div>{flight.arrival}</div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </>
                    )}
                  </React.Fragment>
                ))}

                {/* Additional Services */}
                <tr>
                  <td className="thai-text" style={{ paddingTop: '10px' }}>ค่าโหลดสัมภาระใต้ท้องเครื่อง</td>
                  <td></td>
                  <td></td>
                  <td className="text-right" style={{ paddingTop: '10px' }}>
                    {formatCurrency(props.baggageCharge)}
                  </td>
                </tr>
                <tr>
                  <td className="thai-text">ค่าบริการอาหารและเครื่องดื่ม</td>
                  <td></td>
                  <td></td>
                  <td className="text-right">{formatCurrency(props.mealCharge)}</td>
                </tr>
                <tr>
                  <td className="thai-text">ค่าบริการเลือกที่นั่ง</td>
                  <td></td>
                  <td></td>
                  <td className="text-right">{formatCurrency(props.seatSelectionCharge)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Summary Section */}
          <div className="summary-section">
            <div className="summary-row">
              <span className="thai-text">รวม</span>
              <span>{formatCurrency(props.subtotal)}</span>
            </div>
            <div className="summary-row">
              <span className="thai-text">ค่าภาษีสนามบิน</span>
              <span>{formatCurrency(props.airportTax)}</span>
            </div>
            <div className="summary-row total">
              <span className="thai-text">ยอดรวมสุทธิ</span>
              <span>{formatCurrency(props.totalAmount)}</span>
            </div>
          </div>

          {/* Amount in Words */}
          <div className="amount-words">
            <span>Text Description</span>
            <span style={{ marginLeft: '20px' }}>
              :{Math.floor(props.totalAmount).toLocaleString('en-US')} BAHT ONLY
            </span>
          </div>

          {/* Remarks */}
          {props.remarks && props.remarks.length > 0 && (
            <div className="remarks">
              <div>Remarks</div>
              {props.remarks.map((remark, index) => (
                <div key={index} style={{ marginLeft: '20px' }}>:{remark}</div>
              ))}
            </div>
          )}

          {/* Payment Section */}
          <div className="payment-section">
            <div className="payment-info">
              <div className="thai-text">
                ผู้รับเงิน................................................................
              </div>
              <div style={{ marginTop: '10px' }}>
                <span>( </span>
                <span className="thai-text">{props.receivedBy || 'ณัฏฐ์ ทัยเขียวศรี'}</span>
                <span> )</span>
              </div>

              <div className="checkbox-group">
                <div className="checkbox-item">
                  <div className={`checkbox ${props.paymentMethod === 'EDC' ? 'checked' : ''}`}></div>
                  <span>EDC</span>
                </div>
                <div className="checkbox-item">
                  <div className={`checkbox ${props.paymentMethod === 'CASH' ? 'checked' : ''}`}></div>
                  <span>CASH</span>
                </div>
                <div className="checkbox-item">
                  <div className={`checkbox ${props.paymentMethod === 'TRANSFER' ? 'checked' : ''}`}></div>
                  <span>TRANSFER</span>
                </div>
                <div className="checkbox-item">
                  <div className={`checkbox ${props.paymentMethod === 'CHEQUE' ? 'checked' : ''}`}></div>
                  <span>CHEQUE</span>
                </div>
              </div>

              {props.bankName && props.bankAccountNumber && (
                <div className="bank-details thai-text">
                  <div className="checkbox-item">
                    <div className={`checkbox ${props.paymentMethod === 'TRANSFER' ? 'checked' : ''}`}></div>
                    <span>{props.bankName} เลขที่บัญชี {props.bankAccountNumber}</span>
                  </div>
                  <div style={{ marginLeft: '20px', marginTop: '5px' }}>
                    {props.bankAccountName}
                  </div>
                </div>
              )}
            </div>

            {/* QR Code */}
            {props.qrCode && (
              <div className="qr-section">
                <img src={props.qrCode} alt="QR Code" className="qr-image" />
              </div>
            )}
          </div>

          {/* Footer Terms */}
          <div className="footer-terms thai-text">
            {props.termsTh || 'โปรดตรวจสอบความถูกต้องของตั๋วและราคาก่อนรับตั๋วและสั่งจ่ายเช็คในนาม บริษัท ไพรินทร์ (จ.2562) จำกัด เท่านั้น'}
          </div>
        </div>
      </Page>
    </Document>
  )
}