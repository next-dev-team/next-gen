import React from "react";

export function DropZone({ index, isActive, onDrop, onDragOver, onDragLeave }) {
  return (
    <div
      className={`h-1 -my-0.5 mx-2 rounded-full transition-all ${
        isActive
          ? "h-3 bg-primary/30 border-2 border-dashed border-primary my-2"
          : "bg-transparent"
      }`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      data-drop-index={index}
    />
  );
}
