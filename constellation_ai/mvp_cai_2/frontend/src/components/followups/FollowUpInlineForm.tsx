"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import type { User, PaginatedResponse } from "@/types";

interface FollowUpData {
  description: string;
  assigned_to?: string;
  due_date?: string;
}

interface FollowUpInlineFormProps {
  onAdd: (data: FollowUpData) => void;
}

export function FollowUpInlineForm({ onAdd }: FollowUpInlineFormProps) {
  const { getToken } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");

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

  const handleAdd = () => {
    if (!description.trim()) return;

    const data: FollowUpData = {
      description: description.trim(),
    };
    if (assignedTo && assignedTo !== "__NONE__") {
      data.assigned_to = assignedTo;
    }
    if (dueDate) {
      data.due_date = dueDate;
    }

    onAdd(data);
    setDescription("");
    setAssignedTo("");
    setDueDate("");
  };

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1 min-w-0">
        <Input
          placeholder="Follow-up description..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
      </div>
      <div className="w-[160px]">
        <Select value={assignedTo || "__NONE__"} onValueChange={setAssignedTo}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Assign to..." />
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
      <div className="w-[140px]">
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="h-9 text-xs"
        />
      </div>
      <Button
        type="button"
        size="sm"
        onClick={handleAdd}
        disabled={!description.trim()}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
