import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { DealerRequestForm, getBrokerEmail } from './types';
import { formatCurrency, round2 } from '../money';
import { formatDisplay } from '../dates';

export async function generateDealerRequestPdf(form: DealerRequestForm): Promise<Uint8Array> {
  // Load the Valco letterhead
  const letterheadBytes = await fetch('/valco-letterhead.pdf').then(res => res.arrayBuffer());
  const letterheadDoc = await PDFDocument.load(letterheadBytes);
  
  // Create new document and copy letterhead page
  const pdfDoc = await PDFDocument.create();
  const [copiedPage] = await pdfDoc.copyPages(letterheadDoc, [0]);
  pdfDoc.addPage(copiedPage);
  
  const page = pdfDoc.getPage(0);
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const navyColor = rgb(31/255, 42/255, 68/255);
  const orangeColor = rgb(254/255, 105/255, 0/255);
  const blackColor = rgb(0, 0, 0);
  const greyColor = rgb(0.5, 0.5, 0.5);

  const leftMargin = 60;
  const rightMargin = width - 60;
  let y = height - 130; // Start below logo

  // Helper functions
  const drawText = (text: string, x: number, yPos: number, size: number = 10, isBold: boolean = false, color = blackColor) => {
    page.drawText(text || "", { x, y: yPos, size, font: isBold ? fontBold : font, color });
  };

  const drawRightAligned = (text: string, rightX: number, yPos: number, size: number = 10, isBold: boolean = false, color = blackColor) => {
    const textWidth = (isBold ? fontBold : font).widthOfTextAtSize(text || "", size);
    drawText(text, rightX - textWidth, yPos, size, isBold, color);
  };

  // === TITLE ===
  drawText("TAX INVOICE REQUEST", leftMargin, y, 18, true, navyColor);
  y -= 30;

  // === HEADER BLOCK ===
  drawText(`TO: ${form.supplierName}`, leftMargin, y, 11, false, blackColor);
  y -= 16;
  drawText(`FROM: Valco Group – ${form.broker}`, leftMargin, y, 11, false, blackColor);
  y -= 16;
  drawText(`DATE: ${formatDisplay(form.dateIso)}`, leftMargin, y, 11, false, blackColor);
  y -= 30;

  // === CLIENT DETAILS ===
  drawText("Client details (Invoice / Delivery To)", leftMargin, y, 12, true, navyColor);
  y -= 18;
  
  drawText(`Client: ${form.clientName}`, leftMargin, y, 10, false, blackColor);
  y -= 14;
  
  if (form.clientAbn) {
    drawText(`ABN: ${form.clientAbn}`, leftMargin, y, 10, false, blackColor);
    y -= 14;
  }
  
  drawText("Address:", leftMargin, y, 10, false, blackColor);
  y -= 14;
  
  // Multi-line address
  const addressLines = form.clientAddress.split('\n');
  for (const line of addressLines) {
    drawText(line.trim(), leftMargin, y, 10, false, blackColor);
    y -= 14;
  }
  
  y -= 20;

  // === INSTRUCTION SECTION ===
  drawText("Please include all vehicle identifiers in your tax invoice, including:", leftMargin, y, 10, false, blackColor);
  y -= 16;

  const bulletItems = [
    "Whether the vehicle is New, Used or Demo",
    "VIN or Serial Number",
    "Engine Number",
    "Registration Number (if registered)",
    "Colour",
    "Make, Model and Badge / Series",
    "Build Date and Compliance Date",
    "Any other relevant identifiers",
    "Your dealership bank details for payment (account name, BSB and account number)"
  ];

  for (const item of bulletItems) {
    drawText(`•  ${item}`, leftMargin + 10, y, 9, false, blackColor);
    y -= 13;
  }

  y -= 10;
  
  // Broker email instruction
  const brokerEmail = getBrokerEmail(form.broker);
  drawText(`Please email the tax invoice to ${brokerEmail}.`, leftMargin, y, 10, true, navyColor);
  y -= 30;

  // === SETTLEMENT DETAILS ===
  drawText("Settlement details", leftMargin, y, 12, true, navyColor);
  y -= 20;

  // Settlement table
  const col1X = leftMargin;
  const col2X = leftMargin + 220;
  const col3X = rightMargin;

  const settlementRows = [
    { label: "Price of vehicle", sign: "+", amount: form.priceOfVehicle },
    { label: "Less total deposit", sign: "-", amount: form.deposit },
    { label: "Less trade in", sign: "-", amount: form.tradeIn },
    { label: "Plus refund deposit", sign: "+", amount: form.refundDeposit },
    { label: "Plus finance payout", sign: "+", amount: form.financePayout },
    { label: "Plus cash back to client", sign: "+", amount: form.cashBackToClient },
  ];

  for (const row of settlementRows) {
    drawText(row.label, col1X, y, 10, false, blackColor);
    drawText(row.sign, col2X, y, 10, false, greyColor);
    drawRightAligned(formatCurrency(round2(row.amount || 0)), col3X, y, 10, false, blackColor);
    y -= 16;
  }

  // Separator line
  y -= 5;
  page.drawLine({
    start: { x: leftMargin, y: y + 8 },
    end: { x: rightMargin, y: y + 8 },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8)
  });
  y -= 5;

  // Invoice Balance row
  drawText("= Invoice Balance", col1X, y, 11, true, navyColor);
  drawRightAligned(formatCurrency(round2(form.invoiceBalance)), col3X, y, 11, true, orangeColor);

  return pdfDoc.save();
}
