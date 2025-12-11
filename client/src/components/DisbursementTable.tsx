import { PrivateSaleDisbursement } from "@/lib/privateSale/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, AlertTriangle, CheckCircle } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatCurrency } from "@/lib/money";

interface DisbursementTableProps {
  disbursements: PrivateSaleDisbursement[];
  onChange: (items: PrivateSaleDisbursement[]) => void;
  targetTotal?: number;
}

export function DisbursementTable({ disbursements, onChange, targetTotal }: DisbursementTableProps) {
  
  const addRow = () => {
    const newRow: PrivateSaleDisbursement = {
      id: Date.now().toString(),
      accountName: "",
      bsb: "",
      accountNumber: "",
      amount: 0
    };
    onChange([...disbursements, newRow]);
  };

  const updateRow = (id: string, field: keyof PrivateSaleDisbursement, value: any) => {
    const updated = disbursements.map(d => 
      d.id === id ? { ...d, [field]: value } : d
    );
    onChange(updated);
  };

  const removeRow = (id: string) => {
    onChange(disbursements.filter(d => d.id !== id));
  };

  const total = disbursements.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const hasTarget = targetTotal !== undefined;
  const variance = hasTarget ? total - (targetTotal || 0) : 0;
  const isBalanced = Math.abs(variance) < 0.01;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
         <h4 className="text-sm font-semibold text-slate-700">Disbursements</h4>
         {hasTarget && (
           <span className="text-xs text-slate-500">
             Target: {formatCurrency(targetTotal || 0)}
           </span>
         )}
      </div>
      
      <div className="border border-slate-200 rounded-md overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Account Name</TableHead>
              <TableHead className="w-24">BSB</TableHead>
              <TableHead className="w-32">Account No</TableHead>
              <TableHead className="w-32 text-right">Amount ($)</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {disbursements.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="p-2">
                  <Input 
                    value={d.accountName} 
                    onChange={e => updateRow(d.id, "accountName", e.target.value)}
                    placeholder="Account Name"
                    className="h-8 text-xs bg-transparent border-transparent hover:bg-white focus:bg-white focus:border-slate-200"
                  />
                </TableCell>
                <TableCell className="p-2">
                  <Input 
                    value={d.bsb} 
                    onChange={e => updateRow(d.id, "bsb", e.target.value)}
                    placeholder="000-000"
                    className="h-8 text-xs bg-transparent border-transparent hover:bg-white focus:bg-white focus:border-slate-200"
                  />
                </TableCell>
                <TableCell className="p-2">
                  <Input 
                    value={d.accountNumber} 
                    onChange={e => updateRow(d.id, "accountNumber", e.target.value)}
                    placeholder="12345678"
                    className="h-8 text-xs bg-transparent border-transparent hover:bg-white focus:bg-white focus:border-slate-200"
                  />
                </TableCell>
                <TableCell className="p-2">
                  <Input 
                    type="number"
                    value={d.amount || ""} 
                    onChange={e => updateRow(d.id, "amount", parseFloat(e.target.value))}
                    placeholder="0.00"
                    className="h-8 text-xs text-right bg-transparent border-transparent hover:bg-white focus:bg-white focus:border-slate-200"
                  />
                </TableCell>
                <TableCell className="p-2">
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-red-500" onClick={() => removeRow(d.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {disbursements.length === 0 && (
                <TableRow>
                    <TableCell colSpan={5} className="text-center py-4 text-slate-400 text-xs italic">
                        No disbursements added.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={addRow} className="text-xs" data-testid="button-add-disbursement">
            <Plus className="w-3 h-3 mr-1" /> Add Disbursement
        </Button>
        <div className="text-sm font-medium text-slate-700 flex items-center gap-2">
            Total: <span className={hasTarget && !isBalanced ? "text-red-600" : "text-primary"}>{formatCurrency(total)}</span>
            {hasTarget && (
              isBalanced ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <span className="text-xs text-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {variance > 0 ? `Over by ${formatCurrency(variance)}` : `Short by ${formatCurrency(Math.abs(variance))}`}
                </span>
              )
            )}
        </div>
      </div>
    </div>
  );
}
