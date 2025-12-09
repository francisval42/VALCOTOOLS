import React, { useState } from "react";
import { SidebarNav } from "../components/SidebarNav";

interface SidebarLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function SidebarLayout({ children, activeTab, onTabChange }: SidebarLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background font-sans">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-[280px] bg-sidebar text-sidebar-foreground flex flex-col shadow-xl z-10">
        <div className="h-20 flex items-center px-8 border-b border-white/10">
          <h1 className="text-xl font-bold tracking-wider text-white">
            VALCO <span className="text-primary font-light">GROUP</span>
          </h1>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <SidebarNav activeId={activeTab} onSelect={onTabChange} />
        </div>

        <div className="p-6 border-t border-white/10 text-xs text-sidebar-foreground/40 text-center">
          &copy; {new Date().getFullYear()} Valco Group
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-[280px] p-8 min-h-screen">
        <div className="max-w-[1400px] mx-auto h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
