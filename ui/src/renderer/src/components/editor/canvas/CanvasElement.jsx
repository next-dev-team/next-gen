import React, { useMemo } from "react";
import { useEditorStore } from "../../../stores/editorStore";
import { ComponentRenderer } from "./ComponentRenderer";

export function CanvasElement({ element, isSelected, isHovered }) {
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

  // Build outline classes
  const outlineClasses = useMemo(() => {
    if (isSelected) {
      return "ring-2 ring-primary ring-offset-1";
    }
    if (isHovered) {
      return "ring-1 ring-primary/50";
    }
    return "";
  }, [isSelected, isHovered]);

  return (
    <div
      className={`relative cursor-pointer transition-all ${outlineClasses}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-element-id={element.id}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -top-6 left-0 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-t font-medium z-10">
          {element.type}
        </div>
      )}

      {/* Rendered component */}
      <ComponentRenderer element={element} />

      {/* Resize handles (for selected elements) */}
      {isSelected && (
        <>
          <div className="absolute top-0 left-0 w-2 h-2 bg-primary rounded-full -translate-x-1/2 -translate-y-1/2 cursor-nw-resize" />
          <div className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-full translate-x-1/2 -translate-y-1/2 cursor-ne-resize" />
          <div className="absolute bottom-0 left-0 w-2 h-2 bg-primary rounded-full -translate-x-1/2 translate-y-1/2 cursor-sw-resize" />
          <div className="absolute bottom-0 right-0 w-2 h-2 bg-primary rounded-full translate-x-1/2 translate-y-1/2 cursor-se-resize" />
        </>
      )}
    </div>
  );
}
