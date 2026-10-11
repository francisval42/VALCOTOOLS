import { useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";

import {
  FormData,
  LoanType,
  BudgetFrequency,
  RateType,
  OtherLender,
  TERM_OPTIONS,
  FIXED_RATE_REASONS,
  VARIABLE_RATE_REASONS,
  FIXED_RULED_OUT_REASONS,
  VARIABLE_RULED_OUT_REASONS,
  LENDER_OPTIONS,
  LENDER_REASONS,
  INCOME_VERIFICATION_OPTIONS,
  EXPENSE_VERIFICATION_OPTIONS,
  getInitialFormData,
  computeMonthlyBudget,
  checkAffordabilityFlag,
  validateForm,
  ValidationErrors,
} from "@/lib/requirements/types";
import { generateNote, formatNoteAsText } from "@/lib/requirements/generateNote";
import { complianceWash, aiEdit } from "@/lib/requirements/ai";

// Navy-dominant premium styling tokens (Valco brand).
const cardClass = "space-y-4 rounded-xl border border-white/10 bg-[#1f2a44] p-5 text-white";
const headingClass = "flex items-center gap-2 text-base font-semibold tracking-tight text-white";
const fieldClass =
  "bg-white text-slate-900 border-slate-200 placeholder:text-slate-400 focus-visible:ring-[#f16823] focus-visible:ring-offset-0";
const optionRowClass =
  "flex items-center space-x-3 rounded-lg bg-white/5 px-3 py-2 transition-colors hover:bg-white/10";
const checkboxClass =
  "border-white/40 data-[state=checked]:bg-[#f16823] data-[state=checked]:border-[#f16823]";
const outlineBtnClass =
  "rounded-full border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white";
const errorTextClass = "text-red-300 text-sm mt-1";

function AccentBar() {
  return <span className="h-4 w-1 rounded-full bg-[#f16823]" aria-hidden="true" />;
}

export function RequirementsObjectivesTab() {
  const { toast } = useToast();
  const [formData, setFormData] = useState<FormData>(getInitialFormData());
  const [noteText, setNoteText] = useState("");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");

  const monthlyBudget = useMemo(
    () => computeMonthlyBudget(formData.budgetAmount, formData.budgetFrequency),
    [formData.budgetAmount, formData.budgetFrequency]
  );

  const isAffordabilityFlagged = useMemo(
    () => checkAffordabilityFlag(formData.loanAmount, monthlyBudget),
    [formData.loanAmount, monthlyBudget]
  );

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleLoanTypeChange = (value: LoanType) => {
    if (value === "consumer_car") {
      setFormData((prev) => ({
        ...prev,
        loanType: value,
        isSecured: true,
        securityDescription: "Motor vehicle being financed",
      }));
    } else if (value === "unsecured_personal") {
      setFormData((prev) => ({
        ...prev,
        loanType: value,
        isSecured: false,
        securityDescription: "",
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        loanType: value,
        isSecured: true,
        securityDescription: "",
      }));
    }
  };

  const handleRateTypeChange = (value: RateType) => {
    setFormData((prev) => ({
      ...prev,
      rateType: value,
      rateTypeReasons: [],
      rateTypeRuledOutReasons: [],
    }));
  };

  const toggleCheckbox = (
    field: "rateTypeReasons" | "rateTypeRuledOutReasons" | "lenderReasons" | "incomeVerification" | "expenseVerification",
    item: string
  ) => {
    setFormData((prev) => {
      const current = prev[field] as string[];
      const updated = current.includes(item)
        ? current.filter((x) => x !== item)
        : [...current, item];
      return { ...prev, [field]: updated };
    });
  };

  const addOtherLender = () => {
    setFormData((prev) => ({
      ...prev,
      otherLenders: [...prev.otherLenders, { name: "", exclusionReason: "" }],
    }));
  };

  const updateOtherLender = (index: number, field: keyof OtherLender, value: string) => {
    setFormData((prev) => {
      const updated = [...prev.otherLenders];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, otherLenders: updated };
    });
  };

  const removeOtherLender = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      otherLenders: prev.otherLenders.filter((_, i) => i !== index),
    }));
  };

  const handleGenerateNote = () => {
    const dataWithComputed = {
      ...formData,
      monthlyBudget,
      isAffordabilityFlagged,
    };
    const validationErrors = validateForm(dataWithComputed);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fix the errors before generating the note.",
      });
      return;
    }

    const note = generateNote(dataWithComputed);
    const text = formatNoteAsText(note);
    setNoteText(text);
    toast({
      title: "Note Generated",
      description: "Requirements and objectives note has been generated.",
    });
  };

  const handleComplianceWash = async () => {
    if (!noteText.trim()) {
      toast({
        variant: "destructive",
        title: "No Note",
        description: "Please generate a note first.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const washed = await complianceWash(noteText);
      setNoteText(washed);
      toast({
        title: "Compliance Wash Complete",
        description: "Note has been reviewed for compliance language.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to perform compliance wash. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAiEdit = async () => {
    if (!noteText.trim()) {
      toast({
        variant: "destructive",
        title: "No Note",
        description: "Please generate a note first.",
      });
      return;
    }

    if (!aiInstruction.trim()) {
      toast({
        variant: "destructive",
        title: "No Instruction",
        description: "Please enter an instruction for the AI.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const edited = await aiEdit(noteText, aiInstruction);
      setNoteText(edited);
      setAiInstruction("");
      toast({
        title: "AI Edit Complete",
        description: "Note has been refined based on your instruction.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to perform AI edit. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const rateReasons = formData.rateType === "fixed" ? FIXED_RATE_REASONS : VARIABLE_RATE_REASONS;
  const rateRuledOutReasons =
    formData.rateType === "fixed" ? VARIABLE_RULED_OUT_REASONS : FIXED_RULED_OUT_REASONS;
  const altRateLabel = formData.rateType === "fixed" ? "variable" : "fixed";

  return (
    <div className="rounded-2xl bg-[#0f2a44] p-4 lg:p-6">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-5 overflow-y-auto max-h-[calc(100vh-200px)] pr-1">
          <section className={cardClass}>
            <h3 className={headingClass}>
              <AccentBar />
              Client &amp; Loan Type
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName" className="text-white/80">First Name</Label>
                <Input
                  id="firstName"
                  data-testid="input-first-name"
                  value={formData.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                  className={`${fieldClass} mt-1.5 ${errors.firstName ? "border-red-400" : ""}`}
                />
                {errors.firstName && <p className={errorTextClass}>{errors.firstName}</p>}
              </div>
              <div>
                <Label htmlFor="lastName" className="text-white/80">Last Name</Label>
                <Input
                  id="lastName"
                  data-testid="input-last-name"
                  value={formData.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  className={`${fieldClass} mt-1.5 ${errors.lastName ? "border-red-400" : ""}`}
                />
                {errors.lastName && <p className={errorTextClass}>{errors.lastName}</p>}
              </div>
            </div>
            <div>
              <Label className="text-white/80">Loan Type</Label>
              <Select
                value={formData.loanType}
                onValueChange={(v) => handleLoanTypeChange(v as LoanType)}
              >
                <SelectTrigger data-testid="select-loan-type" className={`${fieldClass} mt-1.5 ${errors.loanType ? "border-red-400" : ""}`}>
                  <SelectValue placeholder="Select loan type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consumer_car">Consumer Car</SelectItem>
                  <SelectItem value="secured_personal">Secured Personal</SelectItem>
                  <SelectItem value="unsecured_personal">Unsecured Personal</SelectItem>
                </SelectContent>
              </Select>
              {errors.loanType && <p className={errorTextClass}>{errors.loanType}</p>}
            </div>
          </section>

          <section className={cardClass}>
            <h3 className={headingClass}>
              <AccentBar />
              Loan Details
            </h3>
            <div>
              <Label htmlFor="purpose" className="text-white/80">Purpose</Label>
              <Input
                id="purpose"
                data-testid="input-purpose"
                value={formData.purpose}
                onChange={(e) => updateField("purpose", e.target.value)}
                placeholder="e.g., purchase a motor vehicle for personal use"
                className={`${fieldClass} mt-1.5 ${errors.purpose ? "border-red-400" : ""}`}
              />
              {errors.purpose && <p className={errorTextClass}>{errors.purpose}</p>}
            </div>
            {formData.isSecured && formData.loanType !== "consumer_car" && (
              <div>
                <Label htmlFor="securityDescription" className="text-white/80">Security Description</Label>
                <Input
                  id="securityDescription"
                  data-testid="input-security-description"
                  value={formData.securityDescription}
                  onChange={(e) => updateField("securityDescription", e.target.value)}
                  className={`${fieldClass} mt-1.5 ${errors.securityDescription ? "border-red-400" : ""}`}
                />
                {errors.securityDescription && <p className={errorTextClass}>{errors.securityDescription}</p>}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="loanAmount" className="text-white/80">Loan Amount ($)</Label>
                <Input
                  id="loanAmount"
                  data-testid="input-loan-amount"
                  type="text"
                  value={formData.loanAmount}
                  onChange={(e) => updateField("loanAmount", e.target.value)}
                  placeholder="e.g., 25000"
                  className={`${fieldClass} mt-1.5 ${errors.loanAmount ? "border-red-400" : ""}`}
                />
                {errors.loanAmount && <p className={errorTextClass}>{errors.loanAmount}</p>}
              </div>
              <div>
                <Label className="text-white/80">Term (months)</Label>
                <Select
                  value={formData.term ? formData.term.toString() : ""}
                  onValueChange={(v) => updateField("term", parseInt(v))}
                >
                  <SelectTrigger data-testid="select-term" className={`${fieldClass} mt-1.5 ${errors.term ? "border-red-400" : ""}`}>
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>
                  <SelectContent>
                    {TERM_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t.toString()}>
                        {t} months
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.term && <p className={errorTextClass}>{errors.term}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="budgetAmount" className="text-white/80">Budget Amount ($)</Label>
                <Input
                  id="budgetAmount"
                  data-testid="input-budget-amount"
                  type="text"
                  value={formData.budgetAmount}
                  onChange={(e) => updateField("budgetAmount", e.target.value)}
                  placeholder="e.g., 500"
                  className={`${fieldClass} mt-1.5 ${errors.budgetAmount ? "border-red-400" : ""}`}
                />
                {errors.budgetAmount && <p className={errorTextClass}>{errors.budgetAmount}</p>}
              </div>
              <div>
                <Label className="text-white/80">Budget Frequency</Label>
                <Select
                  value={formData.budgetFrequency}
                  onValueChange={(v) => updateField("budgetFrequency", v as BudgetFrequency)}
                >
                  <SelectTrigger data-testid="select-budget-frequency" className={`${fieldClass} mt-1.5`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="fortnightly">Fortnightly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {monthlyBudget > 0 && (
              <p className="text-sm text-white/70">
                Monthly budget: ${monthlyBudget.toFixed(2)}
                {isAffordabilityFlagged && (
                  <span className="text-[#f7a072] ml-2">(Affordability flagged)</span>
                )}
              </p>
            )}
          </section>

          <section className={cardClass}>
            <h3 className={headingClass}>
              <AccentBar />
              Rate Type
            </h3>
            <div>
              <Label className="text-white/80">Rate Type</Label>
              <Select
                value={formData.rateType}
                onValueChange={(v) => handleRateTypeChange(v as RateType)}
              >
                <SelectTrigger data-testid="select-rate-type" className={`${fieldClass} mt-1.5 ${errors.rateType ? "border-red-400" : ""}`}>
                  <SelectValue placeholder="Select rate type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="variable">Variable</SelectItem>
                </SelectContent>
              </Select>
              {errors.rateType && <p className={errorTextClass}>{errors.rateType}</p>}
            </div>
            {formData.rateType && (
              <div className="space-y-2">
                <Label className="text-white/80">Why {formData.rateType} suits the client</Label>
                {rateReasons.map((reason) => (
                  <div key={reason} className={optionRowClass}>
                    <Checkbox
                      id={`rate-${reason}`}
                      className={checkboxClass}
                      data-testid={`checkbox-rate-reason-${reason.replace(/\s+/g, "-").toLowerCase()}`}
                      checked={formData.rateTypeReasons.includes(reason)}
                      onCheckedChange={() => toggleCheckbox("rateTypeReasons", reason)}
                    />
                    <Label htmlFor={`rate-${reason}`} className="font-normal cursor-pointer text-white/90">
                      {reason}
                    </Label>
                  </div>
                ))}
                {errors.rateTypeReasons && <p className="text-red-300 text-sm">{errors.rateTypeReasons}</p>}
              </div>
            )}
            {formData.rateType && (
              <div className="space-y-2">
                <Label className="text-white/80">Why {altRateLabel} was ruled out</Label>
                <p className="text-xs text-white/50">
                  Quick pick what the client told you. This is the detail an auditor looks for.
                </p>
                {rateRuledOutReasons.map((reason) => (
                  <div key={reason} className={optionRowClass}>
                    <Checkbox
                      id={`rate-ruledout-${reason}`}
                      className={checkboxClass}
                      data-testid={`checkbox-rate-ruledout-${reason.replace(/\s+/g, "-").toLowerCase()}`}
                      checked={formData.rateTypeRuledOutReasons.includes(reason)}
                      onCheckedChange={() => toggleCheckbox("rateTypeRuledOutReasons", reason)}
                    />
                    <Label htmlFor={`rate-ruledout-${reason}`} className="font-normal cursor-pointer text-white/90">
                      {reason}
                    </Label>
                  </div>
                ))}
                {errors.rateTypeRuledOutReasons && <p className="text-red-300 text-sm">{errors.rateTypeRuledOutReasons}</p>}
              </div>
            )}
            <div>
              <Label htmlFor="rateTypeAdditionalJustification" className="text-white/80">Anything specific to this client (optional)</Label>
              <Textarea
                id="rateTypeAdditionalJustification"
                data-testid="textarea-rate-additional"
                value={formData.rateTypeAdditionalJustification}
                onChange={(e) => updateField("rateTypeAdditionalJustification", e.target.value)}
                rows={2}
                className={`${fieldClass} mt-1.5`}
              />
            </div>
          </section>

          <section className={cardClass}>
            <h3 className={headingClass}>
              <AccentBar />
              Lender Selection
            </h3>
            <div>
              <Label className="text-white/80">Lender</Label>
              <Select
                value={LENDER_OPTIONS.includes(formData.lender as any) ? formData.lender : "other"}
                onValueChange={(v) => {
                  if (v === "other") {
                    updateField("lender", "");
                  } else {
                    updateField("lender", v);
                  }
                }}
              >
                <SelectTrigger data-testid="select-lender" className={`${fieldClass} mt-1.5 ${errors.lender ? "border-red-400" : ""}`}>
                  <SelectValue placeholder="Select lender" />
                </SelectTrigger>
                <SelectContent>
                  {LENDER_OPTIONS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                  <SelectItem value="other">Other (type manually)</SelectItem>
                </SelectContent>
              </Select>
              {!LENDER_OPTIONS.includes(formData.lender as any) && (
                <Input
                  data-testid="input-lender-custom"
                  value={formData.lender}
                  onChange={(e) => updateField("lender", e.target.value)}
                  placeholder="Enter lender name"
                  className={`${fieldClass} mt-2`}
                />
              )}
              {errors.lender && <p className={errorTextClass}>{errors.lender}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-white/80">Reasons for lender selection</Label>
              {LENDER_REASONS.map((reason) => (
                <div key={reason} className={optionRowClass}>
                  <Checkbox
                    id={`lender-${reason}`}
                    className={checkboxClass}
                    data-testid={`checkbox-lender-reason-${reason.replace(/\s+/g, "-").toLowerCase()}`}
                    checked={formData.lenderReasons.includes(reason)}
                    onCheckedChange={() => toggleCheckbox("lenderReasons", reason)}
                  />
                  <Label htmlFor={`lender-${reason}`} className="font-normal cursor-pointer text-white/90">
                    {reason}
                  </Label>
                </div>
              ))}
              {errors.lenderReasons && <p className="text-red-300 text-sm">{errors.lenderReasons}</p>}
            </div>
            <div>
              <Label htmlFor="lenderAdditionalJustification" className="text-white/80">Additional Justification (optional)</Label>
              <Textarea
                id="lenderAdditionalJustification"
                data-testid="textarea-lender-additional"
                value={formData.lenderAdditionalJustification}
                onChange={(e) => updateField("lenderAdditionalJustification", e.target.value)}
                rows={2}
                className={`${fieldClass} mt-1.5`}
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-white/80">Other Lenders Considered</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  data-testid="button-add-other-lender"
                  onClick={addOtherLender}
                  className={outlineBtnClass}
                >
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
              {formData.otherLenders.map((ol, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <Input
                    data-testid={`input-other-lender-name-${i}`}
                    value={ol.name}
                    onChange={(e) => updateOtherLender(i, "name", e.target.value)}
                    placeholder="Lender name"
                    className={`${fieldClass} flex-1`}
                  />
                  <Input
                    data-testid={`input-other-lender-reason-${i}`}
                    value={ol.exclusionReason}
                    onChange={(e) => updateOtherLender(i, "exclusionReason", e.target.value)}
                    placeholder="Reason for exclusion"
                    className={`${fieldClass} flex-1`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    data-testid={`button-remove-other-lender-${i}`}
                    onClick={() => removeOtherLender(i)}
                    className="text-red-400 hover:bg-white/10 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </section>

          <section className={cardClass}>
            <h3 className={headingClass}>
              <AccentBar />
              Verification
            </h3>
            <div className="space-y-2">
              <Label className="text-white/80">Income Verification</Label>
              {INCOME_VERIFICATION_OPTIONS.map((opt) => (
                <div key={opt} className={optionRowClass}>
                  <Checkbox
                    id={`income-${opt}`}
                    className={checkboxClass}
                    data-testid={`checkbox-income-${opt.replace(/\s+/g, "-").toLowerCase()}`}
                    checked={formData.incomeVerification.includes(opt)}
                    onCheckedChange={() => toggleCheckbox("incomeVerification", opt)}
                  />
                  <Label htmlFor={`income-${opt}`} className="font-normal cursor-pointer text-white/90">
                    {opt}
                  </Label>
                </div>
              ))}
              {errors.incomeVerification && <p className="text-red-300 text-sm">{errors.incomeVerification}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-white/80">Expense Verification</Label>
              {EXPENSE_VERIFICATION_OPTIONS.map((opt) => (
                <div key={opt} className={optionRowClass}>
                  <Checkbox
                    id={`expense-${opt}`}
                    className={checkboxClass}
                    data-testid={`checkbox-expense-${opt.replace(/\s+/g, "-").toLowerCase()}`}
                    checked={formData.expenseVerification.includes(opt)}
                    onCheckedChange={() => toggleCheckbox("expenseVerification", opt)}
                  />
                  <Label htmlFor={`expense-${opt}`} className="font-normal cursor-pointer text-white/90">
                    {opt}
                  </Label>
                </div>
              ))}
              {errors.expenseVerification && <p className="text-red-300 text-sm">{errors.expenseVerification}</p>}
            </div>
          </section>

          <section className={cardClass}>
            <h3 className={headingClass}>
              <AccentBar />
              Change in Circumstances
            </h3>
            <RadioGroup
              value={formData.changeInCircumstances}
              onValueChange={(v) => updateField("changeInCircumstances", v as "yes" | "no")}
            >
              <div className={optionRowClass}>
                <RadioGroupItem value="no" id="change-no" data-testid="radio-change-no" className="border-white/40 text-[#f16823]" />
                <Label htmlFor="change-no" className="font-normal cursor-pointer text-white/90">
                  No change in circumstances
                </Label>
              </div>
              <div className={optionRowClass}>
                <RadioGroupItem value="yes" id="change-yes" data-testid="radio-change-yes" className="border-white/40 text-[#f16823]" />
                <Label htmlFor="change-yes" className="font-normal cursor-pointer text-white/90">
                  Yes, there is a change
                </Label>
              </div>
            </RadioGroup>
            {formData.changeInCircumstances === "yes" && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="changeDescription" className="text-white/80">Describe the change</Label>
                  <Textarea
                    id="changeDescription"
                    data-testid="textarea-change-description"
                    value={formData.changeDescription}
                    onChange={(e) => updateField("changeDescription", e.target.value)}
                    rows={2}
                    className={`${fieldClass} mt-1.5 ${errors.changeDescription ? "border-red-400" : ""}`}
                  />
                  {errors.changeDescription && <p className={errorTextClass}>{errors.changeDescription}</p>}
                </div>
                <div>
                  <Label htmlFor="changeMitigation" className="text-white/80">Mitigation measures</Label>
                  <Textarea
                    id="changeMitigation"
                    data-testid="textarea-change-mitigation"
                    value={formData.changeMitigation}
                    onChange={(e) => updateField("changeMitigation", e.target.value)}
                    rows={2}
                    className={`${fieldClass} mt-1.5 ${errors.changeMitigation ? "border-red-400" : ""}`}
                  />
                  {errors.changeMitigation && <p className={errorTextClass}>{errors.changeMitigation}</p>}
                </div>
              </div>
            )}
          </section>

          {isAffordabilityFlagged && (
            <section className="space-y-4 rounded-xl border border-[#f16823]/40 bg-[#f16823]/10 p-5 text-white">
              <h3 className="text-base font-semibold text-[#f7a072]">Affordability Justification Required</h3>
              <p className="text-sm text-white/80">
                The monthly budget is below the minimum threshold. Please provide justification.
              </p>
              <Textarea
                id="affordabilityJustification"
                data-testid="textarea-affordability-justification"
                value={formData.affordabilityJustification}
                onChange={(e) => updateField("affordabilityJustification", e.target.value)}
                rows={3}
                className={`${fieldClass} ${errors.affordabilityJustification ? "border-red-400" : ""}`}
              />
              {errors.affordabilityJustification && (
                <p className="text-red-300 text-sm">{errors.affordabilityJustification}</p>
              )}
            </section>
          )}
        </div>

        <div className="w-full lg:w-[450px] space-y-4">
          <div className="rounded-xl border border-white/10 bg-[#1f2a44] p-5 text-white lg:sticky lg:top-4">
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-white">
              <AccentBar />
              Requirements and Objectives Note
            </h3>
            <Textarea
              data-testid="textarea-note-preview"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={20}
              className="bg-white text-slate-900 border-slate-200 font-mono text-sm resize-none"
              placeholder="Click 'Generate note' to create the requirements and objectives note..."
            />
            <div className="flex flex-col gap-2 mt-4">
              <Button
                data-testid="button-generate-note"
                onClick={handleGenerateNote}
                className="w-full rounded-full bg-[#f16823] hover:bg-[#e8590c] text-white font-semibold"
              >
                Generate note
              </Button>
              <Button
                data-testid="button-compliance-wash"
                onClick={handleComplianceWash}
                disabled={isLoading || !noteText}
                variant="outline"
                className={`w-full ${outlineBtnClass}`}
              >
                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Compliance wash
              </Button>
              <div className="flex gap-2">
                <Input
                  data-testid="input-ai-instruction"
                  value={aiInstruction}
                  onChange={(e) => setAiInstruction(e.target.value)}
                  placeholder="Enter instruction for AI..."
                  className={`${fieldClass} flex-1`}
                />
                <Button
                  data-testid="button-ai-edit"
                  onClick={handleAiEdit}
                  disabled={isLoading || !noteText || !aiInstruction}
                  variant="outline"
                  className={outlineBtnClass}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "AI refine"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
