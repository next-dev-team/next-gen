import * as React from "react";
import {
  Book,
  Plus,
  Trash2,
  Pencil,
  X,
  GripVertical,
  LayoutGrid,
  Layout,
  Wifi,
  WifiOff,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle2,
  Clock,
  Users,
  Sparkles,
  Zap,
  Target,
  TrendingUp,
  RefreshCw,
  Settings,
  ChevronDown,
  Search,
  Filter,
  Tag,
  User,
  Calendar,
  ArrowRight,
  PlayCircle,
  PauseCircle,
  CheckCircle,
  Circle,
  GitBranch,
} from "lucide-react";

import { cn } from "../lib/utils";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { ScrollArea } from "../components/ui/scroll-area";
import { Separator } from "../components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";

import useKanbanStore, {
  STORY_STATUSES,
  EPIC_STATUSES,
  PRIORITY_LEVELS,
} from "../stores/kanbanStore";

// Board templates based on BMAD-Method
const BOARD_TEMPLATES = [
  {
    id: "bmad-method",
    name: "BMAD-Method Sprint",
    description: "Full agile workflow with story lifecycle",
    type: "bmad",
    lists: STORY_STATUSES.map((s) => s.name),
    icon: Sparkles,
  },
  {
    id: "kanban-simple",
    name: "Simple Kanban",
    description: "Basic workflow for quick projects",
    type: "custom",
    lists: ["Backlog", "In Progress", "Done"],
    icon: Layout,
  },
  {
    id: "dev-workflow",
    name: "Development Flow",
    description: "Extended workflow with code review",
    type: "custom",
    lists: ["Backlog", "To Do", "In Progress", "Review", "Testing", "Done"],
    icon: GitBranch,
  },
];

// Status icons mapping
const STATUS_ICONS = {
  backlog: Circle,
  "ready-for-dev": PlayCircle,
  "in-progress": Clock,
  review: Users,
  done: CheckCircle,
};

// Priority colors and icons
const PRIORITY_CONFIG = {
  low: { color: "bg-slate-500", textColor: "text-slate-500", icon: "○" },
  medium: { color: "bg-blue-500", textColor: "text-blue-500", icon: "◐" },
  high: { color: "bg-amber-500", textColor: "text-amber-500", icon: "◑" },
  critical: { color: "bg-red-500", textColor: "text-red-500", icon: "●" },
};

// ============ Card Editor Dialog ============
const CardEditorDialog = ({
  open,
  onOpenChange,
  initial,
  onSave,
  onDelete,
  epics = [],
  isLocked = false,
  lockInfo = null,
}) => {
  const [title, setTitle] = React.useState(initial?.title || "");
  const [description, setDescription] = React.useState(
    initial?.description || ""
  );
  const [assignee, setAssignee] = React.useState(initial?.assignee || "");
  const [points, setPoints] = React.useState(
    typeof initial?.points === "number" ? String(initial.points) : ""
  );
  const [labels, setLabels] = React.useState(
    Array.isArray(initial?.labels) ? initial.labels.join(", ") : ""
  );
  const [priority, setPriority] = React.useState(initial?.priority || "medium");
  const [epicId, setEpicId] = React.useState(initial?.epicId || "");

  React.useEffect(() => {
    setTitle(initial?.title || "");
    setDescription(initial?.description || "");
    setAssignee(initial?.assignee || "");
    setPoints(
      typeof initial?.points === "number" ? String(initial.points) : ""
    );
    setLabels(Array.isArray(initial?.labels) ? initial.labels.join(", ") : "");
    setPriority(initial?.priority || "medium");
    setEpicId(initial?.epicId || "");
  }, [initial]);

  const canSave = title.trim().length > 0 && !isLocked;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-background/95 backdrop-blur-lg border-border/50">
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
            <Label className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              Title
            </Label>
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
                          className={cn(
                            "w-2 h-2 rounded-full",
                            `bg-[${p.color}]`
                          )}
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
                  onValueChange={setEpicId}
                  disabled={isLocked}
                >
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Select epic..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Epic</SelectItem>
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
        </div>

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
};

