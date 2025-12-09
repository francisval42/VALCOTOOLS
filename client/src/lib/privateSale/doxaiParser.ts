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

    // List of labels that indicate the start of a new field (to stop capturing)
    // We will use these to terminate capture groups
    const stopWords = [
        "Seller First name", "Seller Last name", "Seller e-mail", "Seller Mobile",
        "Buyer First name", "Buyer Last name",
        "Address", "Card Number", "Owner of the Vehicle", 
        "Verification System", "Verified by", "Important NEVDIS",
        "Make", "Model", "Body type", "Colour", "VIN", "Registration plate number", "Number Plate",
        "Engine number", "Odometer", "Build Date", "Year of manufacture", "Year/Month of compliance",
        "Please confirm", "Confirmed", "Flagged", "Stolen", "Written-off", "Reminder"
    ];

    // Build a regex part that matches any of the stop words
    const stopWordsPattern = stopWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join("|");

    // Helper to find value after a label
    // We look for the label, then grab subsequent text until:
    // 1. A stop word is found
    // 2. A newline (if meaningful, but here text is joined with spaces often)
    // 3. Max length is reached
    const findAfterLabel = (label: string): string | undefined => {
        const safeLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Regex Explanation:
        // 1. Match the label (case insensitive): `(?:${safeLabel})`
        // 2. Match separator (colon, spaces): `[:\s]*`
        // 3. Capture content: `((?:(?!${stopWordsPattern}).)+?)`
        //    - Lookahead to ensure we don't match start of a stop word
        //    - Lazy match characters
        // 4. Match end conditions: Stop at stop word or end of string
        
        const regex = new RegExp(`${safeLabel}[:\\s]*((?:(?!${stopWordsPattern}).)+)`, 'i');
        const match = text.match(regex);
        
        if (match && match[1]) {
            let val = match[1].trim();
            // Clean up common trailing garbage if regex missed it
            // Sometimes "Please confirm" is attached without space
            stopWords.forEach(sw => {
                if (val.toLowerCase().endsWith(sw.toLowerCase())) {
                    val = val.substring(0, val.length - sw.length).trim();
                }
            });
            return val;
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
    // "Address U 1 34 FIRST AVENUE PALM BEACH 4221"
    // The previous regex was better for address because addresses vary wildly but usually end in postcode
    // Let's stick to the specific regex for address but make it stricter to avoid capturing previous labels
    const addressMatch = text.match(/Address\s+([A-Za-z0-9\s,./-]+(?:QLD|NSW|VIC|TAS|SA|WA|NT|ACT)\s+\d{4})/i);
    if (addressMatch) {
         result.vendorAddress = addressMatch[1].trim();
    } else {
        // Fallback using the stop-word aware finder
        const simpleAddr = findAfterLabel("Address");
        if (simpleAddr) result.vendorAddress = simpleAddr;
    }

    // --- Vehicle Details ---
    
    // VIN
    // Strict VIN: 17 chars, alphanumeric (excluding I, O, Q usually but let's be safe)
    const vinMatch = text.match(/VIN\s+([A-HJ-NPR-Z0-9]{17})/i);
    if (vinMatch) {
        result.vehicleVin = vinMatch[1];
    } else {
        // Fallback
        const v = findAfterLabel("VIN");
        if (v && v.length >= 17) result.vehicleVin = v.substring(0, 17);
    }

    // Registration
    // "Number Plate 741AT4" or "Registration plate number: 741AT4"
    // Avoid capturing "Flagged" or status words
    const regoMatch = text.match(/(?:Number Plate|Registration plate number)[:\s]*([A-Z0-9]+)(?:\s|$)/i);
    if (regoMatch) {
        // Filter out common status words if they got matched
        const val = regoMatch[1].trim();
        if (!["FLAGGED", "STOLEN", "WRITTEN", "CONFIRMED"].includes(val.toUpperCase())) {
            result.vehicleRegistration = val;
        }
    }

    // Odometer
    // Strict digits
    const odoMatch = text.match(/Odometer(?:\s*Reading)?[:\s]*(\d+)/i);
    if (odoMatch) {
        result.vehicleOdometer = odoMatch[1];
    }

    // NEVDIS Block
    // Use the new stop-word aware finder
    const make = findAfterLabel("Make"); // removed colon to be more flexible
    if (make) result.vehicleMake = make;

    const model = findAfterLabel("Model");
    if (model) result.vehicleModel = model;

    const bodyType = findAfterLabel("Body type");
    if (bodyType) result.vehicleDescription = bodyType;

    const engine = findAfterLabel("Engine number");
    if (engine) result.vehicleEngineNumber = engine;

    // Dates - try to capture just the year or year-month
    const buildYear = findAfterLabel("Year of manufacture");
    if (buildYear) {
         // Extract just the year if it looks like a year
         const y = buildYear.match(/\b(19|20)\d{2}\b/);
         result.vehicleBuildYear = y ? y[0] : buildYear;
    }

    const compliance = findAfterLabel("Year/Month of compliance");
    if (compliance) {
        // Extract YYYY-MM
        const ym = compliance.match(/\b(19|20)\d{2}[-/]\d{2}\b/);
        result.vehicleComplianceYearMonth = ym ? ym[0] : compliance;
    }

    return result;
}
