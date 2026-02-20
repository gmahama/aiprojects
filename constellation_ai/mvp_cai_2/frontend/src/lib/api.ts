const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface RequestOptions extends RequestInit {
  token?: string;
}

class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

async function fetchWithAuth(
  endpoint: string,
  options: RequestOptions = {}
): Promise<Response> {
  const { token, ...fetchOptions } = options;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    let detail = "An error occurred";
    try {
      const errorData = await response.json();
      detail = errorData.detail || detail;
    } catch {
      // Ignore JSON parse errors
    }
    throw new ApiError(response.status, detail);
  }

  return response;
}

export const api = {
  // Health
  async health() {
    const res = await fetchWithAuth("/api/health");
    return res.json();
  },

  // Users
  async getCurrentUser(token: string) {
    const res = await fetchWithAuth("/api/users/me", { token });
    return res.json();
  },

  async getUsers(token: string, page = 1, pageSize = 25) {
    const res = await fetchWithAuth(
      `/api/users?page=${page}&page_size=${pageSize}`,
      { token }
    );
    return res.json();
  },

  async updateUser(token: string, userId: string, data: Record<string, unknown>) {
    const res = await fetchWithAuth(`/api/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
      token,
    });
    return res.json();
  },

  // Organizations
  async getOrganizations(token: string, params?: Record<string, string>) {
    const queryString = params ? "?" + new URLSearchParams(params).toString() : "";
    const res = await fetchWithAuth(`/api/organizations${queryString}`, { token });
    return res.json();
  },

  async getOrganization(token: string, id: string) {
    const res = await fetchWithAuth(`/api/organizations/${id}`, { token });
    return res.json();
  },

  async createOrganization(token: string, data: Record<string, unknown>) {
    const res = await fetchWithAuth("/api/organizations", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    });
    return res.json();
  },

  async updateOrganization(token: string, id: string, data: Record<string, unknown>) {
    const res = await fetchWithAuth(`/api/organizations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
      token,
    });
    return res.json();
  },

  async deleteOrganization(token: string, id: string) {
    await fetchWithAuth(`/api/organizations/${id}`, {
      method: "DELETE",
      token,
    });
  },

  // Contacts
  async getContacts(token: string, params?: Record<string, string>) {
    const queryString = params ? "?" + new URLSearchParams(params).toString() : "";
    const res = await fetchWithAuth(`/api/contacts${queryString}`, { token });
    return res.json();
  },

  async getContact(token: string, id: string) {
    const res = await fetchWithAuth(`/api/contacts/${id}`, { token });
    return res.json();
  },

  async createContact(token: string, data: Record<string, unknown>) {
    const res = await fetchWithAuth("/api/contacts", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    });
    return res.json();
  },

  async updateContact(token: string, id: string, data: Record<string, unknown>) {
    const res = await fetchWithAuth(`/api/contacts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
      token,
    });
    return res.json();
  },

  async deleteContact(token: string, id: string) {
    await fetchWithAuth(`/api/contacts/${id}`, {
      method: "DELETE",
      token,
    });
  },

  async addContactTags(token: string, contactId: string, tagIds: string[]) {
    const res = await fetchWithAuth(`/api/contacts/${contactId}/tags`, {
      method: "POST",
      body: JSON.stringify(tagIds),
      token,
    });
    return res.json();
  },

  async removeContactTag(token: string, contactId: string, tagId: string) {
    await fetchWithAuth(`/api/contacts/${contactId}/tags/${tagId}`, {
      method: "DELETE",
      token,
    });
  },

  // Activities
  async getActivities(token: string, params?: Record<string, string>) {
    const queryString = params ? "?" + new URLSearchParams(params).toString() : "";
    const res = await fetchWithAuth(`/api/activities${queryString}`, { token });
    return res.json();
  },

  async getActivity(token: string, id: string) {
    const res = await fetchWithAuth(`/api/activities/${id}`, { token });
    return res.json();
  },

  async createActivity(token: string, data: Record<string, unknown>) {
    const res = await fetchWithAuth("/api/activities", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    });
    return res.json();
  },

  async updateActivity(token: string, id: string, data: Record<string, unknown>) {
    const res = await fetchWithAuth(`/api/activities/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
      token,
    });
    return res.json();
  },

  async deleteActivity(token: string, id: string) {
    await fetchWithAuth(`/api/activities/${id}`, {
      method: "DELETE",
      token,
    });
  },

  async getActivityVersions(token: string, activityId: string) {
    const res = await fetchWithAuth(`/api/activities/${activityId}/versions`, { token });
    return res.json();
  },

  // Attachments
  async uploadAttachments(token: string, activityId: string, files: File[]) {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const res = await fetch(`${API_URL}/api/activities/${activityId}/attachments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!res.ok) {
      throw new ApiError(res.status, "Failed to upload attachments");
    }

    return res.json();
  },

  getAttachmentDownloadUrl(attachmentId: string) {
    return `${API_URL}/api/attachments/${attachmentId}/download`;
  },

  async downloadAttachment(token: string, attachmentId: string, filename: string) {
    const res = await fetch(`${API_URL}/api/attachments/${attachmentId}/download`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new ApiError(res.status, "Failed to download attachment");
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  },

  async deleteAttachment(token: string, attachmentId: string) {
    await fetchWithAuth(`/api/attachments/${attachmentId}`, {
      method: "DELETE",
      token,
    });
  },

  // Follow-ups
  async getFollowUps(token: string, params?: Record<string, string>) {
    const queryString = params ? "?" + new URLSearchParams(params).toString() : "";
    const res = await fetchWithAuth(`/api/followups${queryString}`, { token });
    return res.json();
  },

  async getMyFollowUps(token: string, params?: Record<string, string>) {
    const queryString = params ? "?" + new URLSearchParams(params).toString() : "";
    const res = await fetchWithAuth(`/api/followups/my${queryString}`, { token });
    return res.json();
  },

  async createFollowUp(token: string, activityId: string, data: Record<string, unknown>) {
    const res = await fetchWithAuth(`/api/followups/activities/${activityId}/followups`, {
      method: "POST",
      body: JSON.stringify(data),
      token,
    });
    return res.json();
  },

  async updateFollowUp(token: string, followUpId: string, data: Record<string, unknown>) {
    const res = await fetchWithAuth(`/api/followups/${followUpId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
      token,
    });
    return res.json();
  },

  // Tags
  async getTagSets(token: string, includeInactive = false) {
    const res = await fetchWithAuth(
      `/api/tag-sets?include_inactive=${includeInactive}`,
      { token }
    );
    return res.json();
  },

  async createTagSet(token: string, data: { name: string; description?: string }) {
    const res = await fetchWithAuth("/api/tag-sets", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    });
    return res.json();
  },

  async createTag(token: string, tagSetId: string, value: string) {
    const res = await fetchWithAuth(`/api/tag-sets/${tagSetId}/tags`, {
      method: "POST",
      body: JSON.stringify({ value }),
      token,
    });
    return res.json();
  },

  async updateTag(token: string, tagId: string, data: { value?: string; is_active?: boolean }) {
    const res = await fetchWithAuth(`/api/tags/${tagId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
      token,
    });
    return res.json();
  },

  async getTagUsage(token: string, tagId: string) {
    const res = await fetchWithAuth(`/api/tags/${tagId}/usage`, { token });
    return res.json();
  },

  // Search
  async search(token: string, params: Record<string, string>) {
    const queryString = new URLSearchParams(params).toString();
    const res = await fetchWithAuth(`/api/search?${queryString}`, { token });
    return res.json();
  },

  // Audit
  async getAuditLog(token: string, params?: Record<string, string>) {
    const queryString = params ? "?" + new URLSearchParams(params).toString() : "";
    const res = await fetchWithAuth(`/api/audit${queryString}`, { token });
    return res.json();
  },

  // Export
  getExportUrl(entityType: string, entityId: string) {
    return `${API_URL}/api/export/${entityType}/${entityId}`;
  },

  // Events
  async getEvents(token: string, params?: Record<string, string>) {
    const queryString = params ? "?" + new URLSearchParams(params).toString() : "";
    const res = await fetchWithAuth(`/api/events${queryString}`, { token });
    return res.json();
  },

  async getEvent(token: string, id: string) {
    const res = await fetchWithAuth(`/api/events/${id}`, { token });
    return res.json();
  },

  async createEvent(token: string, data: Record<string, unknown>) {
    const res = await fetchWithAuth("/api/events", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    });
    return res.json();
  },

  async updateEvent(token: string, id: string, data: Record<string, unknown>) {
    const res = await fetchWithAuth(`/api/events/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
      token,
    });
    return res.json();
  },

  async deleteEvent(token: string, id: string) {
    await fetchWithAuth(`/api/events/${id}`, {
      method: "DELETE",
      token,
    });
  },

  async addEventAttendee(token: string, eventId: string, data: Record<string, unknown>) {
    const res = await fetchWithAuth(`/api/events/${eventId}/attendees`, {
      method: "POST",
      body: JSON.stringify(data),
      token,
    });
    return res.json();
  },

  async addEventPitch(token: string, eventId: string, data: Record<string, unknown>) {
    const res = await fetchWithAuth(`/api/events/${eventId}/pitches`, {
      method: "POST",
      body: JSON.stringify(data),
      token,
    });
    return res.json();
  },

  async getEventVersions(token: string, eventId: string) {
    const res = await fetchWithAuth(`/api/events/${eventId}/versions`, { token });
    return res.json();
  },

  // Document Parsing
  async parseDocument(token: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_URL}/api/parse-document`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!res.ok) {
      let detail = "Failed to parse document";
      try {
        const errorData = await res.json();
        detail = errorData.detail || detail;
      } catch {
        // Ignore JSON parse errors
      }
      throw new ApiError(res.status, detail);
    }

    return res.json();
  },
};

export { ApiError };
