'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createMeeting, MeetingCreate, ApiError } from '@/lib/api';
import {
  Button,
  Input,
  Textarea,
  FormField,
  Card,
} from '@/components/ui';
import { AttendeePicker, SelectedAttendee } from '@/components/AttendeePicker';

const MEETING_TYPES = ['coffee', 'call', 'zoom', 'in-person', 'meeting'];

export default function NewMeetingPage() {
  const router = useRouter();

  const [occurredAt, setOccurredAt] = useState('');
  const [meetingType, setMeetingType] = useState('meeting');
  const [location, setLocation] = useState('');
  const [agenda, setAgenda] = useState('');
  const [notes, setNotes] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [attendees, setAttendees] = useState<SelectedAttendee[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!occurredAt) {
      newErrors.occurred_at = 'Date and time is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    setApiError(null);

    try {
      const data: MeetingCreate = {
        occurred_at: new Date(occurredAt).toISOString(),
        type: meetingType || 'meeting',
        location: location.trim() || null,
        agenda: agenda.trim() || null,
        notes: notes.trim() || null,
        next_steps: nextSteps.trim() || null,
        attendees: attendees.length > 0
          ? attendees.map((a) => ({
              person_id: a.person_id,
              role: a.role || null,
            }))
          : undefined,
      };

      const meeting = await createMeeting(data);
      router.push(`/meetings/${meeting.id}`);
    } catch (error) {
      if (error instanceof ApiError) {
        setApiError(error.detail);
      } else {
        setApiError('An unexpected error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Link
          href="/people"
          style={{ color: '#6b7280', textDecoration: 'none', fontSize: '14px' }}
        >
          &larr; Back to People
        </Link>
        <h1 style={{ margin: '8px 0 0', fontSize: '24px', fontWeight: 600 }}>
          Log Meeting
        </h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          {apiError && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '16px',
                color: '#dc2626',
                fontSize: '14px',
              }}
            >
              {apiError}
            </div>
          )}

          {/* Date/Time and Type */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
            }}
          >
            <FormField label="Date & Time" required error={errors.occurred_at}>
              <Input
                type="datetime-local"
                value={occurredAt}
                onChange={setOccurredAt}
                required
              />
            </FormField>

            <FormField label="Type">
              <select
                value={meetingType}
                onChange={(e) => setMeetingType(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  width: '100%',
                  backgroundColor: 'white',
                }}
              >
                {MEETING_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          {/* Location */}
          <FormField label="Location">
            <Input
              value={location}
              onChange={setLocation}
              placeholder="e.g., Zoom, Coffee shop, Office"
            />
          </FormField>

          {/* Attendees */}
          <FormField label="Attendees">
            <AttendeePicker
              selectedAttendees={attendees}
              onChange={setAttendees}
              showRoles
            />
          </FormField>

          {/* Agenda */}
          <FormField label="Agenda">
            <Textarea
              value={agenda}
              onChange={setAgenda}
              placeholder="What was the meeting about?"
              rows={2}
            />
          </FormField>

          {/* Notes */}
          <FormField label="Notes">
            <Textarea
              value={notes}
              onChange={setNotes}
              placeholder="Key takeaways, discussion points..."
              rows={4}
            />
          </FormField>

          {/* Next Steps */}
          <FormField label="Next Steps">
            <Textarea
              value={nextSteps}
              onChange={setNextSteps}
              placeholder="Action items, follow-ups..."
              rows={2}
            />
          </FormField>

          {/* Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '24px',
              paddingTop: '16px',
              borderTop: '1px solid #e5e7eb',
            }}
          >
            <Button
              variant="secondary"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Meeting'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
