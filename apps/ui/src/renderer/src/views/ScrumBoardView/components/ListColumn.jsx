/**
 * ListColumn Component
 *
 * A kanban board column with cards and drag-and-drop support.
 */

import * as React from "react";
import {
  GripVertical,
  Plus,
  Trash2,
  CheckCircle2,
  X,
  Circle,
  PlayCircle,
  Clock,
  Users,
  CheckCircle,
} from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { ScrollArea } from "../../../components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../../components/ui/tooltip";
import { cn } from "../../../lib/utils";
import DropZone from "./DropZone";
import ScrumCard from "./ScrumCard";

// Status icons mapping
const STATUS_ICONS = {
  backlog: Circle,
  "ready-for-dev": PlayCircle,
  "in-progress": Clock,
  review: Users,
  done: CheckCircle,
};

export default function ListColumn({
  list,
  displayCards,
  disableDnd,
  listDrop,
  onDragOverList,
  onDropList,
  onDragStartList,
  onDragEndList,
  dragState,
  onAddCard,
  onEditCard,
  onRename,
  onDelete,
  onDragStartCard,
  onDragEndCard,
  onDropToIndex,
  onDropToEnd,
  isCardLocked,
  getCardLock,
  storyKeyByCardId,
  sprintNameById,
}) {
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [nameDraft, setNameDraft] = React.useState(list.name);
  const isCardDrag = !disableDnd && dragState?.type === "card";
  const isDragFromHere = isCardDrag && dragState?.listId === list.id;
  const isListDropTarget =
    !disableDnd &&
    dragState?.type === "list" &&
    listDrop?.overListId === list.id;

  const cards = Array.isArray(displayCards) ? displayCards : list.cards;
  const isFilteredEmpty = cards.length === 0 && list.cards.length > 0;

  const StatusIcon = STATUS_ICONS[list.statusId] || Circle;

  React.useEffect(() => {
    setNameDraft(list.name);
  }, [list.name]);

  return (
    <div
      role="application"
      aria-label={`List: ${String(list.name || "")}`}
      className={cn(
        "relative w-[320px] rounded-xl border bg-background/50 backdrop-blur-sm flex flex-col h-full min-h-0",
        "border-border/50 hover:border-border transition-all duration-300",
        isListDropTarget && "ring-2 ring-primary/30",
      )}
      onDragOver={disableDnd ? undefined : onDragOverList}
      onDrop={disableDnd ? undefined : onDropList}
    >
      {isListDropTarget && (
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-y-2 w-1 rounded bg-primary/50",
            listDrop?.position === "after" ? "right-0" : "left-0",
          )}
        />
      )}
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
        <button
          type="button"
          draggable={!isEditingName && !disableDnd}
          className={cn(
            "shrink-0 rounded p-1 -ml-1 text-muted-foreground",
            isEditingName
              ? "cursor-not-allowed opacity-40"
              : "cursor-grab active:cursor-grabbing hover:text-foreground",
          )}
          onDragStart={disableDnd ? undefined : onDragStartList}
          onDragEnd={disableDnd ? undefined : onDragEndList}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </button>

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
          {cards.length}
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
          {cards.map((card, index) => {
            const locked = isCardLocked(card.id);
            const lockInfo = getCardLock(card.id);
            const isDragging = isCardDrag && dragState?.cardId === card.id;

            return (
              <React.Fragment key={card.id}>
                {!disableDnd ? (
                  <DropZone
                    isActive={
                      isCardDrag &&
                      (!isDragFromHere ||
                        (index !== dragState?.index &&
                          index !== dragState?.index + 1))
                    }
                    onDrop={(e) => onDropToIndex(e, index)}
                  />
                ) : null}
                <div className="group">
                  <ScrumCard
                    card={card}
                    onClick={() => onEditCard(card)}
                    onDragStart={
                      disableDnd
                        ? undefined
                        : (e) => onDragStartCard(e, card.id, index)
                    }
                    onDragEnd={disableDnd ? undefined : onDragEndCard}
                    isLocked={locked}
                    lockInfo={lockInfo}
                    listColor={list.color}
                    storyKey={storyKeyByCardId?.[card.id]}
                    sprintName={
                      card.sprintId ? sprintNameById?.[card.sprintId] : null
                    }
                    isDragging={isDragging}
                    draggableEnabled={!disableDnd}
                  />
                </div>
              </React.Fragment>
            );
          })}
          {!disableDnd ? (
            <DropZone
              isActive={
                isCardDrag &&
                (!isDragFromHere || dragState?.index !== list.cards.length - 1)
              }
              onDrop={(e) => onDropToIndex(e, list.cards.length)}
            />
          ) : null}

          {cards.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Circle className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>
                {isFilteredEmpty ? "No matching stories" : "No stories yet"}
              </p>
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
}
