"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const STAGE_LABELS: Record<number, string> = {
  1: "First Meeting",
  2: "Quant Diligence",
  3: "Patrick Meeting",
  4: "Live Diligence",
  5: "References",
  6: "Docs",
};

interface StageProgressProps {
  currentStage: number;
  className?: string;
}

export function StageProgress({ currentStage, className }: StageProgressProps) {
  return (
    <div className={cn("flex items-center w-full", className)}>
      {[1, 2, 3, 4, 5, 6].map((stage) => {
        const isCompleted = stage < currentStage;
        const isCurrent = stage === currentStage;

        return (
          <div key={stage} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex items-center justify-center rounded-full border-2 font-medium text-xs transition-all",
                  isCompleted
                    ? "h-8 w-8 border-blue-600 bg-blue-600 text-white"
                    : isCurrent
                      ? "h-9 w-9 border-blue-600 bg-blue-600 text-white ring-2 ring-blue-200"
                      : "h-8 w-8 border-gray-300 bg-white text-gray-400"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  stage
                )}
              </div>
              <span
                className={cn(
                  "mt-1.5 text-xs font-medium hidden md:block text-center whitespace-nowrap",
                  isCompleted || isCurrent
                    ? "text-blue-700"
                    : "text-gray-400"
                )}
              >
                {STAGE_LABELS[stage]}
              </span>
            </div>
            {stage < 6 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-1",
                  stage < currentStage ? "bg-blue-600" : "bg-gray-200"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
