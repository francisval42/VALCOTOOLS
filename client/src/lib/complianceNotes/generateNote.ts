import { ComplianceFormData, CreditEnquiry } from "./types";

function generateClientIdentification(idVerification: "biometric" | "personal"): string {
  if (idVerification === "biometric") {
    return "No – Lender completed biometric ID verification prior to settlement.";
  }
  return "Yes – The broker has personally met the client and sighted the original identification documents.";
}

function generateMedicareVerification(match: "yes" | "no", notes: string): string {
  if (match === "yes") {
    return "The client's Medicare card details have been verified and match the details provided in the application. The number of dependants listed is consistent with the client's declared household composition.";
  }
  return `The client's Medicare card was reviewed. ${notes || "Additional verification notes were not provided."}`;
}

function generateIncomeVerification(options: string[], otherNotes: string): string {
  if (options.includes("Self Declared")) {
    return "Income has been self-declared by the client. The lender will conduct their own verification as part of their assessment process.";
  }

  const parts: string[] = [];
  if (options.includes("Payslips")) {
    parts.push("recent payslips");
  }
  if (options.includes("Bank Statements")) {
    parts.push("bank statements showing regular income credits");
  }
  if (options.includes("Other")) {
    parts.push(otherNotes || "other documentation");
  }

  if (parts.length === 0) {
    return "Income verification method has not been specified.";
  }

  return `Income has been verified through ${parts.join(" and ")}. The verified income is consistent with the amounts declared in the application and supports the client's capacity to service the proposed loan.`;
}

function generateExpenseVerification(text: string): string {
  return text || "Expenses have been verified using the Household Expenditure Measure (HEM) benchmark and adjusted based on the client's specific circumstances as disclosed during the application process.";
}

function generateCreditEnquiries(hasEnquiries: boolean, enquiries: CreditEnquiry[]): string {
  if (!hasEnquiries || enquiries.length === 0) {
    return "A review of the client's credit file indicates no material credit enquiries within the relevant assessment period that would impact the suitability of this loan application.";
  }

  const lines = enquiries.map(
    (e, i) => `${i + 1}. ${e.description} – Outcome: ${e.outcome}. ${e.commentary}`
  );

  return `The following credit enquiries were identified during the assessment:\n\n${lines.join("\n")}\n\nThese enquiries have been considered in the overall assessment and do not preclude the suitability of the proposed loan.`;
}

function generateUnsuitabilityAssessment(unsuitability: "yes" | "no", explanation: string): string {
  if (unsuitability === "yes") {
    return "Based on the assessment conducted, the proposed loan is considered suitable for the client's circumstances. The loan amount, term and repayment structure align with the client's verified income, expenses and stated objectives. There are no indicators suggesting the loan would be unsuitable or cause substantial hardship.";
  }

  return `The proposed loan has been assessed as potentially unsuitable for the following reasons: ${explanation || "Further explanation required."}`;
}

export function generateComplianceNote(data: ComplianceFormData): string {
  const sections: string[] = [];

  sections.push(`[Client Identification]\n${generateClientIdentification(data.idVerification)}`);
  sections.push(`[Medicare Verification]\n${generateMedicareVerification(data.medicareMatch, data.medicareNotes)}`);
  sections.push(`[Income Verification]\n${generateIncomeVerification(data.incomeVerification, data.incomeOtherNotes)}`);
  sections.push(`[Expense Verification]\n${generateExpenseVerification(data.expenseVerification)}`);
  sections.push(`[Credit Enquiries]\n${generateCreditEnquiries(data.hasEnquiries, data.enquiries)}`);
  sections.push(`[Unsuitability Assessment]\n${generateUnsuitabilityAssessment(data.unsuitability, data.unsuitabilityExplanation)}`);

  return sections.join("\n\n");
}
