"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import type { Activity, ActivityType, Classification } from "@/types";

export default function EditActivityPage() {
  const params = useParams();
  const activityId = params.id as string;
  const router = useRouter();
  const { getToken } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    activity_type: "MEETING" as ActivityType,
    occurred_at: "",
    location: "",
    description: "",
    summary: "",
    key_points: "",
    classification: "INTERNAL" as Classification,
  });

  useEffect(() => {
    async function fetchActivity() {
      try {
        const token = await getToken();
        const data: Activity = await api.getActivity(token, activityId);
        setFormData({
          title: data.title || "",
          activity_type: data.activity_type,
          occurred_at: data.occurred_at
            ? new Date(data.occurred_at).toISOString().slice(0, 16)
            : "",
          location: data.location || "",
          description: data.description || "",
          summary: data.summary || "",
          key_points: data.key_points || "",
          classification: data.classification,
        });
      } catch (err) {
        console.error("Failed to fetch activity:", err);
        setError("Failed to load activity data.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchActivity();
  }, [getToken, activityId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const token = await getToken();
      await api.updateActivity(token, activityId, {
        ...formData,
        occurred_at: new Date(formData.occurred_at).toISOString(),
      });
      router.push(`/activities/${activityId}`);
    } catch (err) {
      setError("Failed to update activity. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/activities/${activityId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Edit Activity</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Activity Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {error}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Activity title"
                />
              </div>

              <div className="space-y-2">
                <Label>Type *</Label>
                <Select
                  value={formData.activity_type}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      activity_type: value as ActivityType,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEETING">Meeting</SelectItem>
                    <SelectItem value="CALL">Call</SelectItem>
                    <SelectItem value="EMAIL">Email</SelectItem>
                    <SelectItem value="NOTE">Note</SelectItem>
                    <SelectItem value="LLM_INTERACTION">LLM Interaction</SelectItem>
                    <SelectItem value="SLACK_NOTE">Slack Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date & Time *</Label>
                <Input
                  type="datetime-local"
                  required
                  value={formData.occurred_at}
                  onChange={(e) =>
                    setFormData({ ...formData, occurred_at: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder="Location (optional)"
                />
              </div>

              <div className="space-y-2">
                <Label>Classification</Label>
                <Select
                  value={formData.classification}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      classification: value as Classification,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Classification" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INTERNAL">Internal</SelectItem>
                    <SelectItem value="CONFIDENTIAL">Confidential</SelectItem>
                    <SelectItem value="RESTRICTED">Restricted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Summary</Label>
              <Textarea
                value={formData.summary}
                onChange={(e) =>
                  setFormData({ ...formData, summary: e.target.value })
                }
                placeholder="Meeting summary (supports markdown)"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Key Points</Label>
              <Textarea
                value={formData.key_points}
                onChange={(e) =>
                  setFormData({ ...formData, key_points: e.target.value })
                }
                placeholder="Key takeaways (supports markdown)"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Additional notes"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Link href={`/activities/${activityId}`}>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
