import React, { useMemo, useState, useCallback } from "react";
import { useEditorStore } from "../../../stores/editorStore";
import { ComponentRenderer } from "./ComponentRenderer";
import { ContextMenu } from "./ContextMenu";

export function CanvasElement({ element, isSelected, isHovered }) {
  const [contextMenu, setContextMenu] = useState(null);

  const setSelection = useEditorStore((s) => s.setSelection);
  const addToSelection = useEditorStore((s) => s.addToSelection);
  const setHovered = useEditorStore((s) => s.setHovered);

  const handleClick = (e) => {
    e.stopPropagation();

    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      addToSelection(element.id);
    } else {
      setSelection([element.id]);
    }
  };

  const handleMouseEnter = () => {
    setHovered(element.id);
  };

  const handleMouseLeave = () => {
    setHovered(null);
  };

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    // Select the element if not already selected
    setSelection([element.id]);

    // Show context menu at cursor position
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
    });
  }, [element.id, setSelection]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Build outline classes
  const outlineClasses = useMemo(() => {
    if (isSelected) {
      return "ring-2 ring-primary ring-offset-2 ring-offset-background";
    }
    if (isHovered) {
      return "ring-1 ring-primary/50 ring-offset-1 ring-offset-background";
    }
    return "";
  }, [isSelected, isHovered]);

  // Calculate element type label
  const typeLabel = element.type
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return (
    <>
      <div
        className={`relative transition-all rounded-sm ${outlineClasses}`}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
        data-element-id={element.id}
        data-element-type={element.type}
      >
        {/* Selection indicator label */}
        {isSelected && (
          <div className="absolute -top-7 left-0 z-20 flex items-center gap-1">
            <div className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-t font-medium shadow-sm">
              {typeLabel}
            </div>
            <div className="bg-muted text-muted-foreground text-[10px] px-1.5 py-0.5 rounded font-mono">
              {element.id.slice(0, 6)}
            </div>
          </div>
        )}

        {/* Hover indicator */}
        {isHovered && !isSelected && (
          <div className="absolute -top-6 left-0 z-10">
            <div className="bg-primary/80 text-primary-foreground text-[10px] px-2 py-0.5 rounded font-medium">
              {typeLabel}
            </div>
          </div>
        )}

        {/* Rendered component - pass isSelected for inline editing */}
        <ComponentRenderer element={element} isSelected={isSelected} />

        {/* Resize handles (for selected elements) */}
        {isSelected && (
          <>
            {/* Corner handles */}
            <div className="absolute top-0 left-0 w-2 h-2 bg-primary rounded-full -translate-x-1/2 -translate-y-1/2 cursor-nw-resize z-20 shadow" />
            <div className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-full translate-x-1/2 -translate-y-1/2 cursor-ne-resize z-20 shadow" />
            <div className="absolute bottom-0 left-0 w-2 h-2 bg-primary rounded-full -translate-x-1/2 translate-y-1/2 cursor-sw-resize z-20 shadow" />
            <div className="absolute bottom-0 right-0 w-2 h-2 bg-primary rounded-full translate-x-1/2 translate-y-1/2 cursor-se-resize z-20 shadow" />
            
            {/* Edge handles */}
            <div className="absolute top-0 left-1/2 w-2 h-2 bg-primary rounded-full -translate-x-1/2 -translate-y-1/2 cursor-n-resize z-20 shadow" />
            <div className="absolute bottom-0 left-1/2 w-2 h-2 bg-primary rounded-full -translate-x-1/2 translate-y-1/2 cursor-s-resize z-20 shadow" />
            <div className="absolute top-1/2 left-0 w-2 h-2 bg-primary rounded-full -translate-x-1/2 -translate-y-1/2 cursor-w-resize z-20 shadow" />
            <div className="absolute top-1/2 right-0 w-2 h-2 bg-primary rounded-full translate-x-1/2 -translate-y-1/2 cursor-e-resize z-20 shadow" />
          </>
        )}

        {/* Click indicator - shows "Double-click to edit" on selected elements */}
        {isSelected && (
          <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 z-20">
            <div className="bg-muted text-muted-foreground text-[10px] px-2 py-0.5 rounded whitespace-nowrap shadow-sm">
              Double-click to edit • Right-click for menu
            </div>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          element={element}
          position={contextMenu}
          onClose={closeContextMenu}
        />
      )}
    </>
  );
}
