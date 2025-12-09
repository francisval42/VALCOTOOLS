import { DoxaiParsed } from "./types";
import * as pdfjsLib from 'pdfjs-dist';

// Configure worker - we need to point to the worker file in node_modules
// In a vite environment, we usually need to import the worker script URL
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export async function parseDoxaiPdf(file: File): Promise<DoxaiParsed> {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = "";
    
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        fullText += pageText + "\n";
    }
    
    return parseDoxaiText(fullText);
}

export function parseDoxaiText(text: string): DoxaiParsed {
    const result: DoxaiParsed = {};

    // Helper to find value after a label
    // We look for the label, then grab subsequent text until a reasonable delimiter or length
    const findAfterLabel = (label: string, maxLength = 100): string | undefined => {
        const regex = new RegExp(`${label}\\s*([\\w\\s\\d/-]+)`, 'i');
        const match = text.match(regex);
        if (match && match[1]) {
            return match[1].trim();
        }
        return undefined;
    };

    // --- Vendor Details ---
    // Look for "Seller First name" and "Seller Last name"
    // In PDF text extraction, these might appear as "Seller First name Ashley" "Seller Last name Gill"
    // Or sometimes structured differently.
    
    const firstName = findAfterLabel("Seller First name");
    const lastName = findAfterLabel("Seller Last name");
    
    if (firstName && lastName) {
        result.vendorName = `${firstName} ${lastName}`;
    }

    // Address
    // "Address U 1 34 FIRST AVENUE PALM BEACH 4221"
    // Often in photo ID section
    const addressMatch = text.match(/Address\s+([A-Za-z0-9\s,]+(?:QLD|NSW|VIC|TAS|SA|WA|NT|ACT)\s+\d{4})/i);
    if (addressMatch) {
         result.vendorAddress = addressMatch[1].trim();
    } else {
        // Fallback: try to find just "Address" followed by text
        // This is risky as "Address" is common word.
        // Let's look for "Residential Address" or similar if DoxAI uses it
        // Based on prompt: "Find line beginning with “Address”"
        // Since we joined everything with spaces, we look for the sequence
        const simpleAddr = findAfterLabel("Address", 150);
        if (simpleAddr) result.vendorAddress = simpleAddr;
    }

    // --- Vehicle Details ---
    
    // VIN
    // "VIN MNAUM2F50KW977225"
    const vinMatch = text.match(/VIN\s+([A-HJ-NPR-Z0-9]{17})/i);
    if (vinMatch) {
        result.vehicleVin = vinMatch[1];
    }

    // Registration
    // "Number Plate 741AT4" or "Registration plate number: 741AT4"
    const regoMatch = text.match(/(?:Number Plate|Registration plate number:?)\s*([A-Z0-9]+)/i);
    if (regoMatch) {
        result.vehicleRegistration = regoMatch[1];
    }

    // Odometer
    // "Odometer Reading 107858"
    const odoMatch = text.match(/Odometer(?:\s*Reading)?\s*(\d+)/i);
    if (odoMatch) {
        result.vehicleOdometer = odoMatch[1];
    }

    // NEVDIS Block
    // Make
    const make = findAfterLabel("Make:");
    if (make) result.vehicleMake = make;

    // Model
    const model = findAfterLabel("Model:");
    if (model) result.vehicleModel = model;

    // Description (Body Type)
    const bodyType = findAfterLabel("Body type:");
    if (bodyType) result.vehicleDescription = bodyType;

    // Engine Number
    const engine = findAfterLabel("Engine number:");
    if (engine) result.vehicleEngineNumber = engine;

    // Build Year
    // "Year of manufacture: 2019"
    const buildYear = findAfterLabel("Year of manufacture:");
    if (buildYear) result.vehicleBuildYear = buildYear;

    // Compliance Date
    // "Year/Month of compliance: 2019-09"
    const compliance = findAfterLabel("Year/Month of compliance:");
    if (compliance) result.vehicleComplianceYearMonth = compliance;

    return result;
}
