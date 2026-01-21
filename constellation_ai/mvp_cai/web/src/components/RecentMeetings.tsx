'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getMeetings, Meeting, ApiError } from '@/lib/api';
import { Card, LoadingState, EmptyState, ErrorState } from '@/components/ui';

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function MeetingTypeIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    coffee: '☕',
    call: '📞',
    zoom: '💻',
    'in-person': '🤝',
    meeting: '📅',
  };
  return <span>{icons[type.toLowerCase()] || '📅'}</span>;
}

interface AttendeeChipsProps {
  attendees: Meeting['attendees'];
  maxDisplay?: number;
}

function AttendeeChips({ attendees, maxDisplay = 3 }: AttendeeChipsProps) {
  const displayAttendees = attendees.slice(0, maxDisplay);
  const remaining = attendees.length - maxDisplay;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
      {displayAttendees.map((attendee) => (
        <span
          key={attendee.person_id}
          style={{
            backgroundColor: '#f3f4f6',
            color: '#374151',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '12px',
          }}
        >
          {attendee.first_name} {attendee.last_name.charAt(0)}.
        </span>
      ))}
      {remaining > 0 && (
        <span
          style={{
            backgroundColor: '#e5e7eb',
            color: '#6b7280',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '12px',
          }}
        >
          +{remaining}
        </span>
      )}
    </div>
  );
}

export function RecentMeetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecentMeetings() {
      setIsLoading(true);
      setError(null);

      try {
        // API already returns meetings ordered by occurred_at DESC
        const data = await getMeetings({ limit: 10 });
        setMeetings(data.items);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.detail);
        } else {
          setError('Failed to load recent meetings');
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchRecentMeetings();
  }, []);

  return (
    <div>
      <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
        Recent Meetings
      </h2>

      {isLoading ? (
        <LoadingState message="Loading meetings..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : meetings.length === 0 ? (
        <EmptyState
          title="No meetings yet"
          description="Log your first meeting to see it here"
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {meetings.map((meeting) => (
            <Link
              key={meeting.id}
              href={`/meetings/${meeting.id}`}
              style={{ textDecoration: 'none' }}
            >
              <Card
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '12px',
                  }}
                >
                  {/* Left side: Type, attendees, location */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '6px',
                      }}
                    >
                      <MeetingTypeIcon type={meeting.type} />
                      <span
                        style={{
                          fontWeight: 500,
                          color: '#374151',
                          textTransform: 'capitalize',
                          fontSize: '14px',
                        }}
                      >
                        {meeting.type}
                      </span>
                      {meeting.location && (
                        <>
                          <span style={{ color: '#d1d5db' }}>•</span>
                          <span
                            style={{
                              color: '#6b7280',
                              fontSize: '13px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {meeting.location}
                          </span>
                        </>
                      )}
                    </div>

                    {meeting.attendees.length > 0 && (
                      <AttendeeChips attendees={meeting.attendees} />
                    )}
                  </div>

                  {/* Right side: Date/time */}
                  <div
                    style={{
                      textAlign: 'right',
                      flexShrink: 0,
                    }}
                  >
                    <p
                      style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#374151',
                        margin: 0,
                      }}
                    >
                      {formatDate(meeting.occurred_at)}
                    </p>
                    <p
                      style={{
                        fontSize: '12px',
                        color: '#9ca3af',
                        margin: '2px 0 0',
                      }}
                    >
                      {formatTime(meeting.occurred_at)}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
