import { useState, useEffect, useMemo } from "react";
import { Download, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatCurrency, round2 } from "@/lib/money";
import { todayIso } from "@/lib/dates";

import {
  LoanCalcForm,
  calculateAmountFinanced,
  calculateRepayments,
  syncBalloonFromAmount,
  syncBalloonFromPercent,
  getQuoteFilename,
  getNextQuoteIndex,
} from "@/lib/loanCalc/types";
import { generateLoanQuotePdf } from "@/lib/loanCalc/pdf";

type ValidationErrors = {
  vehiclePrice?: string;
  termMonths?: string;
  annualRate?: string;
};

export function LoanCalculatorTab() {
  const { toast } = useToast();

  const [vehiclePrice, setVehiclePrice] = useState<number>(0);
  const [deposit, setDeposit] = useState<number>(0);
  const [tradeIn, setTradeIn] = useState<number>(0);
  const [payout, setPayout] = useState<number>(0);
  const [originationFee, setOriginationFee] = useState<number>(0);
  const [lenderEstablishmentFee, setLenderEstablishmentFee] = useState<number>(0);

  const [termMonths, setTermMonths] = useState<number>(60);
  const [annualRate, setAnnualRate] = useState<number>(12.95);
  const [balloonAmount, setBalloonAmount] = useState<number>(0);
  const [balloonPercent, setBalloonPercent] = useState<number>(0);
  const [balloonEditMode, setBalloonEditMode] = useState<'amount' | 'percent' | null>(null);
  const [monthlyFee, setMonthlyFee] = useState<number>(0);
  const [paymentInAdvance, setPaymentInAdvance] = useState<boolean>(false);

  const [clientOrRef, setClientOrRef] = useState("");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showErrors, setShowErrors] = useState(false);

  const amountFinanced = useMemo(() => 
    round2(calculateAmountFinanced(vehiclePrice, deposit, tradeIn, payout, originationFee, lenderEstablishmentFee)),
    [vehiclePrice, deposit, tradeIn, payout, originationFee, lenderEstablishmentFee]
  );

  const repayments = useMemo(() => {
    const result = calculateRepayments(amountFinanced, termMonths, annualRate, balloonAmount, monthlyFee, paymentInAdvance);
    return {
      monthly: round2(result.monthly),
      fortnightly: round2(result.fortnightly),
      weekly: round2(result.weekly),
    };
  }, [amountFinanced, termMonths, annualRate, balloonAmount, monthlyFee, paymentInAdvance]);

  const handleBalloonAmountChange = (value: number) => {
    setBalloonAmount(value);
    setBalloonPercent(round2(syncBalloonFromAmount(value, vehiclePrice)));
    setBalloonEditMode('amount');
  };

  const handleBalloonPercentChange = (value: number) => {
    setBalloonPercent(value);
    setBalloonAmount(round2(syncBalloonFromPercent(value, vehiclePrice)));
    setBalloonEditMode('percent');
  };

  useEffect(() => {
    if (vehiclePrice > 0) {
      if (balloonEditMode === 'percent' && balloonPercent > 0) {
        setBalloonAmount(round2(syncBalloonFromPercent(balloonPercent, vehiclePrice)));
      } else if (balloonEditMode === 'amount' && balloonAmount > 0) {
        setBalloonPercent(round2(syncBalloonFromAmount(balloonAmount, vehiclePrice)));
      }
    }
  }, [vehiclePrice]);

  const validate = (): boolean => {
    const newErrors: ValidationErrors = {};
    
    if (!vehiclePrice || vehiclePrice <= 0) {
      newErrors.vehiclePrice = "Vehicle price must be greater than 0";
    }
    if (!termMonths || termMonths <= 0) {
      newErrors.termMonths = "Term must be greater than 0";
    }
    if (annualRate < 0 || annualRate > 99.99) {
      newErrors.annualRate = "Rate must be between 0 and 99.99";
    }
    
    setErrors(newErrors);
    setShowErrors(Object.keys(newErrors).length > 0);
    return Object.keys(newErrors).length === 0;
  };

  const handleExport = async () => {
    if (!validate()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please check vehicle price, term and interest rate before exporting."
      });
      return;
    }

    const form: LoanCalcForm = {
      vehiclePrice,
      deposit,
      tradeIn,
      payout,
      originationFee,
      lenderEstablishmentFee,
      termMonths,
      annualRate,
      balloonAmount,
      balloonPercent,
      monthlyFee,
      amountFinanced,
      monthlyRepayment: repayments.monthly,
      fortnightlyRepayment: repayments.fortnightly,
      weeklyRepayment: repayments.weekly,
      paymentInAdvance,
    };

    try {
      const pdfBytes = await generateLoanQuotePdf(form, clientOrRef);
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      const dateKey = todayIso();
      const index = getNextQuoteIndex(dateKey);
      link.download = getQuoteFilename(clientOrRef, dateKey, index);
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({ title: "Quote Generated", description: "Loan quote PDF downloaded successfully." });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error", description: "Failed to generate PDF" });
    }
  };

  const inputClass = (field: keyof ValidationErrors) => cn(
    "bg-white",
    showErrors && errors[field] && "border-red-400 bg-red-50"
  );

  const canExport = vehiclePrice > 0 && termMonths > 0 && annualRate >= 0 && annualRate <= 99.99;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <Card className="bg-white rounded-2xl shadow-md">
        <CardContent className="p-6 md:p-8 space-y-6">
          
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Calculator className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Loan Calculator</h2>
              <p className="text-sm text-slate-500">Quick internal calculator for repayments on a vehicle loan.</p>
            </div>
          </div>

          {showErrors && Object.keys(errors).length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              Please check vehicle price, term and interest rate before exporting.
            </div>
          )}

          <div>
            <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase mb-4">Deal Inputs</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Vehicle Price <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  step="0.01"
                  value={vehiclePrice || ""}
                  onChange={e => setVehiclePrice(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className={inputClass("vehiclePrice")}
                  data-testid="input-vehicle-price"
                />
                {showErrors && errors.vehiclePrice && <p className="text-xs text-red-500">{errors.vehiclePrice}</p>}
              </div>
              
              <div className="space-y-2">
                <Label>Deposit</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={deposit || ""}
                  onChange={e => setDeposit(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  data-testid="input-deposit"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Trade In</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={tradeIn || ""}
                  onChange={e => setTradeIn(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  data-testid="input-trade-in"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Payout</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={payout || ""}
                  onChange={e => setPayout(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  data-testid="input-payout"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label>Origination Fee</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={originationFee || ""}
                  onChange={e => setOriginationFee(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  data-testid="input-origination-fee"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Lender Establishment Fee</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={lenderEstablishmentFee || ""}
                  onChange={e => setLenderEstablishmentFee(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  data-testid="input-lender-establishment-fee"
                />
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-slate-50 rounded-lg flex justify-between items-center">
              <span className="text-sm text-slate-600">Amount Financed = Price − Deposit − Trade in + Payout + Fees</span>
              <span className="text-lg font-bold text-primary" data-testid="text-amount-financed">{formatCurrency(amountFinanced)}</span>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          <div>
            <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase mb-4">Loan Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Term (months) <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  step="1"
                  min="1"
                  max="999"
                  value={termMonths || ""}
                  onChange={e => setTermMonths(parseInt(e.target.value) || 0)}
                  placeholder="60"
                  className={inputClass("termMonths")}
                  data-testid="input-term"
                />
                {showErrors && errors.termMonths && <p className="text-xs text-red-500">{errors.termMonths}</p>}
              </div>
              
              <div className="space-y-2">
                <Label>Interest Rate p.a. (%) <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="99.99"
                  value={annualRate || ""}
                  onChange={e => setAnnualRate(parseFloat(e.target.value) || 0)}
                  placeholder="12.95"
                  className={inputClass("annualRate")}
                  data-testid="input-rate"
                />
                {showErrors && errors.annualRate && <p className="text-xs text-red-500">{errors.annualRate}</p>}
              </div>
              
              <div className="space-y-2">
                <Label>Monthly Account Fee</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={monthlyFee || ""}
                  onChange={e => setMonthlyFee(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  data-testid="input-monthly-fee"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label>Balloon Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={balloonAmount || ""}
                  onChange={e => handleBalloonAmountChange(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  data-testid="input-balloon-amount"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Balloon Percent (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={balloonPercent || ""}
                  onChange={e => handleBalloonPercentChange(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  data-testid="input-balloon-percent"
                />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">Balloon can be entered as an amount or a percent of vehicle price. Changing one updates the other.</p>
            
            <div className="mt-4">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={paymentInAdvance}
                  onChange={e => setPaymentInAdvance(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                  data-testid="checkbox-payment-in-advance"
                />
                <span>First repayment in advance (payment on settlement date)</span>
              </label>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          <div>
            <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase mb-4">Repayments</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#1f2a44] rounded-xl p-5 text-center">
                <p className="text-white/70 text-sm mb-1">Monthly</p>
                <p className="text-2xl font-bold text-primary" data-testid="text-monthly">{formatCurrency(repayments.monthly)}</p>
              </div>
              <div className="bg-slate-100 rounded-xl p-5 text-center">
                <p className="text-slate-500 text-sm mb-1">Fortnightly</p>
                <p className="text-xl font-semibold text-slate-800" data-testid="text-fortnightly">{formatCurrency(repayments.fortnightly)}</p>
              </div>
              <div className="bg-slate-100 rounded-xl p-5 text-center">
                <p className="text-slate-500 text-sm mb-1">Weekly</p>
                <p className="text-xl font-semibold text-slate-800" data-testid="text-weekly">{formatCurrency(repayments.weekly)}</p>
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          <div className="space-y-4">
            <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Export Quote</h3>
            
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 space-y-2">
                <Label>Client Name or Quote Reference <span className="text-slate-400 font-normal">(Optional)</span></Label>
                <Input
                  value={clientOrRef}
                  onChange={e => setClientOrRef(e.target.value)}
                  placeholder="e.g. John Smith or Quote #123"
                  data-testid="input-client-ref"
                />
              </div>
              
              <Button 
                onClick={handleExport}
                disabled={!canExport}
                className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="button-download-pdf"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Quote PDF
              </Button>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
