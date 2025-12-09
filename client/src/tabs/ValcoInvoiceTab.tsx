import { useState, useEffect } from "react";
import { InvoiceForm } from "../components/InvoiceForm";
import { RecentInvoicesPanel } from "../components/RecentInvoicesPanel";
import { TaxInvoice, SavedSupplier, TaxInvoiceMode, InvoiceParty } from "../lib/types";
import { getSuppliers, addOrUpdateSupplier } from "../lib/storage/suppliers";
import { getRecentInvoices, addRecentInvoice, clearRecentInvoices } from "../lib/storage/invoices";
import { getNextInvoiceNumber, commitInvoiceNumber } from "../lib/storage/invoiceNumber";
import { todayIso, addDays } from "../lib/dates";
import { generateTaxInvoicePdf } from "../lib/pdf/taxInvoicePdf";
import { useToast } from "@/hooks/use-toast";

const INITIAL_INVOICE_STATE: Partial<TaxInvoice> = {
  reference: "",
  mode: "GST_INC",
  includePaymentDetails: true,
  lineItems: [],
  recipient: { businessName: "", abn: "" }
};

export function ValcoInvoiceTab() {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<SavedSupplier[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<TaxInvoice[]>([]);
  
  const [currentInvoice, setCurrentInvoice] = useState<TaxInvoice>({
    id: "",
    invoiceNumber: "",
    invoiceDate: todayIso(),
    dueDate: addDays(todayIso(), 7),
    subtotalExGst: 0,
    gstTotal: 0,
    totalIncGst: 0,
    supplier: { businessName: "Valco Group" },
    ...INITIAL_INVOICE_STATE
  } as TaxInvoice);

  // Initial Load
  useEffect(() => {
    setSuppliers(getSuppliers());
    setRecentInvoices(getRecentInvoices());
    const nextNum = getNextInvoiceNumber();
    setCurrentInvoice(prev => ({ ...prev, invoiceNumber: nextNum }));
  }, []);

  const handleUpdateField = (field: string, value: any) => {
    setCurrentInvoice(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveSupplier = (s: SavedSupplier) => {
    const updated = addOrUpdateSupplier(s);
    setSuppliers(updated);
    toast({
      title: "Supplier Saved",
      description: `${s.businessName} has been saved to your list.`,
    });
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset the form? All unsaved changes will be lost.")) {
      const nextNum = getNextInvoiceNumber(); // Re-fetch in case it changed
      setCurrentInvoice({
        ...currentInvoice,
        ...INITIAL_INVOICE_STATE,
        invoiceNumber: nextNum,
        invoiceDate: todayIso(),
        dueDate: addDays(todayIso(), 7),
        lineItems: []
      } as TaxInvoice);
    }
  };

  const handleLoadInvoice = (inv: TaxInvoice) => {
    if (confirm("Load this invoice? This will replace your current work.")) {
      // Generate a NEW invoice number for the loaded invoice so we don't overwrite history by default
      // Or should we load it exactly as is? 
      // Spec says "Load recent invoices", usually implies viewing or cloning. 
      // Let's load it as a "Clone" - new ID, new Invoice Number, today's date
      
      const nextNum = getNextInvoiceNumber();
      setCurrentInvoice({
        ...inv,
        id: "", // Clear ID so it's a new one
        invoiceNumber: nextNum,
        invoiceDate: todayIso(),
        dueDate: addDays(todayIso(), 7)
      });
      
      toast({
        title: "Invoice Loaded",
        description: `Loaded details from ${inv.invoiceNumber}. A new invoice number has been assigned.`,
      });
    }
  };

  const handleGeneratePdf = async () => {
    if (!currentInvoice.recipient.businessName) {
      toast({
        variant: "destructive",
        title: "Missing Details",
        description: "Please enter a recipient business name.",
      });
      return;
    }
    
    if (currentInvoice.lineItems.length === 0) {
      toast({
        variant: "destructive",
        title: "No Items",
        description: "Please add at least one line item.",
      });
      return;
    }

    try {
      // 1. Generate PDF
      const pdfBytes = await generateTaxInvoicePdf(currentInvoice);
      
      // 2. Download
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Invoice-${currentInvoice.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 3. Commit number & Save to history
      commitInvoiceNumber(currentInvoice.invoiceNumber);
      
      const finalInvoice = { 
        ...currentInvoice, 
        id: Date.now().toString() 
      };
      
      const updatedRecent = addRecentInvoice(finalInvoice);
      setRecentInvoices(updatedRecent);
      
      // 4. Prep next invoice
      const nextNum = getNextInvoiceNumber();
      setCurrentInvoice(prev => ({ ...prev, invoiceNumber: nextNum }));
      
      toast({
        title: "Invoice Generated",
        description: `PDF downloaded and history updated. Next invoice number is ${nextNum}.`,
      });

    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate PDF.",
      });
    }
  };
  
  const handleClearHistory = () => {
    if(confirm("Clear all recent invoice history?")) {
        clearRecentInvoices();
        setRecentInvoices([]);
    }
  }

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-full">
      {/* Main Builder Area */}
      <div className="flex-1 min-w-0">
        <InvoiceForm 
          {...currentInvoice}
          suppliers={suppliers}
          onUpdateField={handleUpdateField}
          onSaveSupplier={handleSaveSupplier}
          onGeneratePdf={handleGeneratePdf}
          onReset={handleReset}
        />
      </div>

      {/* Right Sidebar - Recent Invoices */}
      <div className="w-full xl:w-80 shrink-0">
        <RecentInvoicesPanel 
          invoices={recentInvoices} 
          onLoadInvoice={handleLoadInvoice}
          onClearHistory={handleClearHistory}
        />
      </div>
    </div>
  );
}
