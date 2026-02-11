"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { AttendeeSelector } from "@/components/events/AttendeeSelector";
import { PitchForm } from "@/components/events/PitchForm";
import type { EventType, Classification, EventAttendeeFormData, EventPitchFormData, TagSet, PaginatedResponse } from "@/types";

export default function NewEventPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagSets, setTagSets] = useState<TagSet[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    event_type: "RETREAT" as EventType,
    occurred_at: new Date().toISOString().slice(0, 16),
    location: "",
    description: "",
    notes: "",
    classification: "INTERNAL" as Classification,
  });

  const [attendees, setAttendees] = useState<EventAttendeeFormData[]>([]);
  const [pitches, setPitches] = useState<EventPitchFormData[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  // Fetch tag sets
  useEffect(() => {
    async function fetchTagSets() {
      try {
        const token = await getToken();
        const data = await api.getTagSets(token);
        setTagSets(data);
      } catch (error) {
        console.error("Failed to fetch tag sets:", error);
      }
    }
    fetchTagSets();
  }, [getToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const token = await getToken();
      const event = await api.createEvent(token, {
        ...formData,
        occurred_at: new Date(formData.occurred_at).toISOString(),
        attendees: attendees.map((a) => ({
          contact_id: a.contact_id || undefined,
          first_name: a.first_name || undefined,
          last_name: a.last_name || undefined,
          email: a.email || undefined,
          organization_id: a.organization_id || undefined,
          role: a.role || undefined,
          notes: a.notes || undefined,
        })),
        pitches: pitches.map((p) => ({
          ticker: p.ticker || undefined,
          company_name: p.company_name,
          thesis: p.thesis || undefined,
          notes: p.notes || undefined,
          pitched_by: p.pitched_by || undefined,
          is_bullish: p.is_bullish,
        })),
        tag_ids: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      });
      router.push(`/events/${event.id}`);
    } catch (err) {
      setError("Failed to create event. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/events">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">New Event</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Details */}
        <Card>
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {error}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Event Name *</label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Tech Conference 2026"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Event Type *</label>
                <select
                  required
                  value={formData.event_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      event_type: e.target.value as EventType,
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="RETREAT">Retreat</option>
                  <option value="DINNER">Dinner</option>
                  <option value="LUNCH">Lunch</option>
                  <option value="OTHER">Other</option>
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
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Event description (supports markdown)"
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Additional notes"
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
            <AttendeeSelector
              attendees={attendees}
              onChange={setAttendees}
            />
          </CardContent>
        </Card>

        {/* Stock Pitches */}
        <Card>
          <CardHeader>
            <CardTitle>Stock Pitches</CardTitle>
          </CardHeader>
          <CardContent>
            <PitchForm
              pitches={pitches}
              onChange={setPitches}
            />
          </CardContent>
        </Card>

        {/* Tags */}
        {tagSets.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tagSets.map((tagSet) => (
                <div key={tagSet.id}>
                  <p className="text-sm font-medium mb-2">{tagSet.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {tagSet.tags
                      .filter((tag) => tag.is_active)
                      .map((tag) => (
                        <Button
                          key={tag.id}
                          type="button"
                          variant={selectedTagIds.includes(tag.id) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleTag(tag.id)}
                        >
                          {tag.value}
                        </Button>
                      ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link href="/events">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Event"}
          </Button>
        </div>
      </form>
    </div>
  );
}
