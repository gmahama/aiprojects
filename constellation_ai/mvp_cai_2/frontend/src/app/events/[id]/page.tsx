"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Calendar, MapPin, Users, TrendingUp, TrendingDown, Minus, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import {
  formatDateTime,
  getEventTypeColor,
  getClassificationColor,
  formatEventType,
} from "@/lib/utils";
import type { Event } from "@/types";

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { getToken } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchEvent() {
      try {
        const token = await getToken();
        const data = await api.getEvent(token, eventId);
        setEvent(data);
      } catch (error) {
        console.error("Failed to fetch event:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchEvent();
  }, [getToken, eventId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Event not found</p>
        <Link href="/events">
          <Button variant="link">Back to events</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/events">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Badge
              className={getEventTypeColor(event.event_type)}
              variant="secondary"
            >
              {formatEventType(event.event_type)}
            </Badge>
            <h1 className="text-2xl font-bold">{event.name}</h1>
            <Badge
              className={getClassificationColor(event.classification)}
              variant="secondary"
            >
              {event.classification}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-2 text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formatDateTime(event.occurred_at)}
            </span>
            {event.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {event.location}
              </span>
            )}
          </div>
        </div>
        <Button variant="outline">Edit</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {event.description && (
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <ReactMarkdown>{event.description}</ReactMarkdown>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {event.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{event.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Stock Pitches */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Stock Pitches ({event.pitches?.length || 0})
              </CardTitle>
              <Button size="sm">Add Pitch</Button>
            </CardHeader>
            <CardContent>
              {!event.pitches || event.pitches.length === 0 ? (
                <p className="text-muted-foreground text-sm">No pitches recorded</p>
              ) : (
                <div className="space-y-4">
                  {event.pitches.map((pitch) => (
                    <div
                      key={pitch.id}
                      className="p-4 rounded-lg border"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {pitch.is_bullish !== null && (
                            pitch.is_bullish ? (
                              <TrendingUp className="h-5 w-5 text-green-600" />
                            ) : (
                              <TrendingDown className="h-5 w-5 text-red-600" />
                            )
                          )}
                          {pitch.is_bullish === null && (
                            <Minus className="h-5 w-5 text-gray-400" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{pitch.company_name}</span>
                              {pitch.ticker && (
                                <Badge variant="outline" className="text-xs">
                                  {pitch.ticker}
                                </Badge>
                              )}
                            </div>
                            {pitch.pitcher_name && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Pitched by: {pitch.pitcher_name}
                              </p>
                            )}
                          </div>
                        </div>
                        {pitch.is_bullish !== null && (
                          <Badge
                            variant="secondary"
                            className={pitch.is_bullish ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                          >
                            {pitch.is_bullish ? "Bullish" : "Bearish"}
                          </Badge>
                        )}
                      </div>
                      {pitch.thesis && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-md">
                          <p className="text-sm font-medium text-gray-700 mb-1">Thesis:</p>
                          <p className="text-sm">{pitch.thesis}</p>
                        </div>
                      )}
                      {pitch.notes && (
                        <p className="text-sm text-muted-foreground mt-2">{pitch.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Attendees */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Attendees ({event.attendees?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!event.attendees || event.attendees.length === 0 ? (
                <p className="text-muted-foreground text-sm">No attendees</p>
              ) : (
                <div className="space-y-3">
                  {event.attendees.map((attendee) => (
                    <Link
                      key={attendee.contact_id}
                      href={`/contacts/${attendee.contact_id}`}
                      className="block"
                    >
                      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-primary-600 font-semibold text-xs">
                            {attendee.first_name[0]}
                            {attendee.last_name[0]}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {attendee.first_name} {attendee.last_name}
                          </p>
                          {attendee.organization_name && (
                            <p className="text-xs text-muted-foreground">
                              {attendee.organization_name}
                            </p>
                          )}
                          {attendee.role && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {attendee.role}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag) => (
                    <Badge key={tag.id} variant="secondary">
                      {tag.value}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Version History */}
          {event.versions && event.versions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Version History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {event.versions.map((version) => (
                    <div
                      key={version.id}
                      className="text-sm p-2 rounded-lg border"
                    >
                      <p className="font-medium">Version {version.version_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(version.changed_at)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
