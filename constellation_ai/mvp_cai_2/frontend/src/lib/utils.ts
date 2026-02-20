import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  return format(parseISO(dateString), "MMM d, yyyy");
}

export function formatDateTime(dateString: string): string {
  return format(parseISO(dateString), "MMM d, yyyy h:mm a");
}

export function formatRelativeTime(dateString: string): string {
  return formatDistanceToNow(parseISO(dateString), { addSuffix: true });
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return "Unknown size";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export function getActivityTypeColor(type: string): string {
  const colors: Record<string, string> = {
    MEETING: "bg-blue-100 text-blue-800",
    CALL: "bg-green-100 text-green-800",
    EMAIL: "bg-purple-100 text-purple-800",
    NOTE: "bg-yellow-100 text-yellow-800",
    LLM_INTERACTION: "bg-pink-100 text-pink-800",
    SLACK_NOTE: "bg-orange-100 text-orange-800",
  };
  return colors[type] || "bg-gray-100 text-gray-800";
}

export function getClassificationColor(classification: string): string {
  const colors: Record<string, string> = {
    INTERNAL: "bg-green-100 text-green-800",
    CONFIDENTIAL: "bg-yellow-100 text-yellow-800",
    RESTRICTED: "bg-red-100 text-red-800",
  };
  return colors[classification] || "bg-gray-100 text-gray-800";
}

export function getFollowUpStatusColor(status: string): string {
  const colors: Record<string, string> = {
    OPEN: "bg-blue-100 text-blue-800",
    IN_PROGRESS: "bg-yellow-100 text-yellow-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-gray-100 text-gray-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

export function getEventTypeColor(type: string): string {
  const colors: Record<string, string> = {
    RETREAT: "bg-indigo-100 text-indigo-800",
    DINNER: "bg-purple-100 text-purple-800",
    LUNCH: "bg-green-100 text-green-800",
    OTHER: "bg-gray-100 text-gray-800",
  };
  return colors[type] || "bg-gray-100 text-gray-800";
}

export function formatEventType(type: string): string {
  const labels: Record<string, string> = {
    RETREAT: "Retreat",
    DINNER: "Dinner",
    LUNCH: "Lunch",
    OTHER: "Other",
  };
  return labels[type] || type;
}

export function getPipelineStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ACTIVE: "bg-blue-100 text-blue-800",
    BACK_BURNER: "bg-yellow-100 text-yellow-800",
    PASSED: "bg-gray-100 text-gray-800",
    CONVERTED: "bg-green-100 text-green-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

export function getPipelineStageColor(stage: number): string {
  const colors: Record<number, string> = {
    1: "bg-sky-100 text-sky-800",
    2: "bg-blue-100 text-blue-800",
    3: "bg-blue-200 text-blue-900",
    4: "bg-indigo-100 text-indigo-800",
    5: "bg-indigo-200 text-indigo-900",
    6: "bg-violet-100 text-violet-800",
  };
  return colors[stage] || "bg-gray-100 text-gray-800";
}

export function formatPipelineStatus(status: string): string {
  const labels: Record<string, string> = {
    ACTIVE: "Active",
    BACK_BURNER: "Back Burner",
    PASSED: "Passed",
    CONVERTED: "Converted",
  };
  return labels[status] || status;
}
