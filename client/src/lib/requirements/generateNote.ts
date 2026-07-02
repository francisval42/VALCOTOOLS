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

function safeLC(str: string): string {
  if (/^[A-Z]{2}/.test(str)) return str;
  return str.charAt(0).toLowerCase() + str.slice(1);
}

export function generateNote(data: FormData): GeneratedNote {
  const { firstName, lastName, loanType, purpose, term, rateType, loanAmount, monthlyBudget, isAffordabilityFlagged, affordabilityJustification, lender, otherLenders, securityDescription, changeInCircumstances, changeDescription, changeMitigation, rateTypeReasons, rateTypeAdditionalJustification, lenderReasons, lenderAdditionalJustification, incomeVerification, expenseVerification } = data;

  const loanTypeText = loanType ? LOAN_TYPE_TEXT[loanType] : "loan";
  const loanAmountFormatted = formatCurrency(loanAmount);
  const monthlyBudgetFormatted = formatCurrency(monthlyBudget);
  const isFixed = rateType === "fixed";

  // Bug 1 fix: branch clientObjectives rate sentence on rate type
  const rateObjectiveSentence = isFixed
    ? `The client requires a ${term}-month term with a fixed rate to provide payment certainty and budgeting predictability.`
    : `The client requires a ${term}-month term with a variable rate, selected for ${joinWithAnd(rateTypeReasons.map(r => safeLC(r)))}.`;

  // Bug 3 fix: use firstName consistently (no "them/their"), fix "loan purpose of" grammar
  const clientObjectives = `${firstName} ${lastName} seeks a ${loanAmountFormatted} ${loanTypeText} to ${purpose}. ${rateObjectiveSentence} The proposed loan structure aligns with ${firstName}'s financial capacity and objectives, enabling ${firstName} to achieve the stated purpose while maintaining sustainable repayment obligations.`;

  let balloonPayment: string | undefined;
  if (loanType === "consumer_car") {
    balloonPayment = `No balloon payment has been included in this loan structure. The loan will be fully amortised over the ${term}-month term, providing ${firstName} with complete ownership at maturity without any additional lump-sum requirement.`;
  }

  // Bug 1 fix: branch interestRateType wording on rate type — no certainty/predictability for variable
  const rateReasonsList = rateTypeReasons.map(r => safeLC(r));
  let reasonsSentence = joinWithAnd(rateReasonsList);
  if (rateTypeAdditionalJustification.trim()) {
    reasonsSentence += `. ${rateTypeAdditionalJustification.trim()}`;
  }
  const rateClosingSentence = isFixed
    ? `This rate structure supports ${firstName}'s preference for predictable repayments and aligns with current market conditions and the client's risk profile.`
    : `This rate structure gives ${firstName} the flexibility to benefit from favourable market movements and aligns with the client's preference for lower initial costs and repayment flexibility.`;
  const interestRateType = `A ${rateType} interest rate has been recommended for this loan based on the following considerations: ${reasonsSentence}. ${rateClosingSentence}`;

  // Bug 2 fix: list ALL selected income verification methods
  const incomeText = joinWithAnd(incomeVerification.map(v => safeLC(v)));

  // Bug 2 fix: list ALL selected expense verification methods; only mention HEM if HEM was actually selected
  const expenseList = joinWithAnd(expenseVerification.map(v => safeLC(v)));
  const expenseText = `Expenses were verified through ${expenseList}.`;

  let affordabilityText: string;
  if (isAffordabilityFlagged) {
    affordabilityText = `While ${firstName}'s monthly budget of ${monthlyBudgetFormatted} is below the standard minimum threshold, the following justification supports the loan's viability: ${affordabilityJustification}.`;
  } else {
    affordabilityText = `${firstName}'s monthly budget of ${monthlyBudgetFormatted} provides adequate servicing capacity for the proposed loan repayments with an appropriate buffer for financial resilience.`;
  }
  const reasonableEnquiry = `Comprehensive income verification has been conducted through ${incomeText}. ${expenseText} ${affordabilityText}`;

  const lenderReasonsList = lenderReasons.map(r => safeLC(r));
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

  // Bug 4 fix: only build security clause for secured loan types
  let suitabilitySecurityClause = "";
  if (data.isSecured) {
    let securityText: string;
    if (loanType === "consumer_car") {
      securityText = "the secured structure with the motor vehicle being financed as security enables access to competitive interest rates";
    } else if (securityDescription.trim()) {
      securityText = `the secured structure with ${securityDescription} as security enables access to competitive interest rates`;
    } else {
      securityText = "the secured structure enables access to competitive interest rates";
    }
    suitabilitySecurityClause = `, while ${securityText}`;
  }

  let suitabilityText: string;
  if (isAffordabilityFlagged) {
    suitabilityText = `The ${term}-month term has been structured considering ${firstName}'s specific circumstances and the justification provided for affordability`;
  } else {
    suitabilityText = `The ${term}-month term provides manageable repayments within ${firstName}'s demonstrated capacity`;
  }

  // Bug 3 fix: "stated loan purpose — X —" instead of "loan purpose of X"
  const suitabilityAssessment = `The proposed ${loanTypeText} is suitable for ${firstName} ${lastName}'s circumstances, taking into consideration verified income, assessed expenses and stated objectives. ${suitabilityText}${suitabilitySecurityClause}. The stated loan purpose — ${purpose} — represents responsible financial management and aligns with ${firstName}'s stated goals.`;

  let changeInCircumstancesText: string;
  if (changeInCircumstances === "yes") {
    changeInCircumstancesText = `A material change in circumstances has been identified: ${changeDescription}. The following mitigation measures have been implemented: ${changeMitigation}. These measures ensure ${firstName} maintains capacity to service the proposed loan.`;
  } else {
    changeInCircumstancesText = `No material change in circumstances has been identified that would impact ${firstName}'s ability to service the proposed loan. ${firstName}'s employment and financial position remain stable and consistent with the initial assessment.`;
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
