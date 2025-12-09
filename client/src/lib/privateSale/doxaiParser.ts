import { DoxaiParsed } from "./types";
import * as pdfjsLib from 'pdfjs-dist';

// Configure worker
// We use unpkg to match the installed version exactly to avoid version mismatch errors
// v5.4.449 is the installed version
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export async function parseDoxaiPdf(file: File): Promise<DoxaiParsed> {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        let fullText = "";
        
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            // In v5/modern pdf.js, items can be TextItem or TextMarkedContent
            // We safely extract 'str' from items that have it
            const pageText = textContent.items
                .map((item: any) => item.str || "")
                .join(" ");
            fullText += pageText + "\n";
        }
        
        return parseDoxaiText(fullText);
    } catch (error) {
        console.error("PDF Parsing Error:", error);
        throw new Error("Failed to parse PDF document");
    }
}

export function parseDoxaiText(text: string): DoxaiParsed {
    const result: DoxaiParsed = {};

    // Helper to find value after a label
    // We look for the label, then grab subsequent text until a reasonable delimiter or length
    const findAfterLabel = (label: string, maxLength = 100): string | undefined => {
        // Escape special chars in label just in case
        const safeLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`${safeLabel}\\s*([\\w\\s\\d/-]+)`, 'i');
        const match = text.match(regex);
        if (match && match[1]) {
            return match[1].trim();
        }
        return undefined;
    };

    // --- Vendor Details ---
    const firstName = findAfterLabel("Seller First name");
    const lastName = findAfterLabel("Seller Last name");
    
    if (firstName && lastName) {
        result.vendorName = `${firstName} ${lastName}`;
    }

    // Address
    const addressMatch = text.match(/Address\s+([A-Za-z0-9\s,]+(?:QLD|NSW|VIC|TAS|SA|WA|NT|ACT)\s+\d{4})/i);
    if (addressMatch) {
         result.vendorAddress = addressMatch[1].trim();
    } else {
        const simpleAddr = findAfterLabel("Address", 150);
        if (simpleAddr) result.vendorAddress = simpleAddr;
    }

    // --- Vehicle Details ---
    
    // VIN
    const vinMatch = text.match(/VIN\s+([A-HJ-NPR-Z0-9]{17})/i);
    if (vinMatch) {
        result.vehicleVin = vinMatch[1];
    }

    // Registration
    const regoMatch = text.match(/(?:Number Plate|Registration plate number:?)\s*([A-Z0-9]+)/i);
    if (regoMatch) {
        result.vehicleRegistration = regoMatch[1];
    }

    // Odometer
    const odoMatch = text.match(/Odometer(?:\s*Reading)?\s*(\d+)/i);
    if (odoMatch) {
        result.vehicleOdometer = odoMatch[1];
    }

    // NEVDIS Block
    const make = findAfterLabel("Make:");
    if (make) result.vehicleMake = make;

    const model = findAfterLabel("Model:");
    if (model) result.vehicleModel = model;

    const bodyType = findAfterLabel("Body type:");
    if (bodyType) result.vehicleDescription = bodyType;

    const engine = findAfterLabel("Engine number:");
    if (engine) result.vehicleEngineNumber = engine;

    const buildYear = findAfterLabel("Year of manufacture:");
    if (buildYear) result.vehicleBuildYear = buildYear;

    const compliance = findAfterLabel("Year/Month of compliance:");
    if (compliance) result.vehicleComplianceYearMonth = compliance;

    return result;
}
