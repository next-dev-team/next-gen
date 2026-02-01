/**
 * AddListColumn Component
 *
 * Inline form to add a new column/list to the board.
 */

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";

export default function AddListColumn({ onAdd }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  return (
    <div className="w-[320px] shrink-0">
      {open ? (
        <div className="rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm p-4 shadow-lg animate-in fade-in zoom-in-95 duration-200">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">
            New Column
          </Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Column name..."
            className="mt-2 bg-background/50"
            onKeyDown={async (e) => {
              if (e.key === "Enter" && name.trim() && !submitting) {
                setSubmitting(true);
                try {
                  const ok = await onAdd(name.trim());
                  if (ok) {
                    setName("");
                    setOpen(false);
                  }
                } finally {
                  setSubmitting(false);
                }
              }
              if (e.key === "Escape") {
                setName("");
                setOpen(false);
              }
            }}
            autoFocus
          />
          <div className="flex gap-2 mt-3">
            <Button
              type="button"
              className="flex-1"
              disabled={!name.trim() || submitting}
              onClick={async () => {
                if (submitting) return;
                setSubmitting(true);
                try {
                  const ok = await onAdd(name.trim());
                  if (ok) {
                    setName("");
                    setOpen(false);
                  }
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {submitting ? "Adding..." : "Add"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={submitting}
              onClick={() => {
                setName("");
                setOpen(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full justify-center h-14 border-dashed border-2 border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all"
          onClick={() => setOpen(true)}
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Column
        </Button>
      )}
    </div>
  );
}
