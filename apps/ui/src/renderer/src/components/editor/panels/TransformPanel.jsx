import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  Move,
  Maximize2,
  RotateCw,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  FlipHorizontal,
  FlipVertical,
  CornerUpLeft,
  CornerUpRight,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Lock,
  Unlock,
  Grid3X3,
  Crosshair,
  MoveHorizontal,
  MoveVertical,
} from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Separator } from "../../ui/separator";
import { Slider } from "../../ui/slider";
import { Badge } from "../../ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { useEditorStore } from "../../../stores/editorStore";

// Nudge amounts
const NUDGE_SMALL = 1;
const NUDGE_MEDIUM = 10;
const NUDGE_LARGE = 50;

// Canvas default size (can be made dynamic)
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;

// Preset positions
const presetPositions = [
  { id: "top-left", label: "Top Left", x: 0, y: 0 },
  {
    id: "top-center",
    label: "Top Center",
    getX: (w) => (CANVAS_WIDTH - w) / 2,
    y: 0,
  },
  { id: "top-right", label: "Top Right", getX: (w) => CANVAS_WIDTH - w, y: 0 },
  {
    id: "center-left",
    label: "Center Left",
    x: 0,
    getY: (h) => (CANVAS_HEIGHT - h) / 2,
  },
  {
    id: "center",
    label: "Center",
    getX: (w) => (CANVAS_WIDTH - w) / 2,
    getY: (h) => (CANVAS_HEIGHT - h) / 2,
  },
  {
    id: "center-right",
    label: "Center Right",
    getX: (w) => CANVAS_WIDTH - w,
    getY: (h) => (CANVAS_HEIGHT - h) / 2,
  },
  {
    id: "bottom-left",
    label: "Bottom Left",
    x: 0,
    getY: (h) => CANVAS_HEIGHT - h,
  },
  {
    id: "bottom-center",
    label: "Bottom Center",
    getX: (w) => (CANVAS_WIDTH - w) / 2,
    getY: (h) => CANVAS_HEIGHT - h,
  },
  {
    id: "bottom-right",
    label: "Bottom Right",
    getX: (w) => CANVAS_WIDTH - w,
    getY: (h) => CANVAS_HEIGHT - h,
  },
];

// Input with label and unit
function DimensionInput({
  label,
  value,
  onChange,
  unit = "px",
  min = 0,
  step = 1,
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-[10px] text-muted-foreground uppercase">
        {label}
      </Label>
      <div className="relative">
        <Input
          type="number"
          value={value || ""}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          step={step}
          className="h-7 text-xs pr-6 font-mono"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
          {unit}
        </span>
      </div>
    </div>
  );
}

// Linked dimension inputs (width/height with lock)
function LinkedDimensions({ width, height, onChange, locked, onLockToggle }) {
  const aspectRatio = width && height ? width / height : 1;

  const handleWidthChange = (newWidth) => {
    if (locked && aspectRatio) {
      onChange({ width: newWidth, height: Math.round(newWidth / aspectRatio) });
    } else {
      onChange({ width: newWidth });
    }
  };

  const handleHeightChange = (newHeight) => {
    if (locked && aspectRatio) {
      onChange({
        width: Math.round(newHeight * aspectRatio),
        height: newHeight,
      });
    } else {
      onChange({ height: newHeight });
    }
  };

  return (
    <div className="flex gap-2 items-end">
      <div className="flex-1">
        <DimensionInput
          label="Width"
          value={width}
          onChange={handleWidthChange}
          unit="px"
        />
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 shrink-0"
        onClick={onLockToggle}
      >
        {locked ? (
          <Lock className="h-3 w-3 text-primary" />
        ) : (
          <Unlock className="h-3 w-3 text-muted-foreground" />
        )}
      </Button>
      <div className="flex-1">
        <DimensionInput
          label="Height"
          value={height}
          onChange={handleHeightChange}
          unit="px"
        />
      </div>
    </div>
  );
}

