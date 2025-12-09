export type GstMode = "GST_INC" | "NO_GST";

export type FieldStatus = "missing" | "autoFilled" | "confirmed";

export type FieldId =
  | "vendorName"
  | "vendorAddress"
  | "buyerName"
  | "buyerAddress"
  | "vehicleMake"
  | "vehicleModel"
  | "vehicleDescription"
  | "vehicleVin"
  | "vehicleEngineNumber"
  | "vehicleRegistration"
  | "vehicleOdometer"
  | "vehicleBuildDate"
  | "vehicleComplianceDate"
  | "invoiceAmount";

export type FieldState = {
  value: string;
  status: FieldStatus;
  initialSource: "empty" | "manual" | "parser";
};

export type PrivateSaleDisbursement = {
  id: string;
  amount: number;
  accountName: string;
  bsb: string;
  accountNumber: string;
};

export type PrivateSaleInvoice = {
  id: string;
  title: "TAX INVOICE" | "INVOICE"; // derived from gstMode
  invoiceDate: string; // ISO YYYY-MM-DD
  gstMode: GstMode;

  vendor: {
    name: string;
    abn?: string;
    acn?: string;
    address?: string;
    phone?: string;
    email?: string;
  };

  buyer: {
    name: string;
    address?: string;
  };

  vehicle: {
    make: string;
    model: string;
    description?: string;
    vin?: string;
    engineNumber?: string;
    registration?: string;
    odometer?: string;
    buildDate?: string;
    complianceDate?: string;
  };

  invoiceAmount: number;  // as entered (inc GST or not depending on mode)
  gstAmount: number;      // derived if GST_INC, else 0
  totalPayable: number;   // equals invoiceAmount

  disbursements: PrivateSaleDisbursement[];

  includeVendorSignature: boolean;
  includeBuyerSignature: boolean;
};

// DoxAI Parsed Type
export type DoxaiParsed = {
  vendorName?: string;
  vendorAddress?: string;
  buyerName?: string; 
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleDescription?: string;
  vehicleVin?: string;
  vehicleEngineNumber?: string;
  vehicleRegistration?: string;
  vehicleOdometer?: string;
  vehicleBuildYear?: string;
  vehicleComplianceYearMonth?: string;
};
