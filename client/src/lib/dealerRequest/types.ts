export type BrokerName = "Alex Qemal" | "Francis Valente";

export type DealerRequestForm = {
  // Section 1 – header
  supplierName: string;   // "Tax Invoice Request issued to"
  contactName?: string;   // optional contact person at dealership
  broker: BrokerName;
  dateIso: string;        // YYYY-MM-DD

  // Client details
  clientName: string;
  clientAbn?: string;
  clientAddress: string;

  // Settlement numbers
  priceOfVehicle: number;
  deposit: number;
  tradeIn: number;
  refundDeposit: number;
  financePayout: number;
  cashBackToClient: number;

  // Derived total
  invoiceBalance: number;
};

export function calculateInvoiceBalance(form: Partial<DealerRequestForm>): number {
  const P = form.priceOfVehicle || 0;
  const D = form.deposit || 0;
  const T = form.tradeIn || 0;
  const R = form.refundDeposit || 0;
  const F = form.financePayout || 0;
  const C = form.cashBackToClient || 0;
  return P - D - T + R + F + C;
}

export function getBrokerEmail(broker: BrokerName): string {
  return broker === "Alex Qemal" ? "alex@vgfs.com.au" : "francis@vgfs.com.au";
}

export function generateDefaultSubject(form: Partial<DealerRequestForm>): string {
  const clientName = form.clientName?.trim();
  return clientName ? `Tax Invoice Request - ${clientName}` : "Tax Invoice Request";
}

export function generateDefaultBody(form: Partial<DealerRequestForm>): string {
  const contactName = form.contactName?.trim();
  const clientName = form.clientName?.trim() || "[Client Name]";
  const brokerName = form.broker || "Alex Qemal";
  const brokerEmail = getBrokerEmail(brokerName);

  const greeting = contactName ? `Hi ${contactName},` : "Hi,";

  return `${greeting}

Please see attached Tax Invoice Request for ${clientName}.

If you are able to reply at your earliest convenience with your Tax Invoice, it would be greatly appreciated.

As soon as remittance is available, we will issue it to you for the confirmation of receipt of funds.

Kind Regards,
${brokerName}
${brokerEmail}
Valco Group Financial Services`;
}
