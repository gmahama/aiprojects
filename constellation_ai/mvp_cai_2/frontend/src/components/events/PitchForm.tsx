"use client";

import { useState, useEffect } from "react";
import { X, Plus, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import type { Contact, EventPitchFormData, PaginatedResponse } from "@/types";

interface PitchFormProps {
  pitches: EventPitchFormData[];
  onChange: (pitches: EventPitchFormData[]) => void;
}

export function PitchForm({ pitches, onChange }: PitchFormProps) {
  const { getToken } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPitch, setNewPitch] = useState<EventPitchFormData>({
    ticker: "",
    company_name: "",
    thesis: "",
    notes: "",
    pitched_by: undefined,
    is_bullish: undefined,
  });

  // Fetch contacts for pitcher dropdown
  useEffect(() => {
    async function fetchContacts() {
      try {
        const token = await getToken();
        const res = (await api.getContacts(token, { page_size: "100" })) as PaginatedResponse<Contact>;
        setContacts(res.items);
      } catch (error) {
        console.error("Failed to fetch contacts:", error);
      }
    }
    fetchContacts();
  }, [getToken]);

  const addPitch = () => {
    if (newPitch.company_name) {
      onChange([...pitches, newPitch]);
      setNewPitch({
        ticker: "",
        company_name: "",
        thesis: "",
        notes: "",
        pitched_by: undefined,
        is_bullish: undefined,
      });
      setShowAddForm(false);
    }
  };

  const removePitch = (index: number) => {
    onChange(pitches.filter((_, i) => i !== index));
  };

  const getSentimentIcon = (is_bullish: boolean | undefined) => {
    if (is_bullish === true) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (is_bullish === false) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getContactName = (contactId: string | undefined) => {
    if (!contactId) return null;
    const contact = contacts.find((c) => c.id === contactId);
    return contact ? `${contact.first_name} ${contact.last_name}` : null;
  };

  return (
    <div className="space-y-4">
      {/* Existing Pitches */}
      {pitches.length > 0 && (
        <div className="space-y-3">
          {pitches.map((pitch, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 rounded-lg border bg-gray-50"
            >
              {getSentimentIcon(pitch.is_bullish)}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{pitch.company_name}</span>
                  {pitch.ticker && (
                    <Badge variant="outline" className="text-xs">
                      {pitch.ticker}
                    </Badge>
                  )}
                  {pitch.is_bullish !== undefined && (
                    <Badge
                      variant="secondary"
                      className={pitch.is_bullish ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                    >
                      {pitch.is_bullish ? "Bullish" : "Bearish"}
                    </Badge>
                  )}
                </div>
                {pitch.thesis && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {pitch.thesis}
                  </p>
                )}
                {pitch.pitched_by && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Pitched by: {getContactName(pitch.pitched_by)}
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removePitch(index)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add Pitch Button */}
      {!showAddForm && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Stock Pitch
        </Button>
      )}

      {/* New Pitch Form */}
      {showAddForm && (
        <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
          <p className="text-sm font-medium">Add Stock Pitch</p>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              placeholder="Ticker (e.g., AAPL)"
              value={newPitch.ticker || ""}
              onChange={(e) =>
                setNewPitch({ ...newPitch, ticker: e.target.value.toUpperCase() })
              }
            />
            <Input
              placeholder="Company Name *"
              value={newPitch.company_name}
              onChange={(e) =>
                setNewPitch({ ...newPitch, company_name: e.target.value })
              }
            />
          </div>

          <textarea
            placeholder="Investment Thesis"
            value={newPitch.thesis || ""}
            onChange={(e) =>
              setNewPitch({ ...newPitch, thesis: e.target.value })
            }
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />

          <div className="grid gap-3 md:grid-cols-2">
            <select
              value={newPitch.pitched_by || ""}
              onChange={(e) =>
                setNewPitch({ ...newPitch, pitched_by: e.target.value || undefined })
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select Pitcher (optional)</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.first_name} {contact.last_name}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Sentiment:</span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={newPitch.is_bullish === true ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    setNewPitch({ ...newPitch, is_bullish: newPitch.is_bullish === true ? undefined : true })
                  }
                  className={newPitch.is_bullish === true ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Bullish
                </Button>
                <Button
                  type="button"
                  variant={newPitch.is_bullish === false ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    setNewPitch({ ...newPitch, is_bullish: newPitch.is_bullish === false ? undefined : false })
                  }
                  className={newPitch.is_bullish === false ? "bg-red-600 hover:bg-red-700" : ""}
                >
                  <TrendingDown className="h-4 w-4 mr-1" />
                  Bearish
                </Button>
              </div>
            </div>
          </div>

          <textarea
            placeholder="Additional Notes"
            value={newPitch.notes || ""}
            onChange={(e) =>
              setNewPitch({ ...newPitch, notes: e.target.value })
            }
            rows={2}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={addPitch}
              disabled={!newPitch.company_name}
            >
              Add Pitch
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
