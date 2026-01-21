'use client';

import { useState, useEffect, useRef } from 'react';
import { getPeople, Person } from '@/lib/api';
import { useDebounce } from '@/lib/hooks';
import { Input, Tag } from '@/components/ui';

export interface SelectedAttendee {
  person_id: string;
  first_name: string;
  last_name: string;
  primary_email: string | null;
  role?: string | null;
}

interface AttendeePickerProps {
  selectedAttendees: SelectedAttendee[];
  onChange: (attendees: SelectedAttendee[]) => void;
  showRoles?: boolean;
}

export function AttendeePicker({
  selectedAttendees,
  onChange,
  showRoles = false,
}: AttendeePickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Search for people
  useEffect(() => {
    async function search() {
      if (!debouncedSearch.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const result = await getPeople({ query: debouncedSearch, limit: 10 });
        // Filter out already selected attendees
        const selectedIds = new Set(selectedAttendees.map((a) => a.person_id));
        setSearchResults(result.items.filter((p) => !selectedIds.has(p.id)));
      } catch (error) {
        console.error('Failed to search people:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }

    search();
  }, [debouncedSearch, selectedAttendees]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectPerson = (person: Person) => {
    const newAttendee: SelectedAttendee = {
      person_id: person.id,
      first_name: person.first_name,
      last_name: person.last_name,
      primary_email: person.primary_email,
      role: null,
    };

    // Check for duplicates (shouldn't happen but defensive)
    if (!selectedAttendees.some((a) => a.person_id === person.id)) {
      onChange([...selectedAttendees, newAttendee]);
    }

    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveAttendee = (personId: string) => {
    onChange(selectedAttendees.filter((a) => a.person_id !== personId));
  };

  const handleRoleChange = (personId: string, role: string) => {
    onChange(
      selectedAttendees.map((a) =>
        a.person_id === personId ? { ...a, role: role || null } : a
      )
    );
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Selected Attendees */}
      {selectedAttendees.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginBottom: '12px',
          }}
        >
          {selectedAttendees.map((attendee) => (
            <div
              key={attendee.person_id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 10px',
                backgroundColor: '#eff6ff',
                borderRadius: '6px',
                border: '1px solid #bfdbfe',
              }}
            >
              <span style={{ fontSize: '14px', color: '#1e40af' }}>
                {attendee.first_name} {attendee.last_name}
              </span>
              {showRoles && (
                <input
                  type="text"
                  value={attendee.role || ''}
                  onChange={(e) =>
                    handleRoleChange(attendee.person_id, e.target.value)
                  }
                  placeholder="role"
                  style={{
                    width: '80px',
                    padding: '2px 6px',
                    fontSize: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                  }}
                />
              )}
              <button
                type="button"
                onClick={() => handleRemoveAttendee(attendee.person_id)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280',
                  fontSize: '16px',
                  lineHeight: 1,
                  padding: '0 2px',
                }}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div style={{ position: 'relative' }}>
        <Input
          value={searchQuery}
          onChange={(value) => {
            setSearchQuery(value);
            setIsDropdownOpen(true);
          }}
          onFocus={() => setIsDropdownOpen(true)}
          placeholder="Search people to add..."
        />

        {/* Dropdown Results */}
        {isDropdownOpen && (searchQuery.trim() || isSearching) && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '4px',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              zIndex: 10,
              maxHeight: '200px',
              overflow: 'auto',
            }}
          >
            {isSearching ? (
              <div
                style={{
                  padding: '12px',
                  textAlign: 'center',
                  color: '#6b7280',
                  fontSize: '14px',
                }}
              >
                Searching...
              </div>
            ) : searchResults.length === 0 ? (
              <div
                style={{
                  padding: '12px',
                  textAlign: 'center',
                  color: '#6b7280',
                  fontSize: '14px',
                }}
              >
                {searchQuery.trim()
                  ? 'No people found'
                  : 'Type to search people'}
              </div>
            ) : (
              searchResults.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => handleSelectPerson(person)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '10px 12px',
                    textAlign: 'left',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f3f4f6',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ fontWeight: 500, color: '#111827' }}>
                    {person.first_name} {person.last_name}
                  </div>
                  {(person.primary_email || person.employer) && (
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {person.primary_email || person.employer}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Update Input component to support onFocus
declare module '@/components/ui' {
  interface InputProps {
    onFocus?: () => void;
  }
}
