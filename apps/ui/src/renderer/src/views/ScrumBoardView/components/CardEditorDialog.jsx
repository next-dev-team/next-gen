/**
 * CardEditorDialog Component
 *
 * Dialog for creating/editing story cards with attachments, priority, etc.
 */

import * as React from "react";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Lock,
  Target,
  Book,
  User,
  Zap,
  AlertCircle,
  GitBranch,
  Calendar,
  Tag,
  Paperclip,
  X,
  Image,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import useKanbanStore, { PRIORITY_LEVELS } from "../../../stores/kanbanStore";

export default function CardEditorDialog({
  open,
  onOpenChange,
  initial,
  onSave,
  onDelete,
  epics = [],
  sprints = [],
  isLocked = false,
  lockInfo = null,
}) {
  const { state } = useKanbanStore();
  const nextId = React.useMemo(() => {
    if (initial?.id) return initial.id;
    const allCards = (state?.boards || []).flatMap((b) =>
      b.lists.flatMap((l) => l.cards),
    );
    const maxId = allCards.reduce((max, c) => {
      const numericId = parseInt(c.id, 10);
      return !isNaN(numericId) ? Math.max(max, numericId) : max;
    }, 0);
    return String(maxId + 1);
  }, [initial?.id, state]);

  const [title, setTitle] = React.useState(initial?.title || "");
  const [description, setDescription] = React.useState(
    initial?.description || "",
  );
  const [assignee, setAssignee] = React.useState(initial?.assignee || "");
  const [points, setPoints] = React.useState(
    typeof initial?.points === "number" ? String(initial.points) : "",
  );
  const [labels, setLabels] = React.useState(
    Array.isArray(initial?.labels) ? initial.labels.join(", ") : "",
  );
  const [priority, setPriority] = React.useState(initial?.priority || "medium");
  const [epicId, setEpicId] = React.useState(initial?.epicId || "");
  const [sprintId, setSprintId] = React.useState(initial?.sprintId || "");
  const [attachments, setAttachments] = React.useState(
    Array.isArray(initial?.attachments) ? initial.attachments : [],
  );
  const [previewAttachment, setPreviewAttachment] = React.useState(null);

  React.useEffect(() => {
    setTitle(initial?.title || "");
    setDescription(initial?.description || "");
    setAssignee(initial?.assignee || "");
    setPoints(
      typeof initial?.points === "number" ? String(initial.points) : "",
    );
    setLabels(Array.isArray(initial?.labels) ? initial.labels.join(", ") : "");
    setPriority(initial?.priority || "medium");
    setEpicId(initial?.epicId || "");
    setSprintId(initial?.sprintId || "");
    setAttachments(
      Array.isArray(initial?.attachments) ? initial.attachments : [],
    );
  }, [initial]);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newAttachments = await Promise.all(
      files.map(async (file, idx) => {
        const reader = new FileReader();
        return new Promise((resolve) => {
          reader.onload = (ev) => {
            const sequence = attachments.length + idx + 1;
            resolve({
              id: `${nextId}-${sequence}`,
              name: file.name,
              type: file.type,
              size: file.size,
              data: ev.target.result,
            });
          };
          reader.readAsDataURL(file);
        });
      }),
    );

    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const pastedFiles = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === "file") {
        const file = items[i].getAsFile();
        if (file) {
          pastedFiles.push(file);
        }
      }
    }

    if (pastedFiles.length > 0) {
      const newAttachments = await Promise.all(
        pastedFiles.map(async (file, idx) => {
          const reader = new FileReader();
          return new Promise((resolve) => {
            reader.onload = (ev) => {
              const sequence = attachments.length + idx + 1;
              resolve({
                id: `${nextId}-${sequence}`,
                name:
                  file.name ||
                  `pasted-image-${Date.now()}.${file.type.split("/")[1] || "png"}`,
                type: file.type,
                size: file.size,
                data: ev.target.result,
              });
            };
            reader.readAsDataURL(file);
          });
        }),
      );
      setAttachments((prev) => [...prev, ...newAttachments]);
    }
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const canSave = title.trim().length > 0 && !isLocked;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[500px] bg-background/95 backdrop-blur-lg border-border/50"
        onPaste={handlePaste}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {initial?.id ? (
              <>
                <Pencil className="h-5 w-5 text-primary" />
                Edit Story
              </>
            ) : (
              <>
                <Plus className="h-5 w-5 text-primary" />
                Create New Story
              </>
            )}
          </DialogTitle>
          {isLocked && lockInfo && (
            <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm">
              <Lock className="h-4 w-4 text-amber-500" />
              <span className="text-amber-600 dark:text-amber-400">
                This card is being edited by {lockInfo.userId}
              </span>
            </div>
          )}
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                Title
              </Label>
              <Badge variant="outline" className="text-[10px] tabular-nums">
                Story ID: #{nextId}
              </Badge>
            </div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter story title..."
              className="bg-background/50"
              disabled={isLocked}
            />
          </div>

          <div className="grid gap-2">
            <Label className="flex items-center gap-2">
              <Book className="h-4 w-4 text-muted-foreground" />
              Description
            </Label>
            <textarea
              className="flex min-h-[100px] w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the story requirements..."
              disabled={isLocked}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Assignee
              </Label>
              <Input
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="Who's working on this?"
                className="bg-background/50"
                disabled={isLocked}
              />
            </div>

            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                Story Points
              </Label>
              <Input
                inputMode="numeric"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                placeholder="e.g. 3"
                className="bg-background/50"
                disabled={isLocked}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                Priority
              </Label>
              <Select
                value={priority}
                onValueChange={setPriority}
                disabled={isLocked}
              >
                <SelectTrigger className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_LEVELS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                        {p.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {epics.length > 0 && (
              <div className="grid gap-2">
                <Label className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-muted-foreground" />
                  Epic
                </Label>
                <Select
                  value={epicId}
                  onValueChange={(value) =>
                    setEpicId(value === "__none__" ? "" : value)
                  }
                  disabled={isLocked}
                >
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Select epic..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No Epic</SelectItem>
                    {epics.map((epic) => (
                      <SelectItem key={epic.id} value={epic.id}>
                        {epic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {sprints.length > 0 && (
            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Sprint
              </Label>
              <Select
                value={sprintId}
                onValueChange={(value) =>
                  setSprintId(value === "__none__" ? "" : value)
                }
                disabled={isLocked}
              >
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="No sprint" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No sprint</SelectItem>
                  {sprints.map((sprint) => (
                    <SelectItem key={sprint.id} value={sprint.id}>
                      {sprint.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-2">
            <Label className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              Labels
            </Label>
            <Input
              value={labels}
              onChange={(e) => setLabels(e.target.value)}
              placeholder="feature, bugfix, enhancement (comma separated)"
              className="bg-background/50"
              disabled={isLocked}
            />
          </div>

          <div className="grid gap-2">
            <Label className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                Attachments
              </div>
              {!isLocked && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => document.getElementById("file-upload").click()}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Upload
                </Button>
              )}
            </Label>
            <input
              id="file-upload"
              type="file"
              multiple
              className="hidden"
              onChange={handleFileUpload}
              disabled={isLocked}
            />
            <div className="flex flex-wrap gap-2 mt-1">
              {attachments.map((file) => (
                <div
                  key={file.id}
                  className="group relative flex items-center bg-background/50 border border-border/50 rounded-lg text-xs hover:bg-background/80 transition-colors"
                >
                  <button
                    type="button"
                    className="flex items-center gap-2 p-2 pr-8 w-full text-left rounded-lg"
                    onClick={() => setPreviewAttachment(file)}
                  >
                    {file.type?.startsWith("image/") ? (
                      <div className="relative h-12 w-12 rounded border border-border/50 overflow-hidden bg-muted/30 shrink-0 group/editor-img">
                        <img
                          src={file.data}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const text = `story img id: ${file.id}`;
                            navigator.clipboard.writeText(text);
                            toast.success(`Copied image ID: ${file.id}`);
                          }}
                          className="absolute top-0.5 right-0.5 bg-background/90 backdrop-blur-sm border border-border/50 rounded-full px-1 py-0 text-[8px] font-mono text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all shadow-sm z-10"
                          title={`Copy ID: ${file.id}`}
                        >
                          {file.id}
                        </button>
                      </div>
                    ) : (
                      <Paperclip className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                    <span className="max-w-[120px] truncate" title={file.name}>
                      {file.name}
                    </span>
                  </button>
                  {!isLocked && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAttachment(file.id);
                      }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                      title="Remove attachment"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
              {attachments.length === 0 && (
                <div className="text-[11px] text-muted-foreground italic py-1 px-1">
                  No files attached. Paste images or upload files.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Attachment Preview Dialog */}
        <Dialog
          open={!!previewAttachment}
          onOpenChange={() => setPreviewAttachment(null)}
        >
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/50">
            <DialogHeader className="p-4 border-b border-border/50">
              <div className="flex items-center justify-between pr-8">
                <DialogTitle className="text-sm font-medium flex items-center gap-2">
                  {previewAttachment?.type?.startsWith("image/") ? (
                    <Image className="h-4 w-4 text-primary" />
                  ) : (
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                  )}
                  {previewAttachment?.name}
                </DialogTitle>
                {previewAttachment && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    asChild
                  >
                    <a
                      href={previewAttachment.data}
                      download={previewAttachment.name}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Download
                    </a>
                  </Button>
                )}
              </div>
            </DialogHeader>
            <div className="flex items-center justify-center bg-black/5 dark:bg-white/5 min-h-[300px] max-h-[calc(90vh-120px)] overflow-auto p-4">
              {previewAttachment?.type?.startsWith("image/") ? (
                <img
                  src={previewAttachment.data}
                  alt={previewAttachment.name}
                  className="max-w-full h-auto rounded shadow-lg"
                />
              ) : (
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                  <Paperclip className="h-16 w-16 opacity-20" />
                  <div className="text-center">
                    <p className="text-sm font-medium">
                      {previewAttachment?.name}
                    </p>
                    <p className="text-xs opacity-60">
                      {(previewAttachment?.size / 1024).toFixed(1)} KB •{" "}
                      {previewAttachment?.type}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <DialogFooter className="gap-2">
          {initial?.id && !isLocked && (
            <Button
              type="button"
              variant="destructive"
              className="mr-auto"
              onClick={() => onDelete?.()}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canSave}
            onClick={() => {
              const parsedPoints = points.trim() === "" ? null : Number(points);
              const nextPoints = Number.isFinite(parsedPoints)
                ? parsedPoints
                : null;
              const nextLabels = labels
                .split(",")
                .map((l) => l.trim())
                .filter(Boolean);

              onSave({
                title: title.trim(),
                description: description.trim(),
                assignee: assignee.trim(),
                points: nextPoints,
                labels: nextLabels,
                priority,
                epicId: epicId || null,
                sprintId: sprintId || null,
                attachments: attachments,
              });
            }}
            className="bg-primary hover:bg-primary/90"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {initial?.id ? "Update Story" : "Create Story"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
