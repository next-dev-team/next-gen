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
  const previewMode = useEditorStore((s) => s.ui.previewMode);

  // Actions
  const addElement = useEditorStore((s) => s.addElement);
  const clearSelection = useEditorStore((s) => s.clearSelection);

  // Handle drop from design panel
  const handleDrop = useCallback(
    (e, index = null) => {
      if (previewMode) return;
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
    [addElement, previewMode]
  );

  const handleDragOver = useCallback((e, index = null) => {
    if (previewMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragOverIndex(index);
  }, [previewMode]);

  const handleDragLeave = useCallback(() => {
    if (previewMode) return;
    setDragOverIndex(null);
  }, [previewMode]);

  // Click on empty canvas to deselect
  const handleCanvasClick = (e) => {
    if (previewMode) return;
    if (e.target === containerRef.current || e.target.classList.contains("canvas-empty")) {
      clearSelection();
    }
  };

  const isEmpty = elements.length === 0;

  return (
    <div
      ref={containerRef}
      className="min-h-[600px] relative"
      onClick={previewMode ? undefined : handleCanvasClick}
      onDrop={previewMode ? undefined : (e) => handleDrop(e, elements.length)}
      onDragOver={previewMode ? undefined : (e) => handleDragOver(e, elements.length)}
      onDragLeave={previewMode ? undefined : handleDragLeave}
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
              {!previewMode && (
                <DropZone
                  index={index}
                  isActive={dragOverIndex === index}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                />
              )}

              {/* Element */}
              <CanvasElement
                element={element}
                isSelected={!previewMode && selectedIds.includes(element.id)}
                isHovered={!previewMode && hoveredId === element.id}
              />
            </React.Fragment>
          ))}

          {/* Drop zone after last element */}
          {!previewMode && (
            <DropZone
              index={elements.length}
              isActive={dragOverIndex === elements.length}
              onDrop={(e) => handleDrop(e, elements.length)}
              onDragOver={(e) => handleDragOver(e, elements.length)}
              onDragLeave={handleDragLeave}
            />
          )}
        </div>
      )}
    </div>
  );
}
