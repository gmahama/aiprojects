"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { TagSet } from "@/types";

interface TagSelectorProps {
  selectedTagIds: string[];
  onChange: (ids: string[]) => void;
  compact?: boolean;
}

const TAG_SET_COLORS: Record<string, string> = {
  Sector: "bg-blue-100 text-blue-800 hover:bg-blue-200",
  Strategy: "bg-purple-100 text-purple-800 hover:bg-purple-200",
  Geography: "bg-green-100 text-green-800 hover:bg-green-200",
  "Relationship Type": "bg-orange-100 text-orange-800 hover:bg-orange-200",
};

function getTagColor(tagSetName: string, selected: boolean): string {
  if (selected) {
    return TAG_SET_COLORS[tagSetName] || "bg-gray-200 text-gray-900";
  }
  return "bg-gray-100 text-gray-600 hover:bg-gray-200";
}

export function TagSelector({ selectedTagIds, onChange, compact }: TagSelectorProps) {
  const { getToken } = useAuth();
  const [tagSets, setTagSets] = useState<TagSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTagSets() {
      try {
        const token = await getToken();
        const data = await api.getTagSets(token);
        setTagSets(data);
      } catch (error) {
        console.error("Failed to fetch tag sets:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTagSets();
  }, [getToken]);

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading tags...</div>;
  }

  if (tagSets.length === 0) {
    return <div className="text-sm text-muted-foreground">No tags available</div>;
  }

  return (
    <div className="space-y-3">
      {/* Selected tags summary */}
      {selectedTagIds.length > 0 && !compact && (
        <div className="flex flex-wrap gap-1.5">
          {tagSets.flatMap((ts) =>
            ts.tags
              .filter((t) => selectedTagIds.includes(t.id) && t.is_active)
              .map((t) => (
                <Badge
                  key={t.id}
                  className={cn(TAG_SET_COLORS[ts.name] || "bg-gray-200 text-gray-900", "cursor-pointer")}
                  onClick={() => toggleTag(t.id)}
                >
                  {t.value} &times;
                </Badge>
              ))
          )}
        </div>
      )}

      {/* Tag sets */}
      <div className={cn("space-y-3", compact && "space-y-2")}>
        {tagSets
          .filter((ts) => ts.is_active)
          .map((tagSet) => (
            <div key={tagSet.id}>
              <p className={cn("font-medium mb-1.5", compact ? "text-xs" : "text-sm")}>
                {tagSet.name}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {tagSet.tags
                  .filter((t) => t.is_active)
                  .map((tag) => {
                    const selected = selectedTagIds.includes(tag.id);
                    return (
                      <Badge
                        key={tag.id}
                        variant="secondary"
                        className={cn(
                          "cursor-pointer transition-colors",
                          compact ? "text-xs px-1.5 py-0" : "",
                          getTagColor(tagSet.name, selected),
                          selected && "ring-1 ring-offset-1 ring-gray-400"
                        )}
                        onClick={() => toggleTag(tag.id)}
                      >
                        {tag.value}
                      </Badge>
                    );
                  })}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
