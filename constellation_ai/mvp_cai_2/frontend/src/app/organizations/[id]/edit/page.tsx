"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import type { Classification, OrgType, Organization } from "@/types";

export default function EditOrganizationPage() {
  const params = useParams();
  const orgId = params.id as string;
  const router = useRouter();
  const { getToken } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    short_name: "",
    org_type: "" as OrgType | "",
    website: "",
    classification: "INTERNAL" as Classification,
    notes: "",
  });

  useEffect(() => {
    async function fetchOrganization() {
      try {
        const token = await getToken();
        const data: Organization = await api.getOrganization(token, orgId);
        setFormData({
          name: data.name,
          short_name: data.short_name || "",
          org_type: data.org_type || "",
          website: data.website || "",
          classification: data.classification,
          notes: data.notes || "",
        });
      } catch (err) {
        console.error("Failed to fetch organization:", err);
        setError("Failed to load organization data.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrganization();
  }, [getToken, orgId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const token = await getToken();
      await api.updateOrganization(token, orgId, {
        ...formData,
        org_type: formData.org_type || undefined,
      });
      router.push(`/organizations/${orgId}`);
    } catch (err) {
      setError("Failed to update organization. Please try again.");
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
        <Link href={`/organizations/${orgId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Edit Organization</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {error}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Organization Name *</Label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Organization name"
                />
              </div>

              <div className="space-y-2">
                <Label>Short Name</Label>
                <Input
                  value={formData.short_name}
                  onChange={(e) =>
                    setFormData({ ...formData, short_name: e.target.value })
                  }
                  placeholder="Abbreviation or short name"
                />
              </div>

              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.org_type || "__NONE__"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      org_type: (value === "__NONE__" ? "" : value) as OrgType | "",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__NONE__">Select Type</SelectItem>
                    <SelectItem value="ASSET_MANAGER">Asset Manager</SelectItem>
                    <SelectItem value="BROKER">Broker</SelectItem>
                    <SelectItem value="CONSULTANT">Consultant</SelectItem>
                    <SelectItem value="CORPORATE">Corporate</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Website</Label>
                <Input
                  type="url"
                  value={formData.website}
                  onChange={(e) =>
                    setFormData({ ...formData, website: e.target.value })
                  }
                  placeholder="https://example.com"
                />
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
              <Link href={`/organizations/${orgId}`}>
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
