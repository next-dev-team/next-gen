import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import {
  Plus,
  Move,
  Type,
  LayoutGrid,
  Image,
  Square,
  MousePointerClick,
  Search,
  ChevronRight,
  ChevronDown,
  FormInput,
  Table,
  Bell,
  Menu,
  Layers,
  Grid3X3,
  Magnet,
  ZoomIn,
} from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { ScrollArea } from "../../ui/scroll-area";
import { Badge } from "../../ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../ui/tooltip";
import { useEditorStore } from "../../../stores/editorStore";
import {
  shadcnComponents,
  shadcnCategories,
} from "../../../data/shadcnComponents";
import { blocks, blockCategories } from "../../../data/blocks";
import { ComponentRenderer } from "./ComponentRenderer";

// Icon mapping for categories
const categoryIcons = {
  inputs: FormInput,
  layout: LayoutGrid,
  "data-display": Table,
  feedback: Bell,
  navigation: Menu,
  overlay: Layers,
  typography: Type,
};

// Snap threshold in pixels
const SNAP_THRESHOLD = 10;
const GRID_SIZE = 20;

/**
 * SelectionBox - Marquee selection component
 */
function SelectionBox({ start, end }) {
  if (!start || !end) return null;

  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  return (
    <div
      className="absolute border-2 border-primary bg-primary/10 pointer-events-none z-50"
      style={{ left, top, width, height }}
    />
  );
}

/**
 * SnapGuides - Visual snap guides
 */
function SnapGuides({ guides }) {
  if (!guides || guides.length === 0) return null;

  return (
    <>
      {guides.map((guide, index) => (
        <div
          key={index}
          className="absolute bg-primary/50 pointer-events-none z-40"
          style={
            guide.orientation === "horizontal"
              ? { left: 0, right: 0, top: guide.position, height: 1 }
              : { top: 0, bottom: 0, left: guide.position, width: 1 }
          }
        />
      ))}
    </>
  );
}

/**
 * DraggableElement - Makes any element draggable and resizable on canvas
 */
