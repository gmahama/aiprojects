"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, Building2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import {
  formatDateTime,
  getClassificationColor,
  getActivityTypeColor,
} from "@/lib/utils";
import type { Contact } from "@/types";

export default function ContactDetailPage() {
  const params = useParams();
  const contactId = params.id as string;
  const { getToken } = useAuth();
  const [contact, setContact] = useState<Contact | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchContact() {
      try {
        const token = await getToken();
        const data = await api.getContact(token, contactId);
        setContact(data);
      } catch (error) {
        console.error("Failed to fetch contact:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchContact();
  }, [getToken, contactId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Contact not found</p>
        <Link href="/contacts">
          <Button variant="link">Back to contacts</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/contacts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">
              {contact.first_name} {contact.last_name}
            </h1>
            <Badge
              className={getClassificationColor(contact.classification)}
              variant="secondary"
            >
              {contact.classification}
            </Badge>
          </div>
          {contact.title && (
            <p className="text-muted-foreground">{contact.title}</p>
          )}
        </div>
        <Button variant="outline">Edit</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contact Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contact.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-primary-600 hover:underline"
                  >
                    {contact.email}
                  </a>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`tel:${contact.phone}`}
                    className="text-primary-600 hover:underline"
                  >
                    {contact.phone}
                  </a>
                </div>
              )}
              {contact.organization && (
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <Link
                    href={`/organizations/${contact.organization.id}`}
                    className="text-primary-600 hover:underline"
                  >
                    {contact.organization.name}
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          {contact.tags && contact.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {contact.tags.map((tag) => (
                    <Badge key={tag.id} variant="secondary">
                      {tag.value}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {contact.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Activity Timeline */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Activities</CardTitle>
              <Link href={`/activities/new?contact=${contactId}`}>
                <Button size="sm">Log Activity</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {!contact.recent_activities ||
              contact.recent_activities.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No activities recorded
                </p>
              ) : (
                <div className="space-y-4">
                  {contact.recent_activities.map((activity) => (
                    <Link
                      key={activity.id}
                      href={`/activities/${activity.id}`}
                      className="block"
                    >
                      <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border">
                        <Badge
                          className={getActivityTypeColor(activity.activity_type)}
                          variant="secondary"
                        >
                          {activity.activity_type}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{activity.title}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDateTime(activity.occurred_at)}
                          </p>
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
