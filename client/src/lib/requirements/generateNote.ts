import { FormData, GeneratedNote, LOAN_TYPE_TEXT } from "./types";

function formatCurrency(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount.replace(/[^0-9.]/g, "")) : amount;
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
}

function joinWithAnd(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function lowercaseFirst(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

export function generateNote(data: FormData): GeneratedNote {
  const { firstName, lastName, loanType, purpose, term, rateType, loanAmount, monthlyBudget, isAffordabilityFlagged, affordabilityJustification, lender, otherLenders, securityDescription, changeInCircumstances, changeDescription, changeMitigation, rateTypeReasons, rateTypeAdditionalJustification, lenderReasons, lenderAdditionalJustification, incomeVerification, expenseVerification } = data;

  const loanTypeText = loanType ? LOAN_TYPE_TEXT[loanType] : "loan";
  const loanAmountFormatted = formatCurrency(loanAmount);
  const monthlyBudgetFormatted = formatCurrency(monthlyBudget);
  const rateTypeText = rateType || "fixed";

  const clientObjectives = `${firstName} ${lastName} seeks a ${loanAmountFormatted} ${loanTypeText} to ${purpose}. The client requires a ${term}-month term with a ${rateTypeText} rate to provide payment certainty and budgeting predictability. The proposed loan structure aligns with ${firstName}'s financial capacity and objectives, enabling them to achieve their stated purpose while maintaining sustainable repayment obligations.`;

  let balloonPayment: string | undefined;
  if (loanType === "consumer_car") {
    balloonPayment = `No balloon payment has been included in this loan structure. The loan will be fully amortised over the ${term}-month term, providing ${firstName} with complete ownership at maturity without any additional lump-sum requirement.`;
  }

  const rateReasonsList = rateTypeReasons.map(r => lowercaseFirst(r));
  let reasonsSentence = joinWithAnd(rateReasonsList);
  if (rateTypeAdditionalJustification.trim()) {
    reasonsSentence += `. ${rateTypeAdditionalJustification.trim()}`;
  }
  const interestRateType = `A ${rateTypeText} interest rate has been recommended for this loan based on the following considerations: ${reasonsSentence}. This rate structure supports ${firstName}'s preference for predictable repayments and aligns with current market conditions and the client's risk profile.`;

  const incomeText = joinWithAnd(incomeVerification.map(v => lowercaseFirst(v)));
  let expenseText: string;
  if (expenseVerification.includes("Client interview")) {
    expenseText = "Expenses were ascertained through a client interview and benchmarked against the Household Expenditure Measure (HEM).";
  } else {
    expenseText = `Expense verification includes ${joinWithAnd(expenseVerification.map(v => lowercaseFirst(v)))}.`;
  }
  let affordabilityText: string;
  if (isAffordabilityFlagged) {
    affordabilityText = `While the client's monthly budget of ${monthlyBudgetFormatted} is below the standard minimum threshold, the following justification supports the loan's viability: ${affordabilityJustification}.`;
  } else {
    affordabilityText = `The client's monthly budget of ${monthlyBudgetFormatted} provides adequate servicing capacity for the proposed loan repayments with an appropriate buffer for financial resilience.`;
  }
  const reasonableEnquiry = `Comprehensive income verification has been conducted through ${incomeText}. ${expenseText} ${affordabilityText}`;

  const lenderReasonsList = lenderReasons.map(r => lowercaseFirst(r));
  let lenderReasonsSentence = joinWithAnd(lenderReasonsList);
  if (lenderAdditionalJustification.trim()) {
    lenderReasonsSentence += `. ${lenderAdditionalJustification.trim()}`;
  }
  const lenderJustification = `${lender} has been selected as the recommended lender based on ${lenderReasonsSentence}. The lender's assessment criteria and product features provide optimal terms for this loan structure and align with ${firstName}'s profile and requirements.`;

  let otherLendersText: string | undefined;
  if (otherLenders.length > 0) {
    const exclusions = otherLenders.map(ol => `${ol.name} was excluded due to ${ol.exclusionReason}.`).join(" ");
    otherLendersText = `Other lenders were considered during the assessment process. ${exclusions}`;
  }

  let securityText: string;
  if (loanType === "consumer_car") {
    securityText = "the secured structure with the motor vehicle being financed as security enables access to competitive interest rates";
  } else if (data.isSecured && securityDescription.trim()) {
    securityText = `the secured structure with ${securityDescription} as security enables access to competitive interest rates`;
  } else if (data.isSecured) {
    securityText = "the secured structure enables access to competitive interest rates";
  } else {
    securityText = "the unsecured structure provides flexibility without requiring security";
  }

  let suitabilityText: string;
  if (isAffordabilityFlagged) {
    suitabilityText = `The ${term}-month term has been structured considering the client's specific circumstances and the justification provided for affordability`;
  } else {
    suitabilityText = `The ${term}-month term provides manageable repayments within the client's demonstrated capacity`;
  }

  const suitabilityAssessment = `The proposed ${loanTypeText} is suitable for ${firstName} ${lastName}'s circumstances, taking into consideration verified income, assessed expenses and stated objectives. ${suitabilityText}, while ${securityText}. The loan purpose of ${purpose} represents responsible financial management and aligns with the client's stated goals.`;

  let changeInCircumstancesText: string;
  if (changeInCircumstances === "yes") {
    changeInCircumstancesText = `A material change in circumstances has been identified: ${changeDescription}. The following mitigation measures have been implemented: ${changeMitigation}. These measures ensure the client maintains capacity to service the proposed loan.`;
  } else {
    changeInCircumstancesText = `No material change in circumstances has been identified that would impact the client's ability to service the proposed loan. ${firstName}'s employment and financial position remain stable and consistent with the initial assessment.`;
  }

  return {
    clientObjectives,
    balloonPayment,
    interestRateType,
    reasonableEnquiry,
    lenderJustification,
    otherLenders: otherLendersText,
    suitabilityAssessment,
    changeInCircumstances: changeInCircumstancesText,
  };
}

export function formatNoteAsText(note: GeneratedNote): string {
  const sections: string[] = [];

  sections.push(`[Client Objectives]\n${note.clientObjectives}`);

  if (note.balloonPayment) {
    sections.push(`[Balloon Payment]\n${note.balloonPayment}`);
  }

  sections.push(`[Interest Rate Type]\n${note.interestRateType}`);
  sections.push(`[Reasonable Enquiry]\n${note.reasonableEnquiry}`);
  sections.push(`[Lender Justification]\n${note.lenderJustification}`);

  if (note.otherLenders) {
    sections.push(`[Other Lenders]\n${note.otherLenders}`);
  }

  sections.push(`[Suitability Assessment]\n${note.suitabilityAssessment}`);
  sections.push(`[Change in Circumstances]\n${note.changeInCircumstances}`);

  return sections.join("\n\n");
}
