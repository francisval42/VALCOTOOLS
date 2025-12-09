import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { LoanCalcForm } from './types';
import { formatCurrency, round2 } from '../money';

const POPPINS_REGULAR_URL = 'https://fonts.gstatic.com/s/poppins/v21/pxiEyp8kv8JHgFVrFJA.ttf';
const POPPINS_SEMIBOLD_URL = 'https://fonts.gstatic.com/s/poppins/v21/pxiByp8kv8JHgFVrLEj6V1s.ttf';
const POPPINS_BOLD_URL = 'https://fonts.gstatic.com/s/poppins/v21/pxiByp8kv8JHgFVrLCz7V1s.ttf';

export async function generateLoanQuotePdf(form: LoanCalcForm, clientOrRef: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

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
  const lightGreyColor = rgb(0.9, 0.9, 0.9);
  const whiteColor = rgb(1, 1, 1);

  const leftMargin = 50;
  const rightMargin = width - 50;
  const contentWidth = rightMargin - leftMargin;
  const bodySize = 10;

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

  const drawLabelValue = (label: string, value: string, yPos: number) => {
    drawText(label, leftMargin + 10, yPos, bodySize, 'regular', greyColor);
    drawRightAligned(value, rightMargin - 10, yPos, bodySize, 'semibold', blackColor);
  };

  try {
    const logoBytes = await fetch('/valco-logo.png').then(res => res.arrayBuffer());
    const logoImage = await pdfDoc.embedPng(logoBytes);
    const logoDims = logoImage.scale(0.15);
    const logoX = (width - logoDims.width) / 2;
    const logoY = height - 40 - logoDims.height;
    
    page.drawImage(logoImage, {
      x: logoX,
      y: logoY,
      width: logoDims.width,
      height: logoDims.height,
    });
  } catch (e) {
    console.warn("Could not load logo", e);
  }

  let y = height - 130;

  drawText("LOAN QUOTE", 0, y, 24, 'bold', navyColor, true);
  y -= 10;
  
  const titleWidth = fontBold.widthOfTextAtSize("LOAN QUOTE", 24);
  const lineStartX = (width - titleWidth) / 2;
  page.drawRectangle({
    x: lineStartX,
    y: y,
    width: titleWidth,
    height: 3,
    color: orangeColor,
  });
  y -= 25;

  if (clientOrRef.trim()) {
    drawText(`Client / Reference: ${clientOrRef.trim()}`, 0, y, 11, 'semibold', blackColor, true);
    y -= 30;
  } else {
    y -= 10;
  }

  // Section: Deal Inputs
  drawText("Deal Inputs", leftMargin, y, 12, 'bold', navyColor);
  page.drawRectangle({ x: leftMargin, y: y - 4, width: 35, height: 2, color: orangeColor });
  y -= 25;

  page.drawRectangle({
    x: leftMargin,
    y: y - 75,
    width: contentWidth,
    height: 95,
    color: lightGreyColor,
    borderColor: rgb(0.85, 0.85, 0.85),
    borderWidth: 1,
  });

  drawLabelValue("Vehicle Price", formatCurrency(round2(form.vehiclePrice)), y);
  y -= 18;
  drawLabelValue("Deposit", formatCurrency(round2(form.deposit)), y);
  y -= 18;
  drawLabelValue("Trade In", formatCurrency(round2(form.tradeIn)), y);
  y -= 18;
  drawLabelValue("Payout", formatCurrency(round2(form.payout)), y);
  y -= 22;

  page.drawLine({
    start: { x: leftMargin + 10, y: y + 8 },
    end: { x: rightMargin - 10, y: y + 8 },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7),
  });

  drawText("Amount Financed", leftMargin + 10, y, bodySize, 'bold', navyColor);
  drawRightAligned(formatCurrency(round2(form.amountFinanced)), rightMargin - 10, y, 11, 'bold', orangeColor);
  y -= 35;

  // Section: Loan Settings
  drawText("Loan Settings", leftMargin, y, 12, 'bold', navyColor);
  page.drawRectangle({ x: leftMargin, y: y - 4, width: 35, height: 2, color: orangeColor });
  y -= 25;

  page.drawRectangle({
    x: leftMargin,
    y: y - 75,
    width: contentWidth,
    height: 95,
    color: lightGreyColor,
    borderColor: rgb(0.85, 0.85, 0.85),
    borderWidth: 1,
  });

  drawLabelValue("Term", `${form.termMonths} months`, y);
  y -= 18;
  drawLabelValue("Interest Rate p.a.", `${round2(form.annualRate)}%`, y);
  y -= 18;
  drawLabelValue("Balloon Amount", formatCurrency(round2(form.balloonAmount)), y);
  y -= 18;
  drawLabelValue("Balloon Percent", `${round2(form.balloonPercent)}%`, y);
  y -= 22;
  drawLabelValue("Monthly Account Fee", formatCurrency(round2(form.monthlyFee)), y);
  y -= 35;

  // Section: Repayments
  drawText("Repayments", leftMargin, y, 12, 'bold', navyColor);
  page.drawRectangle({ x: leftMargin, y: y - 4, width: 35, height: 2, color: orangeColor });
  y -= 25;

  const boxWidth = (contentWidth - 20) / 3;
  const boxHeight = 60;
  const boxY = y - boxHeight;

  const repayments = [
    { label: "Monthly", value: form.monthlyRepayment },
    { label: "Fortnightly", value: form.fortnightlyRepayment },
    { label: "Weekly", value: form.weeklyRepayment },
  ];

  repayments.forEach((rep, i) => {
    const boxX = leftMargin + i * (boxWidth + 10);
    
    page.drawRectangle({
      x: boxX,
      y: boxY,
      width: boxWidth,
      height: boxHeight,
      color: navyColor,
    });

    const labelWidth = font.widthOfTextAtSize(rep.label, 10);
    drawText(rep.label, boxX + (boxWidth - labelWidth) / 2, boxY + boxHeight - 18, 10, 'regular', whiteColor);

    const valueStr = formatCurrency(round2(rep.value));
    const valueWidth = fontBold.widthOfTextAtSize(valueStr, 14);
    drawText(valueStr, boxX + (boxWidth - valueWidth) / 2, boxY + 15, 14, 'bold', orangeColor);
  });

  // Footer
  const footerHeight = 70;
  page.drawRectangle({
    x: 0,
    y: 0,
    width: width,
    height: footerHeight,
    color: navyColor,
  });

  let footerY = footerHeight - 18;
  const footerLineHeight = 12;
  
  drawText("VALCO GROUP PTY LTD  |  ABN 96 648 565 226", 0, footerY, 9, 'regular', whiteColor, true);
  footerY -= footerLineHeight;
  drawText("510 / 89 - 93 High St, Kew VIC 3101  |  03 8456 9966  |  accounts@vgfs.com.au", 0, footerY, 8, 'regular', whiteColor, true);
  footerY -= footerLineHeight + 4;
  drawText("This quote is for internal use only and does not constitute a formal loan offer.", 0, footerY, 7, 'regular', rgb(0.7, 0.7, 0.7), true);

  return pdfDoc.save();
}