// Nudge buttons for quick positioning
function NudgeButtons({ onNudge, nudgeAmount }) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="grid grid-cols-3 gap-1 w-24 mx-auto">
        {/* Top row */}
        <div />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onNudge(0, -nudgeAmount)}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Move Up ({nudgeAmount}px)</p>
          </TooltipContent>
        </Tooltip>
        <div />

        {/* Middle row */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onNudge(-nudgeAmount, 0)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Move Left ({nudgeAmount}px)</p>
          </TooltipContent>
        </Tooltip>
        <div className="h-8 w-8 flex items-center justify-center">
          <Crosshair className="h-4 w-4 text-muted-foreground" />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onNudge(nudgeAmount, 0)}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Move Right ({nudgeAmount}px)</p>
          </TooltipContent>
        </Tooltip>

        {/* Bottom row */}
        <div />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onNudge(0, nudgeAmount)}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Move Down ({nudgeAmount}px)</p>
          </TooltipContent>
        </Tooltip>
        <div />
      </div>
    </TooltipProvider>
  );
}

// Alignment buttons row
function AlignmentButtons({ onAlign }) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex gap-0.5 bg-muted/50 rounded-md p-0.5">
        {/* Horizontal alignment */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => onAlign("left")}
            >
              <AlignLeft className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Align Left</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => onAlign("center-h")}
            >
              <AlignCenter className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Align Center (H)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => onAlign("right")}
            >
              <AlignRight className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Align Right</p>
          </TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-5 mx-0.5" />

        {/* Vertical alignment */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => onAlign("top")}
            >
              <AlignStartVertical className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Align Top</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => onAlign("center-v")}
            >
              <AlignCenterVertical className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Align Center (V)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => onAlign("bottom")}
            >
              <AlignEndVertical className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Align Bottom</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

