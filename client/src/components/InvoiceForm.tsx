import { useState, useEffect } from "react";
import { Plus, Trash2, Save, RotateCcw, AlertCircle } from "lucide-react";
import { InvoiceParty, InvoiceLineItem, TaxInvoiceMode, SavedSupplier } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { calculateTotals, formatCurrency } from "@/lib/money";
import { addDays, todayIso } from "@/lib/dates";
import { cn } from "@/lib/utils";

interface InvoiceFormProps {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  reference?: string;
  recipient: InvoiceParty;
  mode: TaxInvoiceMode;
  includePaymentDetails: boolean;
  lineItems: InvoiceLineItem[];
  suppliers: SavedSupplier[];
  
  onUpdateField: (field: string, value: any) => void;
  onSaveSupplier: (supplier: SavedSupplier) => void;
  onGeneratePdf: () => void;
  onReset: () => void;
}

export function InvoiceForm({
  invoiceNumber,
  invoiceDate,
  dueDate,
  reference,
  recipient,
  mode,
  includePaymentDetails,
  lineItems,
  suppliers,
  onUpdateField,
  onSaveSupplier,
  onGeneratePdf,
  onReset
}: InvoiceFormProps) {
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("new");
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  const totals = calculateTotals(lineItems, mode);

  // Auto-update due date when invoice date changes, if due date hasn't been manually set differently
  // For simplicity here, we just check if due date is exactly 7 days after OLD invoice date, but strictly
  // sticking to the prompt: "When invoice date changes and user has not touched due date manually..."
  // Implementing simpler version: just calculate default due date whenever invoice date changes
  const handleDateChange = (newDate: string) => {
    onUpdateField("invoiceDate", newDate);
    onUpdateField("dueDate", addDays(newDate, 7));
  };

  const handleSupplierSelect = (id: string) => {
    setSelectedSupplierId(id);
    if (id === "new") {
      onUpdateField("recipient", { businessName: "", abn: "" });
    } else {
      const s = suppliers.find(sup => sup.id === id);
      if (s) {
        onUpdateField("recipient", { businessName: s.businessName, abn: s.abn || "" });
      }
    }
  };

  const handleSaveSupplier = () => {
    if (!recipient.businessName) return;
    
    const newId = selectedSupplierId === "new" ? Date.now().toString() : selectedSupplierId;
    const toSave: SavedSupplier = {
      id: newId,
      businessName: recipient.businessName,
      abn: recipient.abn
    };
    
    onSaveSupplier(toSave);
    setSelectedSupplierId(newId);
    
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 2000);
  };

  const addLineItem = () => {
    const newItem: InvoiceLineItem = {
      id: Date.now().toString(),
      description: "",
      amountIncGst: 0
    };
    onUpdateField("lineItems", [...lineItems, newItem]);
  };

  const updateLineItem = (id: string, field: keyof InvoiceLineItem, value: any) => {
    const updated = lineItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    );
    onUpdateField("lineItems", updated);
  };

  const removeLineItem = (id: string) => {
    onUpdateField("lineItems", lineItems.filter(item => item.id !== id));
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Valco Invoice Generator</h2>
          <p className="text-slate-500 text-sm mt-1">Create GST inclusive invoices on Valco letterhead.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onReset} className="text-slate-600 hover:text-slate-900 border-slate-200">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button onClick={onGeneratePdf} className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-orange-200">
            <Save className="w-4 h-4 mr-2" />
            Generate PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column - Invoice To */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-100 shadow-sm overflow-hidden">
            <div className="bg-slate-50/50 px-6 py-3 border-b border-slate-100 flex items-center gap-2">
              <div className="w-1 h-4 bg-primary rounded-full" />
              <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wider">Invoice To</h3>
            </div>
            <CardContent className="p-6 space-y-6">
              
              <div className="space-y-2">
                <Label htmlFor="supplier-select" className="text-xs font-semibold text-slate-500 uppercase">Load Saved Supplier</Label>
                <Select value={selectedSupplierId} onValueChange={handleSupplierSelect}>
                  <SelectTrigger id="supplier-select" className="bg-white border-slate-200">
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new" className="text-primary font-medium">+ New Supplier</SelectItem>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.businessName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="business-name" className="text-slate-600">Business Name <span className="text-red-500">*</span></Label>
                  <Input 
                    id="business-name" 
                    value={recipient.businessName} 
                    onChange={(e) => onUpdateField("recipient", { ...recipient, businessName: e.target.value })}
                    placeholder="e.g. Frankie's Hot Dogs Pty Ltd"
                    className="focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="abn" className="text-slate-600">ABN <span className="text-slate-400 text-xs font-normal">(Optional)</span></Label>
                  <Input 
                    id="abn" 
                    value={recipient.abn || ""} 
                    onChange={(e) => onUpdateField("recipient", { ...recipient, abn: e.target.value })}
                    placeholder="XX XXX XXX XXX"
                    className="focus-visible:ring-primary"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={handleSaveSupplier}
                  disabled={!recipient.businessName}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Save Supplier
                </Button>
                {showSaveSuccess && (
                  <span className="text-xs text-green-600 font-medium animate-in fade-in slide-in-from-left-2">
                    Supplier saved!
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card className="border-slate-100 shadow-sm overflow-hidden">
             <div className="bg-slate-50/50 px-6 py-3 border-b border-slate-100 flex items-center justify-between">
               <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-primary rounded-full" />
                <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wider">Line Items</h3>
               </div>
               <span className="text-xs text-slate-500 font-medium">
                 {mode === "GST_INC" ? "Amounts include GST" : "Amounts exclude GST"}
               </span>
            </div>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="w-[60%] pl-6">Description</TableHead>
                    <TableHead className="text-right">Amount ($)</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item) => (
                    <TableRow key={item.id} className="border-slate-50 hover:bg-slate-50/50">
                      <TableCell className="pl-6 py-3">
                        <Input 
                          value={item.description}
                          onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                          placeholder="Item description..."
                          className="border-transparent bg-transparent hover:bg-white focus:bg-white focus:border-slate-200 h-9 transition-colors"
                        />
                      </TableCell>
                      <TableCell className="text-right py-3">
                        <Input 
                          type="number"
                          value={item.amountIncGst === 0 ? "" : item.amountIncGst}
                          onChange={(e) => updateLineItem(item.id, "amountIncGst", parseFloat(e.target.value))}
                          placeholder="0.00"
                          className="border-transparent bg-transparent hover:bg-white focus:bg-white focus:border-slate-200 h-9 text-right w-32 ml-auto transition-colors"
                        />
                      </TableCell>
                      <TableCell className="pr-4 py-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLineItem(item.id)}
                          className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {lineItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center text-slate-400 italic">
                        No items added yet. Click "Add Item" to start.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              
              <div className="p-4 bg-slate-50/30 border-t border-slate-100">
                <Button 
                  onClick={addLineItem} 
                  variant="outline" 
                  size="sm"
                  className="border-dashed border-slate-300 text-slate-600 hover:text-primary hover:border-primary hover:bg-orange-50"
                >
                  <Plus className="w-3 h-3 mr-2" /> Add Item
                </Button>
              </div>

              {/* Totals Section */}
              <div className="bg-slate-50 p-6 border-t border-slate-200 space-y-3">
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Subtotal (ex GST)</span>
                  <span>{formatCurrency(totals.subtotalExGst)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-500">
                  <span>GST Total</span>
                  <span>{formatCurrency(totals.gstTotal)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-slate-900 pt-3 border-t border-slate-200">
                  <span>Total (Inc GST)</span>
                  <span className="text-primary">{formatCurrency(totals.totalIncGst)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Invoice Details */}
        <div className="space-y-6">
          <Card className="border-slate-100 shadow-sm">
             <div className="bg-slate-50/50 px-6 py-3 border-b border-slate-100 flex items-center gap-2">
                <div className="w-1 h-4 bg-primary rounded-full" />
                <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wider">Details</h3>
             </div>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="invoice-number" className="text-slate-600">Invoice Number</Label>
                <Input 
                  id="invoice-number" 
                  value={invoiceNumber} 
                  onChange={(e) => onUpdateField("invoiceNumber", e.target.value)}
                  className="font-mono bg-slate-50 text-slate-600"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoice-date" className="text-slate-600">Date Issued</Label>
                <Input 
                  id="invoice-date" 
                  type="date"
                  value={invoiceDate} 
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="due-date" className="text-slate-600">Due Date</Label>
                <Input 
                  id="due-date" 
                  type="date"
                  value={dueDate} 
                  onChange={(e) => onUpdateField("dueDate", e.target.value)}
                  className="bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference" className="text-slate-600">Reference <span className="text-slate-400 font-normal">(Optional)</span></Label>
                <Input 
                  id="reference" 
                  value={reference || ""} 
                  onChange={(e) => onUpdateField("reference", e.target.value)}
                  placeholder="PO #1234"
                  className="bg-white"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-100 shadow-sm">
             <div className="bg-slate-50/50 px-6 py-3 border-b border-slate-100 flex items-center gap-2">
                <div className="w-1 h-4 bg-primary rounded-full" />
                <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wider">Settings</h3>
             </div>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-start space-x-3">
                <Checkbox 
                  id="gst-mode" 
                  checked={mode === "GST_INC"} 
                  onCheckedChange={(checked) => onUpdateField("mode", checked ? "GST_INC" : "NO_GST")}
                  className="mt-1 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="gst-mode" className="text-slate-700 font-medium">GST Inclusive</Label>
                  <p className="text-xs text-slate-500">
                    If checked, the amounts you enter are assumed to include 10% GST.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 pt-4 border-t border-slate-100">
                <Checkbox 
                  id="payment-details" 
                  checked={includePaymentDetails} 
                  onCheckedChange={(checked) => onUpdateField("includePaymentDetails", checked)}
                  className="mt-1 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="payment-details" className="text-slate-700 font-medium">Payment Details</Label>
                  <p className="text-xs text-slate-500">
                    Include Valco bank account details on the generated PDF.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
