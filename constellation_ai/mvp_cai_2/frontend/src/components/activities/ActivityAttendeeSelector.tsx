"use client";

import { useState, useEffect, useRef } from "react";
import { X, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import type { Contact, PaginatedResponse } from "@/types";

interface AttendeeEntry {
  contact_id: string;
  role?: string;
}

interface ActivityAttendeeSelectorProps {
  attendees: AttendeeEntry[];
  onChange: (attendees: AttendeeEntry[]) => void;
}

interface ContactOption {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  organization_name: string | null;
}

export function ActivityAttendeeSelector({ attendees, onChange }: ActivityAttendeeSelectorProps) {
  const { getToken } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ContactOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<Map<string, ContactOption>>(new Map());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const token = await getToken();
        const res = (await api.getContacts(token, {
          search: searchQuery,
          page_size: "10",
        })) as PaginatedResponse<Contact>;

        const options: ContactOption[] = res.items
          .filter((c) => !attendees.some((a) => a.contact_id === c.id))
          .map((c) => ({
            id: c.id,
            first_name: c.first_name,
            last_name: c.last_name,
            email: c.email,
            organization_name: c.organization?.name || null,
          }));

        setSearchResults(options);
        setShowDropdown(true);
      } catch (error) {
        console.error("Failed to search contacts:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, getToken, attendees]);

  const addAttendee = (contact: ContactOption) => {
    const updated = new Map(selectedContacts);
    updated.set(contact.id, contact);
    setSelectedContacts(updated);
    onChange([...attendees, { contact_id: contact.id, role: "ATTENDEE" }]);
    setSearchQuery("");
    setShowDropdown(false);
  };

  const removeAttendee = (contactId: string) => {
    const updated = new Map(selectedContacts);
    updated.delete(contactId);
    setSelectedContacts(updated);
    onChange(attendees.filter((a) => a.contact_id !== contactId));
  };

  const updateRole = (contactId: string, role: string) => {
    onChange(
      attendees.map((a) =>
        a.contact_id === contactId ? { ...a, role } : a
      )
    );
  };

  return (
    <div className="space-y-3">
      {/* Selected attendees */}
      {attendees.length > 0 && (
        <div className="space-y-2">
          {attendees.map((attendee) => {
            const contact = selectedContacts.get(attendee.contact_id);
            return (
              <div
                key={attendee.contact_id}
                className="flex items-center gap-2 p-2 rounded-lg border bg-gray-50"
              >
                <div className="h-7 w-7 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                  <span className="text-primary-600 font-semibold text-xs">
                    {contact ? `${contact.first_name[0]}${contact.last_name[0]}` : "??"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {contact
                      ? `${contact.first_name} ${contact.last_name}`
                      : attendee.contact_id.slice(0, 8)}
                  </p>
                  {contact?.organization_name && (
                    <p className="text-xs text-muted-foreground truncate">
                      {contact.organization_name}
                    </p>
                  )}
                </div>
                <Select
                  value={attendee.role || "ATTENDEE"}
                  onValueChange={(value) => updateRole(attendee.contact_id, value)}
                >
                  <SelectTrigger className="w-[130px] h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ATTENDEE">Attendee</SelectItem>
                    <SelectItem value="ORGANIZER">Organizer</SelectItem>
                    <SelectItem value="PRESENTER">Presenter</SelectItem>
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  onClick={() => removeAttendee(attendee.contact_id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Search */}
      <div className="relative" ref={dropdownRef}>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search contacts to add..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchQuery.trim() && setShowDropdown(true)}
          className="pl-9"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {showDropdown && searchResults.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
            {searchResults.map((contact) => (
              <button
                key={contact.id}
                type="button"
                onClick={() => addAttendee(contact)}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="h-7 w-7 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                  <span className="text-primary-600 font-semibold text-xs">
                    {contact.first_name[0]}
                    {contact.last_name[0]}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {contact.first_name} {contact.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[contact.organization_name, contact.email]
                      .filter(Boolean)
                      .join(" - ")}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {showDropdown && searchQuery.trim() && !isSearching && searchResults.length === 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg p-3 text-sm text-muted-foreground">
            No contacts found
          </div>
        )}
      </div>

      {attendees.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Search by name to add attendees to this activity.
        </p>
      )}
    </div>
  );
}
