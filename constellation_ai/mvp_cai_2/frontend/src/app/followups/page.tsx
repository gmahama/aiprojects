"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { getFollowUpStatusColor } from "@/lib/utils";
import type { FollowUp, FollowUpStatus, PaginatedResponse } from "@/types";

export default function FollowUpsPage() {
  const { getToken, user } = useAuth();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"my" | "all">("my");
  const [statusFilter, setStatusFilter] = useState<FollowUpStatus | "">("");
  const [isLoading, setIsLoading] = useState(true);

  const pageSize = 25;
  const isManagerOrAdmin = user?.role === "ADMIN" || user?.role === "MANAGER";

  useEffect(() => {
    async function fetchFollowUps() {
      setIsLoading(true);
      try {
        const token = await getToken();
        const params: Record<string, string> = {
          page: page.toString(),
          page_size: pageSize.toString(),
        };
        if (statusFilter) {
          params.status_filter = statusFilter;
        }

        const res =
          viewMode === "my"
            ? ((await api.getMyFollowUps(token, params)) as PaginatedResponse<FollowUp>)
            : ((await api.getFollowUps(token, params)) as PaginatedResponse<FollowUp>);

        setFollowUps(res.items);
        setTotal(res.total);
      } catch (error) {
        console.error("Failed to fetch follow-ups:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchFollowUps();
  }, [getToken, page, viewMode, statusFilter]);

  const handleStatusChange = async (followUpId: string, newStatus: FollowUpStatus) => {
    try {
      const token = await getToken();
      await api.updateFollowUp(token, followUpId, { status: newStatus });
      // Refresh the list
      setFollowUps((prev) =>
        prev.map((f) => (f.id === followUpId ? { ...f, status: newStatus } : f))
      );
    } catch (error) {
      console.error("Failed to update follow-up:", error);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Follow-ups</h1>
          <p className="text-muted-foreground">{total} follow-ups total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          <Button
            variant={viewMode === "my" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setViewMode("my");
              setPage(1);
            }}
          >
            My Follow-ups
          </Button>
          {isManagerOrAdmin && (
            <Button
              variant={viewMode === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setViewMode("all");
                setPage(1);
              }}
            >
              All Follow-ups
            </Button>
          )}
        </div>

        <Select
          value={statusFilter || "__ALL__"}
          onValueChange={(value) => {
            setStatusFilter(value === "__ALL__" ? "" : value as FollowUpStatus);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__ALL__">All Statuses</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Follow-ups List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : followUps.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No follow-ups found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {followUps.map((followUp) => (
            <Card key={followUp.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <Badge
                      className={getFollowUpStatusColor(followUp.status)}
                      variant="secondary"
                    >
                      {followUp.status.replace("_", " ")}
                    </Badge>
                    <div>
                      <p className="font-medium">{followUp.description}</p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        {followUp.assigned_to_name && (
                          <span>Assigned to: {followUp.assigned_to_name}</span>
                        )}
                        {followUp.due_date && <span>Due: {followUp.due_date}</span>}
                      </div>
                      <Link
                        href={`/activities/${followUp.activity_id}`}
                        className="text-sm text-primary-600 hover:underline mt-1 inline-block"
                      >
                        View Activity
                      </Link>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {followUp.status === "OPEN" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleStatusChange(followUp.id, "IN_PROGRESS")
                        }
                      >
                        Start
                      </Button>
                    )}
                    {followUp.status === "IN_PROGRESS" && (
                      <Button
                        size="sm"
                        onClick={() =>
                          handleStatusChange(followUp.id, "COMPLETED")
                        }
                      >
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
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
