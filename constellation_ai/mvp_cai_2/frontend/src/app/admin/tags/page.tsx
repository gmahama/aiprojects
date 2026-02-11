"use client";

import { useEffect, useState } from "react";
import { Plus, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import type { TagSet } from "@/types";

export default function TagsAdminPage() {
  const { getToken, user } = useAuth();
  const [tagSets, setTagSets] = useState<TagSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTagSetName, setNewTagSetName] = useState("");
  const [newTagValues, setNewTagValues] = useState<Record<string, string>>({});
  const [isCreating, setIsCreating] = useState(false);

  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    fetchTagSets();
  }, []);

  const fetchTagSets = async () => {
    try {
      const token = await getToken();
      const data = await api.getTagSets(token, true);
      setTagSets(data);
    } catch (error) {
      console.error("Failed to fetch tag sets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTagSet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagSetName.trim()) return;

    setIsCreating(true);
    try {
      const token = await getToken();
      await api.createTagSet(token, { name: newTagSetName });
      setNewTagSetName("");
      fetchTagSets();
    } catch (error) {
      console.error("Failed to create tag set:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateTag = async (tagSetId: string) => {
    const value = newTagValues[tagSetId];
    if (!value?.trim()) return;

    try {
      const token = await getToken();
      await api.createTag(token, tagSetId, value);
      setNewTagValues({ ...newTagValues, [tagSetId]: "" });
      fetchTagSets();
    } catch (error) {
      console.error("Failed to create tag:", error);
    }
  };

  const handleToggleTag = async (tagId: string, isActive: boolean) => {
    try {
      const token = await getToken();
      await api.updateTag(token, tagId, { is_active: !isActive });
      fetchTagSets();
    } catch (error) {
      console.error("Failed to update tag:", error);
    }
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          You do not have permission to access this page.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tag Management</h1>
        <p className="text-muted-foreground">
          Manage tag sets and their tags for categorizing records.
        </p>
      </div>

      {/* Create Tag Set */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Tag Set</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateTagSet} className="flex gap-3">
            <Input
              placeholder="Tag set name (e.g., Industry, Region)"
              value={newTagSetName}
              onChange={(e) => setNewTagSetName(e.target.value)}
              className="max-w-xs"
            />
            <Button type="submit" disabled={isCreating || !newTagSetName.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Create Tag Set
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Tag Sets */}
      <div className="grid gap-6 md:grid-cols-2">
        {tagSets.map((tagSet) => (
          <Card key={tagSet.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Tags className="h-5 w-5" />
                {tagSet.name}
              </CardTitle>
              <Badge variant={tagSet.is_active ? "default" : "secondary"}>
                {tagSet.is_active ? "Active" : "Inactive"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing Tags */}
              <div className="flex flex-wrap gap-2">
                {tagSet.tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant={tag.is_active ? "secondary" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleToggleTag(tag.id, tag.is_active)}
                  >
                    {tag.value}
                    {!tag.is_active && " (inactive)"}
                  </Badge>
                ))}
                {tagSet.tags.length === 0 && (
                  <p className="text-sm text-muted-foreground">No tags yet</p>
                )}
              </div>

              {/* Add Tag */}
              <div className="flex gap-2">
                <Input
                  placeholder="New tag value"
                  value={newTagValues[tagSet.id] || ""}
                  onChange={(e) =>
                    setNewTagValues({ ...newTagValues, [tagSet.id]: e.target.value })
                  }
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateTag(tagSet.id);
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={() => handleCreateTag(tagSet.id)}
                  disabled={!newTagValues[tagSet.id]?.trim()}
                >
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
