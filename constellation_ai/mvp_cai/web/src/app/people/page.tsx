'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getPeople, Person, PersonList, ApiError } from '@/lib/api';
import { useDebounce } from '@/lib/hooks';
import {
  Button,
  Input,
  Card,
  Tag,
  LoadingState,
  EmptyState,
  ErrorState,
} from '@/components/ui';
import { AddPersonModal } from '@/components/AddPersonModal';

const PAGE_SIZE = 20;

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  const fetchPeople = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getPeople({
        query: debouncedSearch || undefined,
        limit: PAGE_SIZE,
        offset,
      });
      setPeople(result.items);
      setTotal(result.total);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError('Failed to load people');
      }
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, offset]);

  // Fetch on mount and when search/pagination changes
  useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);

  // Reset offset when search changes
  useEffect(() => {
    setOffset(0);
  }, [debouncedSearch]);

  const handleAddSuccess = () => {
    fetchPeople();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <div>
          <Link
            href="/"
            style={{ color: '#6b7280', textDecoration: 'none', fontSize: '14px' }}
          >
            &larr; Back to Home
          </Link>
          <h1 style={{ margin: '8px 0 0', fontSize: '24px', fontWeight: 600 }}>
            People
          </h1>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>+ Add Person</Button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '24px' }}>
        <Input
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by name, email, or employer..."
          style={{ maxWidth: '400px' }}
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingState message="Loading people..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchPeople} />
      ) : people.length === 0 ? (
        <EmptyState
          title={debouncedSearch ? 'No results found' : 'No people yet'}
          description={
            debouncedSearch
              ? 'Try a different search term'
              : 'Add your first contact to get started'
          }
          action={
            !debouncedSearch && (
              <Button onClick={() => setIsAddModalOpen(true)}>
                + Add Person
              </Button>
            )
          }
        />
      ) : (
        <>
          {/* Results count */}
          <p style={{ color: '#6b7280', marginBottom: '16px', fontSize: '14px' }}>
            Showing {people.length} of {total} people
          </p>

          {/* People Table */}
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '12px 16px',
                      fontWeight: 500,
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb',
                    }}
                  >
                    Name
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '12px 16px',
                      fontWeight: 500,
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb',
                    }}
                  >
                    Email
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '12px 16px',
                      fontWeight: 500,
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb',
                    }}
                  >
                    Company
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '12px 16px',
                      fontWeight: 500,
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb',
                    }}
                  >
                    Tags
                  </th>
                </tr>
              </thead>
              <tbody>
                {people.map((person) => (
                  <tr
                    key={person.id}
                    style={{
                      borderBottom: '1px solid #e5e7eb',
                    }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <Link
                        href={`/people/${person.id}`}
                        style={{
                          color: '#2563eb',
                          textDecoration: 'none',
                          fontWeight: 500,
                        }}
                      >
                        {person.first_name} {person.last_name}
                      </Link>
                      {person.title && (
                        <div style={{ color: '#6b7280', fontSize: '12px' }}>
                          {person.title}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6b7280' }}>
                      {person.primary_email || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6b7280' }}>
                      {person.employer || '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {person.tags && person.tags.length > 0 ? (
                        person.tags.slice(0, 3).map((tag) => (
                          <Tag key={tag}>{tag}</Tag>
                        ))
                      ) : (
                        <span style={{ color: '#9ca3af' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '16px',
                marginTop: '24px',
              }}
            >
              <Button
                variant="secondary"
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                disabled={offset === 0}
              >
                Previous
              </Button>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="secondary"
                onClick={() => setOffset(offset + PAGE_SIZE)}
                disabled={currentPage >= totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Add Person Modal */}
      <AddPersonModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}
