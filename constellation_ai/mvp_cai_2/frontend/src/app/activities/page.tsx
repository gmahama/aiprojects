"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Calendar, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { formatDateTime, getActivityTypeColor, getClassificationColor } from "@/lib/utils";
import type { Activity, PaginatedResponse } from "@/types";

export default function ActivitiesPage() {
  const { getToken } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [activityType, setActivityType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const pageSize = 25;

  useEffect(() => {
    async function fetchActivities() {
      setIsLoading(true);
      try {
        const token = await getToken();
        const params: Record<string, string> = {
          page: page.toString(),
          page_size: pageSize.toString(),
        };
        if (activityType) {
          params.activity_type = activityType;
        }
        if (fromDate) {
          params.from_date = fromDate;
        }
        if (toDate) {
          params.to_date = toDate;
        }
        const res = (await api.getActivities(token, params)) as PaginatedResponse<Activity>;
        setActivities(res.items);
        setTotal(res.total);
      } catch (error) {
        console.error("Failed to fetch activities:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchActivities();
  }, [getToken, page, activityType, fromDate, toDate]);

  const totalPages = Math.ceil(total / pageSize);

  const clearFilters = () => {
    setActivityType("");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const hasFilters = activityType || fromDate || toDate;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activities</h1>
          <p className="text-muted-foreground">{total} activities total</p>
        </div>
        <Link href="/activities/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Activity
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Type</label>
          <Select
            value={activityType || "__ALL__"}
            onValueChange={(value) => {
              setActivityType(value === "__ALL__" ? "" : value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__ALL__">All Types</SelectItem>
              <SelectItem value="MEETING">Meeting</SelectItem>
              <SelectItem value="CALL">Call</SelectItem>
              <SelectItem value="EMAIL">Email</SelectItem>
              <SelectItem value="NOTE">Note</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">From</label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            className="w-[160px]"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">To</label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            className="w-[160px]"
          />
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Activities List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activities.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No activities found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <Link key={activity.id} href={`/activities/${activity.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <Badge
                        className={getActivityTypeColor(activity.activity_type)}
                        variant="secondary"
                      >
                        {activity.activity_type}
                      </Badge>
                      <div>
                        <h3 className="font-semibold">{activity.title}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3" />
                          {formatDateTime(activity.occurred_at)}
                        </p>
                        {activity.location && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {activity.location}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge
                      className={getClassificationColor(activity.classification)}
                      variant="secondary"
                    >
                      {activity.classification}
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
