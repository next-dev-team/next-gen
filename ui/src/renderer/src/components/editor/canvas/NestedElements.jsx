import React, { useState, useRef, useCallback, useMemo } from "react";
import {
  Plus,
  Trash2,
  GripVertical,
  Type,
  MousePointerClick,
  ChevronDown,
  ChevronRight,
  Move,
  Copy,
} from "lucide-react";
import { Button } from "../../ui/button";
import { useEditorStore } from "../../../stores/editorStore";
import { getBlockById } from "../../../data/blocks";
import { getComponentById as getShadcnComponent } from "../../../data/shadcnComponents";

/**
 * ElementDropZone - Allows dropping elements INTO a container (block)
 */
export function ElementDropZone({
  parentId,
  index,
  isActive,
  orientation = "horizontal",
  label = "Drop here",
  acceptTypes = ["component", "block"],
}) {
  const addElement = useEditorStore((s) => s.addElement);

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json"));
      if (data && data.type) {
        // Add element as child of parent at specific index
        addElement(data, parentId, index);
      }
    } catch (err) {
      console.error("Drop error:", err);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  };

  return (
    <div
      className={`
        transition-all duration-200
        ${orientation === "horizontal" ? "h-2 my-1 w-full" : "w-2 mx-1 h-full"}
        ${
          isActive
            ? "bg-primary/30 border-2 border-dashed border-primary rounded"
            : "hover:bg-primary/10 border border-dashed border-transparent hover:border-primary/30 rounded"
        }
      `}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {isActive && (
        <div className="text-[10px] text-primary text-center py-0.5">
          {label}
        </div>
      )}
    </div>
  );
}

/**
 * NestedElement - Renders a child element within a container with selection support
 */
