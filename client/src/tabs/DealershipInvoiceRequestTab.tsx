import { useState, useEffect } from "react";
import { Save, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { todayIso } from "@/lib/dates";
import { formatCurrency, round2 } from "@/lib/money";

import { 
  DealerRequestForm, 
  BrokerName, 
  calculateInvoiceBalance, 
  getBrokerEmail,
  generateDefaultSubject,
  generateDefaultBody
} from "@/lib/dealerRequest/types";
import { generateDealerRequestPdf } from "@/lib/dealerRequest/pdf";

type ValidationErrors = {
  supplierName?: string;
  broker?: string;
  dateIso?: string;
  clientName?: string;
  clientAddress?: string;
  priceOfVehicle?: string;
};

export function DealershipInvoiceRequestTab() {
  const { toast } = useToast();
  
  // Form state
  const [supplierName, setSupplierName] = useState("");
  const [contactName, setContactName] = useState("");
  const [broker, setBroker] = useState<BrokerName>("Alex Qemal");
  const [dateIso, setDateIso] = useState(todayIso());
  
  const [clientName, setClientName] = useState("");
  const [clientAbn, setClientAbn] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  
  const [priceOfVehicle, setPriceOfVehicle] = useState<number>(0);
  const [deposit, setDeposit] = useState<number>(0);
  const [tradeIn, setTradeIn] = useState<number>(0);
  const [refundDeposit, setRefundDeposit] = useState<number>(0);
  const [financePayout, setFinancePayout] = useState<number>(0);
  const [cashBackToClient, setCashBackToClient] = useState<number>(0);
  
  // Email template state
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [userEditedSubject, setUserEditedSubject] = useState(false);
  const [userEditedBody, setUserEditedBody] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Validation state
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showErrors, setShowErrors] = useState(false);

  // Calculate invoice balance
  const invoiceBalance = round2(calculateInvoiceBalance({
    priceOfVehicle, deposit, tradeIn, refundDeposit, financePayout, cashBackToClient
  }));

  // Build form object for email template generation
  const formForTemplate = { clientName, contactName, broker };

  // Auto-update email template when relevant fields change
  useEffect(() => {
    if (!userEditedSubject) {
      setSubject(generateDefaultSubject(formForTemplate));
    }
    if (!userEditedBody) {
      setBody(generateDefaultBody(formForTemplate));
    }
  }, [clientName, contactName, broker]);

  // Initialize email template on mount
  useEffect(() => {
    setSubject(generateDefaultSubject(formForTemplate));
    setBody(generateDefaultBody(formForTemplate));
  }, []);

  const validate = (): boolean => {
    const newErrors: ValidationErrors = {};
    
    if (!supplierName.trim()) newErrors.supplierName = "Supplier name is required";
    if (!broker) newErrors.broker = "Broker is required";
    if (!dateIso) newErrors.dateIso = "Date is required";
    if (!clientName.trim()) newErrors.clientName = "Client name is required";
    if (!clientAddress.trim()) newErrors.clientAddress = "Client address is required";
    if (!priceOfVehicle || priceOfVehicle <= 0) newErrors.priceOfVehicle = "Price of vehicle must be greater than 0";
    
    setErrors(newErrors);
    setShowErrors(Object.keys(newErrors).length > 0);
    return Object.keys(newErrors).length === 0;
  };

  const handleGenerate = async () => {
    if (!validate()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please complete all required fields highlighted below."
      });
      return;
    }

    const form: DealerRequestForm = {
      supplierName,
      contactName: contactName || undefined,
      broker,
      dateIso,
      clientName,
      clientAbn: clientAbn || undefined,
      clientAddress,
      priceOfVehicle,
      deposit,
      tradeIn,
      refundDeposit,
      financePayout,
      cashBackToClient,
      invoiceBalance
    };

    try {
      const pdfBytes = await generateDealerRequestPdf(form);
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      // Sanitize filename
      const safeName = clientName.replace(/[^a-zA-Z0-9\s]/g, "").trim() || "Client";
      link.download = `${safeName} - Tax Invoice Request.pdf`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({ title: "PDF Generated", description: "Tax Invoice Request downloaded successfully." });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error", description: "Failed to generate PDF" });
    }
  };

  const handleCopyBody = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      toast({ variant: "destructive", title: "Copy Failed", description: "Could not copy to clipboard" });
    }
  };

  const inputClass = (field: keyof ValidationErrors) => cn(
    "bg-white",
    showErrors && errors[field] && "border-red-400 bg-red-50"
  );

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <Card className="bg-white rounded-2xl shadow-md">
        <CardContent className="p-6 md:p-8 space-y-8">
          
          {/* Header */}
          <div className="border-b border-slate-100 pb-6">
            <h2 className="text-2xl font-bold text-slate-900">Dealership Tax Invoice Request</h2>
            <p className="text-slate-500 text-sm mt-1">Generate a tax invoice request to send to dealerships.</p>
          </div>

          {/* Error Banner */}
          {showErrors && Object.keys(errors).length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              Please complete all required fields highlighted below before generating the request.
            </div>
          )}

          {/* Section 1 - From / To / Date */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-primary rounded-full"/> Request Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Issued To (Dealership) <span className="text-red-500">*</span></Label>
                <Input 
                  value={supplierName} 
                  onChange={e => setSupplierName(e.target.value)}
                  placeholder="e.g. ABC Motors Pty Ltd"
                  className={inputClass("supplierName")}
                />
                {showErrors && errors.supplierName && <p className="text-xs text-red-500">{errors.supplierName}</p>}
              </div>
              
              <div className="space-y-2">
                <Label>Contact Name <span className="text-slate-400 font-normal">(Optional)</span></Label>
                <Input 
                  value={contactName} 
                  onChange={e => setContactName(e.target.value)}
                  placeholder="e.g. John Smith"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Broker <span className="text-red-500">*</span></Label>
                <Select value={broker} onValueChange={(v) => setBroker(v as BrokerName)}>
                  <SelectTrigger className={inputClass("broker")}>
                    <SelectValue placeholder="Select broker" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Alex Qemal">Alex Qemal</SelectItem>
                    <SelectItem value="Francis Valente">Francis Valente</SelectItem>
                  </SelectContent>
                </Select>
                {showErrors && errors.broker && <p className="text-xs text-red-500">{errors.broker}</p>}
              </div>
              
              <div className="space-y-2">
                <Label>Date <span className="text-red-500">*</span></Label>
                <Input 
                  type="date" 
                  value={dateIso} 
                  onChange={e => setDateIso(e.target.value)}
                  className={inputClass("dateIso")}
                />
                {showErrors && errors.dateIso && <p className="text-xs text-red-500">{errors.dateIso}</p>}
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Section 2 - Client Details */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-primary rounded-full"/> Client Details (Invoice / Delivery To)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Client Name <span className="text-red-500">*</span></Label>
                <Input 
                  value={clientName} 
                  onChange={e => setClientName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className={inputClass("clientName")}
                />
                {showErrors && errors.clientName && <p className="text-xs text-red-500">{errors.clientName}</p>}
              </div>
              
              <div className="space-y-2">
                <Label>Client ABN <span className="text-slate-400 font-normal">(Optional)</span></Label>
                <Input 
                  value={clientAbn} 
                  onChange={e => setClientAbn(e.target.value)}
                  placeholder="XX XXX XXX XXX"
                />
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label>Client Address <span className="text-red-500">*</span></Label>
                <Textarea 
                  value={clientAddress} 
                  onChange={e => setClientAddress(e.target.value)}
                  placeholder="123 Main Street&#10;Sydney NSW 2000"
                  rows={3}
                  className={inputClass("clientAddress")}
                />
                {showErrors && errors.clientAddress && <p className="text-xs text-red-500">{errors.clientAddress}</p>}
              </div>
            </div>
          </div>

          {/* Static Instructions */}
          <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600 space-y-3">
            <p className="font-medium text-slate-700">Please include all vehicle identifiers in your tax invoice, including:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Whether the vehicle is New, Used or Demo</li>
              <li>VIN or Serial Number</li>
              <li>Engine Number</li>
              <li>Registration Number (if registered)</li>
              <li>Colour</li>
              <li>Make, Model and Badge / Series</li>
              <li>Build Date and Compliance Date</li>
              <li>Any other relevant identifiers</li>
              <li>Your dealership bank details for payment (account name, BSB and account number)</li>
            </ul>
            <p className="font-semibold text-primary mt-4">
              Please email the tax invoice to {getBrokerEmail(broker)}.
            </p>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Section 3 - Settlement Details */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-primary rounded-full"/> Settlement Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Price of Vehicle <span className="text-red-500">*</span></Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={priceOfVehicle || ""} 
                  onChange={e => setPriceOfVehicle(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className={inputClass("priceOfVehicle")}
                />
                {showErrors && errors.priceOfVehicle && <p className="text-xs text-red-500">{errors.priceOfVehicle}</p>}
              </div>
              
              <div className="space-y-2">
                <Label>Deposit <span className="text-slate-400 font-normal">(Optional)</span></Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={deposit || ""} 
                  onChange={e => setDeposit(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Trade In <span className="text-slate-400 font-normal">(Optional)</span></Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={tradeIn || ""} 
                  onChange={e => setTradeIn(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Refund Deposit <span className="text-slate-400 font-normal">(Optional)</span></Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={refundDeposit || ""} 
                  onChange={e => setRefundDeposit(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Finance Payout <span className="text-slate-400 font-normal">(Optional)</span></Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={financePayout || ""} 
                  onChange={e => setFinancePayout(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Cash Back to Client <span className="text-slate-400 font-normal">(Optional)</span></Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={cashBackToClient || ""} 
                  onChange={e => setCashBackToClient(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
            </div>
            
            {/* Invoice Balance */}
            <div className="mt-6 pt-4 border-t border-slate-200 flex justify-between items-center">
              <span className="text-lg font-bold text-slate-800">Invoice Balance</span>
              <span className="text-xl font-bold text-primary">{formatCurrency(invoiceBalance)}</span>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Section 4 - Email Template */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-primary rounded-full"/> Email Template
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              You can copy this into your email client. It updates automatically as you change the form until you edit it manually.
            </p>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input 
                  value={subject} 
                  onChange={e => {
                    setSubject(e.target.value);
                    setUserEditedSubject(true);
                  }}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Body</Label>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleCopyBody}
                    className="text-xs"
                  >
                    {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                    {copied ? "Copied!" : "Copy Body"}
                  </Button>
                </div>
                <Textarea 
                  value={body} 
                  onChange={e => {
                    setBody(e.target.value);
                    setUserEditedBody(true);
                  }}
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Generate PDF Button */}
          <div className="pt-4">
            <Button 
              size="lg" 
              onClick={handleGenerate}
              className="w-full bg-primary hover:bg-primary/90 text-white shadow-lg shadow-orange-200"
              data-testid="button-generate-pdf"
            >
              <Save className="w-5 h-5 mr-2" /> Generate PDF
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
