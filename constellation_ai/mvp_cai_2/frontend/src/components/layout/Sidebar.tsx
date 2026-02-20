"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  Calendar,
  CalendarDays,
  GitBranch,
  CheckSquare,
  Search,
  Settings,
  Tags,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Organizations", href: "/organizations", icon: Building2 },
  { name: "Activities", href: "/activities", icon: Calendar },
  { name: "Events", href: "/events", icon: CalendarDays },
  { name: "Pipeline", href: "/pipeline", icon: GitBranch },
  { name: "Follow-ups", href: "/followups", icon: CheckSquare },
  { name: "Search", href: "/search", icon: Search },
];

const adminNavigation = [
  { name: "Tags", href: "/admin/tags", icon: Tags },
  { name: "Audit Log", href: "/admin/audit", icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  return (
    <div className="flex h-full w-64 flex-col bg-primary-900 text-white">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-primary-800">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
            <span className="text-lg font-bold">C</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold">Constellation AI</h1>
            <p className="text-xs text-primary-300">v0.1</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary-800 text-white"
                    : "text-primary-200 hover:bg-primary-800 hover:text-white"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Admin Section */}
        {isAdmin && (
          <div className="pt-6">
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-primary-400">
              Admin
            </p>
            <div className="mt-2 space-y-1">
              {adminNavigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary-800 text-white"
                        : "text-primary-200 hover:bg-primary-800 hover:text-white"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* User Info */}
      {user && (
        <div className="border-t border-primary-800 p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary-700 flex items-center justify-center text-sm font-medium">
              {user.display_name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.display_name}</p>
              <p className="text-xs text-primary-400 truncate">{user.role}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
