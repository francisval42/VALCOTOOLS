import { useState } from "react";
import { SidebarLayout } from "./layout/SidebarLayout";
import { PrivateSaleInvoiceTab } from "./tabs/PrivateSaleInvoiceTab";
import { ValcoInvoiceTab } from "./tabs/ValcoInvoiceTab";
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
        This tool is currently under development. Check back soon for updates.
      </p>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState("valco-invoice");

  return (
    <>
      <SidebarLayout activeTab={activeTab} onTabChange={setActiveTab}>
        {activeTab === "valco-invoice" && <ValcoInvoiceTab />}
        {activeTab === "private-sale" && <PrivateSaleInvoiceTab />}
        {activeTab === "dealership-request" && <PlaceholderTab title="Dealership Invoice Request" />}
        {activeTab === "tool-4" && <PlaceholderTab title="Settings" />}
      </SidebarLayout>
      <Toaster />
    </>
  );
}

export default App;
