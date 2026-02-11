"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { DocumentUpload } from "@/components/activities/DocumentUpload";
import type { ActivityType, Classification, ExtractedActivityData, ExtractedPerson } from "@/types";

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
      const activity = await api.createActivity(token, {
        ...formData,
        occurred_at: new Date(formData.occurred_at).toISOString(),
      });
      router.push(`/activities/${activity.id}`);
    } catch (err) {
      setError("Failed to create activity. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
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
                  Link these people as attendees after creating the activity.
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
                <label className="text-sm font-medium">Title *</label>
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
                <label className="text-sm font-medium">Type *</label>
                <select
                  required
                  value={formData.activity_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      activity_type: e.target.value as ActivityType,
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="MEETING">Meeting</option>
                  <option value="CALL">Call</option>
                  <option value="EMAIL">Email</option>
                  <option value="NOTE">Note</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Date & Time *</label>
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
                <label className="text-sm font-medium">Location</label>
                <Input
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder="Location (optional)"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Classification</label>
                <select
                  value={formData.classification}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      classification: e.target.value as Classification,
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="INTERNAL">Internal</option>
                  <option value="CONFIDENTIAL">Confidential</option>
                  <option value="RESTRICTED">Restricted</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Summary</label>
              <textarea
                value={formData.summary}
                onChange={(e) =>
                  setFormData({ ...formData, summary: e.target.value })
                }
                placeholder="Meeting summary (supports markdown)"
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Key Points</label>
              <textarea
                value={formData.key_points}
                onChange={(e) =>
                  setFormData({ ...formData, key_points: e.target.value })
                }
                placeholder="Key takeaways (supports markdown)"
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Additional notes"
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Link href="/activities">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Activity"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
