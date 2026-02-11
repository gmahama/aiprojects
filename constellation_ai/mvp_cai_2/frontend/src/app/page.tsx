"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Users, Building2, Calendar, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { formatRelativeTime, getActivityTypeColor, getFollowUpStatusColor } from "@/lib/utils";
import type { Activity, FollowUp, PaginatedResponse } from "@/types";

export default function DashboardPage() {
  const { user, getToken } = useAuth();
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [myFollowUps, setMyFollowUps] = useState<FollowUp[]>([]);
  const [stats, setStats] = useState({
    contacts: 0,
    organizations: 0,
    activities: 0,
    openFollowUps: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const token = await getToken();

        // Fetch recent activities
        const activitiesRes = await api.getActivities(token, {
          page: "1",
          page_size: "5",
        }) as PaginatedResponse<Activity>;
        setRecentActivities(activitiesRes.items);

        // Fetch my follow-ups
        const followUpsRes = await api.getMyFollowUps(token, {
          page: "1",
          page_size: "5",
        }) as PaginatedResponse<FollowUp>;
        setMyFollowUps(followUpsRes.items);

        // Fetch stats
        const [contactsRes, orgsRes] = await Promise.all([
          api.getContacts(token, { page: "1", page_size: "1" }),
          api.getOrganizations(token, { page: "1", page_size: "1" }),
        ]);

        setStats({
          contacts: contactsRes.total,
          organizations: orgsRes.total,
          activities: activitiesRes.total,
          openFollowUps: followUpsRes.total,
        });
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, [getToken]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.display_name?.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s what&apos;s happening with your CRM today.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/activities/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Meeting
            </Button>
          </Link>
          <Link href="/contacts?new=true">
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              New Contact
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Contacts
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.contacts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Organizations
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.organizations}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Activities
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activities}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open Follow-ups
            </CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openFollowUps}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities & Follow-ups */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activities */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Activities</CardTitle>
            <Link href="/activities">
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <p className="text-muted-foreground text-sm">No recent activities</p>
            ) : (
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <Link
                    key={activity.id}
                    href={`/activities/${activity.id}`}
                    className="block"
                  >
                    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <Badge
                        className={getActivityTypeColor(activity.activity_type)}
                        variant="secondary"
                      >
                        {activity.activity_type}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{activity.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatRelativeTime(activity.occurred_at)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Follow-ups */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>My Follow-ups</CardTitle>
            <Link href="/followups">
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {myFollowUps.length === 0 ? (
              <p className="text-muted-foreground text-sm">No open follow-ups</p>
            ) : (
              <div className="space-y-4">
                {myFollowUps.map((followUp) => (
                  <Link
                    key={followUp.id}
                    href={`/activities/${followUp.activity_id}`}
                    className="block"
                  >
                    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <Badge
                        className={getFollowUpStatusColor(followUp.status)}
                        variant="secondary"
                      >
                        {followUp.status}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{followUp.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {followUp.due_date
                            ? `Due: ${followUp.due_date}`
                            : "No due date"}
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
  );
}
