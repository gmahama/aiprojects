"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, ChevronDown, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { getPipelineStatusColor } from "@/lib/utils";
import { PipelineCard } from "@/components/pipeline/PipelineCard";
import type {
  PipelineBoardResponse,
  PipelineItem,
  PipelineBackBurnerItem,
  Organization,
  Contact,
  User,
  PaginatedResponse,
} from "@/types";

export default function PipelinePage() {
  const { getToken } = useAuth();
  const { toast } = useToast();

  const [board, setBoard] = useState<PipelineBoardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [backBurnerOpen, setBackBurnerOpen] = useState(true);

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [newItem, setNewItem] = useState({
    organization_id: "",
    primary_contact_id: "",
    owner_id: "",
    stage: "1",
    notes: "",
  });

  // Reason dialog state (for back burner / pass)
  const [reasonDialog, setReasonDialog] = useState<{
    open: boolean;
    type: "BACK_BURNER" | "PASSED";
    item: PipelineItem | null;
  }>({ open: false, type: "BACK_BURNER", item: null });
  const [reason, setReason] = useState("");
  const [reasonLoading, setReasonLoading] = useState(false);

  const fetchBoard = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const data = await api.getPipelineBoard(token);
      setBoard(data);
    } catch (err) {
      console.error("Failed to fetch pipeline board:", err);
      toast({ title: "Error", description: "Failed to load pipeline board", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [getToken, toast]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  // Fetch organizations, users for create dialog
  const openCreateDialog = async () => {
    setCreateOpen(true);
    try {
      const token = await getToken();
      if (!token) return;
      const [orgsData, usersData] = await Promise.all([
        api.getOrganizations(token, { page_size: "200" }),
        api.getUsers(token, 1, 200),
      ]);
      setOrganizations(orgsData.items || []);
      setUsers(usersData.items || []);
    } catch (err) {
      console.error("Failed to fetch form data:", err);
    }
  };

  // Fetch contacts when organization changes
  const handleOrgChange = async (orgId: string) => {
    setNewItem((prev) => ({ ...prev, organization_id: orgId, primary_contact_id: "" }));
    if (!orgId) {
      setContacts([]);
      return;
    }
    try {
      const token = await getToken();
      if (!token) return;
      const data: PaginatedResponse<Contact> = await api.getContacts(token, {
        organization_id: orgId,
        page_size: "200",
      });
      setContacts(data.items || []);
    } catch (err) {
      console.error("Failed to fetch contacts:", err);
    }
  };

  const handleCreate = async () => {
    if (!newItem.organization_id || !newItem.owner_id) return;
    setCreateLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      await api.createPipelineItem(token, {
        organization_id: newItem.organization_id,
        primary_contact_id: newItem.primary_contact_id || undefined,
        owner_id: newItem.owner_id,
        stage: parseInt(newItem.stage, 10),
        notes: newItem.notes || undefined,
      });
      toast({ title: "Success", description: "Pipeline item created" });
      setCreateOpen(false);
      setNewItem({ organization_id: "", primary_contact_id: "", owner_id: "", stage: "1", notes: "" });
      await fetchBoard();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create pipeline item";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleAdvance = async (item: PipelineItem) => {
    try {
      const token = await getToken();
      if (!token) return;
      await api.advancePipelineItem(token, item.id);
      toast({ title: "Advanced", description: `${item.organization_name} moved to stage ${item.stage + 1}` });
      await fetchBoard();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to advance";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  const openReasonDialog = (type: "BACK_BURNER" | "PASSED", item: PipelineItem) => {
    setReasonDialog({ open: true, type, item });
    setReason("");
  };

  const handleReasonSubmit = async () => {
    if (!reasonDialog.item || !reason.trim()) return;
    setReasonLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const updateData =
        reasonDialog.type === "BACK_BURNER"
          ? { status: "BACK_BURNER", back_burner_reason: reason }
          : { status: "PASSED", passed_reason: reason };
      await api.updatePipelineItem(token, reasonDialog.item.id, updateData);
      toast({
        title: reasonDialog.type === "BACK_BURNER" ? "Shelved" : "Passed",
        description: `${reasonDialog.item.organization_name} moved to ${reasonDialog.type === "BACK_BURNER" ? "back burner" : "passed"}`,
      });
      setReasonDialog({ open: false, type: "BACK_BURNER", item: null });
      await fetchBoard();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setReasonLoading(false);
    }
  };

  const handleReactivate = async (item: PipelineBackBurnerItem) => {
    try {
      const token = await getToken();
      if (!token) return;
      await api.reactivatePipelineItem(token, item.id, { note: "Reactivated from board" });
      toast({ title: "Reactivated", description: `${item.organization_name} returned to the board` });
      await fetchBoard();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to reactivate";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
        </div>
        <div className="grid grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="space-y-3">
              <div className="h-8 bg-gray-200 rounded animate-pulse" />
              <div className="h-24 bg-gray-100 rounded animate-pulse" />
              <div className="h-24 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
          {board?.summary && (
            <div className="flex gap-2">
              <Badge className={getPipelineStatusColor("ACTIVE")}>
                {board.summary.total_active} Active
              </Badge>
              <Badge className={getPipelineStatusColor("BACK_BURNER")}>
                {board.summary.total_back_burner} Back Burner
              </Badge>
              <Badge className={getPipelineStatusColor("PASSED")}>
                {board.summary.total_passed} Passed
              </Badge>
              <Badge className={getPipelineStatusColor("CONVERTED")}>
                {board.summary.total_converted} Converted
              </Badge>
            </div>
          )}
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add to Pipeline
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="grid grid-cols-6 gap-4 min-w-[900px]">
          {board?.stages.map((stage) => (
            <div key={stage.stage} className="flex flex-col">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-sm font-semibold text-gray-700">{stage.label}</h3>
                <Badge variant="secondary" className="text-xs">
                  {stage.items.length}
                </Badge>
              </div>
              <div className="space-y-2 min-h-[100px] bg-gray-50 rounded-lg p-2">
                {stage.items.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No items</p>
                ) : (
                  stage.items.map((item) => (
                    <PipelineCard
                      key={item.id}
                      item={item}
                      onAdvance={handleAdvance}
                      onBackBurner={(i) => openReasonDialog("BACK_BURNER", i)}
                      onPass={(i) => openReasonDialog("PASSED", i)}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Back Burner Section */}
      {board && board.back_burner.length > 0 && (
        <div className="border-t pt-4">
          <button
            onClick={() => setBackBurnerOpen(!backBurnerOpen)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3 hover:text-gray-900"
          >
            {backBurnerOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            Back Burner ({board.back_burner.length})
          </button>
          {backBurnerOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {board.back_burner.map((item) => (
                <Card key={item.id} className="bg-yellow-50 border-yellow-200">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <Link
                        href={`/pipeline/${item.id}`}
                        className="font-medium text-sm text-gray-900 hover:text-blue-600"
                      >
                        {item.organization_name || "Unknown Org"}
                      </Link>
                      {item.stage_when_shelved_label && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                          from {item.stage_when_shelved_label}
                        </Badge>
                      )}
                    </div>
                    {item.back_burner_reason && (
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {item.back_burner_reason}
                      </p>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-7 text-xs"
                      onClick={() => handleReactivate(item)}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Reactivate
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to Pipeline</DialogTitle>
            <DialogDescription>
              Add an organization to the investment pipeline.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Organization *</Label>
              <Select value={newItem.organization_id} onValueChange={handleOrgChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Primary Contact</Label>
              <Select
                value={newItem.primary_contact_id}
                onValueChange={(v) => setNewItem((prev) => ({ ...prev, primary_contact_id: v }))}
                disabled={!newItem.organization_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder={newItem.organization_id ? "Select contact" : "Select an organization first"} />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Owner *</Label>
              <Select
                value={newItem.owner_id}
                onValueChange={(v) => setNewItem((prev) => ({ ...prev, owner_id: v }))}
              >
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
              <Label>Starting Stage</Label>
              <Select
                value={newItem.stage}
                onValueChange={(v) => setNewItem((prev) => ({ ...prev, stage: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - First Meeting</SelectItem>
                  <SelectItem value="2">2 - Quantitative Diligence</SelectItem>
                  <SelectItem value="3">3 - Patrick Meeting</SelectItem>
                  <SelectItem value="4">4 - Live Diligence</SelectItem>
                  <SelectItem value="5">5 - References</SelectItem>
                  <SelectItem value="6">6 - Docs</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Optional notes..."
                value={newItem.notes}
                onChange={(e) => setNewItem((prev) => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createLoading || !newItem.organization_id || !newItem.owner_id}
            >
              {createLoading ? "Creating..." : "Add to Pipeline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reason Dialog (Back Burner / Pass) */}
      <Dialog
        open={reasonDialog.open}
        onOpenChange={(open) => {
          if (!open) setReasonDialog({ open: false, type: "BACK_BURNER", item: null });
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reasonDialog.type === "BACK_BURNER" ? "Move to Back Burner" : "Pass on Opportunity"}
            </DialogTitle>
            <DialogDescription>
              {reasonDialog.type === "BACK_BURNER"
                ? `Shelve ${reasonDialog.item?.organization_name || "this item"} for later review.`
                : `Mark ${reasonDialog.item?.organization_name || "this item"} as passed.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Reason *</Label>
            <Textarea
              placeholder="Enter reason..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReasonDialog({ open: false, type: "BACK_BURNER", item: null })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReasonSubmit}
              disabled={reasonLoading || !reason.trim()}
              variant={reasonDialog.type === "PASSED" ? "destructive" : "default"}
            >
              {reasonLoading
                ? "Saving..."
                : reasonDialog.type === "BACK_BURNER"
                  ? "Shelve"
                  : "Pass"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
