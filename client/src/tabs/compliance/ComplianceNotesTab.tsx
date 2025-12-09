import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Copy } from "lucide-react";

import {
  ComplianceFormData,
  CreditEnquiry,
  INCOME_VERIFICATION_OPTIONS,
  getInitialComplianceFormData,
} from "@/lib/complianceNotes/types";
import { generateComplianceNote } from "@/lib/complianceNotes/generateNote";

export function ComplianceNotesTab() {
  const { toast } = useToast();
  const [formData, setFormData] = useState<ComplianceFormData>(getInitialComplianceFormData());
  const [noteText, setNoteText] = useState("");

  const updateField = <K extends keyof ComplianceFormData>(field: K, value: ComplianceFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleIncomeVerification = (item: string) => {
    setFormData((prev) => {
      const current = prev.incomeVerification;
      const updated = current.includes(item)
        ? current.filter((x) => x !== item)
        : [...current, item];
      return { ...prev, incomeVerification: updated };
    });
  };

  const addEnquiry = () => {
    setFormData((prev) => ({
      ...prev,
      enquiries: [...prev.enquiries, { description: "", outcome: "", commentary: "" }],
    }));
  };

  const updateEnquiry = (index: number, field: keyof CreditEnquiry, value: string) => {
    setFormData((prev) => {
      const updated = [...prev.enquiries];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, enquiries: updated };
    });
  };

  const removeEnquiry = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      enquiries: prev.enquiries.filter((_, i) => i !== index),
    }));
  };

  const handleGenerate = () => {
    const note = generateComplianceNote(formData);
    setNoteText(note);
    toast({
      title: "Note Generated",
      description: "Compliance notes have been generated.",
    });
  };

  const handleCopy = async () => {
    if (!noteText) {
      toast({
        variant: "destructive",
        title: "Nothing to Copy",
        description: "Please generate a note first.",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(noteText);
      toast({
        title: "Copied",
        description: "Note copied to clipboard.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Copy Failed",
        description: "Could not copy to clipboard.",
      });
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 space-y-6 overflow-y-auto max-h-[calc(100vh-200px)] pr-2">
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-[#1f2a44]">Client Identification</h3>
          <RadioGroup
            value={formData.idVerification}
            onValueChange={(v) => updateField("idVerification", v as "biometric" | "personal")}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="biometric" id="id-biometric" data-testid="radio-id-biometric" />
              <Label htmlFor="id-biometric" className="font-normal cursor-pointer">
                Lender completed biometric ID verification
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="personal" id="id-personal" data-testid="radio-id-personal" />
              <Label htmlFor="id-personal" className="font-normal cursor-pointer">
                Broker personally sighted original ID documents
              </Label>
            </div>
          </RadioGroup>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-[#1f2a44]">Medicare Verification</h3>
          <RadioGroup
            value={formData.medicareMatch}
            onValueChange={(v) => updateField("medicareMatch", v as "yes" | "no")}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="medicare-yes" data-testid="radio-medicare-yes" />
              <Label htmlFor="medicare-yes" className="font-normal cursor-pointer">
                Medicare details match application
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="medicare-no" data-testid="radio-medicare-no" />
              <Label htmlFor="medicare-no" className="font-normal cursor-pointer">
                Medicare details require additional notes
              </Label>
            </div>
          </RadioGroup>
          {formData.medicareMatch === "no" && (
            <div>
              <Label htmlFor="medicareNotes">Additional Notes</Label>
              <Textarea
                id="medicareNotes"
                data-testid="textarea-medicare-notes"
                value={formData.medicareNotes}
                onChange={(e) => updateField("medicareNotes", e.target.value)}
                rows={2}
                placeholder="Explain discrepancy or additional verification steps..."
              />
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-[#1f2a44]">Income Verification</h3>
          <div className="space-y-2">
            {INCOME_VERIFICATION_OPTIONS.map((opt) => (
              <div key={opt} className="flex items-center space-x-2">
                <Checkbox
                  id={`income-${opt}`}
                  data-testid={`checkbox-compliance-income-${opt.replace(/\s+/g, "-").toLowerCase()}`}
                  checked={formData.incomeVerification.includes(opt)}
                  onCheckedChange={() => toggleIncomeVerification(opt)}
                />
                <Label htmlFor={`income-${opt}`} className="font-normal cursor-pointer">
                  {opt}
                </Label>
              </div>
            ))}
          </div>
          {formData.incomeVerification.includes("Other") && (
            <div>
              <Label htmlFor="incomeOtherNotes">Other Income Verification Details</Label>
              <Input
                id="incomeOtherNotes"
                data-testid="input-income-other-notes"
                value={formData.incomeOtherNotes}
                onChange={(e) => updateField("incomeOtherNotes", e.target.value)}
                placeholder="Describe other verification method..."
              />
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-[#1f2a44]">Expense Verification</h3>
          <Textarea
            data-testid="textarea-expense-verification"
            value={formData.expenseVerification}
            onChange={(e) => updateField("expenseVerification", e.target.value)}
            rows={3}
            placeholder="Describe how expenses were verified..."
          />
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-[#1f2a44]">Credit Enquiries</h3>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasEnquiries"
              data-testid="checkbox-has-enquiries"
              checked={formData.hasEnquiries}
              onCheckedChange={(checked) => updateField("hasEnquiries", checked === true)}
            />
            <Label htmlFor="hasEnquiries" className="font-normal cursor-pointer">
              There are credit enquiries to report
            </Label>
          </div>
          {formData.hasEnquiries && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Enquiries</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  data-testid="button-add-enquiry"
                  onClick={addEnquiry}
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Enquiry
                </Button>
              </div>
              {formData.enquiries.map((enq, i) => (
                <div key={i} className="p-3 bg-slate-50 rounded-lg space-y-2 border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600">Enquiry {i + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      data-testid={`button-remove-enquiry-${i}`}
                      onClick={() => removeEnquiry(i)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                  <Input
                    data-testid={`input-enquiry-description-${i}`}
                    value={enq.description}
                    onChange={(e) => updateEnquiry(i, "description", e.target.value)}
                    placeholder="Description (e.g., Credit card application with ANZ)"
                  />
                  <Input
                    data-testid={`input-enquiry-outcome-${i}`}
                    value={enq.outcome}
                    onChange={(e) => updateEnquiry(i, "outcome", e.target.value)}
                    placeholder="Outcome (e.g., Approved, Declined)"
                  />
                  <Textarea
                    data-testid={`textarea-enquiry-commentary-${i}`}
                    value={enq.commentary}
                    onChange={(e) => updateEnquiry(i, "commentary", e.target.value)}
                    placeholder="Commentary explaining relevance to this application..."
                    rows={2}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-[#1f2a44]">Unsuitability Assessment</h3>
          <RadioGroup
            value={formData.unsuitability}
            onValueChange={(v) => updateField("unsuitability", v as "yes" | "no")}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="suitable-yes" data-testid="radio-suitable-yes" />
              <Label htmlFor="suitable-yes" className="font-normal cursor-pointer">
                Loan is suitable for the client
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="suitable-no" data-testid="radio-suitable-no" />
              <Label htmlFor="suitable-no" className="font-normal cursor-pointer">
                Loan may be unsuitable - requires explanation
              </Label>
            </div>
          </RadioGroup>
          {formData.unsuitability === "no" && (
            <div>
              <Label htmlFor="unsuitabilityExplanation">Unsuitability Explanation</Label>
              <Textarea
                id="unsuitabilityExplanation"
                data-testid="textarea-unsuitability-explanation"
                value={formData.unsuitabilityExplanation}
                onChange={(e) => updateField("unsuitabilityExplanation", e.target.value)}
                rows={3}
                placeholder="Explain why the loan may be unsuitable and any considerations..."
              />
            </div>
          )}
        </section>
      </div>

      <div className="w-full lg:w-[450px] space-y-4">
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <h3 className="text-lg font-semibold text-[#1f2a44] mb-3">Generated Compliance Notes</h3>
          <Textarea
            data-testid="textarea-compliance-note-preview"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={20}
            className="font-mono text-sm resize-none"
            placeholder="Click 'Generate note' to create the compliance notes..."
          />
          <div className="flex gap-2 mt-4">
            <Button
              data-testid="button-generate-compliance-note"
              onClick={handleGenerate}
              className="flex-1 bg-[#fe6900] hover:bg-[#e55f00] text-white"
            >
              Generate note
            </Button>
            <Button
              data-testid="button-copy-compliance-note"
              onClick={handleCopy}
              variant="outline"
              disabled={!noteText}
            >
              <Copy className="w-4 h-4 mr-1" /> Copy
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
