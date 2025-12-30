import React, { useMemo, useState } from "react";
import {
  Code,
  Copy,
  Check,
  Layers,
  Terminal,
  ChevronDown,
  ChevronRight,
  Trash2,
  Clipboard,
  Move,
  Palette,
  Settings2,
  Sparkles,
} from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { ScrollArea } from "../../ui/scroll-area";
import { Separator } from "../../ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../ui/tabs";
import { Switch } from "../../ui/switch";
import { Badge } from "../../ui/badge";
import { Slider } from "../../ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../ui/collapsible";
import { useEditorStore } from "../../../stores/editorStore";
import {
  generateElementCode,
  copyToClipboard,
} from "../../../utils/codeGenerator";
import { getComponentById as getShadcnComponent } from "../../../data/shadcnComponents";
import { getBlockById } from "../../../data/blocks";
import { TransformPanel } from "./TransformPanel";
import { InspectorPanel } from "./InspectorPanel";

// Property editor components
function TextProperty({ label, value, onChange, placeholder }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 text-sm"
      />
    </div>
  );
}

function TextareaProperty({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
      />
    </div>
  );
}

function SelectProperty({ label, value, options, onChange }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Select value={value || ""} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-sm">
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={String(opt.value)}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function NumberProperty({ label, value, onChange, min, max, step }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="h-8 text-sm"
      />
    </div>
  );
}

function BooleanProperty({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-xs">{label}</Label>
      <Switch checked={value || false} onCheckedChange={onChange} />
    </div>
  );
}

function ColorProperty({ label, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2">
        <div className="relative">
          <input
            type="color"
            value={value || "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 w-10 rounded-md border cursor-pointer"
          />
        </div>
        <Input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="h-8 text-sm font-mono flex-1"
        />
      </div>
    </div>
  );
}

function SliderProperty({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit = "",
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <span className="text-xs text-muted-foreground font-mono">
          {value ?? min}
          {unit}
        </span>
      </div>
      <Slider
        value={[value ?? min]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
      />
    </div>
  );
}

function ArrayProperty({ label, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);

  // Simple JSON editor for array props
  const handleTextChange = (text) => {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        onChange(parsed);
      }
    } catch (e) {
      // Invalid JSON, ignore
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-1 w-full text-left hover:text-primary transition-colors">
        {isOpen ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        <Label className="text-xs cursor-pointer flex-1">{label}</Label>
        <Badge variant="secondary" className="text-[10px]">
          {Array.isArray(value) ? value.length : 0} items
        </Badge>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <textarea
          value={JSON.stringify(value || [], null, 2)}
          onChange={(e) => handleTextChange(e.target.value)}
          rows={6}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
        />
      </CollapsibleContent>
    </Collapsible>
  );
}

// Render property editor based on schema
function PropertyEditor({ propKey, schema, value, onChange }) {
  switch (schema.type) {
    case "select":
      return (
        <SelectProperty
          label={schema.label || propKey}
          value={value}
          options={schema.options || []}
          onChange={onChange}
        />
      );
    case "number":
      return (
        <NumberProperty
          label={schema.label || propKey}
          value={value}
          onChange={onChange}
          min={schema.min}
          max={schema.max}
          step={schema.step}
        />
      );
    case "boolean":
      return (
        <BooleanProperty
          label={schema.label || propKey}
          value={value}
          onChange={onChange}
        />
      );
    case "textarea":
      return (
        <TextareaProperty
          label={schema.label || propKey}
          value={value}
          onChange={onChange}
          placeholder={schema.placeholder}
        />
      );
    case "array":
      return (
        <ArrayProperty
          label={schema.label || propKey}
          value={value}
          onChange={onChange}
        />
      );
    case "color":
      return (
        <ColorProperty
          label={schema.label || propKey}
          value={value}
          onChange={onChange}
        />
      );
    case "slider":
      return (
        <SliderProperty
          label={schema.label || propKey}
          value={value}
          onChange={onChange}
          min={schema.min}
          max={schema.max}
          step={schema.step}
          unit={schema.unit}
        />
      );
    default:
      return (
        <TextProperty
          label={schema.label || propKey}
          value={value}
          onChange={onChange}
          placeholder={schema.placeholder}
        />
      );
  }
}

// Style section with common CSS properties
function StyleSection({ element, updateElement }) {
  const style = element.style || {};

  const handleStyleChange = (key, value) => {
    updateElement(element.id, { style: { [key]: value } });
  };

  return (
    <div className="space-y-4">
      {/* Layout */}
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-medium hover:text-primary transition-colors">
          <span>Layout</span>
          <ChevronDown className="h-3 w-3" />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <TextProperty
              label="Width"
              value={style.width}
              onChange={(v) => handleStyleChange("width", v)}
              placeholder="auto"
            />
            <TextProperty
              label="Height"
              value={style.height}
              onChange={(v) => handleStyleChange("height", v)}
              placeholder="auto"
            />
          </div>
          <TextProperty
            label="Padding"
            value={style.padding}
            onChange={(v) => handleStyleChange("padding", v)}
            placeholder="0"
          />
          <TextProperty
            label="Margin"
            value={style.margin}
            onChange={(v) => handleStyleChange("margin", v)}
            placeholder="0"
          />
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Appearance */}
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-medium hover:text-primary transition-colors">
          <span>Appearance</span>
          <ChevronDown className="h-3 w-3" />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-3">
          <ColorProperty
            label="Background"
            value={style.background}
            onChange={(v) => handleStyleChange("background", v)}
          />
          <TextProperty
            label="Border Radius"
            value={style.borderRadius}
            onChange={(v) => handleStyleChange("borderRadius", v)}
            placeholder="0"
          />
          <SliderProperty
            label="Opacity"
            value={(style.opacity ?? 1) * 100}
            onChange={(v) => handleStyleChange("opacity", v / 100)}
            min={0}
            max={100}
            step={1}
            unit="%"
          />
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* CSS Class */}
      <TextProperty
        label="CSS Class"
        value={element.props?.className}
        onChange={(v) => updateElement(element.id, { props: { className: v } })}
        placeholder="e.g. mt-4 p-2"
      />
    </div>
  );
}

