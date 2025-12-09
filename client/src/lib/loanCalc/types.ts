export type LoanCalcForm = {
  vehiclePrice: number;
  deposit: number;
  tradeIn: number;
  payout: number;
  termMonths: number;
  annualRate: number;
  balloonAmount: number;
  balloonPercent: number;
  monthlyFee: number;
  amountFinanced: number;
  monthlyRepayment: number;
  fortnightlyRepayment: number;
  weeklyRepayment: number;
};

export function calculateAmountFinanced(
  vehiclePrice: number,
  deposit: number,
  tradeIn: number,
  payout: number
): number {
  return vehiclePrice - deposit - tradeIn + payout;
}

export function calculateRepayments(
  amountFinanced: number,
  termMonths: number,
  annualRate: number,
  balloonAmount: number,
  monthlyFee: number
): { monthly: number; fortnightly: number; weekly: number } {
  const P = amountFinanced;
  const n = termMonths;
  const R = balloonAmount;

  if (n <= 0 || P <= 0) {
    return { monthly: 0, fortnightly: 0, weekly: 0 };
  }

  const r = annualRate / 100 / 12;
  let monthlyPrincipalInterest: number;

  if (Math.abs(r) < 1e-8) {
    const netPrincipal = P - R;
    if (netPrincipal <= 0) {
      return { monthly: 0, fortnightly: 0, weekly: 0 };
    }
    monthlyPrincipalInterest = netPrincipal / n;
  } else {
    const compoundFactor = Math.pow(1 + r, n);
    const effectivePrincipal = P - R / compoundFactor;
    
    if (effectivePrincipal <= 0) {
      return { monthly: 0, fortnightly: 0, weekly: 0 };
    }
    
    monthlyPrincipalInterest = effectivePrincipal * (r / (1 - Math.pow(1 + r, -n)));
  }

  const monthlyRepayment = monthlyPrincipalInterest + monthlyFee;
  const fortnightlyRepayment = (monthlyRepayment * 12) / 26;
  const weeklyRepayment = (monthlyRepayment * 12) / 52;

  const clamp = (val: number) => (isNaN(val) || val < 0 ? 0 : val);

  return {
    monthly: clamp(monthlyRepayment),
    fortnightly: clamp(fortnightlyRepayment),
    weekly: clamp(weeklyRepayment),
  };
}

export function syncBalloonFromAmount(balloonAmount: number, vehiclePrice: number): number {
  if (vehiclePrice <= 0) return 0;
  return (balloonAmount / vehiclePrice) * 100;
}

export function syncBalloonFromPercent(balloonPercent: number, vehiclePrice: number): number {
  return vehiclePrice * (balloonPercent / 100);
}

export function getQuoteFilename(clientOrRef: string, date: string, index: number): string {
  const paddedIndex = String(index).padStart(3, '0');
  const cleanRef = clientOrRef.trim().replace(/[/\\:*?"<>|]/g, '-');
  
  if (!cleanRef) {
    return `Quote - ${date} - ${paddedIndex}.pdf`;
  }
  return `${cleanRef} - Quote - ${date} - ${paddedIndex}.pdf`;
}

export function getNextQuoteIndex(dateKey: string): number {
  const storageKey = `loan_calc_quote_counter_${dateKey}`;
  const stored = localStorage.getItem(storageKey);
  const index = stored ? parseInt(stored, 10) + 1 : 1;
  localStorage.setItem(storageKey, String(index));
  return index;
}
