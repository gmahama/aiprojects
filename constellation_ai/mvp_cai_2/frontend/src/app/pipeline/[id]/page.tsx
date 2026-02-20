"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowDown,
  Pause,
  XCircle,
  RotateCcw,
  Trophy,
  Pencil,
  Trash2,
  Clock,
  Building2,
  User as UserIcon,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import {
  formatDate,
  formatDateTime,
  getPipelineStatusColor,
  getPipelineStageColor,
  formatPipelineStatus,
} from "@/lib/utils";
import { StageProgress } from "@/components/pipeline/StageProgress";
import type {
  PipelineItemDetail,
  PipelineStageHistory,
  Contact,
  User,
  PaginatedResponse,
} from "@/types";

export default function PipelineDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken, user: currentUser } = useAuth();
  const { toast } = useToast();

  const id = params.id as string;

  const [item, setItem] = useState<PipelineItemDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  // Action dialog state
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: "advance" | "revert" | "back_burner" | "pass" | "reactivate" | "convert" | "edit";
  }>({ open: false, type: "advance" });
  const [actionNote, setActionNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [reactivateStage, setReactivateStage] = useState("");

  // Edit dialog state
  const [editNotes, setEditNotes] = useState("");
  const [editOwnerId, setEditOwnerId] = useState("");
  const [editContactId, setEditContactId] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  const fetchItem = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const data = await api.getPipelineItem(token, id);
      setItem(data);
    } catch (err) {
      console.error("Failed to fetch pipeline item:", err);
      toast({ title: "Error", description: "Failed to load pipeline item", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [getToken, id, toast]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  const openActionDialog = async (type: typeof actionDialog.type) => {
    setActionDialog({ open: true, type });
    setActionNote("");
    setReactivateStage("");

    if (type === "edit" && item) {
      setEditNotes(item.notes || "");
      setEditOwnerId(item.owner_id);
      setEditContactId(item.primary_contact_id || "");
      try {
        const token = await getToken();
        if (!token) return;
        const [usersData, contactsData] = await Promise.all([
          api.getUsers(token, 1, 200),
          item.organization_id
            ? api.getContacts(token, { organization_id: item.organization_id, page_size: "200" })
            : Promise.resolve({ items: [] }),
        ]);
        setUsers(usersData.items || []);
        setContacts((contactsData as PaginatedResponse<Contact>).items || []);
      } catch (err) {
        console.error("Failed to fetch form data:", err);
      }
    }
  };

  const handleAction = async () => {
    if (!item) return;
    setActionLoading(true);
    try {
      const token = await getToken();
      if (!token) return;

      switch (actionDialog.type) {
        case "advance":
          await api.advancePipelineItem(token, item.id, { note: actionNote || undefined });
          toast({ title: "Advanced", description: `Moved to stage ${item.stage + 1}` });
          break;
        case "revert":
          if (!actionNote.trim()) return;
          await api.revertPipelineItem(token, item.id, { note: actionNote });
          toast({ title: "Reverted", description: `Moved back to stage ${item.stage - 1}` });
          break;
        case "back_burner":
          if (!actionNote.trim()) return;
          await api.updatePipelineItem(token, item.id, {
            status: "BACK_BURNER",
            back_burner_reason: actionNote,
          });
          toast({ title: "Shelved", description: "Moved to back burner" });
          break;
        case "pass":
          if (!actionNote.trim()) return;
          await api.updatePipelineItem(token, item.id, {
            status: "PASSED",
            passed_reason: actionNote,
          });
          toast({ title: "Passed", description: "Marked as passed" });
          break;
        case "convert":
          await api.updatePipelineItem(token, item.id, { status: "CONVERTED" });
          toast({ title: "Converted", description: "Pipeline item converted!" });
          break;
        case "reactivate":
          if (!actionNote.trim()) return;
          await api.reactivatePipelineItem(token, item.id, {
            note: actionNote,
            stage: reactivateStage ? parseInt(reactivateStage, 10) : undefined,
          });
          toast({ title: "Reactivated", description: "Returned to active pipeline" });
          break;
        case "edit":
          await api.updatePipelineItem(token, item.id, {
            notes: editNotes || null,
            owner_id: editOwnerId,
            primary_contact_id: editContactId || null,
          });
          toast({ title: "Updated", description: "Pipeline item updated" });
          break;
      }

      setActionDialog({ open: false, type: "advance" });
      await fetchItem();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Action failed";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    setIsDeleting(true);
    try {
      const token = await getToken();
      if (!token) return;
      await api.deletePipelineItem(token, item.id);
      toast({ title: "Deleted", description: "Pipeline item removed" });
      router.push("/pipeline");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete";
      toast({ title: "Error", description: message, variant: "destructive" });
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            Pipeline item not found.
          </CardContent>
        </Card>
      </div>
    );
  }

  const isActive = item.status === "ACTIVE";
  const isBackBurner = item.status === "BACK_BURNER";
  const isPassed = item.status === "PASSED";
  const isConverted = item.status === "CONVERTED";
  const canModify = !isConverted;

  // Sort history newest first
  const sortedHistory = [...(item.stage_history || [])].sort(
    (a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/pipeline")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {item.organization_name || "Unknown Organization"}
              </h1>
              <Badge className={getPipelineStageColor(item.stage)}>
                Stage {item.stage}: {item.stage_label}
              </Badge>
              <Badge className={getPipelineStatusColor(item.status)}>
                {formatPipelineStatus(item.status)}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canModify && (
            <Button variant="outline" size="sm" onClick={() => openActionDialog("edit")}>
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
          {canModify && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isDeleting}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete pipeline item?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove {item.organization_name} from the pipeline. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Info */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-500">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Organization:</span>
                <Link
                  href={`/organizations/${item.organization_id}`}
                  className="text-blue-600 hover:underline font-medium"
                >
                  {item.organization_name}
                </Link>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <UserIcon className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Primary Contact:</span>
                {item.primary_contact_id ? (
                  <Link
                    href={`/contacts/${item.primary_contact_id}`}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {item.primary_contact_name}
                  </Link>
                ) : (
                  <span className="text-gray-400">None set</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <UserIcon className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Owner:</span>
                <span className="font-medium">{item.owner_name || "Unassigned"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CalendarDays className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Entered Pipeline:</span>
                <span>{formatDate(item.entered_pipeline_at)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Days in Pipeline:</span>
                <span className="font-medium">{item.days_in_pipeline ?? 0}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Days in Stage:</span>
                <span className="font-medium">{item.days_in_stage ?? 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-500">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {item.notes ? (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.notes}</p>
              ) : (
                <p className="text-sm text-gray-400">No notes</p>
              )}
            </CardContent>
          </Card>

          {/* Status Reason (if shelved/passed) */}
          {(isBackBurner || isPassed) && (
            <Card className={isBackBurner ? "border-yellow-200 bg-yellow-50" : "border-gray-200 bg-gray-50"}>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-500">
                  {isBackBurner ? "Back Burner Reason" : "Pass Reason"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">
                  {isBackBurner ? item.back_burner_reason : item.passed_reason}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Progress, Actions, History */}
        <div className="lg:col-span-2 space-y-4">
          {/* Stage Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-500">Stage Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <StageProgress currentStage={item.stage} />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          {canModify && (
            <Card>
              <CardContent className="py-4">
                <div className="flex flex-wrap gap-2">
                  {isActive && item.stage < 6 && (
                    <Button size="sm" onClick={() => openActionDialog("advance")}>
                      <ArrowRight className="h-4 w-4 mr-1" />
                      Advance Stage
                    </Button>
                  )}
                  {isActive && item.stage > 1 && (
                    <Button size="sm" variant="outline" onClick={() => openActionDialog("revert")}>
                      <ArrowDown className="h-4 w-4 mr-1" />
                      Revert Stage
                    </Button>
                  )}
                  {isActive && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-yellow-700"
                      onClick={() => openActionDialog("back_burner")}
                    >
                      <Pause className="h-4 w-4 mr-1" />
                      Back Burner
                    </Button>
                  )}
                  {isActive && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                      onClick={() => openActionDialog("pass")}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Pass
                    </Button>
                  )}
                  {isActive && item.stage === 6 && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => openActionDialog("convert")}
                    >
                      <Trophy className="h-4 w-4 mr-1" />
                      Convert
                    </Button>
                  )}
                  {(isBackBurner || isPassed) && (
                    <Button size="sm" onClick={() => openActionDialog("reactivate")}>
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Reactivate
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stage History Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-500">Stage History</CardTitle>
            </CardHeader>
            <CardContent>
              {sortedHistory.length === 0 ? (
                <p className="text-sm text-gray-400">No history yet</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-3.5 top-2 bottom-2 w-px bg-gray-200" />
                  <div className="space-y-4">
                    {sortedHistory.map((entry, idx) => (
                      <HistoryEntry key={entry.id} entry={entry} isFirst={idx === 0} />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Dialog */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) => {
          if (!open) setActionDialog({ open: false, type: "advance" });
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === "advance" && "Advance Stage"}
              {actionDialog.type === "revert" && "Revert Stage"}
              {actionDialog.type === "back_burner" && "Move to Back Burner"}
              {actionDialog.type === "pass" && "Pass on Opportunity"}
              {actionDialog.type === "convert" && "Convert Pipeline Item"}
              {actionDialog.type === "reactivate" && "Reactivate Pipeline Item"}
              {actionDialog.type === "edit" && "Edit Pipeline Item"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === "advance" && `Advance from Stage ${item.stage} to Stage ${item.stage + 1}.`}
              {actionDialog.type === "revert" && `Revert from Stage ${item.stage} to Stage ${item.stage - 1}.`}
              {actionDialog.type === "back_burner" && "Shelve this item for later review."}
              {actionDialog.type === "pass" && "Mark this opportunity as passed."}
              {actionDialog.type === "convert" && "Mark this item as successfully converted."}
              {actionDialog.type === "reactivate" && "Return this item to the active pipeline."}
              {actionDialog.type === "edit" && "Update pipeline item details."}
            </DialogDescription>
          </DialogHeader>

          {actionDialog.type === "edit" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Owner</Label>
                <Select value={editOwnerId} onValueChange={setEditOwnerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Primary Contact</Label>
                <Select value={editContactId} onValueChange={setEditContactId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select contact" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.first_name} {c.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          ) : actionDialog.type === "convert" ? (
            <p className="text-sm text-gray-600">
              This will mark the pipeline item as converted. This action cannot be reversed.
            </p>
          ) : (
            <div className="space-y-4">
              {actionDialog.type === "reactivate" && (
                <div className="space-y-2">
                  <Label>Return to Stage (optional)</Label>
                  <Select value={reactivateStage} onValueChange={setReactivateStage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Auto-detect from history" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto-detect</SelectItem>
                      <SelectItem value="1">1 - First Meeting</SelectItem>
                      <SelectItem value="2">2 - Quantitative Diligence</SelectItem>
                      <SelectItem value="3">3 - Patrick Meeting</SelectItem>
                      <SelectItem value="4">4 - Live Diligence</SelectItem>
                      <SelectItem value="5">5 - References</SelectItem>
                      <SelectItem value="6">6 - Docs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>
                  {actionDialog.type === "advance" ? "Note (optional)" : "Note *"}
                </Label>
                <Textarea
                  placeholder="Enter note..."
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog({ open: false, type: "advance" })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={
                actionLoading ||
                (["revert", "back_burner", "pass", "reactivate"].includes(actionDialog.type) &&
                  !actionNote.trim())
              }
              variant={actionDialog.type === "pass" ? "destructive" : "default"}
            >
              {actionLoading ? "Saving..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HistoryEntry({
  entry,
  isFirst,
}: {
  entry: PipelineStageHistory;
  isFirst: boolean;
}) {
  const isStatusChange = entry.from_status && entry.from_status !== entry.to_status;
  const isStageChange = entry.from_stage !== null && entry.from_stage !== entry.to_stage;

  return (
    <div className="relative flex gap-3 pl-1">
      <div
        className={`mt-1 h-6 w-6 rounded-full flex items-center justify-center shrink-0 z-10 ${
          isFirst
            ? "bg-blue-600 text-white"
            : "bg-white border-2 border-gray-300 text-gray-400"
        }`}
      >
        <div className={`h-2 w-2 rounded-full ${isFirst ? "bg-white" : "bg-gray-300"}`} />
      </div>
      <div className="flex-1 pb-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-900">
            {isStageChange && (
              <>
                {entry.from_stage_label || `Stage ${entry.from_stage}`}
                {" \u2192 "}
                {entry.to_stage_label || `Stage ${entry.to_stage}`}
              </>
            )}
            {isStatusChange && !isStageChange && (
              <>
                {entry.from_status} {"\u2192"} {entry.to_status}
              </>
            )}
            {isStatusChange && isStageChange && (
              <Badge variant="outline" className="ml-1 text-xs">
                {entry.to_status}
              </Badge>
            )}
            {!isStageChange && !isStatusChange && entry.from_stage === null && (
              <>Created at Stage {entry.to_stage_label || entry.to_stage}</>
            )}
          </span>
        </div>
        {entry.note && (
          <p className="text-xs text-gray-600 mt-0.5">{entry.note}</p>
        )}
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
          <span>{formatDateTime(entry.changed_at)}</span>
          {entry.changed_by_name && (
            <>
              <span>&middot;</span>
              <span>{entry.changed_by_name}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
