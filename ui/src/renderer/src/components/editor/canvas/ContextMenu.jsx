import React from "react";
import {
  Copy,
  Trash2,
  Code,
  Layers,
  ChevronUp,
  ChevronDown,
  Clipboard,
  Edit3,
  Eye,
  Terminal,
} from "lucide-react";
import { useEditorStore } from "../../../stores/editorStore";
import { generateElementCode, copyToClipboard } from "../../../utils/codeGenerator";
import { getComponentById } from "../../../data/shadcnComponents";
import { getBlockById } from "../../../data/blocks";

export function ContextMenu({ element, position, onClose }) {
  const deleteElements = useEditorStore((s) => s.deleteElements);
  const duplicateElements = useEditorStore((s) => s.duplicateElements);
  const moveElement = useEditorStore((s) => s.moveElement);
  const copyToClipboardStore = useEditorStore((s) => s.copyToClipboard);
  const elements = useEditorStore((s) => s.canvas.elements);

  if (!element || !position) return null;

  // Find element index for move actions
  const elementIndex = elements.findIndex((el) => el.id === element.id);
  const canMoveUp = elementIndex > 0;
  const canMoveDown = elementIndex < elements.length - 1;

  // Get CLI command
  const componentDef = getComponentById(element.type) || getBlockById(element.type);
  const cliCommand = componentDef?.cli || "";

  const handleCopyCode = async () => {
    const code = generateElementCode(element);
    await copyToClipboard(code);
    onClose();
  };

  const handleCopyCli = async () => {
    if (cliCommand) {
      await copyToClipboard(cliCommand);
    }
    onClose();
  };

  const handleDuplicate = () => {
    duplicateElements([element.id]);
    onClose();
  };

  const handleDelete = () => {
    deleteElements([element.id]);
    onClose();
  };

  const handleMoveUp = () => {
    if (canMoveUp) {
      moveElement(element.id, null, elementIndex - 1);
    }
    onClose();
  };

  const handleMoveDown = () => {
    if (canMoveDown) {
      moveElement(element.id, null, elementIndex + 2);
    }
    onClose();
  };

  const handleCopyElement = () => {
    copyToClipboardStore();
    onClose();
  };

  const menuItems = [
    { type: "header", label: element.type },
    { type: "separator" },
    {
      icon: Code,
      label: "Copy Code",
      shortcut: "⌘C",
      onClick: handleCopyCode,
    },
    ...(cliCommand
      ? [
          {
            icon: Terminal,
            label: "Copy CLI Command",
            onClick: handleCopyCli,
          },
        ]
      : []),
    { type: "separator" },
    {
      icon: Clipboard,
      label: "Copy Element",
      onClick: handleCopyElement,
    },
    {
      icon: Copy,
      label: "Duplicate",
      shortcut: "⌘D",
      onClick: handleDuplicate,
    },
    { type: "separator" },
    {
      icon: ChevronUp,
      label: "Move Up",
      disabled: !canMoveUp,
      onClick: handleMoveUp,
    },
    {
      icon: ChevronDown,
      label: "Move Down",
      disabled: !canMoveDown,
      onClick: handleMoveDown,
    },
    { type: "separator" },
    {
      icon: Trash2,
      label: "Delete",
      shortcut: "Del",
      danger: true,
      onClick: handleDelete,
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />

      {/* Menu */}
      <div
        className="fixed z-50 min-w-[200px] bg-popover border rounded-lg shadow-lg py-1 overflow-hidden"
        style={{
          left: position.x,
          top: position.y,
        }}
      >
        {menuItems.map((item, index) => {
          if (item.type === "header") {
            return (
              <div
                key={index}
                className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                {item.label}
              </div>
            );
          }

          if (item.type === "separator") {
            return <div key={index} className="h-px bg-border my-1" />;
          }

          const Icon = item.icon;
          return (
            <button
              key={index}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent transition-colors ${
                item.disabled
                  ? "opacity-50 cursor-not-allowed"
                  : item.danger
                  ? "text-destructive hover:text-destructive"
                  : ""
              }`}
              onClick={item.disabled ? undefined : item.onClick}
              disabled={item.disabled}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.shortcut && (
                <span className="text-xs text-muted-foreground">
                  {item.shortcut}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
