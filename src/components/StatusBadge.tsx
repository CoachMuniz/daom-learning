import React from "react";
import { CheckCircle2, Clock, AlertTriangle, XCircle, Info } from "lucide-react";

export type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral";

interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
  className?: string;
}

export function StatusBadge({ label, variant = "neutral", className = "" }: StatusBadgeProps) {
  let bgClass = "bg-daom-neutral-100 text-daom-neutral-700 border-daom-neutral-200";
  let icon = <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;

  switch (variant) {
    case "success":
      bgClass = "bg-[#EAF7F0] text-[#16794A] border-[#A6E1C4]";
      icon = <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
      break;
    case "warning":
      bgClass = "bg-[#FFF7DF] text-[#8A5A00] border-[#F2DE9C]";
      icon = <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
      break;
    case "danger":
      bgClass = "bg-[#FFF1F0] text-[#B42318] border-[#FBC5C2]";
      icon = <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
      break;
    case "info":
      bgClass = "bg-[#EFF6FF] text-[#175CD3] border-[#B2CCF8]";
      icon = <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-xs font-semibold border ${bgClass} ${className}`}
    >
      {icon}
      <span>{label}</span>
    </span>
  );
}