export function NestedElement({
  element,
  parentId,
  index,
  depth = 0,
  onSelect,
  isSelected,
  isParentSelected,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const setSelection = useEditorStore((s) => s.setSelection);
  const updateElement = useEditorStore((s) => s.updateElement);
  const deleteElements = useEditorStore((s) => s.deleteElements);
  const addElement = useEditorStore((s) => s.addElement);

  // Get component definition
  const componentDef = useMemo(() => {
    return (
      getShadcnComponent(element.type) || getBlockById(element.type) || null
    );
  }, [element.type]);

  const handleClick = (e) => {
    e.stopPropagation();
    setSelection([element.id]);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    deleteElements([element.id]);
  };

  // Check if this element can accept children
  const canAcceptChildren =
    componentDef?.canAcceptChildren ??
    ["container", "section", "card", "flex", "grid"].some((t) =>
      element.type.includes(t)
    );

  // Handle drop INTO this element
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (!canAcceptChildren) return;

    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json"));
      if (data && data.type) {
        addElement(data, element.id, element.children?.length || 0);
      }
    } catch (err) {
      console.error("Nested drop error:", err);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (canAcceptChildren) {
      setIsDragOver(true);
      e.dataTransfer.dropEffect = "copy";
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const typeLabel = element.type
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return (
    <div
      className={`
        relative transition-all rounded-md
        ${
          isSelected
            ? "ring-2 ring-primary ring-offset-1"
            : isHovered
            ? "ring-1 ring-primary/50"
            : ""
        }
        ${isDragOver ? "ring-2 ring-primary ring-dashed bg-primary/5" : ""}
        ${isParentSelected ? "cursor-pointer" : ""}
      `}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      style={{ marginLeft: depth * 8 }}
    >
      {/* Element label badge */}
      {(isSelected || isHovered) && (
        <div className="absolute -top-5 left-0 z-10 flex items-center gap-1">
          <div
            className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
              isSelected
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {typeLabel}
          </div>
          {isSelected && (
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}

      {/* Render element content */}
      <div
        className={`${canAcceptChildren && isDragOver ? "min-h-[40px]" : ""}`}
      >
        {/* The actual element rendering happens here via ComponentRenderer */}
        {element.children && element.children.length > 0 && (
          <div className="space-y-1 p-2">
            {element.children.map((child, idx) => (
              <NestedElement
                key={child.id}
                element={child}
                parentId={element.id}
                index={idx}
                depth={depth + 1}
                onSelect={onSelect}
                isSelected={false} // Would need to check from store
                isParentSelected={isSelected}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ContainerBlock - A block that can accept child elements via drag-drop
 */
export function ContainerBlock({
  element,
  isSelected,
  children,
  layout = "vertical", // "vertical" | "horizontal" | "grid"
  acceptTypes = [
    "button",
    "heading",
    "paragraph",
    "input",
    "card",
    "badge",
    "separator",
  ],
  emptyMessage = "Drag elements here to add content",
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const addElement = useEditorStore((s) => s.addElement);
  const setSelection = useEditorStore((s) => s.setSelection);
  const selectedIds = useEditorStore((s) => s.canvas.selectedIds);

  const handleDrop = (e, index = null) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragOverIndex(null);

    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json"));
      if (data && data.type) {
        // Add as child of this container
        addElement(data, element.id, index ?? (element.children?.length || 0));
      }
    } catch (err) {
      console.error("Container drop error:", err);
    }
  };

  const handleDragOver = (e, index = null) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
    setDragOverIndex(index);
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDragLeave = (e) => {
    // Only set to false if leaving the container entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
      setDragOverIndex(null);
    }
  };

  const childElements = element.children || [];
  const isEmpty = childElements.length === 0;

  // Layout class based on layout prop
  const layoutClass =
    layout === "horizontal"
      ? "flex flex-row flex-wrap gap-4 items-center"
      : layout === "grid"
      ? "grid grid-cols-2 md:grid-cols-3 gap-4"
      : "flex flex-col gap-2";

  return (
    <div
      className={`
        relative min-h-[60px] rounded-lg transition-all
        ${isDragOver ? "bg-primary/5 ring-2 ring-primary ring-dashed" : ""}
        ${isSelected ? "ring-2 ring-primary" : ""}
      `}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Container content */}
      <div className={layoutClass}>
        {isEmpty ? (
          // Empty state - show drop hint
          <div
            className={`
              flex-1 min-h-[80px] flex items-center justify-center
              border-2 border-dashed rounded-lg transition-colors
              ${
                isDragOver
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-muted-foreground/30 text-muted-foreground/50"
              }
            `}
          >
            <div className="text-center py-4">
              <Plus className="h-6 w-6 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{emptyMessage}</p>
              {isSelected && (
                <p className="text-xs mt-1">
                  Drag components from the left panel
                </p>
              )}
            </div>
          </div>
        ) : (
          // Render children with drop zones between them
          <>
            {/* Drop zone before first child */}
            <ElementDropZone
              parentId={element.id}
              index={0}
              isActive={dragOverIndex === 0}
              orientation={layout === "horizontal" ? "vertical" : "horizontal"}
            />

            {childElements.map((child, index) => (
              <React.Fragment key={child.id}>
                {/* Child element */}
                <NestedElement
                  element={child}
                  parentId={element.id}
                  index={index}
                  isSelected={selectedIds.includes(child.id)}
                  isParentSelected={isSelected}
                />

                {/* Drop zone after each child */}
                <ElementDropZone
                  parentId={element.id}
                  index={index + 1}
                  isActive={dragOverIndex === index + 1}
                  orientation={
                    layout === "horizontal" ? "vertical" : "horizontal"
                  }
                />
              </React.Fragment>
            ))}
          </>
        )}
      </div>

      {/* Selection hint for container */}
      {isSelected && isEmpty && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded whitespace-nowrap">
          Drop Button, Text, or any component
        </div>
      )}
    </div>
  );
}

/**
 * EditableText - Click to edit text inline
 */
export function EditableText({
  value,
  onChange,
  placeholder = "Click to edit...",
  className = "",
  as: Tag = "span",
  multiline = false,
  editable = true,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || "");
  const inputRef = useRef(null);

  const startEditing = useCallback(
    (e) => {
      if (!editable) return;
      e.stopPropagation();
      setEditValue(value || "");
      setIsEditing(true);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    },
    [value, editable]
  );

  const stopEditing = useCallback(() => {
    setIsEditing(false);
    if (editValue !== value) {
      onChange?.(editValue);
    }
  }, [editValue, onChange, value]);

  const handleKeyDown = useCallback(
    (e) => {
      e.stopPropagation();
      if (e.key === "Enter" && !multiline) {
        e.preventDefault();
        stopEditing();
      }
      if (e.key === "Escape") {
        setEditValue(value || "");
        setIsEditing(false);
      }
    },
    [multiline, stopEditing, value]
  );

  if (isEditing) {
    const props = {
      ref: inputRef,
      value: editValue,
      onChange: (e) => setEditValue(e.target.value),
      onBlur: stopEditing,
      onKeyDown: handleKeyDown,
      onClick: (e) => e.stopPropagation(),
      className: `${className} bg-transparent border-none outline-none ring-2 ring-primary rounded px-1 w-full`,
      placeholder,
    };

    if (multiline) {
      return (
        <textarea
          {...props}
          rows={3}
          className={`${props.className} resize-none`}
        />
      );
    }
    return <input type="text" {...props} />;
  }

  return (
    <Tag
      className={`${className} ${
        editable
          ? "cursor-text hover:bg-primary/10 rounded px-1 -mx-1 transition-colors"
          : ""
      } inline-block min-w-[20px]`}
      onClick={editable ? startEditing : undefined}
      title={editable ? "Click to edit" : undefined}
    >
      {value || (
        <span className="text-muted-foreground/50 italic">{placeholder}</span>
      )}
    </Tag>
  );
}

/**
 * AddElementButton - Floating button to add elements to a container
 */
export function AddElementButton({
  onAdd,
  options = [],
  position = "bottom",
  label = "Add Element",
}) {
  const [showMenu, setShowMenu] = useState(false);

  const defaultOptions = [
    { id: "button", label: "Button", icon: MousePointerClick },
    { id: "heading", label: "Heading", icon: Type },
    { id: "paragraph", label: "Paragraph", icon: Type },
    { id: "badge", label: "Badge", icon: Type },
    { id: "separator", label: "Divider", icon: Type },
  ];

  const menuOptions = options.length > 0 ? options : defaultOptions;

  return (
    <div
      className={`flex justify-center ${
        position === "bottom" ? "mt-4" : "mb-4"
      } relative`}
    >
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1 border-dashed hover:border-solid bg-background"
        onClick={() => setShowMenu(!showMenu)}
      >
        <Plus className="h-3 w-3" />
        {label}
        <ChevronDown className="h-3 w-3" />
      </Button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute top-full mt-1 bg-popover border rounded-md shadow-lg z-50 py-1 min-w-[140px]">
            {menuOptions.map((option) => {
              const Icon = option.icon || Type;
              return (
                <button
                  key={option.id}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted text-left"
                  onClick={() => {
                    onAdd?.(option.id);
                    setShowMenu(false);
                  }}
                >
                  <Icon className="h-4 w-4" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
