/**
 * SprintManagerDialog Component
 *
 * Dialog for creating and managing sprints.
 */

import * as React from "react";
import { Plus, Pencil, Check, Calendar, Trash2 } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { ScrollArea } from "../../../components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { cn } from "../../../lib/utils";

const SPRINT_STATUSES = [
  { id: "planned", name: "Planned" },
  { id: "active", name: "Active" },
  { id: "completed", name: "Completed" },
];

export default function SprintManagerDialog({
  open,
  onOpenChange,
  sprints,
  onCreateSprint,
  onUpdateSprint,
  onDeleteSprint,
}) {
  const [selectedSprintId, setSelectedSprintId] = React.useState("");
  const selectedSprint = React.useMemo(
    () => (sprints || []).find((s) => s.id === selectedSprintId) || null,
    [sprints, selectedSprintId],
  );

  const [name, setName] = React.useState("");
  const [goal, setGoal] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [capacityPoints, setCapacityPoints] = React.useState("");
  const [status, setStatus] = React.useState("planned");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (!selectedSprint) {
      setName("");
      setGoal("");
      setStartDate("");
      setEndDate("");
      setCapacityPoints("");
      setStatus("planned");
      return;
    }

    setName(String(selectedSprint.name || ""));
    setGoal(String(selectedSprint.goal || ""));
    setStartDate(String(selectedSprint.startDate || ""));
    setEndDate(String(selectedSprint.endDate || ""));
    setCapacityPoints(
      typeof selectedSprint.capacityPoints === "number"
        ? String(selectedSprint.capacityPoints)
        : "",
    );
    setStatus(String(selectedSprint.status || "planned"));
  }, [open, selectedSprint]);

  const canCreate = name.trim().length > 0 && !busy;
  const canUpdate =
    Boolean(selectedSprintId) && name.trim().length > 0 && !busy;

  const handleCreate = async () => {
    if (!canCreate) return;
    setBusy(true);
    try {
      const nextCapacity =
        capacityPoints.trim() === "" ? null : Number(capacityPoints);
      const sprintId = await onCreateSprint({
        name: name.trim(),
        goal: goal.trim(),
        startDate: startDate.trim() || null,
        endDate: endDate.trim() || null,
        capacityPoints: Number.isFinite(nextCapacity) ? nextCapacity : null,
        status,
      });
      if (sprintId) setSelectedSprintId(sprintId);
    } finally {
      setBusy(false);
    }
  };

  const handleUpdate = async () => {
    if (!canUpdate) return;
    setBusy(true);
    try {
      const nextCapacity =
        capacityPoints.trim() === "" ? null : Number(capacityPoints);
      await onUpdateSprint(selectedSprintId, {
        name: name.trim(),
        goal: goal.trim(),
        startDate: startDate.trim() || null,
        endDate: endDate.trim() || null,
        capacityPoints: Number.isFinite(nextCapacity) ? nextCapacity : null,
        status,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSprintId || busy) return;
    setBusy(true);
    try {
      await onDeleteSprint(selectedSprintId);
      setSelectedSprintId("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setSelectedSprintId("");
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-[900px] bg-background/95 backdrop-blur-lg border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Sprints
          </DialogTitle>
          <DialogDescription>
            Create and manage sprints. Stories and epics can be assigned via
            drag-and-drop.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-[320px_1fr]">
          <div className="rounded-lg border border-border/50 bg-background/60">
            <div className="flex items-center justify-between gap-2 p-3 border-b border-border/50">
              <div className="text-sm font-medium">All sprints</div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setSelectedSprintId("")}
              >
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </div>
            <ScrollArea className="h-[360px]">
              <div className="p-2 space-y-1">
                {(sprints || []).length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground">
                    No sprints yet.
                  </div>
                ) : (
                  (sprints || [])
                    .slice()
                    .sort((a, b) =>
                      String(a.name || "").localeCompare(String(b.name || "")),
                    )
                    .map((sprint) => (
                      <button
                        key={sprint.id}
                        type="button"
                        onClick={() => setSelectedSprintId(sprint.id)}
                        className={cn(
                          "w-full text-left rounded-md px-3 py-2 transition-colors",
                          "hover:bg-muted/40",
                          selectedSprintId === sprint.id &&
                            "bg-primary/10 ring-1 ring-primary/20",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-medium truncate">
                            {sprint.name}
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {String(sprint.status || "planned")}
                          </Badge>
                        </div>
                        {sprint.goal ? (
                          <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {sprint.goal}
                          </div>
                        ) : null}
                      </button>
                    ))
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="rounded-lg border border-border/50 bg-background/60 p-4">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="text-sm font-medium">
                {selectedSprintId ? "Edit sprint" : "Create sprint"}
              </div>
              {selectedSprintId ? (
                <Badge variant="secondary" className="gap-1">
                  <Pencil className="h-3 w-3" />
                  {selectedSprintId.slice(0, 8)}
                </Badge>
              ) : null}
            </div>

            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Sprint name"
                  className="bg-background/50"
                  disabled={busy}
                />
              </div>

              <div className="grid gap-2">
                <Label>Goal</Label>
                <textarea
                  className="flex min-h-[96px] w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="Optional sprint goal"
                  disabled={busy}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Start</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-background/50"
                    disabled={busy}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>End</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-background/50"
                    disabled={busy}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Capacity points</Label>
                  <Input
                    inputMode="numeric"
                    value={capacityPoints}
                    onChange={(e) => setCapacityPoints(e.target.value)}
                    placeholder="Optional"
                    className="bg-background/50"
                    disabled={busy}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select
                    value={status}
                    onValueChange={setStatus}
                    disabled={busy}
                  >
                    <SelectTrigger className="bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SPRINT_STATUSES.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              {selectedSprintId ? (
                <Button
                  type="button"
                  variant="destructive"
                  className="mr-auto"
                  onClick={handleDelete}
                  disabled={busy}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              {selectedSprintId ? (
                <Button
                  type="button"
                  onClick={handleUpdate}
                  disabled={!canUpdate}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Save
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleCreate}
                  disabled={!canCreate}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
