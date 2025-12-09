import { useState } from "react";
import { cn } from "@/lib/utils";
import { RequirementsObjectivesTab } from "./compliance/RequirementsObjectivesTab";
import { ComplianceNotesTab } from "./compliance/ComplianceNotesTab";

type InnerTab = "requirements" | "compliance";

export function ComplianceAssistantTab() {
  const [activeTab, setActiveTab] = useState<InnerTab>("requirements");

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow-md p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1f2a44]">Compliance Assistant</h1>
          <p className="text-slate-500 mt-1">
            Generate professional broker notes and compliance documentation
          </p>
        </div>

        <div className="flex gap-2 border-b border-slate-200">
          <button
            data-testid="tab-requirements-objectives"
            onClick={() => setActiveTab("requirements")}
            className={cn(
              "px-4 py-2 font-medium text-sm transition-colors relative",
              activeTab === "requirements"
                ? "text-[#fe6900]"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            Requirements and Objectives
            {activeTab === "requirements" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#fe6900]" />
            )}
          </button>
          <button
            data-testid="tab-compliance-notes"
            onClick={() => setActiveTab("compliance")}
            className={cn(
              "px-4 py-2 font-medium text-sm transition-colors relative",
              activeTab === "compliance"
                ? "text-[#fe6900]"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            Compliance Notes
            {activeTab === "compliance" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#fe6900]" />
            )}
          </button>
        </div>

        <div className="mt-6">
          {activeTab === "requirements" && <RequirementsObjectivesTab />}
          {activeTab === "compliance" && <ComplianceNotesTab />}
        </div>
      </div>
    </div>
  );
}