export function PropertiesPanel() {
  const [activeTab, setActiveTab] = useState("design");

  // Store state
  const selectedIds = useEditorStore((s) => s.canvas.selectedIds);
  const getElementById = useEditorStore((s) => s.getElementById);
  const updateElement = useEditorStore((s) => s.updateElement);
  const deleteElements = useEditorStore((s) => s.deleteElements);
  const duplicateElements = useEditorStore((s) => s.duplicateElements);

  // Get selected element
  const selectedElement = useMemo(() => {
    if (selectedIds.length !== 1) return null;
    return getElementById(selectedIds[0]);
  }, [selectedIds, getElementById]);

  // Get component/block definition for schema
  const componentDef = useMemo(() => {
    if (!selectedElement) return null;
    return (
      getShadcnComponent(selectedElement.type) ||
      getBlockById(selectedElement.type) ||
      null
    );
  }, [selectedElement]);

  // Get property schema
  const propSchema = componentDef?.propSchema || {};

  // Handle property change
  const handlePropChange = (key, value) => {
    if (!selectedElement) return;
    updateElement(selectedElement.id, { props: { [key]: value } });
  };

  // No selection
  if (!selectedElement) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-3 border-b shrink-0">
          <h3 className="font-semibold text-sm">Properties</h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <Layers className="h-12 w-12 mb-4 opacity-20" />
          <p className="text-sm text-muted-foreground text-center mb-2">
            Select an element to edit
          </p>
          <p className="text-xs text-muted-foreground/70 text-center">
            Click on an element in the canvas, or drag a component from the left
            panel
          </p>
        </div>
      </div>
    );
  }

  // Multiple selection
  if (selectedIds.length > 1) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-3 border-b shrink-0">
          <h3 className="font-semibold text-sm">Properties</h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <p className="text-sm text-muted-foreground text-center mb-4">
            {selectedIds.length} elements selected
          </p>
          <Button
            variant="destructive"
            size="sm"
            className="gap-2"
            onClick={() => deleteElements(selectedIds)}
          >
            <Trash2 className="h-4 w-4" />
            Delete All
          </Button>
        </div>
      </div>
    );
  }

  // Format type name for display
  const displayName = selectedElement.type
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{displayName}</h3>
              <code className="text-[10px] text-muted-foreground font-mono">
                {selectedElement.id.slice(0, 8)}
              </code>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-7 text-xs gap-1"
            onClick={() => duplicateElements([selectedElement.id])}
          >
            <Copy className="h-3 w-3" />
            Duplicate
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2"
            onClick={() => deleteElements([selectedElement.id])}
          >
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>

        {/* CLI command */}
        {componentDef?.cli && (
          <div className="mt-2">
            <Button
              variant="secondary"
              size="sm"
              className="w-full h-7 text-xs gap-1 font-mono justify-start"
              onClick={async () => {
                await copyToClipboard(componentDef.cli);
              }}
            >
              <Terminal className="h-3 w-3 shrink-0" />
              <span className="truncate flex-1 text-left opacity-70">
                {componentDef.cli}
              </span>
              <Clipboard className="h-3 w-3 shrink-0" />
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-col flex-1 min-h-0"
      >
        <div className="px-3 py-2 border-b shrink-0">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="design" className="text-xs gap-1 px-2">
              <Settings2 className="h-3 w-3" />
              Props
            </TabsTrigger>
            <TabsTrigger value="style" className="text-xs gap-1 px-2">
              <Palette className="h-3 w-3" />
              Style
            </TabsTrigger>
            <TabsTrigger value="transform" className="text-xs gap-1 px-2">
              <Move className="h-3 w-3" />
              Transform
            </TabsTrigger>
            <TabsTrigger value="inspect" className="text-xs gap-1 px-2">
              <Code className="h-3 w-3" />
              Code
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Design/Props Tab */}
        <TabsContent value="design" className="flex-1 m-0 p-0 min-h-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-4">
              {/* Editable props info */}
              {componentDef?.editableProps && (
                <div className="text-[10px] text-muted-foreground bg-muted/50 rounded px-2 py-1">
                  <strong>Tip:</strong> Double-click on canvas to edit:{" "}
                  {componentDef.editableProps.join(", ")}
                </div>
              )}

              {/* Dynamic properties from schema */}
              {Object.keys(propSchema).length > 0
                ? Object.entries(propSchema).map(([key, schema]) => (
                    <PropertyEditor
                      key={key}
                      propKey={key}
                      schema={schema}
                      value={selectedElement.props?.[key]}
                      onChange={(v) => handlePropChange(key, v)}
                    />
                  ))
                : // Fallback: show all current props as text fields
                  Object.keys(selectedElement.props || {}).length > 0 && (
                    <>
                      {Object.entries(selectedElement.props).map(
                        ([key, value]) => {
                          if (typeof value === "object") {
                            return (
                              <ArrayProperty
                                key={key}
                                label={key}
                                value={value}
                                onChange={(v) => handlePropChange(key, v)}
                              />
                            );
                          }
                          if (typeof value === "boolean") {
                            return (
                              <BooleanProperty
                                key={key}
                                label={key}
                                value={value}
                                onChange={(v) => handlePropChange(key, v)}
                              />
                            );
                          }
                          return (
                            <TextProperty
                              key={key}
                              label={key}
                              value={String(value || "")}
                              onChange={(v) => handlePropChange(key, v)}
                            />
                          );
                        }
                      )}
                    </>
                  )}

              {Object.keys(propSchema).length === 0 &&
                Object.keys(selectedElement.props || {}).length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    This component has no configurable properties.
                  </p>
                )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Style Tab */}
        <TabsContent value="style" className="flex-1 m-0 p-0 min-h-0">
          <ScrollArea className="h-full">
            <div className="p-3">
              <StyleSection
                element={selectedElement}
                updateElement={updateElement}
              />
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Transform Tab */}
        <TabsContent value="transform" className="flex-1 m-0 p-0 min-h-0">
          <ScrollArea className="h-full">
            <div className="p-3">
              <TransformPanel />
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Inspect/Code Tab */}
        <TabsContent value="inspect" className="flex-1 m-0 p-0 min-h-0">
          <ScrollArea className="h-full">
            <div className="p-3">
              <InspectorPanel />
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
