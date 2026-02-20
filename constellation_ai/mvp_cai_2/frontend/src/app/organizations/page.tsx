"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { getClassificationColor } from "@/lib/utils";
import type { Organization, PaginatedResponse } from "@/types";

export default function OrganizationsPage() {
  const { getToken } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [orgType, setOrgType] = useState("");

  const pageSize = 25;

  useEffect(() => {
    async function fetchOrganizations() {
      setIsLoading(true);
      try {
        const token = await getToken();
        const params: Record<string, string> = {
          page: page.toString(),
          page_size: pageSize.toString(),
        };
        if (search) {
          params.search = search;
        }
        if (orgType) {
          params.org_type = orgType;
        }
        const res = (await api.getOrganizations(token, params)) as PaginatedResponse<Organization>;
        setOrganizations(res.items);
        setTotal(res.total);
      } catch (error) {
        console.error("Failed to fetch organizations:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrganizations();
  }, [getToken, page, search, orgType]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
          <p className="text-muted-foreground">{total} organizations total</p>
        </div>
        <Link href="/organizations/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Organization
          </Button>
        </Link>
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search organizations..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
        <Select
          value={orgType || "__ALL__"}
          onValueChange={(value) => {
            setOrgType(value === "__ALL__" ? "" : value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__ALL__">All Types</SelectItem>
            <SelectItem value="ASSET_MANAGER">Asset Manager</SelectItem>
            <SelectItem value="BROKER">Broker</SelectItem>
            <SelectItem value="CONSULTANT">Consultant</SelectItem>
            <SelectItem value="CORPORATE">Corporate</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>
        {orgType && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setOrgType("");
              setPage(1);
            }}
          >
            Clear filter
          </Button>
        )}
      </div>

      {/* Organizations List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : organizations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No organizations found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {organizations.map((org) => (
            <Link key={org.id} href={`/organizations/${org.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{org.name}</h3>
                      {org.short_name && (
                        <p className="text-sm text-muted-foreground">
                          ({org.short_name})
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      {org.org_type && (
                        <Badge variant="outline">{org.org_type.replace("_", " ")}</Badge>
                      )}
                      <Badge
                        className={getClassificationColor(org.classification)}
                        variant="secondary"
                      >
                        {org.classification}
                      </Badge>
                    </div>
                  </div>
                  {org.website && (
                    <p className="mt-2 text-sm text-muted-foreground flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      {org.website}
                    </p>
                  )}
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
