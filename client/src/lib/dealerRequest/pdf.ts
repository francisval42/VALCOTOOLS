import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { DealerRequestForm, getBrokerEmail } from './types';
import { formatCurrency, round2 } from '../money';
import { formatDisplay } from '../dates';

export async function generateDealerRequestPdf(form: DealerRequestForm): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const navyColor = rgb(31/255, 42/255, 68/255);
  const orangeColor = rgb(254/255, 105/255, 0/255);
  const blackColor = rgb(0, 0, 0);
  const greyColor = rgb(0.5, 0.5, 0.5);
  const whiteColor = rgb(1, 1, 1);

  const leftMargin = 50;
  const rightMargin = width - 50;

  // Helper functions
  const drawText = (text: string, x: number, yPos: number, size: number = 10, isBold: boolean = false, color = blackColor, centered: boolean = false) => {
    const textFont = isBold ? fontBold : font;
    let finalX = x;
    if (centered) {
      const textWidth = textFont.widthOfTextAtSize(text || "", size);
      finalX = (width - textWidth) / 2;
    }
    page.drawText(text || "", { x: finalX, y: yPos, size, font: textFont, color });
  };

  const drawRightAligned = (text: string, rightX: number, yPos: number, size: number = 10, isBold: boolean = false, color = blackColor) => {
    const textWidth = (isBold ? fontBold : font).widthOfTextAtSize(text || "", size);
    drawText(text, rightX - textWidth, yPos, size, isBold, color);
  };

  // === LOGO ===
  try {
    const logoBytes = await fetch('/valco-logo.png').then(res => res.arrayBuffer());
    const logoImage = await pdfDoc.embedPng(logoBytes);
    const logoDims = logoImage.scale(0.2);
    const logoX = (width - logoDims.width) / 2;
    const logoY = height - 50 - logoDims.height;
    
    page.drawImage(logoImage, {
      x: logoX,
      y: logoY,
      width: logoDims.width,
      height: logoDims.height,
    });
  } catch (e) {
    console.warn("Could not load logo", e);
  }

  let y = height - 150;

  // === TITLE ===
  drawText("TAX INVOICE REQUEST", leftMargin, y, 20, true, navyColor);
  y -= 35;

  // === HEADER BLOCK ===
  drawText(`TO: ${form.supplierName}`, leftMargin, y, 11, false, blackColor);
  y -= 16;
  if (form.contactName) {
    drawText(`ATTN: ${form.contactName}`, leftMargin, y, 11, false, blackColor);
    y -= 16;
  }
  drawText(`FROM: Valco Group – ${form.broker}`, leftMargin, y, 11, false, blackColor);
  y -= 16;
  drawText(`DATE: ${formatDisplay(form.dateIso)}`, leftMargin, y, 11, false, blackColor);
  y -= 30;

  // === CLIENT DETAILS ===
  drawText("Client details (Invoice / Delivery To)", leftMargin, y, 12, true, navyColor);
  y -= 20;
  
  drawText(`Client: ${form.clientName}`, leftMargin, y, 10, false, blackColor);
  y -= 14;
  
  if (form.clientAbn) {
    drawText(`ABN: ${form.clientAbn}`, leftMargin, y, 10, false, blackColor);
    y -= 14;
  }
  
  drawText("Address:", leftMargin, y, 10, false, blackColor);
  y -= 14;
  
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
  
  const brokerEmail = getBrokerEmail(form.broker);
  drawText(`Please email the tax invoice to ${brokerEmail}.`, leftMargin, y, 10, true, navyColor);
  y -= 30;

  // === SETTLEMENT DETAILS ===
  drawText("Settlement details", leftMargin, y, 12, true, navyColor);
  y -= 20;

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

  y -= 5;
  page.drawLine({
    start: { x: leftMargin, y: y + 8 },
    end: { x: rightMargin, y: y + 8 },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8)
  });
  y -= 5;

  drawText("= Invoice Balance", col1X, y, 11, true, navyColor);
  drawRightAligned(formatCurrency(round2(form.invoiceBalance)), col3X, y, 11, true, orangeColor);

  // === FOOTER BOX ===
  const footerHeight = 100;
  page.drawRectangle({
    x: 0,
    y: 0,
    width: width,
    height: footerHeight,
    color: navyColor,
  });

  let footerY = footerHeight - 25;
  const footerLineHeight = 14;
  
  drawText("VALCO GROUP PTY LTD", 0, footerY, 10, false, whiteColor, true);
  footerY -= footerLineHeight;
  drawText("ABN 96 648 565 226", 0, footerY, 10, false, whiteColor, true);
  footerY -= footerLineHeight;
  drawText("510 / 89 - 93 High St, Kew VIC 3101", 0, footerY, 10, false, whiteColor, true);
  footerY -= footerLineHeight;
  drawText("03 8456 9966", 0, footerY, 10, false, whiteColor, true);
  footerY -= footerLineHeight;
  drawText("accounts@vgfs.com.au", 0, footerY, 10, false, whiteColor, true);

  return pdfDoc.save();
}
