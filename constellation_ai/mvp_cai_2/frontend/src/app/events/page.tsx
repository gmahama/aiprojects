"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Calendar, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { formatDateTime, getEventTypeColor, getClassificationColor, formatEventType } from "@/lib/utils";
import type { Event, PaginatedResponse, EventType } from "@/types";

export default function EventsPage() {
  const { getToken } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [eventTypeFilter, setEventTypeFilter] = useState<EventType | "">("");

  const pageSize = 25;

  useEffect(() => {
    async function fetchEvents() {
      setIsLoading(true);
      try {
        const token = await getToken();
        const params: Record<string, string> = {
          page: page.toString(),
          page_size: pageSize.toString(),
        };
        if (eventTypeFilter) {
          params.event_type = eventTypeFilter;
        }
        const res = (await api.getEvents(token, params)) as PaginatedResponse<Event>;
        setEvents(res.items);
        setTotal(res.total);
      } catch (error) {
        console.error("Failed to fetch events:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchEvents();
  }, [getToken, page, eventTypeFilter]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="text-muted-foreground">{total} events total</p>
        </div>
        <Link href="/events/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Event
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Event Type</label>
          <select
            value={eventTypeFilter}
            onChange={(e) => {
              setEventTypeFilter(e.target.value as EventType | "");
              setPage(1);
            }}
            className="flex h-10 w-48 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">All Types</option>
            <option value="RETREAT">Retreat</option>
            <option value="DINNER">Dinner</option>
            <option value="LUNCH">Lunch</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      {/* Events List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No events found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <Link key={event.id} href={`/events/${event.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <Badge
                        className={getEventTypeColor(event.event_type)}
                        variant="secondary"
                      >
                        {formatEventType(event.event_type)}
                      </Badge>
                      <div>
                        <h3 className="font-semibold">{event.name}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3" />
                          {formatDateTime(event.occurred_at)}
                        </p>
                        {event.location && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge
                      className={getClassificationColor(event.classification)}
                      variant="secondary"
                    >
                      {event.classification}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