// ============ Stats Card ============
const StatsCard = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
        <div className="flex items-center gap-2 mb-1">
          <LayoutGrid className="h-4 w-4 text-blue-500" />
          <span className="text-xs text-muted-foreground">Total Stories</span>
        </div>
        <div className="text-2xl font-bold text-foreground">
          {stats.total || 0}
        </div>
      </div>

      <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="h-4 w-4 text-amber-500" />
          <span className="text-xs text-muted-foreground">In Progress</span>
        </div>
        <div className="text-2xl font-bold text-foreground">
          {stats.byStatus?.["in-progress"] || 0}
        </div>
      </div>

      <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="text-xs text-muted-foreground">Completed</span>
        </div>
        <div className="text-2xl font-bold text-foreground">
          {stats.byStatus?.done || 0}
        </div>
      </div>

      <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="h-4 w-4 text-purple-500" />
          <span className="text-xs text-muted-foreground">Progress</span>
        </div>
        <div className="text-2xl font-bold text-foreground">
          {stats.completionPercent || 0}%
        </div>
        {stats.totalPoints > 0 && (
          <div className="text-xs text-muted-foreground mt-1">
            {stats.completedPoints}/{stats.totalPoints} pts
          </div>
        )}
      </div>
    </div>
  );
};

// ============ Connection Status ============
const ConnectionStatus = ({ connected, onReconnect }) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "gap-2 text-xs",
              connected ? "text-green-500" : "text-amber-500"
            )}
            onClick={onReconnect}
          >
            {connected ? (
              <>
                <Wifi className="h-4 w-4" />
                <span className="hidden sm:inline">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4" />
                <span className="hidden sm:inline">Offline</span>
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {connected
            ? "Connected to MCP Server - Real-time updates enabled"
            : "Using local storage - Click to reconnect"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// ============ Scrum Card ============
const ScrumCard = ({
  card,
  onClick,
  onDragStart,
  isLocked,
  lockInfo,
  listColor,
}) => {
  const priorityConfig =
    PRIORITY_CONFIG[card.priority] || PRIORITY_CONFIG.medium;

  return (
    <Card
      draggable={!isLocked}
      onDragStart={onDragStart}
      className={cn(
        "cursor-grab active:cursor-grabbing transition-all duration-200",
        "hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30",
        "bg-card/50 backdrop-blur-sm border-border/50",
        isLocked && "opacity-60 cursor-not-allowed ring-2 ring-amber-500/50"
      )}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <button
            type="button"
            className="flex-1 text-left"
            onClick={onClick}
            disabled={isLocked}
          >
            <div className="flex items-center gap-2">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: listColor || "#6b7280" }}
              />
              <span className="font-medium text-sm text-foreground leading-snug line-clamp-2">
                {card.title}
              </span>
            </div>
            {card.description && (
              <div className="text-xs text-muted-foreground line-clamp-2 mt-1.5 pl-3.5">
                {card.description}
              </div>
            )}
          </button>

          {isLocked ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-1.5 rounded-full bg-amber-500/10">
                    <Lock className="h-3.5 w-3.5 text-amber-500" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  Being edited by {lockInfo?.userId || "another user"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
              onClick={onClick}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {(card.assignee ||
          card.points !== null ||
          (card.labels && card.labels.length) ||
          card.priority) && (
          <div className="mt-2.5 pt-2.5 border-t border-border/30 flex flex-wrap items-center gap-1.5">
            {card.priority && card.priority !== "medium" && (
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] px-1.5 py-0",
                  priorityConfig.textColor
                )}
              >
                {card.priority}
              </Badge>
            )}
            {typeof card.points === "number" && (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary"
              >
                {card.points} pt
              </Badge>
            )}
            {card.assignee && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                <User className="h-2.5 w-2.5 mr-1" />
                {card.assignee}
              </Badge>
            )}
            {Array.isArray(card.labels) &&
              card.labels.slice(0, 2).map((label) => (
                <Badge
                  key={label}
                  className="text-[10px] px-1.5 py-0 bg-secondary text-secondary-foreground"
                >
                  {label}
                </Badge>
              ))}
            {card.labels && card.labels.length > 2 && (
              <span className="text-[10px] text-muted-foreground">
                +{card.labels.length - 2}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ============ Drop Zone ============
const DropZone = ({ isActive, onDrop }) => {
  const [over, setOver] = React.useState(false);

  return (
    <div
      className={cn(
        "h-2 rounded transition-all duration-200",
        isActive ? "hover:bg-primary/20 hover:h-4" : "opacity-40",
        over && "bg-primary/40 h-6 border-2 border-dashed border-primary/50"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        if (!isActive) return;
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        setOver(false);
        onDrop(e);
      }}
    />
  );
};

// ============ List Column ============
const ListColumn = ({
  list,
  dragState,
  onAddCard,
  onEditCard,
  onRename,
  onDelete,
  onDragStartCard,
  onDropToIndex,
  onDropToEnd,
  isCardLocked,
  getCardLock,
}) => {
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [nameDraft, setNameDraft] = React.useState(list.name);
  const isDragFromHere = dragState?.listId === list.id;

  const StatusIcon = STATUS_ICONS[list.statusId] || Circle;

  React.useEffect(() => {
    setNameDraft(list.name);
  }, [list.name]);

  return (
    <div
      className={cn(
        "w-[320px] rounded-xl border bg-background/50 backdrop-blur-sm flex flex-col h-full min-h-0",
        "border-border/50 hover:border-border transition-colors"
      )}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDropToEnd}
    >
      {/* List Header */}
      <div
        className="px-3 py-3 border-b border-border/30 flex items-center gap-2"
        style={{
          borderTopColor: list.color || "#6b7280",
          borderTopWidth: 3,
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
        }}
      >
        <StatusIcon
          className="h-4 w-4 shrink-0"
          style={{ color: list.color || "#6b7280" }}
        />

        {isEditingName ? (
          <div className="flex-1 flex items-center gap-2">
            <Input
              className="h-7 text-sm bg-background/50"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onRename(nameDraft);
                  setIsEditingName(false);
                }
                if (e.key === "Escape") {
                  setNameDraft(list.name);
                  setIsEditingName(false);
                }
              }}
              autoFocus
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => {
                onRename(nameDraft);
                setIsEditingName(false);
              }}
            >
              <CheckCircle2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => {
                setNameDraft(list.name);
                setIsEditingName(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            className="flex-1 text-left font-medium text-foreground truncate text-sm hover:text-primary transition-colors"
            onClick={() => setIsEditingName(true)}
          >
            {list.name}
          </button>
        )}

        <Badge
          variant="secondary"
          className="text-xs tabular-nums"
          style={{
            backgroundColor: `${list.color}20`,
            color: list.color,
            borderColor: list.color,
          }}
        >
          {list.cards.length}
        </Badge>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={onAddCard}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add new story</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete list</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Cards */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 flex flex-col gap-2">
          {list.cards.map((card, index) => {
            const locked = isCardLocked(card.id);
            const lockInfo = getCardLock(card.id);

            return (
              <React.Fragment key={card.id}>
                <DropZone
                  isActive={!isDragFromHere}
                  onDrop={(e) => onDropToIndex(e, index)}
                />
                <div className="group">
                  <ScrumCard
                    card={card}
                    onClick={() => onEditCard(card)}
                    onDragStart={(e) => onDragStartCard(e, card.id)}
                    isLocked={locked}
                    lockInfo={lockInfo}
                    listColor={list.color}
                  />
                </div>
              </React.Fragment>
            );
          })}
          <DropZone
            isActive={!isDragFromHere}
            onDrop={(e) => onDropToIndex(e, list.cards.length)}
          />

          {list.cards.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Circle className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No stories yet</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={onAddCard}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add a story
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

// ============ Add List Column ============
const AddListColumn = ({ onAdd }) => {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");

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
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) {
                onAdd(name);
                setName("");
                setOpen(false);
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
              disabled={!name.trim()}
              onClick={() => {
                onAdd(name);
                setName("");
                setOpen(false);
              }}
            >
              Add
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
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
};

// ============ Create Board Dialog ============
const CreateBoardDialog = ({ open, onOpenChange, onCreateBoard }) => {
  const [name, setName] = React.useState("");
  const [selectedTemplate, setSelectedTemplate] = React.useState("bmad-method");

  const handleCreate = () => {
    if (!name.trim()) return;
    const template = BOARD_TEMPLATES.find((t) => t.id === selectedTemplate);
    onCreateBoard(name.trim(), template?.type || "custom");
    setName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-background/95 backdrop-blur-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Create New Board
          </DialogTitle>
          <DialogDescription>
            Choose a workflow template based on your project needs
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Board Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter board name..."
              className="bg-background/50"
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) handleCreate();
              }}
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label>Workflow Template</Label>
            <div className="grid gap-2">
              {BOARD_TEMPLATES.map((template) => {
                const Icon = template.icon;
                return (
                  <button
                    key={template.id}
                    type="button"
                    className={cn(
                      "p-4 rounded-xl border text-left transition-all",
                      "hover:bg-accent/50",
                      selectedTemplate === template.id
                        ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                        : "border-border/50 bg-background/30"
                    )}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "p-2 rounded-lg",
                          selectedTemplate === template.id
                            ? "bg-primary/20 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{template.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {template.description}
                        </div>
                      </div>
                      {selectedTemplate === template.id && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-1 flex-wrap">
                      {template.lists.map((list, i) => (
                        <React.Fragment key={list}>
                          <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                            {list}
                          </span>
                          {i < template.lists.length - 1 && (
                            <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim()}>
            <Plus className="h-4 w-4 mr-2" />
            Create Board
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============ Main Component ============
export default function ScrumBoardView() {
  const {
    state,
    loading,
    error,
    connected,
    activeBoardId,
    lockedCards,
    connect,
    disconnect,
    loadLocalState,
    setActiveBoard,
    createBoard,
    deleteBoard,
    addCard,
    updateCard,
    deleteCard,
    moveCard,
    acquireLock,
    releaseLock,
    isCardLocked,
    getCardLock,
    getActiveBoard,
    getEpics,
    getStats,
    clearError,
  } = useKanbanStore();

  const [cardDialogOpen, setCardDialogOpen] = React.useState(false);
  const [cardDialogContext, setCardDialogContext] = React.useState(null);
  const [createBoardOpen, setCreateBoardOpen] = React.useState(false);
  const [dragState, setDragState] = React.useState(null);

  // Initialize connection
  React.useEffect(() => {
    connect();

    // Fallback to local state if connection fails after a timeout
    const timeout = setTimeout(() => {
      if (!connected && loading) {
        loadLocalState();
      }
    }, 3000);

    return () => {
      clearTimeout(timeout);
      disconnect();
    };
  }, []);

  const activeBoard = getActiveBoard();
  const epics = getEpics();
  const stats = getStats();

  // Card operations
  const openNewCard = async (listId) => {
    setCardDialogContext({ boardId: activeBoardId, listId, card: null });
    setCardDialogOpen(true);
  };

  const openEditCard = async (listId, card) => {
    const locked = await acquireLock(card.id);
    if (!locked) {
      // Still open but in read-only mode
    }
    setCardDialogContext({ boardId: activeBoardId, listId, card });
    setCardDialogOpen(true);
  };

  const handleCardDialogClose = async (open) => {
    if (!open && cardDialogContext?.card?.id) {
      await releaseLock(cardDialogContext.card.id);
    }
    setCardDialogOpen(open);
    if (!open) setCardDialogContext(null);
  };

  const handleSaveCard = async (patch) => {
    const { listId, card } = cardDialogContext;

    if (card?.id) {
      await updateCard(activeBoardId, listId, card.id, patch);
      await releaseLock(card.id);
    } else {
      await addCard(activeBoardId, listId, patch);
    }

    setCardDialogOpen(false);
    setCardDialogContext(null);
  };

  const handleDeleteCard = async () => {
    const { listId, card } = cardDialogContext;
    if (card?.id) {
      await deleteCard(activeBoardId, listId, card.id);
    }
    setCardDialogOpen(false);
    setCardDialogContext(null);
  };

  // List operations
  const addList = async (name) => {
    // For now, using API call through store
    console.log("Add list:", name);
  };

  const renameList = async (listId, name) => {
    console.log("Rename list:", listId, name);
  };

  const deleteList = async (listId) => {
    console.log("Delete list:", listId);
  };

  // Drag and drop
  const safeParse = (value) => {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  const onDragStartCard = (e, listId, cardId) => {
    if (isCardLocked(cardId)) {
      e.preventDefault();
      return;
    }

    const payload = { type: "scrum-card", listId, cardId };
    e.dataTransfer.setData("application/json", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";
    setDragState({ listId, cardId });
  };

  const onDropCardToList = async (e, toListId, toIndex) => {
    e.preventDefault();
    const payload = safeParse(e.dataTransfer.getData("application/json"));
    if (!payload || payload.type !== "scrum-card") return;

    const fromListId = payload.listId;
    const cardId = payload.cardId;
    if (!fromListId || !cardId) return;

    await moveCard(activeBoardId, cardId, fromListId, toListId, toIndex);
    setDragState(null);
  };

  // Loading state
  if (loading && !state) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-8 h-full flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 mx-auto mb-3 text-primary animate-spin" />
          <p className="text-muted-foreground">
            Connecting to Kanban server...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 h-full min-h-0 flex flex-col gap-4">
      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="flex-1 text-sm">{error}</span>
          <Button variant="ghost" size="sm" onClick={clearError}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10">
            <LayoutGrid className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Kanban Board
            </h3>
            <p className="text-xs text-muted-foreground">
              BMAD-Method Workflow
            </p>
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex flex-wrap gap-2 items-center">
          <ConnectionStatus connected={connected} onReconnect={connect} />

          <Select value={activeBoardId || ""} onValueChange={setActiveBoard}>
            <SelectTrigger className="w-[200px] bg-background/50">
              <SelectValue placeholder="Select board" />
            </SelectTrigger>
            <SelectContent>
              {state?.boards?.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  <div className="flex items-center gap-2">
                    {b.type === "bmad" && (
                      <Sparkles className="h-3 w-3 text-primary" />
                    )}
                    {b.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => setCreateBoardOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Board
          </Button>

          {activeBoard && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteBoard(activeBoard.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      {activeBoard && <StatsCard stats={stats} />}

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden min-h-0">
        <div className="min-w-max flex gap-4 items-stretch pb-2 h-full">
          {activeBoard?.lists?.map((list) => (
            <ListColumn
              key={list.id}
              list={list}
              dragState={dragState}
              onAddCard={() => openNewCard(list.id)}
              onEditCard={(card) => openEditCard(list.id, card)}
              onRename={(name) => renameList(list.id, name)}
              onDelete={() => deleteList(list.id)}
              onDragStartCard={(e, cardId) =>
                onDragStartCard(e, list.id, cardId)
              }
              onDropToIndex={(e, index) => onDropCardToList(e, list.id, index)}
              onDropToEnd={(e) =>
                onDropCardToList(e, list.id, list.cards.length)
              }
              isCardLocked={isCardLocked}
              getCardLock={getCardLock}
            />
          ))}

          <AddListColumn onAdd={addList} />
        </div>
      </div>

      {/* Dialogs */}
      <CardEditorDialog
        open={cardDialogOpen}
        onOpenChange={handleCardDialogClose}
        initial={cardDialogContext?.card}
        onSave={handleSaveCard}
        onDelete={handleDeleteCard}
        epics={epics}
        isLocked={
          cardDialogContext?.card?.id
            ? isCardLocked(cardDialogContext.card.id)
            : false
        }
        lockInfo={
          cardDialogContext?.card?.id
            ? getCardLock(cardDialogContext.card.id)
            : null
        }
      />

      <CreateBoardDialog
        open={createBoardOpen}
        onOpenChange={setCreateBoardOpen}
        onCreateBoard={createBoard}
      />
    </div>
  );
}
