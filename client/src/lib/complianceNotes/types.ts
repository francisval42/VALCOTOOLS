export interface CreditEnquiry {
  description: string;
  outcome: string;
  commentary: string;
}

export interface ComplianceFormData {
  idVerification: "biometric" | "personal";
  medicareMatch: "yes" | "no";
  medicareNotes: string;
  incomeVerification: string[];
  incomeOtherNotes: string;
  expenseVerification: string;
  hasEnquiries: boolean;
  enquiries: CreditEnquiry[];
  unsuitability: "yes" | "no";
  unsuitabilityExplanation: string;
}

export const INCOME_VERIFICATION_OPTIONS = [
  "Payslips",
  "Bank Statements",
  "Self Declared",
  "Other",
] as const;

export function getInitialComplianceFormData(): ComplianceFormData {
  return {
    idVerification: "biometric",
    medicareMatch: "yes",
    medicareNotes: "",
    incomeVerification: [],
    incomeOtherNotes: "",
    expenseVerification: "Expenses have been verified using the Household Expenditure Measure (HEM) benchmark and adjusted based on the client's specific circumstances as disclosed during the application process.",
    hasEnquiries: false,
    enquiries: [],
    unsuitability: "yes",
    unsuitabilityExplanation: "",
  };
}
