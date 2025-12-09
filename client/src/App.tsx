import { useState } from "react";
import { SidebarLayout } from "./layout/SidebarLayout";
import { LoanCalculatorTab } from "./tabs/LoanCalculatorTab";
import { PrivateSaleInvoiceTab } from "./tabs/PrivateSaleInvoiceTab";
import { ValcoInvoiceTab } from "./tabs/ValcoInvoiceTab";
import { DealershipInvoiceRequestTab } from "./tabs/DealershipInvoiceRequestTab";
import { Toaster } from "@/components/ui/toaster";
import { Construction } from "lucide-react";

function PlaceholderTab({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-white rounded-xl shadow-sm border border-slate-100">
      <div className="bg-slate-50 p-6 rounded-full mb-6">
        <Construction className="w-12 h-12 text-slate-300" />
      </div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">{title}</h2>
      <p className="text-slate-500 max-w-md">
        Don't pretend you know what's going on here. If broken, please call Francis on 0426 951 399
      </p>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState("loan-calculator");

  return (
    <>
      <SidebarLayout activeTab={activeTab} onTabChange={setActiveTab}>
        {activeTab === "loan-calculator" && <LoanCalculatorTab />}
        {activeTab === "valco-invoice" && <ValcoInvoiceTab />}
        {activeTab === "private-sale" && <PrivateSaleInvoiceTab />}
        {activeTab === "dealership-request" && <DealershipInvoiceRequestTab />}
        {activeTab === "tool-4" && <PlaceholderTab title="Settings" />}
      </SidebarLayout>
      <Toaster />
    </>
  );
}

export default App;