// Quick position preset grid (visual 9-point grid)
function PositionPresetGrid({ onSelectPreset, currentPosition }) {
  const grid = [
    ["top-left", "top-center", "top-right"],
    ["center-left", "center", "center-right"],
    ["bottom-left", "bottom-center", "bottom-right"],
  ];

  // Determine which preset is closest to current position
  const getActivePreset = () => {
    if (!currentPosition) return null;
    const { x, y, width = 200, height = 100 } = currentPosition;

    for (const preset of presetPositions) {
      const presetX = preset.getX ? preset.getX(width) : preset.x;
      const presetY = preset.getY ? preset.getY(height) : preset.y;

      if (Math.abs(x - presetX) < 10 && Math.abs(y - presetY) < 10) {
        return preset.id;
      }
    }
    return null;
  };

  const activePreset = getActivePreset();

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-1">
        {grid.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-1 justify-center">
            {row.map((presetId) => {
              const preset = presetPositions.find((p) => p.id === presetId);
              const isActive = activePreset === presetId;

              return (
                <Tooltip key={presetId}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      className={`h-6 w-6 p-0 ${
                        isActive ? "" : "hover:bg-primary/20"
                      }`}
                      onClick={() => onSelectPreset(preset)}
                    >
                      <div
                        className={`h-2 w-2 rounded-full ${
                          isActive
                            ? "bg-primary-foreground"
                            : "bg-muted-foreground"
                        }`}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>{preset?.label}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}

// Transform actions (flip, rotate)
function TransformActions({ onFlipH, onFlipV, onRotateCW, onRotateCCW }) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex gap-0.5 bg-muted/50 rounded-md p-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={onFlipH}
            >
              <FlipHorizontal className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Flip Horizontal</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={onFlipV}
            >
              <FlipVertical className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Flip Vertical</p>
          </TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-5 mx-0.5" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={onRotateCCW}
            >
              <CornerUpLeft className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Rotate -90°</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={onRotateCW}
            >
              <CornerUpRight className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Rotate +90°</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

// Main Transform Panel component
export function TransformPanel() {
  const [aspectLocked, setAspectLocked] = useState(false);
  const [nudgeAmount, setNudgeAmount] = useState(NUDGE_MEDIUM);

  // Store state
  const selectedIds = useEditorStore((s) => s.canvas.selectedIds);
  const getElementById = useEditorStore((s) => s.getElementById);
  const updateElement = useEditorStore((s) => s.updateElement);
  const elements = useEditorStore((s) => s.canvas.elements);

  // Get selected element
  const selectedElement = useMemo(() => {
    if (selectedIds.length !== 1) return null;
    return getElementById(selectedIds[0]);
  }, [selectedIds, getElementById]);

  // Handle position change
  const handlePositionChange = useCallback(
    (updates) => {
      if (!selectedElement) return;
      updateElement(selectedElement.id, {
        style: {
          ...updates,
        },
      });
    },
    [selectedElement, updateElement]
  );

  // Handle size change
  const handleSizeChange = (updates) => {
    if (!selectedElement) return;
    updateElement(selectedElement.id, {
      style: updates,
    });
  };

  // Handle rotation change
  const handleRotationChange = (rotation) => {
    if (!selectedElement) return;
    updateElement(selectedElement.id, {
      style: { rotation },
    });
  };

  // Handle opacity change
  const handleOpacityChange = (opacity) => {
    if (!selectedElement) return;
    updateElement(selectedElement.id, {
      style: { opacity: opacity / 100 },
    });
  };

  // Handle nudge (move by amount)
  const handleNudge = useCallback(
    (deltaX, deltaY) => {
      if (!selectedElement) return;
      const style = selectedElement.style || {};
      const currentX = style.x ?? 0;
      const currentY = style.y ?? 0;

      handlePositionChange({
        x: Math.max(0, currentX + deltaX),
        y: Math.max(0, currentY + deltaY),
      });
    },
    [selectedElement, handlePositionChange]
  );

  // Handle preset position
  const handlePresetPosition = useCallback(
    (preset) => {
      if (!selectedElement || !preset) return;

      const style = selectedElement.style || {};
      const width = style.width || 200;
      const height = style.height || 100;

      const newX = preset.getX ? preset.getX(width) : preset.x;
      const newY = preset.getY ? preset.getY(height) : preset.y;

      handlePositionChange({ x: Math.max(0, newX), y: Math.max(0, newY) });
    },
    [selectedElement, handlePositionChange]
  );

  // Keyboard arrow key support
  useEffect(() => {
    if (!selectedElement) return;

    const handleKeyDown = (e) => {
      // Don't handle if typing in an input
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
        return;

      const amount = e.shiftKey
        ? NUDGE_LARGE
        : e.altKey
        ? NUDGE_SMALL
        : NUDGE_MEDIUM;

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          handleNudge(0, -amount);
          break;
        case "ArrowDown":
          e.preventDefault();
          handleNudge(0, amount);
          break;
        case "ArrowLeft":
          e.preventDefault();
          handleNudge(-amount, 0);
          break;
        case "ArrowRight":
          e.preventDefault();
          handleNudge(amount, 0);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedElement, handleNudge]);

  // Handle alignment
  const handleAlign = (alignment) => {
    if (!selectedElement) return;

    const style = selectedElement.style || {};
    const x = style.x || 0;
    const y = style.y || 0;
    const width = style.width || 200;
    const height = style.height || 100;

    let newX = x;
    let newY = y;

    switch (alignment) {
      case "left":
        newX = 0;
        break;
      case "center-h":
        newX = (CANVAS_WIDTH - width) / 2;
        break;
      case "right":
        newX = CANVAS_WIDTH - width;
        break;
      case "top":
        newY = 0;
        break;
      case "center-v":
        newY = (CANVAS_HEIGHT - height) / 2;
        break;
      case "bottom":
        newY = CANVAS_HEIGHT - height;
        break;
    }

    handlePositionChange({ x: newX, y: newY });
  };

  // Handle flip
  const handleFlipH = () => {
    if (!selectedElement) return;
    const currentScaleX = selectedElement.style?.scaleX ?? 1;
    updateElement(selectedElement.id, {
      style: { scaleX: currentScaleX * -1 },
    });
  };

  const handleFlipV = () => {
    if (!selectedElement) return;
    const currentScaleY = selectedElement.style?.scaleY ?? 1;
    updateElement(selectedElement.id, {
      style: { scaleY: currentScaleY * -1 },
    });
  };

  // Handle rotate
  const handleRotateCW = () => {
    if (!selectedElement) return;
    const currentRotation = selectedElement.style?.rotation ?? 0;
    updateElement(selectedElement.id, {
      style: { rotation: (currentRotation + 90) % 360 },
    });
  };

  const handleRotateCCW = () => {
    if (!selectedElement) return;
    const currentRotation = selectedElement.style?.rotation ?? 0;
    updateElement(selectedElement.id, {
      style: { rotation: (currentRotation - 90 + 360) % 360 },
    });
  };

  // No selection state
  if (!selectedElement) {
    return (
      <div className="p-3">
        <p className="text-xs text-muted-foreground text-center">
          Select an element to transform
        </p>
        <p className="text-[10px] text-muted-foreground/70 text-center mt-1">
          Use arrow keys to move selected elements
        </p>
      </div>
    );
  }

  const style = selectedElement.style || {};
  const x = style.x ?? 0;
  const y = style.y ?? 0;
  const width = style.width ?? "";
  const height = style.height ?? "";
  const rotation = style.rotation ?? 0;
  const opacity = (style.opacity ?? 1) * 100;

  return (
    <div className="space-y-4">
      {/* Quick Position Presets */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium flex items-center gap-1.5">
            <Grid3X3 className="h-3 w-3 text-muted-foreground" />
            Quick Position
          </span>
          <Badge variant="secondary" className="text-[10px]">
            Click to snap
          </Badge>
        </div>
        <PositionPresetGrid
          onSelectPreset={handlePresetPosition}
          currentPosition={{ x, y, width, height }}
        />
      </div>

      <Separator />

      {/* Nudge Controls */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium flex items-center gap-1.5">
            <Move className="h-3 w-3 text-muted-foreground" />
            Move
          </span>
          <Select
            value={String(nudgeAmount)}
            onValueChange={(v) => setNudgeAmount(Number(v))}
          >
            <SelectTrigger className="h-6 w-20 text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={String(NUDGE_SMALL)}>1px</SelectItem>
              <SelectItem value={String(NUDGE_MEDIUM)}>10px</SelectItem>
              <SelectItem value={String(NUDGE_LARGE)}>50px</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <NudgeButtons onNudge={handleNudge} nudgeAmount={nudgeAmount} />
        <p className="text-[10px] text-muted-foreground text-center">
          Arrow keys: Move • Shift: 50px • Alt: 1px
        </p>
      </div>

      <Separator />

      {/* Position Input */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Crosshair className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium">Position</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <DimensionInput
            label="X"
            value={x}
            onChange={(v) => handlePositionChange({ x: v })}
          />
          <DimensionInput
            label="Y"
            value={y}
            onChange={(v) => handlePositionChange({ y: v })}
          />
        </div>
      </div>

      <Separator />

      {/* Size */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Maximize2 className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium">Size</span>
        </div>
        <LinkedDimensions
          width={width}
          height={height}
          onChange={handleSizeChange}
          locked={aspectLocked}
          onLockToggle={() => setAspectLocked(!aspectLocked)}
        />
      </div>

      <Separator />

      {/* Rotation & Opacity */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <RotateCw className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium">Transform</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <DimensionInput
            label="Rotation"
            value={rotation}
            onChange={handleRotationChange}
            unit="°"
            min={-360}
            step={1}
          />
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase">
              Opacity
            </Label>
            <div className="flex items-center gap-2">
              <Slider
                value={[opacity]}
                onValueChange={([v]) => handleOpacityChange(v)}
                min={0}
                max={100}
                step={1}
                className="flex-1"
              />
              <span className="text-xs font-mono w-8 text-right">
                {Math.round(opacity)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Alignment */}
      <div className="space-y-2">
        <span className="text-xs font-medium">Canvas Alignment</span>
        <AlignmentButtons onAlign={handleAlign} />
      </div>

      <Separator />

      {/* Transform Actions */}
      <div className="space-y-2">
        <span className="text-xs font-medium">Flip & Rotate</span>
        <TransformActions
          onFlipH={handleFlipH}
          onFlipV={handleFlipV}
          onRotateCW={handleRotateCW}
          onRotateCCW={handleRotateCCW}
        />
      </div>
    </div>
  );
}
