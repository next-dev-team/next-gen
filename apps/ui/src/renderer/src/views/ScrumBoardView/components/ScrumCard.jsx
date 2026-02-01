/**
 * ScrumCard Component
 *
 * Individual card displayed in the kanban board.
 * Features: drag and drop, lock indicator, priority, attachments preview.
 */

import * as React from "react";
import { toast } from "sonner";
import {
  User,
  Calendar,
  Paperclip,
  Check,
  Copy,
  Lock,
  Pencil,
} from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../../components/ui/tooltip";
import { cn } from "../../../lib/utils";
import { PRIORITY_CONFIG } from "../constants";

export default function ScrumCard({
  card,
  onClick,
  onDragStart,
  onDragEnd,
  isLocked,
  lockInfo,
  listColor,
  storyKey,
  sprintName,
  isDragging,
  draggableEnabled = true,
}) {
  const [copied, setCopied] = React.useState(false);
  const priorityConfig =
    PRIORITY_CONFIG[card.priority] || PRIORITY_CONFIG.medium;

  const handleCopyStoryId = React.useCallback(
    async (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (!storyKey) return;
      const text = `scrum-kanban/scrum_get_story_by_id here is id: ${storyKey}`;
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    },
    [storyKey],
  );

  const coverImage = card.attachments?.find((a) =>
    a.type?.startsWith("image/"),
  );
  const otherImages =
    card.attachments?.filter(
      (a) => a.type?.startsWith("image/") && a.id !== coverImage?.id,
    ) || [];

  return (
    <Card
      draggable={!isLocked && draggableEnabled}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "cursor-grab active:cursor-grabbing transition-all duration-300 ease-in-out group",
        "hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30",
        "bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden",
        isLocked && "opacity-60 cursor-not-allowed ring-2 ring-amber-500/50",
        isDragging &&
          "opacity-20 scale-95 border-primary/40 grayscale shadow-none",
      )}
    >
      {coverImage && (
        <div className="relative w-full h-32 overflow-hidden border-b border-border/30 group/cover">
          <img
            src={coverImage.data}
            alt={coverImage.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover/cover:scale-105"
          />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const text = `story img id: ${coverImage.id}`;
              navigator.clipboard.writeText(text);
              toast.success(`Copied image ID: ${coverImage.id}`);
            }}
            className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm border border-border/50 rounded-full px-2 py-0.5 text-[10px] font-mono text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all shadow-sm z-10 opacity-0 group-hover/cover:opacity-100"
            title={`Copy ID: ${coverImage.id}`}
          >
            {coverImage.id}
          </button>
        </div>
      )}
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <button
            type="button"
            className="flex-1 text-left"
            onClick={(e) => {
              handleCopyStoryId(e);
              onClick(e);
            }}
            disabled={isLocked}
          >
            <div className="flex items-center gap-2">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: listColor || "#6b7280" }}
              />
              {storyKey && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 tabular-nums shrink-0"
                >
                  #{storyKey.split(":").pop()}
                </Badge>
              )}
              <span className="font-medium text-sm text-foreground leading-snug line-clamp-2">
                {card.title}
              </span>
            </div>
            {card.description && (
              <div className="text-xs text-muted-foreground line-clamp-2 mt-1.5 pl-3.5">
                {card.description}
              </div>
            )}
            {otherImages.length > 0 && (
              <div className="mt-2 pl-3.5 flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                {otherImages.slice(0, 4).map((img) => (
                  <div
                    key={img.id}
                    className="relative w-20 h-20 shrink-0 rounded-md border border-border/30 overflow-hidden bg-muted/50 group/img"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const text = `story img id: ${img.id}`;
                        navigator.clipboard.writeText(text);
                        toast.success(`Copied image ID: ${img.id}`);
                      }}
                      className="absolute top-1 right-1 bg-background/80 backdrop-blur-sm border border-border/50 rounded-full px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all shadow-sm z-10"
                      title={`Copy ID: ${img.id}`}
                    >
                      {img.id}
                    </button>
                    <img
                      src={img.data}
                      alt={img.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-110"
                    />
                  </div>
                ))}
                {otherImages.length > 4 && (
                  <div className="w-20 h-20 shrink-0 rounded-md border border-border/30 bg-muted/30 flex items-center justify-center text-[10px] text-muted-foreground font-medium">
                    +{otherImages.length - 4}
                  </div>
                )}
              </div>
            )}
          </button>

          <div className="flex items-center gap-1 shrink-0">
            {storyKey && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:opacity-100"
                onClick={handleCopyStoryId}
                disabled={!storyKey}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            )}

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
                className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:opacity-100"
                onClick={onClick}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {(card.assignee ||
          card.points !== null ||
          (card.labels && card.labels.length) ||
          card.priority ||
          (card.attachments && card.attachments.length > 0)) && (
          <div className="mt-2.5 pt-2.5 border-t border-border/30 flex flex-wrap items-center gap-1.5">
            {sprintName ? (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                <Calendar className="h-2.5 w-2.5 mr-1" />
                {sprintName}
              </Badge>
            ) : null}
            {card.priority && card.priority !== "medium" && (
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] px-1.5 py-0",
                  priorityConfig.textColor,
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
            {card.attachments && card.attachments.length > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                <Paperclip className="h-2.5 w-2.5 mr-1" />
                {card.attachments.length}
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
}
