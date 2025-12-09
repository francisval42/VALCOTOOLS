import { TaxInvoice } from "@/lib/types";
import { formatDisplay } from "@/lib/dates";
import { formatCurrency } from "@/lib/money";
import { FileText, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface RecentInvoicesPanelProps {
  invoices: TaxInvoice[];
  onLoadInvoice: (invoice: TaxInvoice) => void;
  onClearHistory: () => void;
}

export function RecentInvoicesPanel({ invoices, onLoadInvoice, onClearHistory }: RecentInvoicesPanelProps) {
  return (
    <Card className="h-full border-none shadow-sm bg-white">
      <CardHeader className="pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Recent Invoices
          </CardTitle>
          {invoices.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClearHistory}
              className="text-xs text-slate-400 hover:text-red-500 h-6 px-2"
            >
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4 px-2">
        {invoices.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm italic">
            No recent invoices
          </div>
        ) : (
          <div className="space-y-2">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                onClick={() => onLoadInvoice(inv)}
                className="group p-3 rounded-lg border border-transparent hover:border-slate-200 hover:bg-slate-50 cursor-pointer transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="font-semibold text-slate-700 text-sm group-hover:text-primary transition-colors">
                    {inv.invoiceNumber}
                  </span>
                  <span className="text-xs text-slate-400">
                    {formatDisplay(inv.invoiceDate)}
                  </span>
                </div>
                <div className="text-xs text-slate-600 truncate mb-1 font-medium">
                  {inv.recipient.businessName}
                </div>
                <div className="text-xs font-mono text-slate-500 text-right">
                  {formatCurrency(inv.totalIncGst)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
