import React, { useMemo, useState } from "react";
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
  Copy,
  Lock,
  Unlock,
  CornerUpLeft,
  CornerUpRight,
} from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Separator } from "../../ui/separator";
import { Slider } from "../../ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../ui/tooltip";
import { useEditorStore } from "../../../stores/editorStore";

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

  // Get canvas bounds for alignment
  const canvasBounds = { width: 1200, height: 800 }; // Default canvas size

  // Handle position change
  const handlePositionChange = (updates) => {
    if (!selectedElement) return;
    updateElement(selectedElement.id, {
      style: {
        ...updates,
      },
    });
  };

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
        newX = (canvasBounds.width - width) / 2;
        break;
      case "right":
        newX = canvasBounds.width - width;
        break;
      case "top":
        newY = 0;
        break;
      case "center-v":
        newY = (canvasBounds.height - height) / 2;
        break;
      case "bottom":
        newY = canvasBounds.height - height;
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
      {/* Position */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Move className="h-3 w-3 text-muted-foreground" />
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
        <span className="text-xs font-medium">Alignment</span>
        <AlignmentButtons onAlign={handleAlign} />
      </div>

      <Separator />

      {/* Transform Actions */}
      <div className="space-y-2">
        <span className="text-xs font-medium">Actions</span>
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
