import React, { useState, useRef, useCallback } from "react";
import { useEditorStore } from "../../../stores/editorStore";
import { CanvasElement } from "./CanvasElement";
import { DropZone } from "./DropZone";

export function Canvas() {
  const containerRef = useRef(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Canvas state
  const elements = useEditorStore((s) => s.canvas.elements);
  const selectedIds = useEditorStore((s) => s.canvas.selectedIds);
  const hoveredId = useEditorStore((s) => s.canvas.hoveredId);

  // Actions
  const addElement = useEditorStore((s) => s.addElement);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const setHovered = useEditorStore((s) => s.setHovered);

  // Handle drop from design panel
  const handleDrop = useCallback(
    (e, index = null) => {
      e.preventDefault();
      setDragOverIndex(null);

      try {
        const data = JSON.parse(e.dataTransfer.getData("application/json"));
        if (data && data.type) {
          addElement(data, null, index);
        }
      } catch (err) {
        console.error("Drop error:", err);
      }
    },
    [addElement]
  );

  const handleDragOver = useCallback((e, index = null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  // Click on empty canvas to deselect
  const handleCanvasClick = (e) => {
    if (e.target === containerRef.current || e.target.classList.contains("canvas-empty")) {
      clearSelection();
    }
  };

  const isEmpty = elements.length === 0;

  return (
    <div
      ref={containerRef}
      className="min-h-[600px] relative"
      onClick={handleCanvasClick}
      onDrop={(e) => handleDrop(e, elements.length)}
      onDragOver={(e) => handleDragOver(e, elements.length)}
      onDragLeave={handleDragLeave}
    >
      {isEmpty ? (
        <div
          className={`canvas-empty flex flex-col items-center justify-center h-[600px] border-2 border-dashed transition-colors ${
            dragOverIndex !== null
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/20"
          }`}
        >
          <div className="text-center pointer-events-none">
            <div className="text-muted-foreground text-lg mb-2">
              Drag components here
            </div>
            <div className="text-muted-foreground/60 text-sm">
              Drop components from the left panel to start building
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 space-y-0">
          {elements.map((element, index) => (
            <React.Fragment key={element.id}>
              {/* Drop zone before element */}
              <DropZone
                index={index}
                isActive={dragOverIndex === index}
                onDrop={(e) => handleDrop(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
              />

              {/* Element */}
              <CanvasElement
                element={element}
                isSelected={selectedIds.includes(element.id)}
                isHovered={hoveredId === element.id}
              />
            </React.Fragment>
          ))}

          {/* Drop zone after last element */}
          <DropZone
            index={elements.length}
            isActive={dragOverIndex === elements.length}
            onDrop={(e) => handleDrop(e, elements.length)}
            onDragOver={(e) => handleDragOver(e, elements.length)}
            onDragLeave={handleDragLeave}
          />
        </div>
      )}
    </div>
  );
}
