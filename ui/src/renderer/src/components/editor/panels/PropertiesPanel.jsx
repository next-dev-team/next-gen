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
} from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { ScrollArea } from "../../ui/scroll-area";
import { Separator } from "../../ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../ui/tabs";
import { Switch } from "../../ui/switch";
import { Badge } from "../../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { useEditorStore } from "../../../stores/editorStore";
import { generateElementCode, copyToClipboard } from "../../../utils/codeGenerator";
import { getComponentById as getShadcnComponent } from "../../../data/shadcnComponents";
import { getBlockById } from "../../../data/blocks";

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
    <div className="space-y-1.5">
      <button
        className="flex items-center gap-1 w-full text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        <Label className="text-xs cursor-pointer">{label}</Label>
        <Badge variant="secondary" className="text-[10px] ml-auto">
          {Array.isArray(value) ? value.length : 0} items
        </Badge>
      </button>
      {isOpen && (
        <textarea
          value={JSON.stringify(value || [], null, 2)}
          onChange={(e) => handleTextChange(e.target.value)}
          rows={6}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
        />
      )}
    </div>
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

export function PropertiesPanel() {
  const [copied, setCopied] = useState(false);
  const [cliCopied, setCliCopied] = useState(false);
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

  // Generate code for selected element
  const elementCode = useMemo(() => {
    if (!selectedElement) return "";
    return generateElementCode(selectedElement);
  }, [selectedElement]);

  // Get CLI command
  const cliCommand = componentDef?.cli || "";

  // Handle property change
  const handlePropChange = (key, value) => {
    if (!selectedElement) return;
    updateElement(selectedElement.id, { props: { [key]: value } });
  };

  // Copy code
  const handleCopyCode = async () => {
    const success = await copyToClipboard(elementCode);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Copy CLI
  const handleCopyCli = async () => {
    if (cliCommand) {
      const success = await copyToClipboard(cliCommand);
      if (success) {
        setCliCopied(true);
        setTimeout(() => setCliCopied(false), 2000);
      }
    }
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
            Click on an element in the canvas, or drag a component from the left panel
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
          <h3 className="font-semibold text-sm">{displayName}</h3>
          <code className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
            {selectedElement.id.slice(0, 8)}
          </code>
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
        {cliCommand && (
          <div className="mt-2">
            <Button
              variant="secondary"
              size="sm"
              className="w-full h-7 text-xs gap-1 font-mono justify-start"
              onClick={handleCopyCli}
            >
              <Terminal className="h-3 w-3 shrink-0" />
              <span className="truncate flex-1 text-left opacity-70">{cliCommand}</span>
              {cliCopied ? (
                <Check className="h-3 w-3 text-green-500 shrink-0" />
              ) : (
                <Clipboard className="h-3 w-3 shrink-0" />
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
        <div className="px-3 py-2 border-b shrink-0">
          <TabsList className="w-full">
            <TabsTrigger value="design" className="flex-1 text-xs">
              Design
            </TabsTrigger>
            <TabsTrigger value="style" className="flex-1 text-xs">
              Style
            </TabsTrigger>
            <TabsTrigger value="code" className="flex-1 text-xs">
              Code
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Design Tab */}
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
              {Object.keys(propSchema).length > 0 ? (
                Object.entries(propSchema).map(([key, schema]) => (
                  <PropertyEditor
                    key={key}
                    propKey={key}
                    schema={schema}
                    value={selectedElement.props?.[key]}
                    onChange={(v) => handlePropChange(key, v)}
                  />
                ))
              ) : (
                // Fallback: show all current props as text fields
                Object.keys(selectedElement.props || {}).length > 0 && (
                  <>
                    {Object.entries(selectedElement.props).map(([key, value]) => {
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
                    })}
                  </>
                )
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
            <div className="p-3 space-y-4">
              <TextProperty
                label="CSS Class"
                value={selectedElement.props?.className}
                onChange={(v) => handlePropChange("className", v)}
                placeholder="e.g. mt-4 p-2 bg-muted"
              />

              <Separator />

              <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                Inline Styles
              </h4>

              <TextProperty
                label="Width"
                value={selectedElement.style?.width}
                onChange={(v) =>
                  updateElement(selectedElement.id, { style: { width: v } })
                }
                placeholder="e.g. 100%, 300px, auto"
              />

              <TextProperty
                label="Height"
                value={selectedElement.style?.height}
                onChange={(v) =>
                  updateElement(selectedElement.id, { style: { height: v } })
                }
                placeholder="e.g. auto, 200px"
              />

              <TextProperty
                label="Padding"
                value={selectedElement.style?.padding}
                onChange={(v) =>
                  updateElement(selectedElement.id, { style: { padding: v } })
                }
                placeholder="e.g. 16px, 1rem"
              />

              <TextProperty
                label="Margin"
                value={selectedElement.style?.margin}
                onChange={(v) =>
                  updateElement(selectedElement.id, { style: { margin: v } })
                }
                placeholder="e.g. 0 auto, 16px 0"
              />

              <TextProperty
                label="Background"
                value={selectedElement.style?.background}
                onChange={(v) =>
                  updateElement(selectedElement.id, { style: { background: v } })
                }
                placeholder="e.g. #fff, rgba(0,0,0,0.1)"
              />

              <TextProperty
                label="Border Radius"
                value={selectedElement.style?.borderRadius}
                onChange={(v) =>
                  updateElement(selectedElement.id, { style: { borderRadius: v } })
                }
                placeholder="e.g. 8px, 50%"
              />
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Code Tab */}
        <TabsContent value="code" className="flex-1 m-0 p-0 min-h-0">
          <div className="flex flex-col h-full">
            <div className="p-3 border-b shrink-0">
              <Button
                variant="secondary"
                size="sm"
                className="w-full gap-2"
                onClick={handleCopyCode}
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy Code
                  </>
                )}
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <pre className="p-3 text-[11px] font-mono leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {elementCode || "// No code to display"}
              </pre>
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
