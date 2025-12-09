import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { PrivateSaleInvoice } from './types';
import { formatCurrency } from '../money';
import { formatDisplay } from '../dates';

export async function generatePrivateSalePdf(invoice: PrivateSaleInvoice): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const width = 595.28;
  const height = 841.89;

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const navColor = rgb(31/255, 42/255, 68/255); // #1f2a44
  const orangeColor = rgb(254/255, 105/255, 0/255); // #fe6900
  const blackColor = rgb(0, 0, 0);

  // Helper to draw text
  const drawText = (text: string, x: number, y: number, size: number = 10, isBold: boolean = false, color = blackColor) => {
    page.drawText(text || "", {
      x,
      y,
      size,
      font: isBold ? fontBold : font,
      color,
    });
  };

  const drawRightAligned = (text: string, rightX: number, y: number, size: number = 10, isBold: boolean = false, color = blackColor) => {
    const textWidth = (isBold ? fontBold : font).widthOfTextAtSize(text || "", size);
    drawText(text, rightX - textWidth, y, size, isBold, color);
  };

  let y = height - 50;

  // Header Title
  // "TAX INVOICE" or "INVOICE"
  drawText(invoice.title, 50, y, 24, true, navColor);
  
  // Date
  drawRightAligned(`Date: ${formatDisplay(invoice.invoiceDate)}`, width - 50, y, 10, false, blackColor);

  y -= 60;

  // Vendor (Seller) Details
  drawText("VENDOR (SELLER)", 50, y, 12, true, orangeColor);
  y -= 20;
  drawText(invoice.vendor.name, 50, y, 11, true);
  y -= 15;
  if (invoice.vendor.abn) {
      drawText(`ABN: ${invoice.vendor.abn}`, 50, y, 10);
      y -= 15;
  }
  if (invoice.vendor.acn) {
      drawText(`ACN: ${invoice.vendor.acn}`, 50, y, 10);
      y -= 15;
  }
  if (invoice.vendor.address) {
      drawText(invoice.vendor.address, 50, y, 10);
      y -= 15;
  }
  if (invoice.vendor.phone) {
      drawText(`Ph: ${invoice.vendor.phone}`, 50, y, 10);
      y -= 15;
  }
  if (invoice.vendor.email) {
      drawText(invoice.vendor.email, 50, y, 10);
      y -= 15;
  }

  // Buyer Details
  // Positioned on the right side approx x=300
  let rightColX = 300;
  let rightColY = height - 110; // Reset Y for right column
  
  drawText("INVOICE / DELIVERY TO", rightColX, rightColY, 12, true, orangeColor);
  rightColY -= 20;
  drawText(invoice.buyer.name, rightColX, rightColY, 11, true);
  rightColY -= 15;
  if (invoice.buyer.address) {
      // Simple word wrap for address if needed, simplistic approach
      drawText(invoice.buyer.address, rightColX, rightColY, 10);
      rightColY -= 15;
  }

  // Move Y down below the lowest column
  y = Math.min(y, rightColY) - 40;

  // Vehicle Details Section
  drawText("VEHICLE DETAILS", 50, y, 12, true, orangeColor);
  y -= 10;
  
  // Draw a line
  page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 1, color: rgb(0.9, 0.9, 0.9) });
  y -= 20;

  const vehicleFields = [
      { label: "Make", value: invoice.vehicle.make },
      { label: "Model", value: invoice.vehicle.model },
      { label: "Description", value: invoice.vehicle.description },
      { label: "VIN", value: invoice.vehicle.vin },
      { label: "Registration", value: invoice.vehicle.registration },
      { label: "Engine No", value: invoice.vehicle.engineNumber },
      { label: "Odometer", value: invoice.vehicle.odometer },
      { label: "Build Date", value: invoice.vehicle.buildDate },
      { label: "Compliance Date", value: invoice.vehicle.complianceDate },
  ];

  // Grid layout for vehicle details (2 columns)
  let vY = y;
  const col1X = 50;
  const col2X = 300;
  
  vehicleFields.forEach((field, index) => {
      const isCol2 = index % 2 !== 0;
      const x = isCol2 ? col2X : col1X;
      
      if (field.value) {
          drawText(`${field.label}:`, x, vY, 10, true, navColor);
          drawText(field.value, x + 100, vY, 10, false, blackColor);
      }
      
      if (isCol2) vY -= 20;
  });

  if (vehicleFields.length % 2 !== 0) vY -= 20; // Ensure we move down if odd number of fields
  y = vY - 30;

  // Pricing Section
  drawText("PAYMENT SUMMARY", 50, y, 12, true, orangeColor);
  y -= 10;
  page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 1, color: rgb(0.9, 0.9, 0.9) });
  y -= 30;

  // Invoice Amount
  drawText("Invoice Amount", 50, y, 11, true);
  drawRightAligned(formatCurrency(invoice.invoiceAmount), width - 50, y, 11, true);
  y -= 20;

  if (invoice.gstMode === "GST_INC") {
      drawText("Includes GST of", 50, y, 10, false, rgb(0.5, 0.5, 0.5));
      drawRightAligned(formatCurrency(invoice.gstAmount), width - 50, y, 10, false, rgb(0.5, 0.5, 0.5));
      y -= 20;
  }

  y -= 10;
  // Total Payable (Huge)
  drawText("TOTAL PAYABLE", 50, y, 14, true, navColor);
  drawRightAligned(formatCurrency(invoice.totalPayable), width - 50, y, 14, true, navColor);
  
  y -= 50;

  // Disbursements
  if (invoice.disbursements.length > 0) {
      drawText("DISBURSEMENTS (Included in Total)", 50, y, 12, true, orangeColor);
      y -= 10;
      page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 1, color: rgb(0.9, 0.9, 0.9) });
      y -= 25;

      // Table Header
      drawText("Account Name", 50, y, 9, true);
      drawText("BSB", 250, y, 9, true);
      drawText("Account No", 350, y, 9, true);
      drawRightAligned("Amount", width - 50, y, 9, true);
      y -= 15;

      for (const d of invoice.disbursements) {
          drawText(d.accountName, 50, y, 9);
          drawText(d.bsb, 250, y, 9);
          drawText(d.accountNumber, 350, y, 9);
          drawRightAligned(formatCurrency(d.amount), width - 50, y, 9);
          y -= 15;
      }
  }

  y -= 40;

  // Signatures
  if (invoice.includeVendorSignature || invoice.includeBuyerSignature) {
      const sigY = 100; // Bottom area
      
      if (invoice.includeVendorSignature) {
          page.drawLine({ start: { x: 50, y: sigY + 20 }, end: { x: 250, y: sigY + 20 }, thickness: 1 });
          drawText("Vendor Signature", 50, sigY, 10);
      }

      if (invoice.includeBuyerSignature) {
          page.drawLine({ start: { x: 300, y: sigY + 20 }, end: { x: 500, y: sigY + 20 }, thickness: 1 });
          drawText("Buyer Signature", 300, sigY, 10);
      }
  }

  return pdfDoc.save();
}
