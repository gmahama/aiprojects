'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getPeople, getMeetings, Person, Meeting, ApiError } from '@/lib/api';
import { useDebounce } from '@/lib/hooks';
import { Card, LoadingState, EmptyState, ErrorState } from '@/components/ui';

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
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

/**
 * Client-side meeting search fallback.
 *
 * NOTE: This is a temporary MVP fallback because the backend doesn't support
 * meeting query search. It fetches recent meetings and filters client-side.
 * For production, consider adding backend search support.
 */
function searchMeetingsClientSide(meetings: Meeting[], query: string): Meeting[] {
  const lowerQuery = query.toLowerCase();

  return meetings.filter((meeting) => {
    // Search in type
    if (meeting.type.toLowerCase().includes(lowerQuery)) return true;

    // Search in location
    if (meeting.location?.toLowerCase().includes(lowerQuery)) return true;

    // Search in agenda
    if (meeting.agenda?.toLowerCase().includes(lowerQuery)) return true;

    // Search in notes
    if (meeting.notes?.toLowerCase().includes(lowerQuery)) return true;

    // Search in next_steps
    if (meeting.next_steps?.toLowerCase().includes(lowerQuery)) return true;

    // Search in attendee names
    for (const attendee of meeting.attendees) {
      const fullName = `${attendee.first_name} ${attendee.last_name}`.toLowerCase();
      if (fullName.includes(lowerQuery)) return true;
    }

    return false;
  });
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebounce(query, 300);

  // People search state
  const [people, setPeople] = useState<Person[]>([]);
  const [isLoadingPeople, setIsLoadingPeople] = useState(false);
  const [peopleError, setPeopleError] = useState<string | null>(null);

  // Meetings search state (client-side fallback)
  const [allMeetings, setAllMeetings] = useState<Meeting[]>([]);
  const [filteredMeetings, setFilteredMeetings] = useState<Meeting[]>([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(false);
  const [meetingsError, setMeetingsError] = useState<string | null>(null);

  // Fetch all meetings once for client-side search
  useEffect(() => {
    async function fetchMeetings() {
      setIsLoadingMeetings(true);
      setMeetingsError(null);

      try {
        // Fetch a bounded set of recent meetings for client-side search
        // NOTE: This is an MVP fallback; backend search would be better
        const data = await getMeetings({ limit: 100 });
        setAllMeetings(data.items);
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

    fetchMeetings();
  }, []);

  // Search when debounced query changes
  useEffect(() => {
    // Update URL with query param
    if (debouncedQuery) {
      router.replace(`/search?q=${encodeURIComponent(debouncedQuery)}`, { scroll: false });
    } else {
      router.replace('/search', { scroll: false });
    }

    if (!debouncedQuery.trim()) {
      setPeople([]);
      setFilteredMeetings([]);
      return;
    }

    // Search people via API
    async function searchPeople() {
      setIsLoadingPeople(true);
      setPeopleError(null);

      try {
        const data = await getPeople({ query: debouncedQuery, limit: 10 });
        setPeople(data.items);
      } catch (err) {
        if (err instanceof ApiError) {
          setPeopleError(err.detail);
        } else {
          setPeopleError('Failed to search people');
        }
      } finally {
        setIsLoadingPeople(false);
      }
    }

    searchPeople();

    // Filter meetings client-side
    const filtered = searchMeetingsClientSide(allMeetings, debouncedQuery).slice(0, 10);
    setFilteredMeetings(filtered);
  }, [debouncedQuery, allMeetings, router]);

  const hasQuery = debouncedQuery.trim().length > 0;

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Link
          href="/"
          style={{ color: '#6b7280', textDecoration: 'none', fontSize: '14px' }}
        >
          &larr; Back to Home
        </Link>
        <h1 style={{ margin: '8px 0 0', fontSize: '24px', fontWeight: 600 }}>
          Search
        </h1>
      </div>

      {/* Search Input */}
      <div style={{ marginBottom: '24px' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people and meetings..."
          autoFocus
          style={{
            width: '100%',
            padding: '12px 16px',
            fontSize: '16px',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Results */}
      {!hasQuery ? (
        <p style={{ color: '#6b7280', textAlign: 'center', marginTop: '48px' }}>
          Enter a search term to find people and meetings
        </p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '24px',
          }}
        >
          {/* People Results */}
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
              People
            </h2>

            {isLoadingPeople ? (
              <LoadingState message="Searching..." />
            ) : peopleError ? (
              <ErrorState message={peopleError} />
            ) : people.length === 0 ? (
              <Card>
                <p style={{ color: '#6b7280', textAlign: 'center', margin: 0 }}>
                  No people found
                </p>
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {people.map((person) => (
                  <Link
                    key={person.id}
                    href={`/people/${person.id}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <Card style={{ padding: '12px 16px', cursor: 'pointer' }}>
                      <p
                        style={{
                          margin: 0,
                          fontWeight: 500,
                          color: '#2563eb',
                          fontSize: '14px',
                        }}
                      >
                        {person.first_name} {person.last_name}
                      </p>
                      {(person.title || person.employer) && (
                        <p
                          style={{
                            margin: '4px 0 0',
                            color: '#6b7280',
                            fontSize: '13px',
                          }}
                        >
                          {person.title}
                          {person.title && person.employer && ' at '}
                          {person.employer}
                        </p>
                      )}
                      {person.primary_email && (
                        <p
                          style={{
                            margin: '2px 0 0',
                            color: '#9ca3af',
                            fontSize: '12px',
                          }}
                        >
                          {person.primary_email}
                        </p>
                      )}
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Meeting Results */}
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
              Meetings
            </h2>

            {isLoadingMeetings ? (
              <LoadingState message="Searching..." />
            ) : meetingsError ? (
              <ErrorState message={meetingsError} />
            ) : filteredMeetings.length === 0 ? (
              <Card>
                <p style={{ color: '#6b7280', textAlign: 'center', margin: 0 }}>
                  No meetings found
                </p>
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredMeetings.map((meeting) => (
                  <Link
                    key={meeting.id}
                    href={`/meetings/${meeting.id}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <Card style={{ padding: '12px 16px', cursor: 'pointer' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '4px',
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
                        <span style={{ color: '#9ca3af', fontSize: '13px' }}>
                          {formatDate(meeting.occurred_at)}
                        </span>
                      </div>
                      {meeting.attendees.length > 0 && (
                        <p
                          style={{
                            margin: 0,
                            color: '#6b7280',
                            fontSize: '13px',
                          }}
                        >
                          {meeting.attendees
                            .slice(0, 3)
                            .map((a) => `${a.first_name} ${a.last_name}`)
                            .join(', ')}
                          {meeting.attendees.length > 3 &&
                            ` +${meeting.attendees.length - 3}`}
                        </p>
                      )}
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
