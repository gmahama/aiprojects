/**
 * API client for CRM backend.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      errorData.detail || `Request failed with status ${response.status}`
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

// Types

export interface Person {
  id: string;
  first_name: string;
  last_name: string;
  primary_email: string | null;
  employer: string | null;
  title: string | null;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface PersonCreate {
  first_name: string;
  last_name: string;
  primary_email?: string | null;
  employer?: string | null;
  title?: string | null;
  notes?: string | null;
  tags?: string[] | null;
}

export interface PersonList {
  items: Person[];
  total: number;
  limit: number;
  offset: number;
}

export interface MeetingAttendee {
  person_id: string;
  role: string | null;
  first_name: string;
  last_name: string;
  primary_email: string | null;
}

export interface Meeting {
  id: string;
  occurred_at: string;
  type: string;
  location: string | null;
  agenda: string | null;
  notes: string | null;
  next_steps: string | null;
  created_at: string;
  updated_at: string;
  attendees: MeetingAttendee[];
}

export interface MeetingList {
  items: Meeting[];
  total: number;
  limit: number;
  offset: number;
}

// People API

export async function getPeople(params?: {
  query?: string;
  tag?: string;
  limit?: number;
  offset?: number;
}): Promise<PersonList> {
  const searchParams = new URLSearchParams();
  if (params?.query) searchParams.set('query', params.query);
  if (params?.tag) searchParams.set('tag', params.tag);
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());

  const queryString = searchParams.toString();
  return request<PersonList>(`/people${queryString ? `?${queryString}` : ''}`);
}

export async function getPerson(id: string): Promise<Person> {
  return request<Person>(`/people/${id}`);
}

export async function createPerson(data: PersonCreate): Promise<Person> {
  return request<Person>('/people', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePerson(
  id: string,
  data: Partial<PersonCreate>
): Promise<Person> {
  return request<Person>(`/people/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deletePerson(id: string): Promise<void> {
  return request<void>(`/people/${id}`, {
    method: 'DELETE',
  });
}

// Meetings API

export async function getMeetings(params?: {
  person_id?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}): Promise<MeetingList> {
  const searchParams = new URLSearchParams();
  if (params?.person_id) searchParams.set('person_id', params.person_id);
  if (params?.from) searchParams.set('from', params.from);
  if (params?.to) searchParams.set('to', params.to);
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());

  const queryString = searchParams.toString();
  return request<MeetingList>(`/meetings${queryString ? `?${queryString}` : ''}`);
}

export async function getMeeting(id: string): Promise<Meeting> {
  return request<Meeting>(`/meetings/${id}`);
}

export interface MeetingAttendeeInput {
  person_id: string;
  role?: string | null;
}

export interface MeetingCreate {
  occurred_at: string;
  type?: string;
  location?: string | null;
  agenda?: string | null;
  notes?: string | null;
  next_steps?: string | null;
  attendees?: MeetingAttendeeInput[];
}

export interface MeetingUpdate {
  occurred_at?: string;
  type?: string;
  location?: string | null;
  agenda?: string | null;
  notes?: string | null;
  next_steps?: string | null;
  attendees?: MeetingAttendeeInput[];
}

export async function createMeeting(data: MeetingCreate): Promise<Meeting> {
  return request<Meeting>('/meetings', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateMeeting(
  id: string,
  data: MeetingUpdate
): Promise<Meeting> {
  return request<Meeting>(`/meetings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteMeeting(id: string): Promise<void> {
  return request<void>(`/meetings/${id}`, {
    method: 'DELETE',
  });
}
