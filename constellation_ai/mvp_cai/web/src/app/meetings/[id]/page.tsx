'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getMeeting,
  updateMeeting,
  Meeting,
  MeetingUpdate,
  ApiError,
} from '@/lib/api';
import {
  Button,
  Input,
  Textarea,
  FormField,
  Card,
  Tag,
  LoadingState,
  ErrorState,
} from '@/components/ui';
import { AttendeePicker, SelectedAttendee } from '@/components/AttendeePicker';

const MEETING_TYPES = ['coffee', 'call', 'zoom', 'in-person', 'meeting'];

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function toDateTimeLocal(dateString: string): string {
  const date = new Date(dateString);
  // Format as YYYY-MM-DDTHH:mm for datetime-local input
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function MeetingTypeIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    coffee: '☕',
    call: '📞',
    zoom: '💻',
    'in-person': '🤝',
    meeting: '📅',
  };
  return <span style={{ fontSize: '24px' }}>{icons[type.toLowerCase()] || '📅'}</span>;
}

export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Edit form state
  const [editOccurredAt, setEditOccurredAt] = useState('');
  const [editType, setEditType] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editAgenda, setEditAgenda] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editNextSteps, setEditNextSteps] = useState('');
  const [editAttendees, setEditAttendees] = useState<SelectedAttendee[]>([]);

  useEffect(() => {
    async function fetchMeeting() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getMeeting(id);
        setMeeting(data);
        initEditForm(data);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.status === 404 ? 'Meeting not found' : err.detail);
        } else {
          setError('Failed to load meeting');
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchMeeting();
  }, [id]);

  const initEditForm = (data: Meeting) => {
    setEditOccurredAt(toDateTimeLocal(data.occurred_at));
    setEditType(data.type);
    setEditLocation(data.location || '');
    setEditAgenda(data.agenda || '');
    setEditNotes(data.notes || '');
    setEditNextSteps(data.next_steps || '');
    setEditAttendees(
      data.attendees.map((a) => ({
        person_id: a.person_id,
        first_name: a.first_name,
        last_name: a.last_name,
        primary_email: a.primary_email,
        role: a.role,
      }))
    );
  };

  const handleCancelEdit = () => {
    if (meeting) {
      initEditForm(meeting);
    }
    setIsEditing(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!meeting) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const data: MeetingUpdate = {
        occurred_at: new Date(editOccurredAt).toISOString(),
        type: editType,
        location: editLocation.trim() || null,
        agenda: editAgenda.trim() || null,
        notes: editNotes.trim() || null,
        next_steps: editNextSteps.trim() || null,
        attendees: editAttendees.map((a) => ({
          person_id: a.person_id,
          role: a.role || null,
        })),
      };

      const updated = await updateMeeting(id, data);
      setMeeting(updated);
      setIsEditing(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setSaveError(err.detail);
      } else {
        setSaveError('Failed to save changes');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
        <LoadingState message="Loading meeting..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
        <Link
          href="/people"
          style={{ color: '#6b7280', textDecoration: 'none', fontSize: '14px' }}
        >
          &larr; Back to People
        </Link>
        <div style={{ marginTop: '24px' }}>
          <ErrorState message={error} />
        </div>
      </div>
    );
  }

  if (!meeting) return null;

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
        }}
      >
        <div>
          <Link
            href="/people"
            style={{ color: '#6b7280', textDecoration: 'none', fontSize: '14px' }}
          >
            &larr; Back to People
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
            <MeetingTypeIcon type={meeting.type} />
            <div>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>
                {meeting.type.charAt(0).toUpperCase() + meeting.type.slice(1)}
              </h1>
              <p style={{ margin: '4px 0 0', color: '#6b7280' }}>
                {formatDateTime(meeting.occurred_at)}
              </p>
            </div>
          </div>
        </div>

        {!isEditing && (
          <Button onClick={() => setIsEditing(true)}>Edit Meeting</Button>
        )}
      </div>

      {saveError && (
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
          {saveError}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '24px',
        }}
      >
        {/* Main Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isEditing ? (
            // Edit Mode
            <Card>
              <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
                Edit Meeting
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <FormField label="Date & Time" required>
                  <Input
                    type="datetime-local"
                    value={editOccurredAt}
                    onChange={setEditOccurredAt}
                    required
                  />
                </FormField>

                <FormField label="Type">
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
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

              <FormField label="Location">
                <Input
                  value={editLocation}
                  onChange={setEditLocation}
                  placeholder="e.g., Zoom, Coffee shop, Office"
                />
              </FormField>

              <FormField label="Attendees">
                <AttendeePicker
                  selectedAttendees={editAttendees}
                  onChange={setEditAttendees}
                  showRoles
                />
              </FormField>

              <FormField label="Agenda">
                <Textarea
                  value={editAgenda}
                  onChange={setEditAgenda}
                  placeholder="What was the meeting about?"
                  rows={2}
                />
              </FormField>

              <FormField label="Notes">
                <Textarea
                  value={editNotes}
                  onChange={setEditNotes}
                  placeholder="Key takeaways, discussion points..."
                  rows={4}
                />
              </FormField>

              <FormField label="Next Steps">
                <Textarea
                  value={editNextSteps}
                  onChange={setEditNextSteps}
                  placeholder="Action items, follow-ups..."
                  rows={2}
                />
              </FormField>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  marginTop: '16px',
                  paddingTop: '16px',
                  borderTop: '1px solid #e5e7eb',
                }}
              >
                <Button variant="secondary" onClick={handleCancelEdit}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </Card>
          ) : (
            // View Mode
            <>
              {meeting.location && (
                <Card>
                  <h2
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '8px',
                    }}
                  >
                    Location
                  </h2>
                  <p style={{ margin: 0, color: '#111827' }}>{meeting.location}</p>
                </Card>
              )}

              {meeting.agenda && (
                <Card>
                  <h2
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '8px',
                    }}
                  >
                    Agenda
                  </h2>
                  <p
                    style={{
                      margin: 0,
                      color: '#111827',
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.6,
                    }}
                  >
                    {meeting.agenda}
                  </p>
                </Card>
              )}

              {meeting.notes && (
                <Card>
                  <h2
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '8px',
                    }}
                  >
                    Notes
                  </h2>
                  <p
                    style={{
                      margin: 0,
                      color: '#111827',
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.6,
                    }}
                  >
                    {meeting.notes}
                  </p>
                </Card>
              )}

              {meeting.next_steps && (
                <Card>
                  <h2
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#059669',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '8px',
                    }}
                  >
                    Next Steps
                  </h2>
                  <p
                    style={{
                      margin: 0,
                      color: '#111827',
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.6,
                    }}
                  >
                    {meeting.next_steps}
                  </p>
                </Card>
              )}

              {!meeting.location &&
                !meeting.agenda &&
                !meeting.notes &&
                !meeting.next_steps && (
                  <Card>
                    <p style={{ color: '#6b7280', textAlign: 'center', margin: 0 }}>
                      No details recorded for this meeting.
                    </p>
                  </Card>
                )}
            </>
          )}
        </div>

        {/* Sidebar - Attendees */}
        <div>
          <Card>
            <h2
              style={{
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '16px',
              }}
            >
              Attendees ({meeting.attendees.length})
            </h2>

            {meeting.attendees.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
                No attendees recorded
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {meeting.attendees.map((attendee) => (
                  <div
                    key={attendee.person_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <Link
                        href={`/people/${attendee.person_id}`}
                        style={{
                          color: '#2563eb',
                          textDecoration: 'none',
                          fontWeight: 500,
                          fontSize: '14px',
                        }}
                      >
                        {attendee.first_name} {attendee.last_name}
                      </Link>
                      {attendee.primary_email && (
                        <p
                          style={{
                            margin: '2px 0 0',
                            fontSize: '12px',
                            color: '#6b7280',
                          }}
                        >
                          {attendee.primary_email}
                        </p>
                      )}
                    </div>
                    {attendee.role && (
                      <Tag>{attendee.role}</Tag>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
