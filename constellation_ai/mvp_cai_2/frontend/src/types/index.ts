// User types
export type UserRole = "ADMIN" | "MANAGER" | "ANALYST" | "VIEWER";

export interface User {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Classification
export type Classification = "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";

// Organization types
export type OrgType = "ASSET_MANAGER" | "BROKER" | "CONSULTANT" | "CORPORATE" | "OTHER";

export interface Organization {
  id: string;
  name: string;
  short_name: string | null;
  org_type: OrgType | null;
  website: string | null;
  notes?: string | null;
  classification: Classification;
  owner_id: string | null;
  owner?: User | null;
  created_at: string;
  updated_at: string;
  contacts?: ContactSummary[];
  tags?: Tag[];
}

export interface OrganizationSummary {
  id: string;
  name: string;
  short_name: string | null;
}

// Contact types
export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  organization_id: string | null;
  organization?: OrganizationSummary | null;
  classification: Classification;
  owner_id: string | null;
  owner?: User | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
  recent_activities?: ActivitySummary[];
}

export interface ContactSummary {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  title: string | null;
}

// Tag types
export interface TagSet {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  tags: Tag[];
}

export interface Tag {
  id: string;
  tag_set_id: string;
  value: string;
  is_active: boolean;
  created_at: string;
}

// Activity types
export type ActivityType = "MEETING" | "CALL" | "EMAIL" | "NOTE" | "LLM_INTERACTION" | "SLACK_NOTE";

export interface Activity {
  id: string;
  title: string;
  activity_type: ActivityType;
  occurred_at: string;
  location: string | null;
  description?: string | null;
  summary?: string | null;
  key_points?: string | null;
  classification: Classification;
  owner_id: string;
  owner?: User | null;
  created_at: string;
  updated_at: string;
  attendees?: Attendee[];
  tags?: Tag[];
  attachments?: Attachment[];
  followups?: FollowUp[];
  versions?: ActivityVersion[];
}

export interface ActivitySummary {
  id: string;
  title: string;
  activity_type: ActivityType;
  occurred_at: string;
}

export interface Attendee {
  contact_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  organization_name: string | null;
  role: string | null;
}

export interface ActivityVersion {
  id: string;
  version_number: number;
  snapshot: Record<string, unknown>;
  changed_by: string;
  changed_at: string;
}

// Attachment types
export interface Attachment {
  id: string;
  activity_id: string;
  filename: string;
  content_type: string;
  file_size_bytes: number | null;
  checksum: string | null;
  version_number: number;
  classification: Classification;
  uploaded_by: string;
  created_at: string;
}

// Follow-up types
export type FollowUpStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface FollowUp {
  id: string;
  activity_id: string;
  description: string;
  assigned_to: string | null;
  assigned_to_name: string | null;
  due_date: string | null;
  status: FollowUpStatus;
  completed_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Search types
export interface SearchResult {
  entity_type: "contact" | "organization" | "activity";
  entity_id: string;
  title: string;
  snippet: string | null;
  relevance_score: number;
  metadata: Record<string, unknown> | null;
}

// Audit types
export type AuditAction = "CREATE" | "READ" | "UPDATE" | "DELETE";

export interface AuditEntry {
  id: string;
  user_id: string | null;
  action: AuditAction;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

// Pagination types
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// Form types
export interface ContactFormData {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  title?: string;
  organization_id?: string;
  classification: Classification;
  notes?: string;
  tag_ids?: string[];
}

export interface OrganizationFormData {
  name: string;
  short_name?: string;
  org_type?: OrgType;
  website?: string;
  notes?: string;
  classification: Classification;
  tag_ids?: string[];
}

export interface ActivityFormData {
  title: string;
  activity_type: ActivityType;
  occurred_at: string;
  location?: string;
  description?: string;
  summary?: string;
  key_points?: string;
  classification: Classification;
  attendees?: { contact_id: string; role?: string }[];
  tag_ids?: string[];
  followups?: { description: string; assigned_to?: string; due_date?: string }[];
}

export interface FollowUpFormData {
  description: string;
  assigned_to?: string;
  due_date?: string;
  status?: FollowUpStatus;
}

// Event types
export type EventType = "RETREAT" | "DINNER" | "LUNCH" | "OTHER";

export interface Event {
  id: string;
  name: string;
  event_type: EventType;
  occurred_at: string;
  location: string | null;
  description?: string | null;
  notes?: string | null;
  classification: Classification;
  owner_id: string | null;
  owner?: User | null;
  created_at: string;
  updated_at: string;
  attendees?: EventAttendee[];
  pitches?: EventPitch[];
  tags?: Tag[];
  versions?: EventVersion[];
}

export interface EventAttendee {
  contact_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  organization_name: string | null;
  role: string | null;
  notes: string | null;
}

export interface EventPitch {
  id: string;
  ticker: string | null;
  company_name: string;
  thesis: string | null;
  notes: string | null;
  pitched_by: string | null;
  pitcher_name: string | null;
  is_bullish: boolean | null;
  created_by: string;
  created_at: string;
}

export interface EventVersion {
  id: string;
  version_number: number;
  snapshot: Record<string, unknown>;
  changed_by: string;
  changed_at: string;
}

export interface EventFormData {
  name: string;
  event_type: EventType;
  occurred_at: string;
  location?: string;
  description?: string;
  notes?: string;
  classification: Classification;
  attendees?: EventAttendeeFormData[];
  pitches?: EventPitchFormData[];
  tag_ids?: string[];
}

export interface EventAttendeeFormData {
  contact_id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  organization_id?: string;
  role?: string;
  notes?: string;
}

export interface EventPitchFormData {
  ticker?: string;
  company_name: string;
  thesis?: string;
  notes?: string;
  pitched_by?: string;
  is_bullish?: boolean;
}

// Document Parsing types
export interface ExtractedPerson {
  name: string;
  organization: string | null;
  title: string | null;
  email: string | null;
}

export interface ExtractedActivityData {
  title: string | null;
  persons: ExtractedPerson[];
  organizations: string[];
  location: string | null;
  occurred_at: string | null;
  summary: string | null;
  key_points: string | null;
  confidence_score: number;
}

export interface DocumentParseResponse {
  success: boolean;
  data: ExtractedActivityData | null;
  error: string | null;
}
