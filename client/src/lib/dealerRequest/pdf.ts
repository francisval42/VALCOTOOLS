import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { DealerRequestForm, getBrokerEmail } from './types';
import { formatCurrency, round2 } from '../money';
import { formatDisplay } from '../dates';

const POPPINS_REGULAR_URL = 'https://fonts.gstatic.com/s/poppins/v21/pxiEyp8kv8JHgFVrFJA.ttf';
const POPPINS_SEMIBOLD_URL = 'https://fonts.gstatic.com/s/poppins/v21/pxiByp8kv8JHgFVrLEj6V1s.ttf';
const POPPINS_BOLD_URL = 'https://fonts.gstatic.com/s/poppins/v21/pxiByp8kv8JHgFVrLCz7V1s.ttf';

export async function generateDealerRequestPdf(form: DealerRequestForm): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  // Fetch and embed Poppins fonts
  const [regularFontBytes, semiboldFontBytes, boldFontBytes] = await Promise.all([
    fetch(POPPINS_REGULAR_URL).then(res => res.arrayBuffer()),
    fetch(POPPINS_SEMIBOLD_URL).then(res => res.arrayBuffer()),
    fetch(POPPINS_BOLD_URL).then(res => res.arrayBuffer()),
  ]);

  const font = await pdfDoc.embedFont(regularFontBytes);
  const fontSemiBold = await pdfDoc.embedFont(semiboldFontBytes);
  const fontBold = await pdfDoc.embedFont(boldFontBytes);
  
  const navyColor = rgb(31/255, 42/255, 68/255);
  const orangeColor = rgb(254/255, 105/255, 0/255);
  const blackColor = rgb(0, 0, 0);
  const greyColor = rgb(0.45, 0.45, 0.45);
  const lightGreyColor = rgb(0.85, 0.85, 0.85);
  const whiteColor = rgb(1, 1, 1);
  const bgColor = rgb(0.98, 0.98, 0.98);

  const leftMargin = 50;
  const rightMargin = width - 50;
  const contentWidth = rightMargin - leftMargin;

  // Standard font size for body
  const bodySize = 10;
  const sectionHeaderSize = 11;

  // Helper functions
  const drawText = (text: string, x: number, yPos: number, size: number = bodySize, fontType: 'regular' | 'semibold' | 'bold' = 'regular', color = blackColor, centered: boolean = false) => {
    const textFont = fontType === 'bold' ? fontBold : fontType === 'semibold' ? fontSemiBold : font;
    let finalX = x;
    if (centered) {
      const textWidth = textFont.widthOfTextAtSize(text || "", size);
      finalX = (width - textWidth) / 2;
    }
    page.drawText(text || "", { x: finalX, y: yPos, size, font: textFont, color });
  };

  const drawRightAligned = (text: string, rightX: number, yPos: number, size: number = bodySize, fontType: 'regular' | 'semibold' | 'bold' = 'regular', color = blackColor) => {
    const textFont = fontType === 'bold' ? fontBold : fontType === 'semibold' ? fontSemiBold : font;
    const textWidth = textFont.widthOfTextAtSize(text || "", size);
    drawText(text, rightX - textWidth, yPos, size, fontType, color);
  };

  // === LOGO ===
  try {
    const logoBytes = await fetch('/valco-logo.png').then(res => res.arrayBuffer());
    const logoImage = await pdfDoc.embedPng(logoBytes);
    const logoDims = logoImage.scale(0.18);
    const logoX = (width - logoDims.width) / 2;
    const logoY = height - 45 - logoDims.height;
    
    page.drawImage(logoImage, {
      x: logoX,
      y: logoY,
      width: logoDims.width,
      height: logoDims.height,
    });
  } catch (e) {
    console.warn("Could not load logo", e);
  }

  let y = height - 140;

  // === TITLE - CENTERED ===
  drawText("TAX INVOICE REQUEST", 0, y, 22, 'bold', navyColor, true);
  y -= 8;
  
  // Orange accent line under title
  const titleWidth = fontBold.widthOfTextAtSize("TAX INVOICE REQUEST", 22);
  const lineStartX = (width - titleWidth) / 2;
  page.drawRectangle({
    x: lineStartX,
    y: y,
    width: titleWidth,
    height: 3,
    color: orangeColor,
  });
  y -= 30;

  // === TO/FROM BLOCK with subtle background ===
  const headerBlockHeight = form.contactName ? 80 : 65;
  page.drawRectangle({
    x: leftMargin,
    y: y - headerBlockHeight + 15,
    width: contentWidth,
    height: headerBlockHeight,
    color: bgColor,
    borderColor: lightGreyColor,
    borderWidth: 1,
  });
  
  y -= 5;
  drawText(`TO:`, leftMargin + 15, y, bodySize, 'semibold', greyColor);
  drawText(form.supplierName, leftMargin + 50, y, bodySize, 'semibold', blackColor);
  y -= 16;
  
  if (form.contactName) {
    drawText(`ATTN:`, leftMargin + 15, y, bodySize, 'regular', greyColor);
    drawText(form.contactName, leftMargin + 50, y, bodySize, 'regular', blackColor);
    y -= 16;
  }
  
  drawText(`FROM:`, leftMargin + 15, y, bodySize, 'regular', greyColor);
  drawText(`Valco Group – ${form.broker}`, leftMargin + 50, y, bodySize, 'regular', blackColor);
  y -= 16;
  
  drawText(`DATE:`, leftMargin + 15, y, bodySize, 'regular', greyColor);
  drawText(formatDisplay(form.dateIso), leftMargin + 50, y, bodySize, 'regular', blackColor);
  y -= 30;

  // === CLIENT DETAILS SECTION ===
  drawText("Client Details", leftMargin, y, sectionHeaderSize, 'bold', navyColor);
  // Small accent bar
  page.drawRectangle({
    x: leftMargin,
    y: y - 4,
    width: 40,
    height: 2,
    color: orangeColor,
  });
  y -= 20;
  
  drawText(form.clientName, leftMargin, y, bodySize, 'semibold', blackColor);
  y -= 14;
  
  if (form.clientAbn) {
    drawText(`ABN: ${form.clientAbn}`, leftMargin, y, bodySize, 'regular', greyColor);
    y -= 14;
  }
  
  const addressLines = form.clientAddress.split('\n');
  for (const line of addressLines) {
    if (line.trim()) {
      drawText(line.trim(), leftMargin, y, bodySize, 'regular', blackColor);
      y -= 14;
    }
  }
  
  y -= 18;

  // === INSTRUCTIONS SECTION ===
  drawText("Vehicle Identifier Requirements", leftMargin, y, sectionHeaderSize, 'bold', navyColor);
  page.drawRectangle({
    x: leftMargin,
    y: y - 4,
    width: 40,
    height: 2,
    color: orangeColor,
  });
  y -= 18;
  
  drawText("Please include the following in your tax invoice:", leftMargin, y, bodySize, 'regular', blackColor);
  y -= 16;

  const bulletItems = [
    "Vehicle condition (New, Used or Demo)",
    "VIN / Serial Number & Engine Number",
    "Registration Number (if registered)",
    "Colour, Make, Model & Badge / Series",
    "Build Date & Compliance Date",
    "Your dealership bank details (BSB & Account)"
  ];

  for (const item of bulletItems) {
    drawText("•", leftMargin + 8, y, bodySize, 'regular', orangeColor);
    drawText(item, leftMargin + 22, y, 9, 'regular', blackColor);
    y -= 13;
  }

  y -= 8;
  
  const brokerEmail = getBrokerEmail(form.broker);
  drawText("Email invoice to:", leftMargin, y, bodySize, 'regular', greyColor);
  drawText(brokerEmail, leftMargin + 80, y, bodySize, 'semibold', navyColor);
  y -= 28;

  // === SETTLEMENT DETAILS ===
  drawText("Settlement Details", leftMargin, y, sectionHeaderSize, 'bold', navyColor);
  page.drawRectangle({
    x: leftMargin,
    y: y - 4,
    width: 40,
    height: 2,
    color: orangeColor,
  });
  y -= 22;

  // Settlement table with alternating rows
  const settlementRows = [
    { label: "Price of vehicle", sign: "+", amount: form.priceOfVehicle },
    { label: "Less: Total deposit", sign: "−", amount: form.deposit },
    { label: "Less: Trade in", sign: "−", amount: form.tradeIn },
    { label: "Plus: Refund deposit", sign: "+", amount: form.refundDeposit },
    { label: "Plus: Finance payout", sign: "+", amount: form.financePayout },
    { label: "Plus: Cash back to client", sign: "+", amount: form.cashBackToClient },
  ];

  const rowHeight = 18;
  const tableStartY = y;
  
  settlementRows.forEach((row, index) => {
    const rowY = tableStartY - (index * rowHeight);
    
    // Alternate row background
    if (index % 2 === 0) {
      page.drawRectangle({
        x: leftMargin,
        y: rowY - 4,
        width: contentWidth,
        height: rowHeight,
        color: bgColor,
      });
    }
    
    drawText(row.label, leftMargin + 8, rowY, bodySize, 'regular', blackColor);
    drawText(row.sign, leftMargin + 200, rowY, bodySize, 'regular', greyColor);
    drawRightAligned(formatCurrency(round2(row.amount || 0)), rightMargin - 8, rowY, bodySize, 'regular', blackColor);
  });

  y = tableStartY - (settlementRows.length * rowHeight) - 8;

  // Total row with highlight
  page.drawRectangle({
    x: leftMargin,
    y: y - 6,
    width: contentWidth,
    height: 24,
    color: navyColor,
  });
  
  drawText("Invoice Balance", leftMargin + 8, y + 2, 11, 'bold', whiteColor);
  drawRightAligned(formatCurrency(round2(form.invoiceBalance)), rightMargin - 8, y + 2, 12, 'bold', orangeColor);

  // === FOOTER BOX ===
  const footerHeight = 85;
  page.drawRectangle({
    x: 0,
    y: 0,
    width: width,
    height: footerHeight,
    color: navyColor,
  });

  let footerY = footerHeight - 22;
  const footerLineHeight = 13;
  
  drawText("VALCO GROUP PTY LTD", 0, footerY, 10, 'bold', whiteColor, true);
  footerY -= footerLineHeight;
  drawText("ABN 96 648 565 226", 0, footerY, 9, 'regular', whiteColor, true);
  footerY -= footerLineHeight;
  drawText("510 / 89 - 93 High St, Kew VIC 3101", 0, footerY, 9, 'regular', whiteColor, true);
  footerY -= footerLineHeight;
  drawText("03 8456 9966  |  accounts@vgfs.com.au", 0, footerY, 9, 'regular', whiteColor, true);

  return pdfDoc.save();
}
