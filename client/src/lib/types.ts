export type InvoiceParty = {
  businessName: string;
  abn?: string;
};

export type InvoiceLineItem = {
  id: string;
  description: string;
  amountIncGst: number; // user entered amount, always treated as the payable amount
};

export type TaxInvoiceMode = "GST_INC" | "NO_GST";

export type TaxInvoice = {
  id: string;                // internal id for history
  invoiceNumber: string;
  invoiceDate: string;       // ISO YYYY-MM-DD
  dueDate: string;           // ISO YYYY-MM-DD
  reference?: string;

  mode: TaxInvoiceMode;      // "GST_INC" or "NO_GST"

  supplier: InvoiceParty;    // Valco - mostly static
  recipient: InvoiceParty;   // Invoice To

  lineItems: InvoiceLineItem[];

  subtotalExGst: number;
  gstTotal: number;
  totalIncGst: number;

  includePaymentDetails: boolean;
};

export type SavedSupplier = {
  id: string;          // generated with something simple like Date.now + random
  businessName: string;
  abn?: string;
};
