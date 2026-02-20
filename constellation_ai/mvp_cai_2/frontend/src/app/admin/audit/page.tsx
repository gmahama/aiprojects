"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type { AuditEntry, AuditAction, PaginatedResponse } from "@/types";

export default function AuditLogPage() {
  const { getToken, user } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<AuditAction | "">("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const pageSize = 50;
  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    if (!isAdmin) return;

    async function fetchAuditLog() {
      setIsLoading(true);
      try {
        const token = await getToken();
        const params: Record<string, string> = {
          page: page.toString(),
          page_size: pageSize.toString(),
        };
        if (actionFilter) {
          params.action = actionFilter;
        }
        if (entityTypeFilter) {
          params.entity_type = entityTypeFilter;
        }

        const res = (await api.getAuditLog(token, params)) as PaginatedResponse<AuditEntry>;
        setEntries(res.items);
        setTotal(res.total);
      } catch (error) {
        console.error("Failed to fetch audit log:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAuditLog();
  }, [getToken, page, actionFilter, entityTypeFilter, isAdmin]);

  const getActionColor = (action: AuditAction) => {
    const colors: Record<AuditAction, string> = {
      CREATE: "bg-green-100 text-green-800",
      READ: "bg-blue-100 text-blue-800",
      UPDATE: "bg-yellow-100 text-yellow-800",
      DELETE: "bg-red-100 text-red-800",
    };
    return colors[action] || "bg-gray-100 text-gray-800";
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          You do not have permission to access this page.
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-muted-foreground">
          View all actions performed in the system.
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select
          value={actionFilter || "__ALL__"}
          onValueChange={(value) => {
            setActionFilter(value === "__ALL__" ? "" : value as AuditAction);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__ALL__">All Actions</SelectItem>
            <SelectItem value="CREATE">Create</SelectItem>
            <SelectItem value="READ">Read</SelectItem>
            <SelectItem value="UPDATE">Update</SelectItem>
            <SelectItem value="DELETE">Delete</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={entityTypeFilter || "__ALL__"}
          onValueChange={(value) => {
            setEntityTypeFilter(value === "__ALL__" ? "" : value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Entity Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__ALL__">All Entity Types</SelectItem>
            <SelectItem value="contact">Contact</SelectItem>
            <SelectItem value="organization">Organization</SelectItem>
            <SelectItem value="activity">Activity</SelectItem>
            <SelectItem value="attachment">Attachment</SelectItem>
            <SelectItem value="followup">Follow-up</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Audit Log */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No audit entries found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <p className="text-muted-foreground">{total} entries total</p>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Entity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      {formatDateTime(entry.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={getActionColor(entry.action)} variant="secondary">
                        {entry.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="capitalize">{entry.entity_type}</span>
                      <br />
                      <span className="text-xs text-muted-foreground font-mono">
                        {entry.entity_id.slice(0, 8)}...
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {entry.user_id ? (
                        <span className="font-mono text-xs">
                          {entry.user_id.slice(0, 8)}...
                        </span>
                      ) : (
                        <span className="text-muted-foreground">System</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">
                      {entry.ip_address || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
