"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Globe, Pencil, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { getClassificationColor } from "@/lib/utils";
import type { Organization } from "@/types";

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;
  const { getToken } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    try {
      setIsDeleting(true);
      setDeleteError(null);
      const token = await getToken();
      await api.deleteOrganization(token, orgId);
      router.push("/organizations");
    } catch (error) {
      console.error("Failed to delete organization:", error);
      setDeleteError(error instanceof Error ? error.message : "Failed to delete organization");
      setIsDeleting(false);
    }
  }

  useEffect(() => {
    async function fetchOrganization() {
      try {
        const token = await getToken();
        const data = await api.getOrganization(token, orgId);
        setOrganization(data);
      } catch (error) {
        console.error("Failed to fetch organization:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrganization();
  }, [getToken, orgId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Organization not found</p>
        <Link href="/organizations">
          <Button variant="link">Back to organizations</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/organizations">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{organization.name}</h1>
            {organization.short_name && (
              <span className="text-muted-foreground">
                ({organization.short_name})
              </span>
            )}
            <Badge
              className={getClassificationColor(organization.classification)}
              variant="secondary"
            >
              {organization.classification}
            </Badge>
          </div>
          {organization.org_type && (
            <Badge variant="outline" className="mt-1">
              {organization.org_type.replace("_", " ")}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/organizations/${orgId}/edit`}>
            <Button variant="outline">
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeleting}>
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {organization.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently remove this organization from the system.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {deleteError && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {deleteError}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Organization Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {organization.website && (
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={organization.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:underline"
                  >
                    {organization.website}
                  </a>
                </div>
              )}
              {organization.owner && (
                <div>
                  <p className="text-sm text-muted-foreground">Owner</p>
                  <p className="font-medium">{organization.owner.display_name}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          {organization.tags && organization.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {organization.tags.map((tag) => (
                    <Badge key={tag.id} variant="secondary">
                      {tag.value}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {organization.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{organization.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Contacts */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Contacts ({organization.contacts?.length || 0})
              </CardTitle>
              <Link href={`/contacts?organization=${orgId}`}>
                <Button size="sm" variant="outline">
                  View all
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {!organization.contacts || organization.contacts.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No contacts at this organization
                </p>
              ) : (
                <div className="space-y-3">
                  {organization.contacts.map((contact) => (
                    <Link
                      key={contact.id}
                      href={`/contacts/${contact.id}`}
                      className="block"
                    >
                      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-primary-600 font-semibold text-sm">
                            {contact.first_name[0]}
                            {contact.last_name[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">
                            {contact.first_name} {contact.last_name}
                          </p>
                          {contact.title && (
                            <p className="text-sm text-muted-foreground">
                              {contact.title}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
