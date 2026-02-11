"use client";

import { useState, useEffect } from "react";
import { X, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import type { Contact, EventAttendeeFormData, Organization, PaginatedResponse } from "@/types";

interface AttendeeSelectorProps {
  attendees: EventAttendeeFormData[];
  onChange: (attendees: EventAttendeeFormData[]) => void;
}

export function AttendeeSelector({ attendees, onChange }: AttendeeSelectorProps) {
  const { getToken } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showNewContactForm, setShowNewContactForm] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [newContact, setNewContact] = useState({
    first_name: "",
    last_name: "",
    email: "",
    organization_id: "",
    role: "",
  });

  // Fetch organizations for dropdown
  useEffect(() => {
    async function fetchOrganizations() {
      try {
        const token = await getToken();
        const res = (await api.getOrganizations(token, { page_size: "100" })) as PaginatedResponse<Organization>;
        setOrganizations(res.items);
      } catch (error) {
        console.error("Failed to fetch organizations:", error);
      }
    }
    fetchOrganizations();
  }, [getToken]);

  // Search contacts
  useEffect(() => {
    async function searchContacts() {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const token = await getToken();
        const res = (await api.getContacts(token, {
          search: searchQuery,
          page_size: "10",
        })) as PaginatedResponse<Contact>;
        // Filter out already selected contacts
        const selectedIds = attendees.filter(a => a.contact_id).map(a => a.contact_id);
        setSearchResults(res.items.filter((c) => !selectedIds.includes(c.id)));
      } catch (error) {
        console.error("Failed to search contacts:", error);
      } finally {
        setIsSearching(false);
      }
    }

    const debounce = setTimeout(searchContacts, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, getToken, attendees]);

  const addExistingContact = (contact: Contact) => {
    onChange([
      ...attendees,
      {
        contact_id: contact.id,
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email || undefined,
        role: "",
      },
    ]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const addNewContact = () => {
    if (newContact.first_name && newContact.last_name) {
      onChange([
        ...attendees,
        {
          first_name: newContact.first_name,
          last_name: newContact.last_name,
          email: newContact.email || undefined,
          organization_id: newContact.organization_id || undefined,
          role: newContact.role || undefined,
        },
      ]);
      setNewContact({
        first_name: "",
        last_name: "",
        email: "",
        organization_id: "",
        role: "",
      });
      setShowNewContactForm(false);
    }
  };

  const removeAttendee = (index: number) => {
    onChange(attendees.filter((_, i) => i !== index));
  };

  const updateAttendeeRole = (index: number, role: string) => {
    const updated = [...attendees];
    updated[index] = { ...updated[index], role };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {/* Selected Attendees */}
      {attendees.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attendees.map((attendee, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2 rounded-lg border bg-gray-50"
            >
              <div className="h-6 w-6 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-primary-600 font-semibold text-xs">
                  {attendee.first_name?.[0] || "?"}
                  {attendee.last_name?.[0] || "?"}
                </span>
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium">
                  {attendee.first_name} {attendee.last_name}
                </span>
                {!attendee.contact_id && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    New
                  </Badge>
                )}
              </div>
              <Input
                placeholder="Role"
                value={attendee.role || ""}
                onChange={(e) => updateAttendeeRole(index, e.target.value)}
                className="w-24 h-7 text-xs"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeAttendee(index)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Search Existing Contacts */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search existing contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowNewContactForm(!showNewContactForm)}
          >
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
            {searchResults.map((contact) => (
              <button
                key={contact.id}
                type="button"
                onClick={() => addExistingContact(contact)}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-3"
              >
                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-primary-600 font-semibold text-xs">
                    {contact.first_name[0]}
                    {contact.last_name[0]}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {contact.first_name} {contact.last_name}
                  </p>
                  {contact.organization?.name && (
                    <p className="text-xs text-muted-foreground">
                      {contact.organization.name}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {isSearching && (
          <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg p-3 text-center">
            <span className="text-sm text-muted-foreground">Searching...</span>
          </div>
        )}
      </div>

      {/* New Contact Form */}
      {showNewContactForm && (
        <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
          <p className="text-sm font-medium">Add New Contact</p>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              placeholder="First Name *"
              value={newContact.first_name}
              onChange={(e) =>
                setNewContact({ ...newContact, first_name: e.target.value })
              }
            />
            <Input
              placeholder="Last Name *"
              value={newContact.last_name}
              onChange={(e) =>
                setNewContact({ ...newContact, last_name: e.target.value })
              }
            />
            <Input
              type="email"
              placeholder="Email"
              value={newContact.email}
              onChange={(e) =>
                setNewContact({ ...newContact, email: e.target.value })
              }
            />
            <select
              value={newContact.organization_id}
              onChange={(e) =>
                setNewContact({ ...newContact, organization_id: e.target.value })
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select Organization</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
            <Input
              placeholder="Role (e.g., Speaker, Attendee)"
              value={newContact.role}
              onChange={(e) =>
                setNewContact({ ...newContact, role: e.target.value })
              }
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowNewContactForm(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={addNewContact}
              disabled={!newContact.first_name || !newContact.last_name}
            >
              Add Contact
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
