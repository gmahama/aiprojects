'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getPerson, getMeetings, updatePerson, Person, Meeting, ApiError } from '@/lib/api';
import {
  Card,
  Tag,
  Button,
  LoadingState,
  EmptyState,
  ErrorState,
} from '@/components/ui';
import { TagInput } from '@/components/TagInput';

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
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

function truncate(text: string | null, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
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

export default function PersonProfilePage() {
  const params = useParams();
  const id = params.id as string;

  const [person, setPerson] = useState<Person | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoadingPerson, setIsLoadingPerson] = useState(true);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(true);
  const [personError, setPersonError] = useState<string | null>(null);
  const [meetingsError, setMeetingsError] = useState<string | null>(null);

  // Tag editing state
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [isSavingTags, setIsSavingTags] = useState(false);
  const [tagSaveError, setTagSaveError] = useState<string | null>(null);

  const handleEditTags = () => {
    setEditTags(person?.tags || []);
    setTagSaveError(null);
    setIsEditingTags(true);
  };

  const handleCancelEditTags = () => {
    setIsEditingTags(false);
    setTagSaveError(null);
  };

  const handleSaveTags = async () => {
    if (!person) return;

    setIsSavingTags(true);
    setTagSaveError(null);

    try {
      const updated = await updatePerson(id, {
        tags: editTags.length > 0 ? editTags : null,
      });
      setPerson(updated);
      setIsEditingTags(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setTagSaveError(err.detail);
      } else {
        setTagSaveError('Failed to save tags');
      }
    } finally {
      setIsSavingTags(false);
    }
  };

  useEffect(() => {
    async function fetchPerson() {
      setIsLoadingPerson(true);
      setPersonError(null);

      try {
        const data = await getPerson(id);
        setPerson(data);
      } catch (err) {
        if (err instanceof ApiError) {
          setPersonError(
            err.status === 404 ? 'Person not found' : err.detail
          );
        } else {
          setPersonError('Failed to load person');
        }
      } finally {
        setIsLoadingPerson(false);
      }
    }

    async function fetchMeetings() {
      setIsLoadingMeetings(true);
      setMeetingsError(null);

      try {
        const data = await getMeetings({ person_id: id, limit: 50 });
        setMeetings(data.items);
      } catch (err) {
        if (err instanceof ApiError) {
          setMeetingsError(err.detail);
        } else {
          setMeetingsError('Failed to load meetings');
        }
      } finally {
        setIsLoadingMeetings(false);
      }
    }

    fetchPerson();
    fetchMeetings();
  }, [id]);

  if (isLoadingPerson) {
    return (
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <LoadingState message="Loading person..." />
      </div>
    );
  }

  if (personError) {
    return (
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <Link
          href="/people"
          style={{ color: '#6b7280', textDecoration: 'none', fontSize: '14px' }}
        >
          &larr; Back to People
        </Link>
        <div style={{ marginTop: '24px' }}>
          <ErrorState message={personError} />
        </div>
      </div>
    );
  }

  if (!person) {
    return null;
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Breadcrumb */}
      <Link
        href="/people"
        style={{ color: '#6b7280', textDecoration: 'none', fontSize: '14px' }}
      >
        &larr; Back to People
      </Link>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 2fr',
          gap: '24px',
          marginTop: '24px',
        }}
      >
        {/* Profile Card */}
        <div>
          <Card>
            {/* Name and Title */}
            <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>
              {person.first_name} {person.last_name}
            </h1>
            {person.title && (
              <p style={{ color: '#6b7280', margin: '4px 0 0' }}>
                {person.title}
              </p>
            )}
            {person.employer && (
              <p style={{ color: '#374151', margin: '4px 0 0', fontWeight: 500 }}>
                {person.employer}
              </p>
            )}

            {/* Contact Info */}
            {person.primary_email && (
              <div style={{ marginTop: '16px' }}>
                <p
                  style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    margin: '0 0 4px',
                  }}
                >
                  Email
                </p>
                <a
                  href={`mailto:${person.primary_email}`}
                  style={{ color: '#2563eb', textDecoration: 'none' }}
                >
                  {person.primary_email}
                </a>
              </div>
            )}

            {/* Tags */}
            <div style={{ marginTop: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <p
                  style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    margin: 0,
                  }}
                >
                  Tags
                </p>
                {!isEditingTags && (
                  <button
                    onClick={handleEditTags}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontSize: '12px',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Edit
                  </button>
                )}
              </div>

              {tagSaveError && (
                <div
                  style={{
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '4px',
                    padding: '8px',
                    marginBottom: '8px',
                    color: '#dc2626',
                    fontSize: '12px',
                  }}
                >
                  {tagSaveError}
                </div>
              )}

              {isEditingTags ? (
                <div>
                  <TagInput
                    tags={editTags}
                    onChange={setEditTags}
                    placeholder="Add tag..."
                  />
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      marginTop: '8px',
                    }}
                  >
                    <Button
                      onClick={handleSaveTags}
                      disabled={isSavingTags}
                      style={{ fontSize: '12px', padding: '4px 8px' }}
                    >
                      {isSavingTags ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={handleCancelEditTags}
                      style={{ fontSize: '12px', padding: '4px 8px' }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : person.tags && person.tags.length > 0 ? (
                <div>
                  {person.tags.map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>
                  No tags
                </p>
              )}
            </div>

            {/* Notes */}
            {person.notes && (
              <div style={{ marginTop: '16px' }}>
                <p
                  style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    margin: '0 0 8px',
                  }}
                >
                  Notes
                </p>
                <p
                  style={{
                    color: '#374151',
                    fontSize: '14px',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                    margin: 0,
                  }}
                >
                  {person.notes}
                </p>
              </div>
            )}

            {/* Metadata */}
            <div
              style={{
                marginTop: '24px',
                paddingTop: '16px',
                borderTop: '1px solid #e5e7eb',
                fontSize: '12px',
                color: '#9ca3af',
              }}
            >
              <p style={{ margin: 0 }}>
                Created: {formatDate(person.created_at)}
              </p>
            </div>
          </Card>
        </div>

        {/* Meetings Timeline */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
              Meetings
            </h2>
            <Link
              href="/meetings/new"
              style={{
                padding: '6px 12px',
                backgroundColor: '#2563eb',
                color: 'white',
                borderRadius: '6px',
                fontSize: '14px',
                textDecoration: 'none',
              }}
            >
              + Log Meeting
            </Link>
          </div>

          {isLoadingMeetings ? (
            <LoadingState message="Loading meetings..." />
          ) : meetingsError ? (
            <ErrorState message={meetingsError} />
          ) : meetings.length === 0 ? (
            <EmptyState
              title="No meetings yet"
              description="Meetings with this person will appear here"
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {meetings.map((meeting) => (
                <Link
                  key={meeting.id}
                  href={`/meetings/${meeting.id}`}
                  style={{ textDecoration: 'none' }}
                >
                  <Card style={{ cursor: 'pointer', transition: 'box-shadow 0.2s' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        {/* Header */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <MeetingTypeIcon type={meeting.type} />
                          <span
                            style={{
                              fontWeight: 500,
                              color: '#374151',
                              textTransform: 'capitalize',
                            }}
                          >
                            {meeting.type}
                          </span>
                        {meeting.location && (
                          <>
                            <span style={{ color: '#d1d5db' }}>•</span>
                            <span style={{ color: '#6b7280', fontSize: '14px' }}>
                              {meeting.location}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Notes preview */}
                      {meeting.notes && (
                        <p
                          style={{
                            color: '#6b7280',
                            fontSize: '14px',
                            margin: '8px 0 0',
                            lineHeight: 1.5,
                          }}
                        >
                          {truncate(meeting.notes, 150)}
                        </p>
                      )}

                      {/* Next steps */}
                      {meeting.next_steps && (
                        <p
                          style={{
                            color: '#059669',
                            fontSize: '13px',
                            margin: '8px 0 0',
                          }}
                        >
                          <strong>Next:</strong> {truncate(meeting.next_steps, 100)}
                        </p>
                      )}

                      {/* Other attendees */}
                      {meeting.attendees.length > 1 && (
                        <p
                          style={{
                            color: '#9ca3af',
                            fontSize: '12px',
                            margin: '8px 0 0',
                          }}
                        >
                          Also with:{' '}
                          {meeting.attendees
                            .filter((a) => a.person_id !== id)
                            .map((a) => `${a.first_name} ${a.last_name}`)
                            .join(', ')}
                        </p>
                      )}
                    </div>

                    {/* Date */}
                    <div
                      style={{
                        textAlign: 'right',
                        marginLeft: '16px',
                        flexShrink: 0,
                      }}
                    >
                      <p
                        style={{
                          fontSize: '14px',
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
      </div>
    </div>
  );
}
