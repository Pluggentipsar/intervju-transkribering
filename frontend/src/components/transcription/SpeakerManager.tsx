/**
 * Speaker management panel - rename speakers in a transcript.
 */

"use client";

import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import {
  Users,
  Edit3,
  Check,
  X,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { renameSpeaker } from "@/services/api";
import type { Segment } from "@/types";

interface SpeakerManagerProps {
  jobId: string;
  segments: Segment[];
  className?: string;
}

interface SpeakerInfo {
  name: string;
  segmentCount: number;
}

export function SpeakerManager({ jobId, segments, className }: SpeakerManagerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const queryClient = useQueryClient();

  // Get unique speakers with their segment counts
  const speakers = useMemo<SpeakerInfo[]>(() => {
    const speakerMap = new Map<string, number>();
    segments.forEach((s) => {
      if (s.speaker) {
        speakerMap.set(s.speaker, (speakerMap.get(s.speaker) || 0) + 1);
      }
    });
    return Array.from(speakerMap.entries())
      .map(([name, count]) => ({ name, segmentCount: count }))
      .sort((a, b) => a.name.localeCompare(b.name, "sv"));
  }, [segments]);

  const mutation = useMutation({
    mutationFn: (data: { oldName: string; newName: string }) =>
      renameSpeaker(jobId, { old_name: data.oldName, new_name: data.newName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transcript", jobId] });
      setEditingSpeaker(null);
      setNewName("");
    },
  });

  const handleStartEdit = (speaker: string) => {
    setEditingSpeaker(speaker);
    setNewName(speaker);
  };

  const handleCancelEdit = () => {
    setEditingSpeaker(null);
    setNewName("");
  };

  const handleSaveEdit = () => {
    if (editingSpeaker && newName.trim() && newName.trim() !== editingSpeaker) {
      mutation.mutate({ oldName: editingSpeaker, newName: newName.trim() });
    } else {
      handleCancelEdit();
    }
  };

  if (speakers.length === 0) {
    return null;
  }

  return (
    <div className={clsx("bg-dark-800/50 rounded-xl border border-white/10", className)}>
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-indigo-400" />
          <div className="text-left">
            <h3 className="font-medium text-white">Namnge talare</h3>
            <p className="text-sm text-gray-400">
              {speakers.length} {speakers.length === 1 ? "talare" : "talare"} identifierade
            </p>
          </div>
        </div>
        <ChevronDown
          className={clsx(
            "w-5 h-5 text-gray-500 transition-transform",
            isExpanded && "rotate-180"
          )}
        />
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-white/10">
          <p className="text-sm text-gray-400 py-3">
            Klicka på en talare för att byta namn på alla deras segment.
          </p>

          {/* Speaker list */}
          <div className="space-y-2">
            {speakers.map((speaker) => (
              <div
                key={speaker.name}
                className="flex items-center gap-3 p-3 bg-dark-900/50 rounded-lg"
              >
                {editingSpeaker === speaker.name ? (
                  /* Editing mode */
                  <>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveEdit();
                        if (e.key === "Escape") handleCancelEdit();
                      }}
                      className="flex-1 px-3 py-1.5 bg-dark-800 border border-white/20 rounded-lg text-sm text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      autoFocus
                      disabled={mutation.isPending}
                    />
                    <button
                      onClick={handleSaveEdit}
                      disabled={mutation.isPending || !newName.trim()}
                      className="p-1.5 text-green-400 hover:bg-green-500/10 rounded-lg transition-colors disabled:opacity-50"
                      title="Spara"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={mutation.isPending}
                      className="p-1.5 text-gray-400 hover:bg-dark-700 rounded-lg transition-colors"
                      title="Avbryt"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  /* Display mode */
                  <>
                    <span className="flex-1 font-medium text-white">
                      {speaker.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {speaker.segmentCount} segment
                    </span>
                    <button
                      onClick={() => handleStartEdit(speaker.name)}
                      className="p-1.5 text-gray-400 hover:bg-dark-700 rounded-lg transition-colors"
                      title="Redigera namn"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Error message */}
          {mutation.isError && (
            <div className="flex items-center gap-2 mt-3 p-3 bg-red-500/10 text-red-400 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>
                Något gick fel:{" "}
                {mutation.error instanceof Error
                  ? mutation.error.message
                  : "Okänt fel"}
              </span>
            </div>
          )}

          {/* Success message */}
          {mutation.isSuccess && (
            <div className="flex items-center gap-2 mt-3 p-3 bg-green-500/10 text-green-400 rounded-lg text-sm">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>
                Talaren har bytt namn! {mutation.data.segments_updated} segment uppdaterade.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