export function DraggableElement({
  element,
  children,
  isSelected,
  isHovered,
  onSelect,
  onPositionChange,
  onSizeChange,
  onDragStart,
  onDragEnd,
  snapEnabled = true,
  gridEnabled = false,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [elementStart, setElementStart] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const elementRef = useRef(null);

  // Get position from element style or default
  const x = element.style?.x ?? element.style?.left ?? 0;
  const y = element.style?.y ?? element.style?.top ?? 0;
  const width = element.style?.width;
  const height = element.style?.height;
  const rotation = element.style?.rotation ?? 0;
  const opacity = element.style?.opacity ?? 1;

  // Snap to grid helper
  const snapToGrid = useCallback(
    (value) => {
      if (!gridEnabled) return value;
      return Math.round(value / GRID_SIZE) * GRID_SIZE;
    },
    [gridEnabled]
  );

  // Handle mouse down on element (start drag)
  const handleMouseDown = useCallback(
    (e) => {
      if (
        e.target.closest(".resize-handle") ||
        e.target.closest("input") ||
        e.target.closest("textarea")
      ) {
        return;
      }

      e.stopPropagation();
      onSelect?.(e);

      if (isSelected) {
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        setElementStart({
          x,
          y,
          width: elementRef.current?.offsetWidth || 0,
          height: elementRef.current?.offsetHeight || 0,
        });
        onDragStart?.();
      }
    },
    [isSelected, onSelect, x, y, onDragStart]
  );

  // Handle resize start
  const handleResizeStart = useCallback(
    (e, handle) => {
      e.stopPropagation();
      e.preventDefault();
      setIsResizing(true);
      setResizeHandle(handle);
      setDragStart({ x: e.clientX, y: e.clientY });
      setElementStart({
        x,
        y,
        width: elementRef.current?.offsetWidth || 200,
        height: elementRef.current?.offsetHeight || 100,
      });
    },
    [x, y]
  );

  // Handle mouse move
  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      if (isDragging) {
        let newX = elementStart.x + deltaX;
        let newY = elementStart.y + deltaY;

        // Snap to grid if enabled
        newX = snapToGrid(newX);
        newY = snapToGrid(newY);

        onPositionChange?.({
          x: Math.max(0, newX),
          y: Math.max(0, newY),
        });
      }

      if (isResizing) {
        let newWidth = elementStart.width;
        let newHeight = elementStart.height;
        let newX = elementStart.x;
        let newY = elementStart.y;

        if (resizeHandle.includes("e"))
          newWidth = Math.max(50, elementStart.width + deltaX);
        if (resizeHandle.includes("w")) {
          newWidth = Math.max(50, elementStart.width - deltaX);
          newX = elementStart.x + deltaX;
        }
        if (resizeHandle.includes("s"))
          newHeight = Math.max(30, elementStart.height + deltaY);
        if (resizeHandle.includes("n")) {
          newHeight = Math.max(30, elementStart.height - deltaY);
          newY = elementStart.y + deltaY;
        }

        // Snap to grid if enabled
        newWidth = snapToGrid(newWidth);
        newHeight = snapToGrid(newHeight);

        onSizeChange?.({ width: newWidth, height: newHeight });
        if (resizeHandle.includes("w") || resizeHandle.includes("n")) {
          onPositionChange?.({ x: snapToGrid(newX), y: snapToGrid(newY) });
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeHandle(null);
      onDragEnd?.();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isDragging,
    isResizing,
    dragStart,
    elementStart,
    resizeHandle,
    onPositionChange,
    onSizeChange,
    onDragEnd,
    snapToGrid,
  ]);

  // Double-click to edit
  const handleDoubleClick = useCallback((e) => {
    e.stopPropagation();
    // Future: Enable inline text editing
  }, []);

  return (
    <div
      ref={elementRef}
      className={`
        absolute transition-shadow
        ${isSelected ? "ring-2 ring-primary z-20" : ""}
        ${isHovered && !isSelected ? "ring-1 ring-primary/50" : ""}
        ${!isSelected && !isHovered ? "z-10" : ""}
        ${
          isDragging
            ? "cursor-grabbing opacity-80"
            : isSelected
            ? "cursor-grab"
            : "cursor-pointer"
        }
      `}
      style={{
        left: x,
        top: y,
        width: width || "auto",
        height: height || "auto",
        minWidth: 50,
        minHeight: 30,
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        opacity,
        transformOrigin: "center center",
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      data-element-id={element.id}
    >
      {children}

      {/* Resize handles */}
      {isSelected && (
        <>
          {/* Corner handles */}
          <div
            className="resize-handle absolute -top-1.5 -left-1.5 w-3 h-3 bg-primary border-2 border-background rounded-sm cursor-nw-resize z-30 hover:scale-125 transition-transform"
            onMouseDown={(e) => handleResizeStart(e, "nw")}
          />
          <div
            className="resize-handle absolute -top-1.5 -right-1.5 w-3 h-3 bg-primary border-2 border-background rounded-sm cursor-ne-resize z-30 hover:scale-125 transition-transform"
            onMouseDown={(e) => handleResizeStart(e, "ne")}
          />
          <div
            className="resize-handle absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-primary border-2 border-background rounded-sm cursor-sw-resize z-30 hover:scale-125 transition-transform"
            onMouseDown={(e) => handleResizeStart(e, "sw")}
          />
          <div
            className="resize-handle absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-primary border-2 border-background rounded-sm cursor-se-resize z-30 hover:scale-125 transition-transform"
            onMouseDown={(e) => handleResizeStart(e, "se")}
          />

          {/* Edge handles */}
          <div
            className="resize-handle absolute top-1/2 -left-1.5 w-3 h-3 bg-primary border-2 border-background rounded-sm cursor-w-resize z-30 -translate-y-1/2 hover:scale-125 transition-transform"
            onMouseDown={(e) => handleResizeStart(e, "w")}
          />
          <div
            className="resize-handle absolute top-1/2 -right-1.5 w-3 h-3 bg-primary border-2 border-background rounded-sm cursor-e-resize z-30 -translate-y-1/2 hover:scale-125 transition-transform"
            onMouseDown={(e) => handleResizeStart(e, "e")}
          />
          <div
            className="resize-handle absolute -top-1.5 left-1/2 w-3 h-3 bg-primary border-2 border-background rounded-sm cursor-n-resize z-30 -translate-x-1/2 hover:scale-125 transition-transform"
            onMouseDown={(e) => handleResizeStart(e, "n")}
          />
          <div
            className="resize-handle absolute -bottom-1.5 left-1/2 w-3 h-3 bg-primary border-2 border-background rounded-sm cursor-s-resize z-30 -translate-x-1/2 hover:scale-125 transition-transform"
            onMouseDown={(e) => handleResizeStart(e, "s")}
          />

          {/* Element info tooltip */}
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] px-2 py-1 rounded flex items-center gap-1.5 z-30 whitespace-nowrap shadow-lg">
            <span className="font-medium">{element.type}</span>
            <span className="opacity-70">•</span>
            <span className="font-mono">
              {Math.round(x)}, {Math.round(y)}
            </span>
            {width && height && (
              <>
                <span className="opacity-70">•</span>
                <span className="font-mono">
                  {Math.round(width)}×{Math.round(height)}
                </span>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * FloatingToolbar - Add shadcn elements anywhere on canvas
 */
export function FloatingToolbar({ onAddElement, position = { x: 20, y: 20 } }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("components"); // "components" | "blocks"
  const [expandedCategories, setExpandedCategories] = useState({});

  const toggleCategory = (categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  // Filter components based on search
  const filteredComponents = shadcnComponents.filter(
    (comp) =>
      comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comp.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter blocks based on search
  const filteredBlocks = blocks.filter(
    (block) =>
      block.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      block.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group filtered components by category
  const groupedComponents = shadcnCategories
    .map((cat) => ({
      ...cat,
      components: filteredComponents.filter((c) => c.category === cat.id),
    }))
    .filter((cat) => cat.components.length > 0);

  // Group filtered blocks by category
  const groupedBlocks = blockCategories
    .map((cat) => ({
      ...cat,
      blocks: filteredBlocks.filter((b) => b.category === cat.id),
    }))
    .filter((cat) => cat.blocks.length > 0);

  const handleAddComponent = (component) => {
    onAddElement?.(component.id, component.defaultProps || {}, {
      x: 100,
      y: 100,
    });
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleAddBlock = (block) => {
    onAddElement?.(block.id, block.defaultProps || {}, { x: 100, y: 100 });
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="fixed z-50" style={{ left: position.x, top: position.y }}>
      <Button
        variant={isOpen ? "secondary" : "default"}
        size="sm"
        className="gap-1.5 shadow-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Plus className="h-4 w-4" />
        Add Element
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false);
              setSearchQuery("");
            }}
          />
          <div className="absolute top-full left-0 mt-2 bg-popover border rounded-lg shadow-xl z-50 w-[320px] max-h-[500px] flex flex-col">
            {/* Search */}
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search components and blocks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8"
                  autoFocus
                />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b">
              <button
                className={`flex-1 px-4 py-2 text-sm font-medium ${
                  activeTab === "components"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground"
                }`}
                onClick={() => setActiveTab("components")}
              >
                Components ({filteredComponents.length})
              </button>
              <button
                className={`flex-1 px-4 py-2 text-sm font-medium ${
                  activeTab === "blocks"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground"
                }`}
                onClick={() => setActiveTab("blocks")}
              >
                Blocks ({filteredBlocks.length})
              </button>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1 max-h-[380px]">
              <div className="p-2">
                {activeTab === "components" ? (
                  /* Components */
                  groupedComponents.length > 0 ? (
                    groupedComponents.map((category) => {
                      const Icon = categoryIcons[category.id] || LayoutGrid;
                      const isExpanded =
                        expandedCategories[category.id] ?? true;

                      return (
                        <div key={category.id} className="mb-2">
                          <button
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:bg-muted rounded"
                            onClick={() => toggleCategory(category.id)}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                            <Icon className="h-3 w-3" />
                            {category.name}
                            <span className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded">
                              {category.components.length}
                            </span>
                          </button>
                          {isExpanded && (
                            <div className="mt-1 space-y-0.5">
                              {category.components.map((comp) => (
                                <button
                                  key={comp.id}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded hover:bg-muted transition-colors text-left group"
                                  onClick={() => handleAddComponent(comp)}
                                >
                                  <span className="flex-1">{comp.name}</span>
                                  <Plus className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No components found
                    </p>
                  )
                ) : /* Blocks */
                groupedBlocks.length > 0 ? (
                  groupedBlocks.map((category) => {
                    const isExpanded =
                      expandedCategories[`block-${category.id}`] ?? true;

                    return (
                      <div key={category.id} className="mb-2">
                        <button
                          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:bg-muted rounded"
                          onClick={() => toggleCategory(`block-${category.id}`)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                          {category.name}
                          <span className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded">
                            {category.blocks.length}
                          </span>
                        </button>
                        {isExpanded && (
                          <div className="mt-1 space-y-0.5">
                            {category.blocks.map((block) => (
                              <button
                                key={block.id}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded hover:bg-muted transition-colors text-left group"
                                onClick={() => handleAddBlock(block)}
                              >
                                <span className="flex-1">{block.name}</span>
                                <Plus className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No blocks found
                  </p>
                )}
              </div>
            </ScrollArea>

            {/* Quick hint */}
            <div className="p-2 border-t bg-muted/30 text-[10px] text-muted-foreground">
              Right-click on canvas to add at cursor position
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * CanvasContextMenu - Right-click menu for adding elements at cursor position
 */
export function CanvasContextMenu({ position, onAddElement, onClose }) {
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (position) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [position]);

  if (!position) return null;

  // Get top shadcn components and blocks for quick add
  const quickComponents = shadcnComponents.slice(0, 8);
  const quickBlocks = blocks.slice(0, 4);

  // Filter if searching
  const filteredComponents = searchQuery
    ? shadcnComponents
        .filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 8)
    : quickComponents;

  const filteredBlocks = searchQuery
    ? blocks
        .filter((b) => b.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 4)
    : quickBlocks;

  const handleAdd = (item) => {
    onAddElement?.(item.id, item.defaultProps || {}, position);
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        className="fixed z-50 bg-popover border rounded-lg shadow-xl w-[280px] max-h-[400px] flex flex-col"
        style={{ left: position.x, top: position.y }}
      >
        {/* Search */}
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-7 text-sm"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 max-h-[320px]">
          <div className="p-1">
            {/* Components */}
            <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Components
            </div>
            {filteredComponents.map((comp) => (
              <button
                key={comp.id}
                className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted rounded transition-colors flex items-center gap-2"
                onClick={() => handleAdd(comp)}
              >
                <Plus className="h-3 w-3 text-muted-foreground" />
                {comp.name}
              </button>
            ))}

            {/* Blocks */}
            <div className="px-2 py-1 mt-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Blocks
            </div>
            {filteredBlocks.map((block) => (
              <button
                key={block.id}
                className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted rounded transition-colors flex items-center gap-2"
                onClick={() => handleAdd(block)}
              >
                <Plus className="h-3 w-3 text-muted-foreground" />
                {block.name}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>
    </>
  );
}

/**
 * CanvasToolbar - Canvas-level controls
 */
function CanvasToolbar({
  gridEnabled,
  snapEnabled,
  onGridToggle,
  onSnapToggle,
}) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-popover border rounded-lg shadow-lg p-1 z-50">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={gridEnabled ? "secondary" : "ghost"}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onGridToggle}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Toggle Grid (G)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={snapEnabled ? "secondary" : "ghost"}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onSnapToggle}
            >
              <Magnet className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Toggle Snap (S)</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

/**
 * FreeformCanvas - True Figma-like canvas with absolute positioning and drag-drop support
 */
export function FreeformCanvas({ className = "" }) {
  const [contextMenu, setContextMenu] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropPosition, setDropPosition] = useState(null);
  const [gridEnabled, setGridEnabled] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [snapGuides, setSnapGuides] = useState([]);
  const [selectionBox, setSelectionBox] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const canvasRef = useRef(null);

  // Store state
  const elements = useEditorStore((s) => s.canvas.elements);
  const selectedIds = useEditorStore((s) => s.canvas.selectedIds);
  const hoveredId = useEditorStore((s) => s.canvas.hoveredId);

  // Store actions
  const addElement = useEditorStore((s) => s.addElement);
  const updateElement = useEditorStore((s) => s.updateElement);
  const setSelection = useEditorStore((s) => s.setSelection);
  const addToSelection = useEditorStore((s) => s.addToSelection);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const setHovered = useEditorStore((s) => s.setHovered);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
        return;

      if (e.key === "g" || e.key === "G") {
        setGridEnabled((prev) => !prev);
      }
      if (e.key === "s" || e.key === "S") {
        setSnapEnabled((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handle canvas click (deselect)
  const handleCanvasClick = (e) => {
    if (
      e.target === canvasRef.current ||
      e.target.classList.contains("canvas-background")
    ) {
      clearSelection();
    }
  };

  // Handle canvas mouse down (start selection box)
  const handleCanvasMouseDown = (e) => {
    if (
      e.target === canvasRef.current ||
      e.target.classList.contains("canvas-background")
    ) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setSelectionBox({ start: { x, y }, end: { x, y } });
        setIsSelecting(true);
      }
    }
  };

  // Handle canvas mouse move (update selection box)
  useEffect(() => {
    if (!isSelecting) return;

    const handleMouseMove = (e) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect && selectionBox) {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setSelectionBox((prev) => (prev ? { ...prev, end: { x, y } } : null));
      }
    };

    const handleMouseUp = () => {
      if (selectionBox) {
        // Find elements within selection box
        const left = Math.min(selectionBox.start.x, selectionBox.end.x);
        const top = Math.min(selectionBox.start.y, selectionBox.end.y);
        const right = Math.max(selectionBox.start.x, selectionBox.end.x);
        const bottom = Math.max(selectionBox.start.y, selectionBox.end.y);

        const selectedElements = elements.filter((el) => {
          const elX = el.style?.x ?? 0;
          const elY = el.style?.y ?? 0;
          const elWidth = el.style?.width ?? 100;
          const elHeight = el.style?.height ?? 50;

          return (
            elX >= left &&
            elX + elWidth <= right &&
            elY >= top &&
            elY + elHeight <= bottom
          );
        });

        if (selectedElements.length > 0) {
          setSelection(selectedElements.map((el) => el.id));
        }
      }

      setSelectionBox(null);
      setIsSelecting(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isSelecting, selectionBox, elements, setSelection]);

  // Handle canvas context menu
  const handleContextMenu = (e) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      canvasX: e.clientX - rect.left,
      canvasY: e.clientY - rect.top,
    });
  };

  // ============ DRAG & DROP FROM SIDEBAR ============

  // Handle drag over
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);

    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setDropPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  }, []);

  // Handle drag leave
  const handleDragLeave = useCallback((e) => {
    // Only set to false if we're actually leaving the canvas
    if (!canvasRef.current?.contains(e.relatedTarget)) {
      setIsDragOver(false);
      setDropPosition(null);
    }
  }, []);

  // Handle drop from sidebar
  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragOver(false);
      setDropPosition(null);

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Get drop position on canvas
      let dropX = e.clientX - rect.left;
      let dropY = e.clientY - rect.top;

      // Snap to grid if enabled
      if (gridEnabled) {
        dropX = Math.round(dropX / GRID_SIZE) * GRID_SIZE;
        dropY = Math.round(dropY / GRID_SIZE) * GRID_SIZE;
      }

      try {
        const data = JSON.parse(e.dataTransfer.getData("application/json"));

        if (data && data.type) {
          // Add element at drop position with absolute positioning
          addElement({
            type: data.type,
            defaultProps: data.defaultProps || {},
            props: data.defaultProps || {},
            style: {
              x: dropX,
              y: dropY,
              position: "absolute",
            },
          });
        }
      } catch (err) {
        console.error("Drop error:", err);
      }
    },
    [addElement, gridEnabled]
  );

  // Add element at position (for context menu and toolbar)
  const handleAddElement = (
    type,
    defaultProps = {},
    position = { x: 100, y: 100 }
  ) => {
    let x = position.canvasX || position.x || 100;
    let y = position.canvasY || position.y || 100;

    // Snap to grid if enabled
    if (gridEnabled) {
      x = Math.round(x / GRID_SIZE) * GRID_SIZE;
      y = Math.round(y / GRID_SIZE) * GRID_SIZE;
    }

    addElement({
      type,
      defaultProps,
      props: defaultProps,
      style: {
        x,
        y,
        position: "absolute",
      },
    });
  };

  // Handle element selection
  const handleElementSelect = (elementId, e) => {
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      addToSelection(elementId);
    } else {
      setSelection([elementId]);
    }
  };

  // Handle position change
  const handlePositionChange = (elementId, position) => {
    updateElement(elementId, {
      style: {
        x: position.x,
        y: position.y,
      },
    });
  };

  // Handle size change
  const handleSizeChange = (elementId, size) => {
    updateElement(elementId, {
      style: {
        width: size.width,
        height: size.height,
      },
    });
  };

  // Canvas background style with optional grid
  const canvasStyle = useMemo(() => {
    if (gridEnabled) {
      return {
        backgroundImage: `
          linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)
        `,
        backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
      };
    }
    return {
      backgroundImage: `radial-gradient(circle, #333 1px, transparent 1px)`,
      backgroundSize: "20px 20px",
    };
  }, [gridEnabled]);

  return (
    <div
      ref={canvasRef}
      className={`relative w-full h-full min-h-[800px] bg-[#0a0a0a] ${className} ${
        isDragOver ? "ring-2 ring-primary ring-inset" : ""
      }`}
      style={canvasStyle}
      onClick={handleCanvasClick}
      onMouseDown={handleCanvasMouseDown}
      onContextMenu={handleContextMenu}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Canvas background */}
      <div className="canvas-background absolute inset-0 pointer-events-none" />

      {/* Selection box */}
      {selectionBox && (
        <SelectionBox start={selectionBox.start} end={selectionBox.end} />
      )}

      {/* Snap guides */}
      <SnapGuides guides={snapGuides} />

      {/* Drop indicator */}
      {isDragOver && dropPosition && (
        <div
          className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50"
          style={{ left: dropPosition.x, top: dropPosition.y }}
        >
          <div className="absolute inset-0 bg-primary rounded-full animate-ping opacity-75" />
          <div className="absolute inset-0 bg-primary rounded-full" />
          <div className="absolute left-1/2 top-6 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded whitespace-nowrap">
            Drop here ({Math.round(dropPosition.x)},{" "}
            {Math.round(dropPosition.y)})
          </div>
        </div>
      )}

      {/* Floating toolbar */}
      <FloatingToolbar
        onAddElement={handleAddElement}
        position={{ x: 20, y: 20 }}
      />

      {/* Canvas toolbar */}
      <CanvasToolbar
        gridEnabled={gridEnabled}
        snapEnabled={snapEnabled}
        onGridToggle={() => setGridEnabled(!gridEnabled)}
        onSnapToggle={() => setSnapEnabled(!snapEnabled)}
      />

      {/* Elements */}
      {elements.map((element) => (
        <DraggableElement
          key={element.id}
          element={element}
          isSelected={selectedIds.includes(element.id)}
          isHovered={hoveredId === element.id}
          onSelect={(e) => handleElementSelect(element.id, e)}
          onPositionChange={(pos) => handlePositionChange(element.id, pos)}
          onSizeChange={(size) => handleSizeChange(element.id, size)}
          snapEnabled={snapEnabled}
          gridEnabled={gridEnabled}
        >
          <div
            className="bg-background border rounded-md shadow-sm overflow-hidden"
            onMouseEnter={() => setHovered(element.id)}
            onMouseLeave={() => setHovered(null)}
          >
            <ComponentRenderer
              element={element}
              isSelected={selectedIds.includes(element.id)}
            />
          </div>
        </DraggableElement>
      ))}

      {/* Context menu */}
      <CanvasContextMenu
        position={contextMenu}
        onAddElement={handleAddElement}
        onClose={() => setContextMenu(null)}
      />

      {/* Help text */}
      {elements.length === 0 && !isDragOver && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center max-w-md">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <MousePointerClick className="h-8 w-8 text-primary" />
            </div>
            <p className="text-muted-foreground text-lg mb-2">
              Start designing
            </p>
            <p className="text-muted-foreground/60 text-sm">
              Drag components from sidebar or click "Add Element" to get
              started.
              <br />
              <span className="text-xs">
                Right-click for quick menu • Drag to move • Corners to resize
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Drag over help text */}
      {isDragOver && elements.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center bg-primary/10 border-2 border-dashed border-primary rounded-lg p-8">
            <p className="text-primary text-lg font-medium mb-1">
              Drop to add element
            </p>
            <p className="text-primary/70 text-sm">
              Element will be placed at cursor position
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
