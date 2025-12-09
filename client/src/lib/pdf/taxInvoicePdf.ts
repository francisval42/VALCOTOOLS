import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { TaxInvoice } from '../types';
import { calculateTotals, formatCurrency } from '../money';
import { formatDisplay } from '../dates';

export async function generateTaxInvoicePdf(invoice: TaxInvoice): Promise<Uint8Array> {
  // Try to load letterhead
  let pdfDoc: PDFDocument;
  let page;
  let width, height;

  try {
    const letterheadBytes = await fetch('/valco-letterhead.pdf').then(res => {
        if (!res.ok) throw new Error("No letterhead");
        return res.arrayBuffer();
    });
    pdfDoc = await PDFDocument.load(letterheadBytes);
    const pages = pdfDoc.getPages();
    page = pages[0];
    const size = page.getSize();
    width = size.width;
    height = size.height;
  } catch (e) {
    // Fallback if no letterhead
    console.warn("Letterhead not found, creating blank PDF");
    pdfDoc = await PDFDocument.create();
    page = pdfDoc.addPage([595.28, 841.89]); // A4
    width = 595.28;
    height = 841.89;
  }

  // Load and embed logo
  try {
      const logoBytes = await fetch('/valco-logo.png').then(res => res.arrayBuffer());
      const logoImage = await pdfDoc.embedPng(logoBytes);
      // Reduced scale by 20% (0.25 * 0.8 = 0.2)
      const logoDims = logoImage.scale(0.2); 
      const logoWidth = logoDims.width;
      const logoHeight = logoDims.height;
      
      // Center top
      const logoX = (width - logoWidth) / 2;
      const logoY = height - 50 - logoHeight; // 50px margin from top
      
      page.drawImage(logoImage, {
          x: logoX,
          y: logoY,
          width: logoWidth,
          height: logoHeight,
      });
  } catch (e) {
      console.warn("Could not load logo", e);
  }

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const navColor = rgb(31/255, 42/255, 68/255); // #1f2a44
  const orangeColor = rgb(254/255, 105/255, 0/255); // #fe6900
  const whiteColor = rgb(1, 1, 1);

  // Helper to draw text
  const drawText = (text: string, x: number, y: number, size: number = 10, isBold: boolean = false, color = navColor, centered: boolean = false) => {
    const textFont = isBold ? fontBold : font;
    let finalX = x;
    if (centered) {
        const textWidth = textFont.widthOfTextAtSize(text, size);
        finalX = (width - textWidth) / 2;
    }
    
    page.drawText(text, {
      x: finalX,
      y,
      size,
      font: textFont,
      color,
    });
  };

  const drawRightAligned = (text: string, rightX: number, y: number, size: number = 10, isBold: boolean = false, color = navColor) => {
    const textWidth = (isBold ? fontBold : font).widthOfTextAtSize(text, size);
    drawText(text, rightX - textWidth, y, size, isBold, color);
  };

  // Header content
  // Increased padding between logo and heading (lowered y start)
  let y = height - 200;

  // Invoice Title
  drawText("TAX INVOICE", 50, y, 24, true, navColor);
  
  // Invoice Metadata Box
  const metaX = 400;
  const metaY = y;
  
  drawText("Invoice No:", metaX, metaY, 10, true);
  drawRightAligned(invoice.invoiceNumber, width - 50, metaY, 10);
  
  drawText("Date:", metaX, metaY - 15, 10, true);
  drawRightAligned(formatDisplay(invoice.invoiceDate), width - 50, metaY - 15, 10);
  
  drawText("Due Date:", metaX, metaY - 30, 10, true);
  drawRightAligned(formatDisplay(invoice.dueDate), width - 50, metaY - 30, 10);
  
  if (invoice.reference) {
    drawText("Reference:", metaX, metaY - 45, 10, true);
    drawRightAligned(invoice.reference, width - 50, metaY - 45, 10);
  }

  y -= 80;

  // Bill To
  drawText("Bill To:", 50, y, 12, true, orangeColor);
  y -= 20;
  drawText(invoice.recipient.businessName, 50, y, 11, true);
  if (invoice.recipient.abn) {
      y -= 15;
      drawText(`ABN: ${invoice.recipient.abn}`, 50, y, 10);
  }

  y -= 50;

  // Table Header
  const tableTop = y;
  page.drawRectangle({
    x: 50,
    y: tableTop - 5,
    width: width - 100,
    height: 25,
    color: rgb(0.95, 0.95, 0.95)
  });

  drawText("Description", 60, tableTop + 3, 10, true);
  drawRightAligned("Amount", width - 60, tableTop + 3, 10, true);

  y -= 25;

  // Line Items
  for (const item of invoice.lineItems) {
    drawText(item.description, 60, y, 10);
    drawRightAligned(formatCurrency(item.amountIncGst || 0), width - 60, y, 10);
    y -= 20;
  }

  // Totals
  y -= 20;
  const totals = calculateTotals(invoice.lineItems, invoice.mode);

  // Divider
  page.drawLine({
    start: { x: 350, y: y + 10 },
    end: { x: width - 50, y: y + 10 },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });

  drawText("Subtotal (ex GST):", 350, y, 10, false);
  drawRightAligned(formatCurrency(totals.subtotalExGst), width - 60, y, 10);
  
  y -= 20;
  drawText("GST:", 350, y, 10, false);
  drawRightAligned(formatCurrency(totals.gstTotal), width - 60, y, 10);
  
  y -= 25;
  drawText("Total (Inc GST):", 350, y, 12, true, orangeColor);
  drawRightAligned(formatCurrency(totals.totalIncGst), width - 60, y, 12, true, orangeColor);

  // Footer / Payment Details
  if (invoice.includePaymentDetails) {
    // Moved up from 150 to 220 to sit higher
    const bottomY = 220; 
    drawText("PAYMENT DETAILS", 50, bottomY, 11, true, navColor);
    
    // Updated Bank Details
    drawText("Account Name: VALCO GROUP FINANCIAL SERVICES", 50, bottomY - 20, 10);
    drawText("Bank: CBA", 50, bottomY - 35, 10);
    drawText("BSB: 063185", 50, bottomY - 50, 10);
    drawText("Account: 11374231", 50, bottomY - 65, 10);
    drawText(`Ref: ${invoice.invoiceNumber}`, 50, bottomY - 80, 10);
  }

  // Footer Box
  const footerHeight = 100;
  page.drawRectangle({
    x: 0,
    y: 0,
    width: width,
    height: footerHeight,
    color: navColor,
  });

  // Footer Text
  // VALCO GROUP PTY LTD
  // ABN 96 648 565 226
  // 510 / 89 - 93 High St, Kew VIC 3101
  // 03 8456 9966
  // accounts@vgfs.com.au
  
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
}
