"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Calendar, MapPin, Users, Paperclip, CheckSquare, History, Pencil, Trash2, Plus, Upload, Download, Play, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import {
  formatDateTime,
  formatFileSize,
  getActivityTypeColor,
  getClassificationColor,
  getFollowUpStatusColor,
} from "@/lib/utils";
import type { Activity, User, PaginatedResponse, FollowUpStatus } from "@/types";

const ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-outlook",
];

const ALLOWED_EXTENSIONS = [".pdf", ".ppt", ".pptx", ".xls", ".xlsx", ".msg"];

export default function ActivityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const activityId = params.id as string;
  const { getToken } = useAuth();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Follow-up dialog state
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false);
  const [fuDescription, setFuDescription] = useState("");
  const [fuAssignedTo, setFuAssignedTo] = useState("");
  const [fuDueDate, setFuDueDate] = useState("");
  const [fuSubmitting, setFuSubmitting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  // Attachment upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Follow-up status update
  const [updatingFollowUpId, setUpdatingFollowUpId] = useState<string | null>(null);

  async function fetchActivity() {
    try {
      const token = await getToken();
      const data = await api.getActivity(token, activityId);
      setActivity(data);
    } catch (error) {
      console.error("Failed to fetch activity:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    try {
      setIsDeleting(true);
      setDeleteError(null);
      const token = await getToken();
      await api.deleteActivity(token, activityId);
      router.push("/activities");
    } catch (error) {
      console.error("Failed to delete activity:", error);
      setDeleteError(error instanceof Error ? error.message : "Failed to delete activity");
      setIsDeleting(false);
    }
  }

  useEffect(() => {
    fetchActivity();
  }, [getToken, activityId]);

  // Fetch users for follow-up assignment
  useEffect(() => {
    async function fetchUsers() {
      try {
        const token = await getToken();
        const res = (await api.getUsers(token)) as PaginatedResponse<User>;
        setUsers(res.items);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    }
    fetchUsers();
  }, [getToken]);

  // Follow-up creation
  const handleCreateFollowUp = async () => {
    if (!fuDescription.trim()) return;
    setFuSubmitting(true);
    try {
      const token = await getToken();
      const data: Record<string, unknown> = { description: fuDescription.trim() };
      if (fuAssignedTo && fuAssignedTo !== "__NONE__") {
        data.assigned_to = fuAssignedTo;
      }
      if (fuDueDate) {
        data.due_date = fuDueDate;
      }
      await api.createFollowUp(token, activityId, data);
      setShowFollowUpDialog(false);
      setFuDescription("");
      setFuAssignedTo("");
      setFuDueDate("");
      await fetchActivity();
    } catch (error) {
      console.error("Failed to create follow-up:", error);
    } finally {
      setFuSubmitting(false);
    }
  };

  // Follow-up status update
  const handleUpdateFollowUpStatus = async (followUpId: string, newStatus: FollowUpStatus) => {
    setUpdatingFollowUpId(followUpId);
    try {
      const token = await getToken();
      await api.updateFollowUp(token, followUpId, { status: newStatus });
      await fetchActivity();
    } catch (error) {
      console.error("Failed to update follow-up:", error);
    } finally {
      setUpdatingFollowUpId(null);
    }
  };

  // Attachment upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);

    // Validate file types
    const invalidFiles = fileArray.filter((f) => {
      const ext = "." + f.name.split(".").pop()?.toLowerCase();
      return !ALLOWED_EXTENSIONS.includes(ext);
    });

    if (invalidFiles.length > 0) {
      setUploadError(
        `Invalid file type(s): ${invalidFiles.map((f) => f.name).join(", ")}. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    try {
      const token = await getToken();
      await api.uploadAttachments(token, activityId, fileArray);
      await fetchActivity();
    } catch (error) {
      console.error("Failed to upload attachments:", error);
      setUploadError("Failed to upload. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Authenticated download
  const handleDownload = async (attachmentId: string, filename: string) => {
    try {
      const token = await getToken();
      await api.downloadAttachment(token, attachmentId, filename);
    } catch (error) {
      console.error("Failed to download attachment:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Activity not found</p>
        <Link href="/activities">
          <Button variant="link">Back to activities</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/activities">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Badge
              className={getActivityTypeColor(activity.activity_type)}
              variant="secondary"
            >
              {activity.activity_type}
            </Badge>
            <h1 className="text-2xl font-bold">{activity.title}</h1>
            <Badge
              className={getClassificationColor(activity.classification)}
              variant="secondary"
            >
              {activity.classification}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-2 text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formatDateTime(activity.occurred_at)}
            </span>
            {activity.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {activity.location}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/activities/${activityId}/edit`}>
            <Button variant="outline">
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeleting}>
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {activity.title}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently remove this activity from the system.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {deleteError && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {deleteError}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary */}
          {activity.summary && (
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <ReactMarkdown>{activity.summary}</ReactMarkdown>
              </CardContent>
            </Card>
          )}

          {/* Key Points */}
          {activity.key_points && (
            <Card>
              <CardHeader>
                <CardTitle>Key Points</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <ReactMarkdown>{activity.key_points}</ReactMarkdown>
              </CardContent>
            </Card>
          )}

          {/* Description */}
          {activity.description && (
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{activity.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Follow-ups */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                Follow-ups ({activity.followups?.length || 0})
              </CardTitle>
              <Button size="sm" onClick={() => setShowFollowUpDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Follow-up
              </Button>
            </CardHeader>
            <CardContent>
              {!activity.followups || activity.followups.length === 0 ? (
                <p className="text-muted-foreground text-sm">No follow-ups</p>
              ) : (
                <div className="space-y-3">
                  {activity.followups.map((followup) => (
                    <div
                      key={followup.id}
                      className="flex items-start gap-3 p-3 rounded-lg border"
                    >
                      <Badge
                        className={getFollowUpStatusColor(followup.status)}
                        variant="secondary"
                      >
                        {followup.status}
                      </Badge>
                      <div className="flex-1">
                        <p className="font-medium">{followup.description}</p>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          {followup.assigned_to_name && (
                            <span>Assigned to: {followup.assigned_to_name}</span>
                          )}
                          {followup.due_date && (
                            <span>Due: {followup.due_date}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {followup.status === "OPEN" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={updatingFollowUpId === followup.id}
                            onClick={() => handleUpdateFollowUpStatus(followup.id, "IN_PROGRESS")}
                            title="Start"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        {followup.status === "IN_PROGRESS" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={updatingFollowUpId === followup.id}
                            onClick={() => handleUpdateFollowUpStatus(followup.id, "COMPLETED")}
                            title="Complete"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
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
                Attendees ({activity.attendees?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!activity.attendees || activity.attendees.length === 0 ? (
                <p className="text-muted-foreground text-sm">No attendees</p>
              ) : (
                <div className="space-y-3">
                  {activity.attendees.map((attendee) => (
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
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          {activity.tags && activity.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {activity.tags.map((tag) => (
                    <Badge key={tag.id} variant="secondary">
                      {tag.value}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Attachments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                Attachments ({activity.attachments?.length || 0})
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-1" />
                {isUploading ? "Uploading..." : "Upload"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ALLOWED_EXTENSIONS.join(",")}
                onChange={handleFileSelect}
                className="hidden"
              />
            </CardHeader>
            <CardContent>
              {uploadError && (
                <div className="p-2 text-xs text-red-600 bg-red-50 rounded-md mb-3">
                  {uploadError}
                </div>
              )}
              {!activity.attachments || activity.attachments.length === 0 ? (
                <p className="text-muted-foreground text-sm">No attachments</p>
              ) : (
                <div className="space-y-2">
                  {activity.attachments.map((attachment) => (
                    <button
                      key={attachment.id}
                      onClick={() => handleDownload(attachment.id, attachment.filename)}
                      className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {attachment.filename}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(attachment.file_size_bytes)}
                        </p>
                      </div>
                      <Download className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Version History */}
          {activity.versions && activity.versions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Version History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {activity.versions.map((version) => (
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

      {/* Follow-up Creation Dialog */}
      <Dialog open={showFollowUpDialog} onOpenChange={setShowFollowUpDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Follow-up</DialogTitle>
            <DialogDescription>
              Create a new follow-up action item for this activity.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Description *</Label>
              <Input
                value={fuDescription}
                onChange={(e) => setFuDescription(e.target.value)}
                placeholder="What needs to be done?"
              />
            </div>
            <div className="space-y-2">
              <Label>Assign to</Label>
              <Select value={fuAssignedTo || "__NONE__"} onValueChange={setFuAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__NONE__">Unassigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Due date</Label>
              <Input
                type="date"
                value={fuDueDate}
                onChange={(e) => setFuDueDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFollowUpDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateFollowUp}
              disabled={!fuDescription.trim() || fuSubmitting}
            >
              {fuSubmitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
