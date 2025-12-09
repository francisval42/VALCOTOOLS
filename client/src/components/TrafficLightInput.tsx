import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldStatus, FieldState } from "@/lib/privateSale/types";
import { cn } from "@/lib/utils";
import React from "react";

interface TrafficLightInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  fieldState: FieldState;
  onValueChange: (value: string) => void;
  onBlurField: () => void;
}

export function TrafficLightInput({
  label,
  fieldState,
  onValueChange,
  onBlurField,
  className,
  ...props
}: TrafficLightInputProps) {
  
  // Status Colors
  // missing -> red
  // autoFilled -> yellow
  // confirmed -> green
  
  const statusColorClass = 
    fieldState.status === "missing" 
      ? "border-red-300 bg-red-50 focus-visible:ring-red-200"
      : fieldState.status === "autoFilled"
      ? "border-amber-300 bg-amber-50 focus-visible:ring-amber-200"
      : "border-emerald-300 bg-emerald-50 focus-visible:ring-emerald-200";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onValueChange(e.target.value);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-slate-600 flex justify-between">
        {label}
        {fieldState.status === "missing" && <span className="text-red-500 text-xs font-normal">Required</span>}
        {fieldState.status === "autoFilled" && <span className="text-amber-600 text-xs font-normal">Please confirm</span>}
        {fieldState.status === "confirmed" && <span className="text-emerald-600 text-xs font-normal">Confirmed</span>}
      </Label>
      <Input
        value={fieldState.value}
        onChange={handleChange}
        onBlur={onBlurField}
        className={cn("transition-colors duration-200", statusColorClass)}
        {...props}
      />
    </div>
  );
}
