/**
 * EpicManagerDialog Component
 *
 * Dialog for creating and managing epics.
 */

import * as React from "react";
import { Plus, Pencil, Check, GitBranch } from "lucide-react";
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
import { EPIC_STATUSES } from "../../../stores/kanbanStore";

export default function EpicManagerDialog({
  open,
  onOpenChange,
  epics,
  sprints = [],
  onCreateEpic,
  onUpdateEpic,
}) {
  const [selectedEpicId, setSelectedEpicId] = React.useState("");
  const selectedEpic = React.useMemo(
    () => (epics || []).find((e) => e.id === selectedEpicId) || null,
    [epics, selectedEpicId],
  );

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [projectKey, setProjectKey] = React.useState("");
  const [status, setStatus] = React.useState("backlog");
  const [sprintId, setSprintId] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (!selectedEpic) {
      setName("");
      setDescription("");
      setProjectKey("");
      setStatus("backlog");
      setSprintId("");
      return;
    }

    setName(String(selectedEpic.name || ""));
    setDescription(String(selectedEpic.description || ""));
    setProjectKey(String(selectedEpic.projectKey || ""));
    setStatus(String(selectedEpic.status || "backlog"));
    setSprintId(String(selectedEpic.sprintId || ""));
  }, [open, selectedEpic]);

  const canCreate = name.trim().length > 0 && !busy;
  const canUpdate = Boolean(selectedEpicId) && name.trim().length > 0 && !busy;

  const handleCreate = async () => {
    if (!canCreate) return;
    setBusy(true);
    try {
      const epicId = await onCreateEpic(
        name.trim(),
        description.trim(),
        projectKey.trim() || null,
      );
      if (epicId) {
        if (sprintId) {
          await onUpdateEpic(epicId, { sprintId });
        }
        setSelectedEpicId(epicId);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleUpdate = async () => {
    if (!canUpdate) return;
    setBusy(true);
    try {
      await onUpdateEpic(selectedEpicId, {
        name: name.trim(),
        description: description.trim(),
        projectKey: projectKey.trim() || null,
        status,
        sprintId: sprintId || null,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setSelectedEpicId("");
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-[860px] bg-background/95 backdrop-blur-lg border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            Epics
          </DialogTitle>
          <DialogDescription>
            Create and manage epics for grouping related stories.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-[320px_1fr]">
          <div className="rounded-lg border border-border/50 bg-background/60">
            <div className="flex items-center justify-between gap-2 p-3 border-b border-border/50">
              <div className="text-sm font-medium">All epics</div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setSelectedEpicId("")}
              >
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </div>
            <ScrollArea className="h-[360px]">
              <div className="p-2 space-y-1">
                {(epics || []).length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground">
                    No epics yet.
                  </div>
                ) : (
                  (epics || []).map((epic) => (
                    <button
                      key={epic.id}
                      type="button"
                      draggable
                      onDragStart={(e) => {
                        const payload = { type: "scrum-epic", epicId: epic.id };
                        e.dataTransfer.setData(
                          "application/json",
                          JSON.stringify(payload),
                        );
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onClick={() => setSelectedEpicId(epic.id)}
                      className={cn(
                        "w-full text-left rounded-md px-3 py-2 transition-colors",
                        "hover:bg-muted/40",
                        selectedEpicId === epic.id &&
                          "bg-primary/10 ring-1 ring-primary/20",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium truncate">
                          {epic.name}
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {String(epic.status || "backlog")}
                        </Badge>
                      </div>
                      {epic.description ? (
                        <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {epic.description}
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
                {selectedEpicId ? "Edit epic" : "Create epic"}
              </div>
              {selectedEpicId ? (
                <Badge variant="secondary" className="gap-1">
                  <Pencil className="h-3 w-3" />
                  {selectedEpicId.slice(0, 8)}
                </Badge>
              ) : null}
            </div>

            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Epic name"
                  className="bg-background/50"
                  disabled={busy}
                />
              </div>

              <div className="grid gap-2">
                <Label>Description</Label>
                <textarea
                  className="flex min-h-[96px] w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this epic about?"
                  disabled={busy}
                />
              </div>

              <div className="grid gap-2">
                <Label>Project key</Label>
                <Input
                  value={projectKey}
                  onChange={(e) => setProjectKey(e.target.value)}
                  placeholder="Optional (e.g. NEXT)"
                  className="bg-background/50"
                  disabled={busy}
                />
              </div>

              {selectedEpicId ? (
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
                      {EPIC_STATUSES.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              {sprints.length > 0 ? (
                <div className="grid gap-2">
                  <Label>Sprint</Label>
                  <Select
                    value={sprintId}
                    onValueChange={(value) =>
                      setSprintId(value === "__none__" ? "" : value)
                    }
                    disabled={busy}
                  >
                    <SelectTrigger className="bg-background/50">
                      <SelectValue placeholder="No sprint" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No sprint</SelectItem>
                      {sprints.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              {selectedEpicId ? (
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
