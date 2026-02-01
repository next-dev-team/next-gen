/**
 * CreateBoardDialog Component
 *
 * Dialog for creating a new kanban board with template selection.
 */

import * as React from "react";
import { Plus, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { cn } from "../../../lib/utils";
import { BOARD_TEMPLATES } from "../constants";

export default function CreateBoardDialog({
  open,
  onOpenChange,
  onCreateBoard,
}) {
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
                        : "border-border/50 bg-background/30",
                    )}
                    onClick={() => {
                      setSelectedTemplate(template.id);
                      navigator.clipboard
                        .writeText(template.id)
                        .catch(() => {});
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "p-2 rounded-lg",
                          selectedTemplate === template.id
                            ? "bg-primary/20 text-primary"
                            : "bg-muted text-muted-foreground",
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
                      {template.lists?.map((list, i) => (
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
}
