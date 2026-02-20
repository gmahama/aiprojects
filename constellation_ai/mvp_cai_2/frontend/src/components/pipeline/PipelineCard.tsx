"use client";

import Link from "next/link";
import { MoreHorizontal, ArrowRight, Pause, XCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/utils";
import type { PipelineItem } from "@/types";

interface PipelineCardProps {
  item: PipelineItem;
  onAdvance?: (item: PipelineItem) => void;
  onBackBurner?: (item: PipelineItem) => void;
  onPass?: (item: PipelineItem) => void;
}

export function PipelineCard({
  item,
  onAdvance,
  onBackBurner,
  onPass,
}: PipelineCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-1">
          <Link
            href={`/pipeline/${item.id}`}
            className="font-medium text-sm text-gray-900 hover:text-blue-600 truncate leading-tight"
          >
            {item.organization_name || "Unknown Org"}
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/pipeline/${item.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Link>
              </DropdownMenuItem>
              {onBackBurner && (
                <DropdownMenuItem onClick={() => onBackBurner(item)}>
                  <Pause className="h-4 w-4 mr-2" />
                  Back Burner
                </DropdownMenuItem>
              )}
              {onPass && (
                <DropdownMenuItem onClick={() => onPass(item)} className="text-red-600">
                  <XCircle className="h-4 w-4 mr-2" />
                  Pass
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {item.primary_contact_name && (
          <p className="text-xs text-gray-500 truncate">
            {item.primary_contact_name}
          </p>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="h-5 w-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-[10px] font-medium shrink-0">
              {item.owner_name ? getInitials(item.owner_name) : "?"}
            </div>
            <span className="text-xs text-gray-500 truncate">
              {item.owner_name || "Unassigned"}
            </span>
          </div>
          {item.days_in_stage !== null && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
              {item.days_in_stage}d
            </Badge>
          )}
        </div>

        {onAdvance && item.stage < 6 && (
          <Button
            size="sm"
            variant="outline"
            className="w-full h-7 text-xs"
            onClick={() => onAdvance(item)}
          >
            Advance
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
