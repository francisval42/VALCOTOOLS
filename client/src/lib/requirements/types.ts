export type LoanType = "consumer_car" | "secured_personal" | "unsecured_personal" | "";

export type BudgetFrequency = "weekly" | "fortnightly" | "monthly";

export type RateType = "fixed" | "variable" | "";

export interface OtherLender {
  name: string;
  exclusionReason: string;
}

export interface FormData {
  loanType: LoanType;
  firstName: string;
  lastName: string;
  purpose: string;
  isSecured: boolean;
  securityDescription: string;
  loanAmount: string;
  budgetAmount: string;
  budgetFrequency: BudgetFrequency;
  term: number;
  rateType: RateType;
  rateTypeReasons: string[];
  rateTypeAdditionalJustification: string;
  lender: string;
  lenderReasons: string[];
  lenderAdditionalJustification: string;
  otherLenders: OtherLender[];
  incomeVerification: string[];
  expenseVerification: string[];
  changeInCircumstances: "no" | "yes";
  changeDescription: string;
  changeMitigation: string;
  affordabilityJustification: string;
  monthlyBudget: number;
  isAffordabilityFlagged: boolean;
}

export interface GeneratedNote {
  clientObjectives: string;
  balloonPayment?: string;
  interestRateType: string;
  reasonableEnquiry: string;
  lenderJustification: string;
  otherLenders?: string;
  suitabilityAssessment: string;
  changeInCircumstances: string;
}

export const TERM_OPTIONS = [12, 24, 36, 48, 60, 72, 84] as const;

export const FIXED_RATE_REASONS = [
  "Provides payment certainty",
  "Protects against rate rises",
  "Budgeting predictability",
  "Protection from market volatility",
] as const;

export const VARIABLE_RATE_REASONS = [
  "Lower initial rate available",
  "More flexibility with payments",
  "Potential for rate reductions",
  "No break costs if refinancing",
  "Benefit from market rate drops",
] as const;

export const LENDER_OPTIONS = [
  "Now Finance",
  "Latitude Financial",
  "Wisr",
  "MoneyMe",
  "Plenti",
  "Pepper Money",
] as const;

export const LENDER_REASONS = [
  "Competitive interest rate",
  "Suitable policy and criteria",
  "Fast approval process",
  "Flexible terms and conditions",
  "Strong customer service",
  "Established lending track record",
] as const;

export const INCOME_VERIFICATION_OPTIONS = [
  "Employment letter / contract",
  "Recent payslips (2+ months)",
  "Bank statements showing salary credits",
  "Tax returns / accountant letter",
  "Business financial statements",
  "Centrelink statements",
] as const;

export const EXPENSE_VERIFICATION_OPTIONS = [
  "Client interview",
  "HEM (Household Expenditure Measure)",
  "Bank statements (3+ months)",
  "Credit card statements",
  "Loan statements for existing debts",
  "Rental agreements",
  "Insurance statements",
] as const;

export const LOAN_TYPE_TEXT: Record<Exclude<LoanType, "">, string> = {
  consumer_car: "consumer car loan",
  secured_personal: "secured personal loan",
  unsecured_personal: "unsecured personal loan",
};

export function getInitialFormData(): FormData {
  return {
    loanType: "",
    firstName: "",
    lastName: "",
    purpose: "",
    isSecured: false,
    securityDescription: "",
    loanAmount: "",
    budgetAmount: "",
    budgetFrequency: "monthly",
    term: 0,
    rateType: "",
    rateTypeReasons: [],
    rateTypeAdditionalJustification: "",
    lender: "",
    lenderReasons: [],
    lenderAdditionalJustification: "",
    otherLenders: [],
    incomeVerification: [],
    expenseVerification: [],
    changeInCircumstances: "no",
    changeDescription: "",
    changeMitigation: "",
    affordabilityJustification: "",
    monthlyBudget: 0,
    isAffordabilityFlagged: false,
  };
}

export function computeMonthlyBudget(amount: string, frequency: BudgetFrequency): number {
  const parsed = parseFloat(amount.replace(/[^0-9.]/g, "")) || 0;
  switch (frequency) {
    case "weekly":
      return (parsed * 52) / 12;
    case "fortnightly":
      return (parsed * 26) / 12;
    case "monthly":
    default:
      return parsed;
  }
}

export function checkAffordabilityFlag(loanAmount: string, monthlyBudget: number): boolean {
  const loanAmt = parseFloat(loanAmount.replace(/[^0-9.]/g, "")) || 0;
  const minimumRequired = Math.max(loanAmt * 0.005, 100);
  return monthlyBudget < minimumRequired;
}

export interface ValidationErrors {
  loanType?: string;
  firstName?: string;
  lastName?: string;
  purpose?: string;
  securityDescription?: string;
  loanAmount?: string;
  budgetAmount?: string;
  term?: string;
  rateType?: string;
  rateTypeReasons?: string;
  lender?: string;
  lenderReasons?: string;
  incomeVerification?: string;
  expenseVerification?: string;
  changeDescription?: string;
  changeMitigation?: string;
  affordabilityJustification?: string;
}

export function validateForm(data: FormData): ValidationErrors {
  const errors: ValidationErrors = {};
  
  if (!data.loanType) errors.loanType = "Loan type is required";
  if (!data.firstName.trim()) errors.firstName = "First name is required";
  if (!data.lastName.trim()) errors.lastName = "Last name is required";
  if (!data.purpose.trim()) errors.purpose = "Purpose is required";
  
  const loanAmt = parseFloat(data.loanAmount.replace(/[^0-9.]/g, "")) || 0;
  if (loanAmt < 2000 || loanAmt > 250000) {
    errors.loanAmount = "Loan amount must be between $2,000 and $250,000";
  }
  
  const budgetAmt = parseFloat(data.budgetAmount.replace(/[^0-9.]/g, "")) || 0;
  if (budgetAmt < 50) {
    errors.budgetAmount = "Budget amount must be at least $50";
  }
  
  if (!data.term || !TERM_OPTIONS.includes(data.term as any)) {
    errors.term = "Please select a valid term";
  }
  
  if (!data.rateType) errors.rateType = "Rate type is required";
  if (data.rateTypeReasons.length === 0) errors.rateTypeReasons = "Select at least one reason";
  
  if (!data.lender.trim()) errors.lender = "Lender is required";
  if (data.lenderReasons.length === 0) errors.lenderReasons = "Select at least one reason";
  
  if (data.incomeVerification.length === 0) errors.incomeVerification = "Select at least one option";
  if (data.expenseVerification.length === 0) errors.expenseVerification = "Select at least one option";
  
  if (data.isSecured && data.loanType !== "consumer_car" && !data.securityDescription.trim()) {
    errors.securityDescription = "Security description is required for secured loans";
  }
  
  if (data.changeInCircumstances === "yes") {
    if (!data.changeDescription.trim()) errors.changeDescription = "Description is required";
    if (!data.changeMitigation.trim()) errors.changeMitigation = "Mitigation is required";
  }
  
  if (data.isAffordabilityFlagged && !data.affordabilityJustification.trim()) {
    errors.affordabilityJustification = "Justification required when affordability is flagged";
  }
  
  return errors;
}
