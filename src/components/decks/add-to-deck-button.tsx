"use client";

import { useCallback, useEffect, useState } from "react";
import { FolderPlus, Check } from "lucide-react";

import {
  type ReferenceDeck,
  addShotToDeck,
  createDeck,
  getDecks,
} from "@/lib/reference-deck";
import type { ShotWithDetails } from "@/lib/types";

type AddToDeckButtonProps = {
  shot: ShotWithDetails;
};

export function AddToDeckButton({ shot }: AddToDeckButtonProps) {
  const [open, setOpen] = useState(false);
  const [decks, setDecks] = useState<ReferenceDeck[]>([]);
  const [newName, setNewName] = useState("");
  const [added, setAdded] = useState<string | null>(null);

  const refresh = useCallback(() => setDecks(getDecks()), []);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  function handleAdd(deckId: string) {
    addShotToDeck(deckId, shot);
    setAdded(deckId);
    setTimeout(() => setAdded(null), 1500);
    refresh();
  }

  function handleCreateAndAdd() {
    if (!newName.trim()) return;
    const deck = createDeck(newName.trim());
    addShotToDeck(deck.id, shot);
    setNewName("");
    setAdded(deck.id);
    setTimeout(() => setAdded(null), 1500);
    refresh();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex h-7 items-center justify-center gap-1.5 rounded-full border border-[var(--color-border-default)] bg-transparent px-4 text-[0.8rem] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-tertiary)] hover:text-[var(--color-text-primary)]"
      >
        <FolderPlus className="h-3.5 w-3.5" />
        Add to deck
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute right-0 top-full z-50 mt-2 w-72 rounded-[var(--radius-lg)] border p-3 shadow-[var(--shadow-xl)]"
            style={{
              backgroundColor: "var(--color-surface-secondary)",
              borderColor: "var(--color-border-default)",
            }}
          >
            <p className="font-mono text-[10px] uppercase tracking-[var(--letter-spacing-wide)] text-[var(--color-text-tertiary)]">
              Add to reference deck
            </p>

            {decks.length > 0 && (
              <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                {decks.map((deck) => {
                  const alreadyIn = deck.items.some(
                    (item) => item.shotId === shot.id,
                  );
                  return (
                    <button
                      key={deck.id}
                      onClick={() => !alreadyIn && handleAdd(deck.id)}
                      disabled={alreadyIn}
                      className="flex w-full items-center justify-between rounded-[var(--radius-md)] px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--color-surface-tertiary)] disabled:opacity-50"
                    >
                      <span className="text-[var(--color-text-primary)]">
                        {deck.name}
                      </span>
                      {added === deck.id ? (
                        <Check className="h-3.5 w-3.5 text-green-400" />
                      ) : alreadyIn ? (
                        <span className="font-mono text-[10px] text-[var(--color-text-tertiary)]">
                          added
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] text-[var(--color-text-tertiary)]">
                          {deck.items.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-3 flex items-center gap-2 border-t border-[var(--color-border-subtle)] pt-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateAndAdd()}
                placeholder="New deck name..."
                className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-primary)] px-2.5 py-1.5 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none"
              />
              <button
                onClick={handleCreateAndAdd}
                disabled={!newName.trim()}
                className="rounded-[var(--radius-md)] bg-[var(--color-surface-tertiary)] px-2.5 py-1.5 text-xs text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-text-accent)] disabled:opacity-40"
              >
                Create
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
