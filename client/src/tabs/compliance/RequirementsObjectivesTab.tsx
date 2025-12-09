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
    }));
  };

  const toggleCheckbox = (field: "rateTypeReasons" | "lenderReasons" | "incomeVerification" | "expenseVerification", item: string) => {
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

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 space-y-6 overflow-y-auto max-h-[calc(100vh-200px)] pr-2">
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-[#1f2a44]">Client & Loan Type</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                data-testid="input-first-name"
                value={formData.firstName}
                onChange={(e) => updateField("firstName", e.target.value)}
                className={errors.firstName ? "border-red-500" : ""}
              />
              {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                data-testid="input-last-name"
                value={formData.lastName}
                onChange={(e) => updateField("lastName", e.target.value)}
                className={errors.lastName ? "border-red-500" : ""}
              />
              {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
            </div>
          </div>
          <div>
            <Label>Loan Type</Label>
            <Select
              value={formData.loanType}
              onValueChange={(v) => handleLoanTypeChange(v as LoanType)}
            >
              <SelectTrigger data-testid="select-loan-type" className={errors.loanType ? "border-red-500" : ""}>
                <SelectValue placeholder="Select loan type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="consumer_car">Consumer Car</SelectItem>
                <SelectItem value="secured_personal">Secured Personal</SelectItem>
                <SelectItem value="unsecured_personal">Unsecured Personal</SelectItem>
              </SelectContent>
            </Select>
            {errors.loanType && <p className="text-red-500 text-sm mt-1">{errors.loanType}</p>}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-[#1f2a44]">Loan Details</h3>
          <div>
            <Label htmlFor="purpose">Purpose</Label>
            <Input
              id="purpose"
              data-testid="input-purpose"
              value={formData.purpose}
              onChange={(e) => updateField("purpose", e.target.value)}
              placeholder="e.g., purchase a motor vehicle for personal use"
              className={errors.purpose ? "border-red-500" : ""}
            />
            {errors.purpose && <p className="text-red-500 text-sm mt-1">{errors.purpose}</p>}
          </div>
          {formData.isSecured && formData.loanType !== "consumer_car" && (
            <div>
              <Label htmlFor="securityDescription">Security Description</Label>
              <Input
                id="securityDescription"
                data-testid="input-security-description"
                value={formData.securityDescription}
                onChange={(e) => updateField("securityDescription", e.target.value)}
                className={errors.securityDescription ? "border-red-500" : ""}
              />
              {errors.securityDescription && <p className="text-red-500 text-sm mt-1">{errors.securityDescription}</p>}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="loanAmount">Loan Amount ($)</Label>
              <Input
                id="loanAmount"
                data-testid="input-loan-amount"
                type="text"
                value={formData.loanAmount}
                onChange={(e) => updateField("loanAmount", e.target.value)}
                placeholder="e.g., 25000"
                className={errors.loanAmount ? "border-red-500" : ""}
              />
              {errors.loanAmount && <p className="text-red-500 text-sm mt-1">{errors.loanAmount}</p>}
            </div>
            <div>
              <Label>Term (months)</Label>
              <Select
                value={formData.term ? formData.term.toString() : ""}
                onValueChange={(v) => updateField("term", parseInt(v))}
              >
                <SelectTrigger data-testid="select-term" className={errors.term ? "border-red-500" : ""}>
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
              {errors.term && <p className="text-red-500 text-sm mt-1">{errors.term}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="budgetAmount">Budget Amount ($)</Label>
              <Input
                id="budgetAmount"
                data-testid="input-budget-amount"
                type="text"
                value={formData.budgetAmount}
                onChange={(e) => updateField("budgetAmount", e.target.value)}
                placeholder="e.g., 500"
                className={errors.budgetAmount ? "border-red-500" : ""}
              />
              {errors.budgetAmount && <p className="text-red-500 text-sm mt-1">{errors.budgetAmount}</p>}
            </div>
            <div>
              <Label>Budget Frequency</Label>
              <Select
                value={formData.budgetFrequency}
                onValueChange={(v) => updateField("budgetFrequency", v as BudgetFrequency)}
              >
                <SelectTrigger data-testid="select-budget-frequency">
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
            <p className="text-sm text-slate-600">
              Monthly budget: ${monthlyBudget.toFixed(2)}
              {isAffordabilityFlagged && (
                <span className="text-amber-600 ml-2">(Affordability flagged)</span>
              )}
            </p>
          )}
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-[#1f2a44]">Rate Type</h3>
          <div>
            <Label>Rate Type</Label>
            <Select
              value={formData.rateType}
              onValueChange={(v) => handleRateTypeChange(v as RateType)}
            >
              <SelectTrigger data-testid="select-rate-type" className={errors.rateType ? "border-red-500" : ""}>
                <SelectValue placeholder="Select rate type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixed</SelectItem>
                <SelectItem value="variable">Variable</SelectItem>
              </SelectContent>
            </Select>
            {errors.rateType && <p className="text-red-500 text-sm mt-1">{errors.rateType}</p>}
          </div>
          {formData.rateType && (
            <div className="space-y-2">
              <Label>Reasons for {formData.rateType} rate</Label>
              {rateReasons.map((reason) => (
                <div key={reason} className="flex items-center space-x-2">
                  <Checkbox
                    id={`rate-${reason}`}
                    data-testid={`checkbox-rate-reason-${reason.replace(/\s+/g, "-").toLowerCase()}`}
                    checked={formData.rateTypeReasons.includes(reason)}
                    onCheckedChange={() => toggleCheckbox("rateTypeReasons", reason)}
                  />
                  <Label htmlFor={`rate-${reason}`} className="font-normal cursor-pointer">
                    {reason}
                  </Label>
                </div>
              ))}
              {errors.rateTypeReasons && <p className="text-red-500 text-sm">{errors.rateTypeReasons}</p>}
            </div>
          )}
          <div>
            <Label htmlFor="rateTypeAdditionalJustification">Additional Justification (optional)</Label>
            <Textarea
              id="rateTypeAdditionalJustification"
              data-testid="textarea-rate-additional"
              value={formData.rateTypeAdditionalJustification}
              onChange={(e) => updateField("rateTypeAdditionalJustification", e.target.value)}
              rows={2}
            />
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-[#1f2a44]">Lender Selection</h3>
          <div>
            <Label>Lender</Label>
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
              <SelectTrigger data-testid="select-lender" className={errors.lender ? "border-red-500" : ""}>
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
                className="mt-2"
              />
            )}
            {errors.lender && <p className="text-red-500 text-sm mt-1">{errors.lender}</p>}
          </div>
          <div className="space-y-2">
            <Label>Reasons for lender selection</Label>
            {LENDER_REASONS.map((reason) => (
              <div key={reason} className="flex items-center space-x-2">
                <Checkbox
                  id={`lender-${reason}`}
                  data-testid={`checkbox-lender-reason-${reason.replace(/\s+/g, "-").toLowerCase()}`}
                  checked={formData.lenderReasons.includes(reason)}
                  onCheckedChange={() => toggleCheckbox("lenderReasons", reason)}
                />
                <Label htmlFor={`lender-${reason}`} className="font-normal cursor-pointer">
                  {reason}
                </Label>
              </div>
            ))}
            {errors.lenderReasons && <p className="text-red-500 text-sm">{errors.lenderReasons}</p>}
          </div>
          <div>
            <Label htmlFor="lenderAdditionalJustification">Additional Justification (optional)</Label>
            <Textarea
              id="lenderAdditionalJustification"
              data-testid="textarea-lender-additional"
              value={formData.lenderAdditionalJustification}
              onChange={(e) => updateField("lenderAdditionalJustification", e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Other Lenders Considered</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-testid="button-add-other-lender"
                onClick={addOtherLender}
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
                  className="flex-1"
                />
                <Input
                  data-testid={`input-other-lender-reason-${i}`}
                  value={ol.exclusionReason}
                  onChange={(e) => updateOtherLender(i, "exclusionReason", e.target.value)}
                  placeholder="Reason for exclusion"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  data-testid={`button-remove-other-lender-${i}`}
                  onClick={() => removeOtherLender(i)}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-[#1f2a44]">Verification</h3>
          <div className="space-y-2">
            <Label>Income Verification</Label>
            {INCOME_VERIFICATION_OPTIONS.map((opt) => (
              <div key={opt} className="flex items-center space-x-2">
                <Checkbox
                  id={`income-${opt}`}
                  data-testid={`checkbox-income-${opt.replace(/\s+/g, "-").toLowerCase()}`}
                  checked={formData.incomeVerification.includes(opt)}
                  onCheckedChange={() => toggleCheckbox("incomeVerification", opt)}
                />
                <Label htmlFor={`income-${opt}`} className="font-normal cursor-pointer">
                  {opt}
                </Label>
              </div>
            ))}
            {errors.incomeVerification && <p className="text-red-500 text-sm">{errors.incomeVerification}</p>}
          </div>
          <div className="space-y-2">
            <Label>Expense Verification</Label>
            {EXPENSE_VERIFICATION_OPTIONS.map((opt) => (
              <div key={opt} className="flex items-center space-x-2">
                <Checkbox
                  id={`expense-${opt}`}
                  data-testid={`checkbox-expense-${opt.replace(/\s+/g, "-").toLowerCase()}`}
                  checked={formData.expenseVerification.includes(opt)}
                  onCheckedChange={() => toggleCheckbox("expenseVerification", opt)}
                />
                <Label htmlFor={`expense-${opt}`} className="font-normal cursor-pointer">
                  {opt}
                </Label>
              </div>
            ))}
            {errors.expenseVerification && <p className="text-red-500 text-sm">{errors.expenseVerification}</p>}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-[#1f2a44]">Change in Circumstances</h3>
          <RadioGroup
            value={formData.changeInCircumstances}
            onValueChange={(v) => updateField("changeInCircumstances", v as "yes" | "no")}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="change-no" data-testid="radio-change-no" />
              <Label htmlFor="change-no" className="font-normal cursor-pointer">
                No change in circumstances
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="change-yes" data-testid="radio-change-yes" />
              <Label htmlFor="change-yes" className="font-normal cursor-pointer">
                Yes, there is a change
              </Label>
            </div>
          </RadioGroup>
          {formData.changeInCircumstances === "yes" && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="changeDescription">Describe the change</Label>
                <Textarea
                  id="changeDescription"
                  data-testid="textarea-change-description"
                  value={formData.changeDescription}
                  onChange={(e) => updateField("changeDescription", e.target.value)}
                  rows={2}
                  className={errors.changeDescription ? "border-red-500" : ""}
                />
                {errors.changeDescription && <p className="text-red-500 text-sm mt-1">{errors.changeDescription}</p>}
              </div>
              <div>
                <Label htmlFor="changeMitigation">Mitigation measures</Label>
                <Textarea
                  id="changeMitigation"
                  data-testid="textarea-change-mitigation"
                  value={formData.changeMitigation}
                  onChange={(e) => updateField("changeMitigation", e.target.value)}
                  rows={2}
                  className={errors.changeMitigation ? "border-red-500" : ""}
                />
                {errors.changeMitigation && <p className="text-red-500 text-sm mt-1">{errors.changeMitigation}</p>}
              </div>
            </div>
          )}
        </section>

        {isAffordabilityFlagged && (
          <section className="space-y-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <h3 className="text-lg font-semibold text-amber-800">Affordability Justification Required</h3>
            <p className="text-sm text-amber-700">
              The monthly budget is below the minimum threshold. Please provide justification.
            </p>
            <Textarea
              id="affordabilityJustification"
              data-testid="textarea-affordability-justification"
              value={formData.affordabilityJustification}
              onChange={(e) => updateField("affordabilityJustification", e.target.value)}
              rows={3}
              className={errors.affordabilityJustification ? "border-red-500" : ""}
            />
            {errors.affordabilityJustification && (
              <p className="text-red-500 text-sm">{errors.affordabilityJustification}</p>
            )}
          </section>
        )}
      </div>

      <div className="w-full lg:w-[450px] space-y-4">
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <h3 className="text-lg font-semibold text-[#1f2a44] mb-3">
            Generated Requirements and Objectives Notes
          </h3>
          <Textarea
            data-testid="textarea-note-preview"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={20}
            className="font-mono text-sm resize-none"
            placeholder="Click 'Generate note' to create the requirements and objectives note..."
          />
          <div className="flex flex-col gap-2 mt-4">
            <Button
              data-testid="button-generate-note"
              onClick={handleGenerateNote}
              className="w-full bg-[#fe6900] hover:bg-[#e55f00] text-white"
            >
              Generate note
            </Button>
            <Button
              data-testid="button-compliance-wash"
              onClick={handleComplianceWash}
              disabled={isLoading || !noteText}
              variant="outline"
              className="w-full"
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
                className="flex-1"
              />
              <Button
                data-testid="button-ai-edit"
                onClick={handleAiEdit}
                disabled={isLoading || !noteText || !aiInstruction}
                variant="outline"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "AI refine"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
