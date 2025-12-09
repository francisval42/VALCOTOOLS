import { useState, useRef, useEffect } from "react";
import { Upload, FileText, CheckCircle, AlertTriangle, Loader2, Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { todayIso } from "@/lib/dates";
import { formatCurrency } from "@/lib/money";

import { 
  PrivateSaleInvoice, 
  FieldId, 
  FieldState, 
  FieldStatus, 
  PrivateSaleDisbursement,
  DoxaiParsed 
} from "@/lib/privateSale/types";
import { parseDoxaiPdf } from "@/lib/privateSale/doxaiParser";
import { generatePrivateSalePdf } from "@/lib/privateSale/pdf";
import { addPrivateSaleInvoice, getPrivateSaleInvoices } from "@/lib/privateSale/storage";

import { TrafficLightInput } from "@/components/TrafficLightInput";
import { DisbursementTable } from "@/components/DisbursementTable";

// --- Constants & Helper Types ---

const REQUIRED_FIELDS: FieldId[] = [
  "vendorName",
  "vendorAddress",
  "buyerName",
  "buyerAddress",
  "vehicleMake",
  "vehicleModel",
  "vehicleVin",
  "vehicleRegistration",
  "vehicleOdometer",
  "invoiceAmount"
];

// --- Tab Component ---

export function PrivateSaleInvoiceTab() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<DoxaiParsed | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<PrivateSaleInvoice[]>([]);

  // Field States Map
  // We explicitly type the keys we care about, others can be generic
  const [fields, setFields] = useState<Record<string, FieldState>>({});

  // Initialize fields
  useEffect(() => {
    const initial: Record<string, FieldState> = {};
    const allFieldIds: FieldId[] = [
      "vendorName", "vendorAddress", "buyerName", "buyerAddress",
      "vehicleMake", "vehicleModel", "vehicleDescription", "vehicleVin",
      "vehicleEngineNumber", "vehicleRegistration", "vehicleOdometer",
      "vehicleBuildDate", "vehicleComplianceDate", "invoiceAmount"
    ];

    allFieldIds.forEach(id => {
      initial[id] = {
        value: "",
        status: REQUIRED_FIELDS.includes(id) ? "missing" : "confirmed", // Optional fields start confirmed (green) or neutral? Spec says "missing" (red) for required.
        initialSource: "empty"
      };
    });
    
    setFields(initial);
    setRecentInvoices(getPrivateSaleInvoices());
  }, []);

  // Invoice Meta State
  const [invoiceDate, setInvoiceDate] = useState(todayIso());
  const [gstMode, setGstMode] = useState<"GST_INC" | "NO_GST">("GST_INC");
  
  // Vendor optional fields
  const [vendorAbn, setVendorAbn] = useState("");
  const [showAcn, setShowAcn] = useState(false);
  const [vendorAcn, setVendorAcn] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");

  // Disbursements
  const [disbursements, setDisbursements] = useState<PrivateSaleDisbursement[]>([]);

  // Signatures
  const [includeVendorSig, setIncludeVendorSig] = useState(true);
  const [includeBuyerSig, setIncludeBuyerSig] = useState(true);

  // --- Helpers ---

  const updateField = (id: FieldId, newValue: string) => {
    setFields(prev => {
      const current = prev[id];
      let newStatus: FieldStatus = current.status;
      let newSource = current.initialSource;

      // Logic:
      // If manual entry (and was empty or parser), source becomes manual
      if (current.value !== newValue) {
        if (current.initialSource === "empty") newSource = "manual";
        
        // If not empty, it's confirmed
        if (newValue.trim().length > 0) {
            newStatus = "confirmed";
        } else {
             // If cleared and required, missing
             if (REQUIRED_FIELDS.includes(id)) {
                 newStatus = "missing";
             }
        }
      }

      return {
        ...prev,
        [id]: {
          value: newValue,
          status: newStatus,
          initialSource: newSource
        }
      };
    });
  };

  const handleBlur = (id: FieldId) => {
    setFields(prev => {
      const current = prev[id];
      let newStatus = current.status;
      
      if (current.status === "autoFilled") {
          // Confirm on blur if value exists
          if (current.value.trim().length > 0) {
              newStatus = "confirmed";
          } else if (REQUIRED_FIELDS.includes(id)) {
              newStatus = "missing";
          }
      }
      
      return {
          ...prev,
          [id]: { ...current, status: newStatus }
      };
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    try {
      const parsed = await parseDoxaiPdf(file);
      setParseResult(parsed);
      applyParsedData(parsed);
      toast({
        title: "Report Parsed",
        description: "Fields have been auto-filled. Please review yellow fields.",
      });
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Parsing Failed",
        description: "Could not recognise this as a DoxAI inspection report.",
      });
    } finally {
      setIsParsing(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const applyParsedData = (data: DoxaiParsed) => {
    setFields(prev => {
      const next = { ...prev };
      
      const map: Partial<Record<keyof DoxaiParsed, FieldId>> = {
        vendorName: "vendorName",
        vendorAddress: "vendorAddress",
        vehicleMake: "vehicleMake",
        vehicleModel: "vehicleModel",
        vehicleDescription: "vehicleDescription",
        vehicleVin: "vehicleVin",
        vehicleEngineNumber: "vehicleEngineNumber",
        vehicleRegistration: "vehicleRegistration",
        vehicleOdometer: "vehicleOdometer",
        vehicleBuildYear: "vehicleBuildDate",
        vehicleComplianceYearMonth: "vehicleComplianceDate"
      };

      (Object.keys(map) as Array<keyof DoxaiParsed>).forEach(key => {
        const fieldId = map[key];
        const val = data[key];
        
        if (fieldId && val) {
            const currentField = next[fieldId];
            // Only overwrite if empty
            if (!currentField.value) {
                next[fieldId] = {
                    value: val,
                    status: "autoFilled",
                    initialSource: "parser"
                };
            }
        }
      });
      return next;
    });
  };

  const handleGenerate = async () => {
    // Validate required fields
    const missing = REQUIRED_FIELDS.filter(id => !fields[id]?.value);
    if (missing.length > 0) {
        toast({
            variant: "destructive",
            title: "Missing Fields",
            description: `Please fill in: ${missing.join(", ")}`
        });
        return;
    }

    const invoiceAmt = parseFloat(fields["invoiceAmount"]?.value || "0");
    const gstAmt = gstMode === "GST_INC" ? invoiceAmt / 11 : 0; // 1/11th is GST
    
    // Construct Object
    const inv: PrivateSaleInvoice = {
        id: Date.now().toString(),
        title: gstMode === "GST_INC" ? "TAX INVOICE" : "INVOICE",
        invoiceDate,
        gstMode,
        vendor: {
            name: fields["vendorName"].value,
            address: fields["vendorAddress"].value,
            abn: vendorAbn,
            acn: showAcn ? vendorAcn : undefined,
            phone: vendorPhone,
            email: vendorEmail
        },
        buyer: {
            name: fields["buyerName"].value,
            address: fields["buyerAddress"].value
        },
        vehicle: {
            make: fields["vehicleMake"].value,
            model: fields["vehicleModel"].value,
            description: fields["vehicleDescription"].value,
            vin: fields["vehicleVin"].value,
            registration: fields["vehicleRegistration"].value,
            engineNumber: fields["vehicleEngineNumber"].value,
            odometer: fields["vehicleOdometer"].value,
            buildDate: fields["vehicleBuildDate"].value,
            complianceDate: fields["vehicleComplianceDate"].value
        },
        invoiceAmount: invoiceAmt,
        gstAmount: gstAmt,
        totalPayable: invoiceAmt, // Disbursements included in total or added to it? Spec says "Included in total payable" in pdf text, usually implies Invoice Amount covers it.
        disbursements,
        includeVendorSignature: includeVendorSig,
        includeBuyerSignature: includeBuyerSig
    };

    try {
        const pdfBytes = await generatePrivateSalePdf(inv);
        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `PrivateSale-${inv.vehicle.registration || "Invoice"}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Save to recent
        const updated = addPrivateSaleInvoice(inv);
        setRecentInvoices(updated);
        
        toast({ title: "Invoice Generated", description: "PDF downloaded successfully." });
    } catch (e) {
        console.error(e);
        toast({ variant: "destructive", title: "Error", description: "Failed to generate PDF" });
    }
  };
  
  const handleLoadRecent = (inv: PrivateSaleInvoice) => {
      if (!confirm("Load this invoice? Unsaved changes will be lost.")) return;
      
      // Map back to state
      setInvoiceDate(inv.invoiceDate);
      setGstMode(inv.gstMode);
      setVendorAbn(inv.vendor.abn || "");
      setVendorAcn(inv.vendor.acn || "");
      setShowAcn(!!inv.vendor.acn);
      setVendorPhone(inv.vendor.phone || "");
      setVendorEmail(inv.vendor.email || "");
      setDisbursements(inv.disbursements);
      setIncludeVendorSig(inv.includeVendorSignature);
      setIncludeBuyerSig(inv.includeBuyerSignature);
      
      // Map fields
      const newFields = { ...fields };
      
      const setF = (id: FieldId, val?: string) => {
          newFields[id] = { value: val || "", status: "confirmed", initialSource: "manual" };
      };

      setF("vendorName", inv.vendor.name);
      setF("vendorAddress", inv.vendor.address);
      setF("buyerName", inv.buyer.name);
      setF("buyerAddress", inv.buyer.address);
      setF("vehicleMake", inv.vehicle.make);
      setF("vehicleModel", inv.vehicle.model);
      setF("vehicleDescription", inv.vehicle.description);
      setF("vehicleVin", inv.vehicle.vin);
      setF("vehicleEngineNumber", inv.vehicle.engineNumber);
      setF("vehicleRegistration", inv.vehicle.registration);
      setF("vehicleOdometer", inv.vehicle.odometer);
      setF("vehicleBuildDate", inv.vehicle.buildDate);
      setF("vehicleComplianceDate", inv.vehicle.complianceDate);
      setF("invoiceAmount", inv.invoiceAmount.toString());
      
      setFields(newFields);
      toast({ title: "Loaded", description: "Invoice details loaded." });
  };

  const handleReset = () => {
     if(confirm("Reset form?")) {
         window.location.reload(); // Laziest reset but effective for full clear
     }
  };

  if (Object.keys(fields).length === 0) return null; // Loading

  return (
    <div className="flex flex-col xl:flex-row gap-6 pb-20">
      <div className="flex-1 min-w-0 space-y-6">
        
        {/* Upload Card */}
        <Card className="border-slate-200 shadow-sm bg-slate-50/50">
          <CardContent className="p-6">
            <div 
              className="border-2 border-dashed border-slate-300 rounded-lg p-8 flex flex-col items-center justify-center text-center hover:bg-white hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                 type="file" 
                 accept=".pdf" 
                 ref={fileInputRef} 
                 className="hidden" 
                 onChange={handleFileUpload} 
              />
              <div className="bg-white p-3 rounded-full shadow-sm mb-3">
                 {isParsing ? <Loader2 className="w-6 h-6 text-primary animate-spin" /> : <Upload className="w-6 h-6 text-primary" />}
              </div>
              <h3 className="font-semibold text-slate-800">Inspection Report (Optional)</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm">
                Drop your DoxAI report here or click to upload to auto-fill vehicle details.
              </p>
            </div>
            
            {parseResult && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-md text-sm text-slate-700">
                    <div className="font-semibold flex items-center gap-2 mb-2 text-amber-800">
                        <CheckCircle className="w-4 h-4" />
                        Filled from report:
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                        {parseResult.vendorName && <p><span className="font-medium">Vendor:</span> {parseResult.vendorName}</p>}
                        {parseResult.vehicleMake && <p><span className="font-medium">Vehicle:</span> {parseResult.vehicleMake} {parseResult.vehicleModel}</p>}
                        {parseResult.vehicleVin && <p><span className="font-medium">VIN:</span> {parseResult.vehicleVin}</p>}
                    </div>
                </div>
            )}
          </CardContent>
        </Card>

        {/* Main Form Card */}
        <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-white pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-xl text-slate-800">Private Sale Invoice</CardTitle>
                    <Button variant="outline" size="sm" onClick={handleReset}>
                        <RotateCcw className="w-4 h-4 mr-2" /> Reset
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
                
                {/* Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>Invoice Date</Label>
                        <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
                    </div>
                    <div className="flex items-center space-x-2 pt-8">
                         <Checkbox id="gst" checked={gstMode === "GST_INC"} onCheckedChange={c => setGstMode(c ? "GST_INC" : "NO_GST")} />
                         <Label htmlFor="gst">GST Inclusive (10%)</Label>
                    </div>
                </div>
                
                <div className="h-px bg-slate-100" />

                {/* Vendor Details */}
                <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="w-1 h-4 bg-primary rounded-full"/> Vendor Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <TrafficLightInput 
                            label="Vendor Name"
                            fieldState={fields["vendorName"]}
                            onValueChange={v => updateField("vendorName", v)}
                            onBlurField={() => handleBlur("vendorName")}
                        />
                        <div className="space-y-2">
                            <Label>Vendor ABN <span className="text-slate-400 font-normal">(Optional)</span></Label>
                            <Input value={vendorAbn} onChange={e => setVendorAbn(e.target.value)} placeholder="XX XXX XXX XXX" />
                            <div className="flex items-center space-x-2 mt-2">
                                <Checkbox 
                                    id="show-acn" 
                                    checked={showAcn} 
                                    onCheckedChange={c => setShowAcn(!!c)} 
                                />
                                <Label htmlFor="show-acn" className="text-xs text-slate-500 cursor-pointer">Include ACN</Label>
                            </div>
                            {showAcn && (
                                <div className="mt-2">
                                    <Input 
                                        value={vendorAcn} 
                                        onChange={e => setVendorAcn(e.target.value)} 
                                        placeholder="XXX XXX XXX" 
                                    />
                                </div>
                            )}
                        </div>
                        <TrafficLightInput 
                            label="Vendor Address"
                            fieldState={fields["vendorAddress"]}
                            onValueChange={v => updateField("vendorAddress", v)}
                            onBlurField={() => handleBlur("vendorAddress")}
                            className="md:col-span-2"
                        />
                        <div className="space-y-2">
                            <Label>Phone <span className="text-slate-400 font-normal">(Optional)</span></Label>
                            <Input value={vendorPhone} onChange={e => setVendorPhone(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Email <span className="text-slate-400 font-normal">(Optional)</span></Label>
                            <Input value={vendorEmail} onChange={e => setVendorEmail(e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="h-px bg-slate-100" />

                {/* Buyer Details */}
                <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="w-1 h-4 bg-primary rounded-full"/> Buyer Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <TrafficLightInput 
                            label="Buyer Name"
                            fieldState={fields["buyerName"]}
                            onValueChange={v => updateField("buyerName", v)}
                            onBlurField={() => handleBlur("buyerName")}
                        />
                        <TrafficLightInput 
                            label="Buyer Address"
                            fieldState={fields["buyerAddress"]}
                            onValueChange={v => updateField("buyerAddress", v)}
                            onBlurField={() => handleBlur("buyerAddress")}
                        />
                    </div>
                </div>

                <div className="h-px bg-slate-100" />

                {/* Vehicle Details */}
                <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="w-1 h-4 bg-primary rounded-full"/> Vehicle Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <TrafficLightInput 
                            label="Make"
                            fieldState={fields["vehicleMake"]}
                            onValueChange={v => updateField("vehicleMake", v)}
                            onBlurField={() => handleBlur("vehicleMake")}
                        />
                        <TrafficLightInput 
                            label="Model"
                            fieldState={fields["vehicleModel"]}
                            onValueChange={v => updateField("vehicleModel", v)}
                            onBlurField={() => handleBlur("vehicleModel")}
                        />
                         <TrafficLightInput 
                            label="Description / Body Type"
                            fieldState={fields["vehicleDescription"]}
                            onValueChange={v => updateField("vehicleDescription", v)}
                            onBlurField={() => handleBlur("vehicleDescription")}
                        />
                        <TrafficLightInput 
                            label="VIN"
                            fieldState={fields["vehicleVin"]}
                            onValueChange={v => updateField("vehicleVin", v)}
                            onBlurField={() => handleBlur("vehicleVin")}
                        />
                        <TrafficLightInput 
                            label="Registration"
                            fieldState={fields["vehicleRegistration"]}
                            onValueChange={v => updateField("vehicleRegistration", v)}
                            onBlurField={() => handleBlur("vehicleRegistration")}
                        />
                        <TrafficLightInput 
                            label="Engine Number"
                            fieldState={fields["vehicleEngineNumber"]}
                            onValueChange={v => updateField("vehicleEngineNumber", v)}
                            onBlurField={() => handleBlur("vehicleEngineNumber")}
                        />
                         <TrafficLightInput 
                            label="Odometer"
                            fieldState={fields["vehicleOdometer"]}
                            onValueChange={v => updateField("vehicleOdometer", v)}
                            onBlurField={() => handleBlur("vehicleOdometer")}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <TrafficLightInput 
                                label="Build Date"
                                fieldState={fields["vehicleBuildDate"]}
                                onValueChange={v => updateField("vehicleBuildDate", v)}
                                onBlurField={() => handleBlur("vehicleBuildDate")}
                                placeholder="YYYY"
                            />
                            <TrafficLightInput 
                                label="Compliance"
                                fieldState={fields["vehicleComplianceDate"]}
                                onValueChange={v => updateField("vehicleComplianceDate", v)}
                                onBlurField={() => handleBlur("vehicleComplianceDate")}
                                placeholder="MM/YYYY"
                            />
                        </div>
                    </div>
                </div>

                <div className="h-px bg-slate-100" />

                {/* Pricing & Disbursements */}
                <div>
                     <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="w-1 h-4 bg-primary rounded-full"/> Pricing & Disbursements
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                             <TrafficLightInput 
                                label="Invoice Amount ($)"
                                fieldState={fields["invoiceAmount"]}
                                onValueChange={v => updateField("invoiceAmount", v)}
                                onBlurField={() => handleBlur("invoiceAmount")}
                                type="number"
                                className="text-lg"
                            />
                            {gstMode === "GST_INC" && (
                                <p className="text-xs text-slate-500 mt-2">
                                    Includes GST of approximately {formatCurrency((parseFloat(fields["invoiceAmount"]?.value || "0")) / 11)}
                                </p>
                            )}
                        </div>
                        
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <Checkbox id="sigVendor" checked={includeVendorSig} onCheckedChange={c => setIncludeVendorSig(!!c)} />
                                <Label htmlFor="sigVendor">Include Vendor Signature Line</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="sigBuyer" checked={includeBuyerSig} onCheckedChange={c => setIncludeBuyerSig(!!c)} />
                                <Label htmlFor="sigBuyer">Include Buyer Signature Line</Label>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8">
                        <DisbursementTable disbursements={disbursements} onChange={setDisbursements} />
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

      {/* Right Sidebar */}
      <div className="w-full xl:w-80 shrink-0">
         <Card className="h-full border-none shadow-sm bg-white">
            <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-base font-semibold text-slate-800">Recent Invoices</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 px-2 space-y-2">
                {recentInvoices.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No history yet.</p>}
                {recentInvoices.map(inv => (
                    <div 
                        key={inv.id} 
                        onClick={() => handleLoadRecent(inv)}
                        className="group p-3 rounded-lg border border-transparent hover:border-slate-200 hover:bg-slate-50 cursor-pointer transition-all duration-200"
                    >
                        <div className="flex justify-between items-start mb-1">
                            <span className="font-semibold text-slate-700 text-sm group-hover:text-primary">{inv.vehicle.registration || "No Rego"}</span>
                            <span className="text-xs text-slate-400">{inv.invoiceDate}</span>
                        </div>
                        <div className="text-xs text-slate-600 truncate">{inv.vendor.name}</div>
                        <div className="text-xs font-mono text-slate-500 text-right">{formatCurrency(inv.invoiceAmount)}</div>
                    </div>
                ))}
            </CardContent>
         </Card>
      </div>
    </div>
  );
}
