"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import type { Classification, Organization, PaginatedResponse, Contact } from "@/types";

export default function EditContactPage() {
  const router = useRouter();
  const params = useParams();
  const contactId = params.id as string;
  const { getToken } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    title: "",
    organization_id: "",
    classification: "INTERNAL" as Classification,
    notes: "",
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const token = await getToken();

        const [contactData, orgsRes] = await Promise.all([
          api.getContact(token, contactId) as Promise<Contact>,
          api.getOrganizations(token, { page_size: "100" }) as Promise<PaginatedResponse<Organization>>,
        ]);

        setOrganizations(orgsRes.items);

        setFormData({
          first_name: contactData.first_name ?? "",
          last_name: contactData.last_name ?? "",
          email: contactData.email ?? "",
          phone: contactData.phone ?? "",
          title: contactData.title ?? "",
          organization_id: contactData.organization_id ?? "",
          classification: contactData.classification ?? "INTERNAL",
          notes: contactData.notes ?? "",
        });
      } catch (err) {
        console.error("Failed to fetch contact:", err);
        setError("Failed to load contact data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [getToken, contactId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const token = await getToken();
      await api.updateContact(token, contactId, {
        ...formData,
        organization_id: formData.organization_id || undefined,
      });
      router.push(`/contacts/${contactId}`);
    } catch (err) {
      setError("Failed to update contact. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/contacts/${contactId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Edit Contact</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Contact Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {error}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input
                  required
                  value={formData.first_name}
                  onChange={(e) =>
                    setFormData({ ...formData, first_name: e.target.value })
                  }
                  placeholder="First name"
                />
              </div>

              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input
                  required
                  value={formData.last_name}
                  onChange={(e) =>
                    setFormData({ ...formData, last_name: e.target.value })
                  }
                  placeholder="Last name"
                />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="email@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="Phone number"
                />
              </div>

              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Job title"
                />
              </div>

              <div className="space-y-2">
                <Label>Organization</Label>
                <Select
                  value={formData.organization_id || "__NONE__"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, organization_id: value === "__NONE__" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Organization" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__NONE__">Select Organization</SelectItem>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Classification</Label>
                <Select
                  value={formData.classification}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      classification: value as Classification,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Classification" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INTERNAL">Internal</SelectItem>
                    <SelectItem value="CONFIDENTIAL">Confidential</SelectItem>
                    <SelectItem value="RESTRICTED">Restricted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Additional notes"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Link href={`/contacts/${contactId}`}>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
