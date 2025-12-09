import React from "react";
import { cn } from "@/lib/utils";
import { FileText, Car, ShoppingBag, Settings } from "lucide-react";

type NavItem = {
  id: string;
  label: string;
  icon: React.ElementType;
};

const ITEMS: NavItem[] = [
  { id: "valco-invoice", label: "Valco Invoice Generator", icon: FileText },
  { id: "private-sale", label: "Private Sale Invoice", icon: ShoppingBag },
  { id: "dealership-request", label: "Dealership Invoice Request", icon: Car },
  { id: "tool-4", label: "Settings", icon: Settings },
];

interface SidebarNavProps {
  activeId: string;
  onSelect: (id: string) => void;
}

export function SidebarNav({ activeId, onSelect }: SidebarNavProps) {
  return (
    <nav className="flex flex-col w-full py-6 space-y-1">
      {ITEMS.map((item) => {
        const isActive = activeId === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            data-testid={`nav-item-${item.id}`}
            className={cn(
              "group relative flex items-center w-full px-6 py-4 text-left transition-colors duration-200",
              isActive
                ? "bg-sidebar-accent text-white"
                : "text-sidebar-foreground/70 hover:text-white hover:bg-white/5"
            )}
          >
            {isActive && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-[hsl(25,100%,50%)]" />
            )}
            <item.icon
              className={cn(
                "w-5 h-5 mr-3 transition-colors",
                isActive ? "text-[hsl(25,100%,50%)]" : "text-current group-hover:text-white"
              )}
            />
            <span className="font-medium text-sm tracking-wide">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
