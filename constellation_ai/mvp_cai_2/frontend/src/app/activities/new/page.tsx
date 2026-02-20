"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { DocumentUpload } from "@/components/activities/DocumentUpload";
import { ActivityAttendeeSelector } from "@/components/activities/ActivityAttendeeSelector";
import { TagSelector } from "@/components/tags/TagSelector";
import { FollowUpInlineForm } from "@/components/followups/FollowUpInlineForm";
import type { ActivityType, Classification, ExtractedActivityData, ExtractedPerson } from "@/types";

interface FollowUpEntry {
  description: string;
  assigned_to?: string;
  due_date?: string;
}

export default function NewActivityPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedPersons, setExtractedPersons] = useState<ExtractedPerson[]>([]);
  const [extractedOrganizations, setExtractedOrganizations] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    activity_type: "MEETING" as ActivityType,
    occurred_at: new Date().toISOString().slice(0, 16),
    location: "",
    description: "",
    summary: "",
    key_points: "",
    classification: "INTERNAL" as Classification,
  });

  const [attendees, setAttendees] = useState<{ contact_id: string; role?: string }[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [followups, setFollowups] = useState<FollowUpEntry[]>([]);

  const handleDocumentExtracted = (data: ExtractedActivityData) => {
    setFormData((prev) => ({
      ...prev,
      title: data.title || prev.title,
      location: data.location || prev.location,
      summary: data.summary || prev.summary,
      key_points: data.key_points || prev.key_points,
      occurred_at: data.occurred_at
        ? data.occurred_at.slice(0, 16)
        : prev.occurred_at,
    }));

    if (data.persons.length > 0) {
      setExtractedPersons(data.persons);
    }
    if (data.organizations.length > 0) {
      setExtractedOrganizations(data.organizations);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const token = await getToken();
      const payload: Record<string, unknown> = {
        ...formData,
        occurred_at: new Date(formData.occurred_at).toISOString(),
      };

      if (attendees.length > 0) {
        payload.attendees = attendees;
      }
      if (selectedTagIds.length > 0) {
        payload.tag_ids = selectedTagIds;
      }
      if (followups.length > 0) {
        payload.followups = followups;
      }

      const activity = await api.createActivity(token, payload);
      router.push(`/activities/${activity.id}`);
    } catch (err) {
      setError("Failed to create activity. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeFollowup = (index: number) => {
    setFollowups(followups.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/activities">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">New Activity</h1>
      </div>

      {/* Document Upload Section */}
      <DocumentUpload onExtracted={handleDocumentExtracted} />

      {/* Extracted People/Organizations Display */}
      {(extractedPersons.length > 0 || extractedOrganizations.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Extracted Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {extractedPersons.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">People Mentioned</h4>
                <div className="flex flex-wrap gap-2">
                  {extractedPersons.map((person, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-800 rounded-md text-sm"
                    >
                      <span className="font-medium">{person.name}</span>
                      {person.organization && (
                        <span className="text-blue-600">({person.organization})</span>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Search for these people in the attendees section below.
                </p>
              </div>
            )}
            {extractedOrganizations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Organizations</h4>
                <div className="flex flex-wrap gap-2">
                  {extractedOrganizations.map((org, idx) => (
                    <span
                      key={idx}
                      className="inline-flex px-2 py-1 bg-gray-100 text-gray-800 rounded-md text-sm"
                    >
                      {org}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Activity Details */}
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
            </CardContent>
          </Card>

          {/* Attendees */}
          <Card>
            <CardHeader>
              <CardTitle>Attendees</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityAttendeeSelector
                attendees={attendees}
                onChange={setAttendees}
              />
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <TagSelector
                selectedTagIds={selectedTagIds}
                onChange={setSelectedTagIds}
              />
            </CardContent>
          </Card>

          {/* Follow-ups */}
          <Card>
            <CardHeader>
              <CardTitle>Follow-ups</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {followups.length > 0 && (
                <div className="space-y-2">
                  {followups.map((fu, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 rounded-lg border bg-gray-50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{fu.description}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                          {fu.due_date && <span>Due: {fu.due_date}</span>}
                          {fu.assigned_to && (
                            <span>Assigned</span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFollowup(idx)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <FollowUpInlineForm
                onAdd={(data) => setFollowups([...followups, data])}
              />
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Link href="/activities">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Activity"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
