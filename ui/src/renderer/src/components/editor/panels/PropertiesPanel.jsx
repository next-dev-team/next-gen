import React, { useMemo } from "react";
import { Code, Copy, Check, Layers } from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { ScrollArea } from "../../ui/scroll-area";
import { Separator } from "../../ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { useEditorStore } from "../../../stores/editorStore";
import { generateElementCode, copyToClipboard } from "../../../utils/codeGenerator";
import { blocks, getBlockById } from "../../../data/blocks";

// Property editor components
function TextProperty({ label, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-sm"
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
            <SelectItem key={opt.value} value={opt.value}>
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

// Property definitions for each component type
const propertyDefinitions = {
  button: [
    { key: "children", label: "Label", type: "text" },
    {
      key: "variant",
      label: "Variant",
      type: "select",
      options: [
        { value: "default", label: "Default" },
        { value: "secondary", label: "Secondary" },
        { value: "outline", label: "Outline" },
        { value: "ghost", label: "Ghost" },
        { value: "destructive", label: "Destructive" },
        { value: "link", label: "Link" },
      ],
    },
    {
      key: "size",
      label: "Size",
      type: "select",
      options: [
        { value: "default", label: "Default" },
        { value: "sm", label: "Small" },
        { value: "lg", label: "Large" },
        { value: "icon", label: "Icon" },
      ],
    },
  ],
  input: [
    { key: "placeholder", label: "Placeholder", type: "text" },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [
        { value: "text", label: "Text" },
        { value: "email", label: "Email" },
        { value: "password", label: "Password" },
        { value: "number", label: "Number" },
      ],
    },
  ],
  badge: [
    { key: "children", label: "Label", type: "text" },
    {
      key: "variant",
      label: "Variant",
      type: "select",
      options: [
        { value: "default", label: "Default" },
        { value: "secondary", label: "Secondary" },
        { value: "outline", label: "Outline" },
        { value: "destructive", label: "Destructive" },
      ],
    },
  ],
  hero: [
    { key: "heading", label: "Heading", type: "text" },
    { key: "description", label: "Description", type: "text" },
    {
      key: "align",
      label: "Alignment",
      type: "select",
      options: [
        { value: "left", label: "Left" },
        { value: "center", label: "Center" },
        { value: "right", label: "Right" },
      ],
    },
    { key: "primaryLabel", label: "Primary Button", type: "text" },
    { key: "primaryHref", label: "Primary URL", type: "text" },
    { key: "secondaryLabel", label: "Secondary Button", type: "text" },
    { key: "secondaryHref", label: "Secondary URL", type: "text" },
  ],
  card: [
    { key: "title", label: "Title", type: "text" },
    { key: "description", label: "Description", type: "text" },
    { key: "content", label: "Content", type: "text" },
    { key: "footer", label: "Footer", type: "text" },
  ],
  heading: [
    { key: "text", label: "Text", type: "text" },
    {
      key: "level",
      label: "Level",
      type: "select",
      options: [
        { value: "1", label: "H1" },
        { value: "2", label: "H2" },
        { value: "3", label: "H3" },
        { value: "4", label: "H4" },
      ],
    },
  ],
  paragraph: [{ key: "text", label: "Text", type: "text" }],
  spacer: [{ key: "height", label: "Height (px)", type: "number", min: 8, max: 200 }],
  cta: [
    { key: "heading", label: "Heading", type: "text" },
    { key: "description", label: "Description", type: "text" },
    { key: "primaryLabel", label: "Primary Button", type: "text" },
    { key: "primaryHref", label: "Primary URL", type: "text" },
    { key: "secondaryLabel", label: "Secondary Button", type: "text" },
    { key: "secondaryHref", label: "Secondary URL", type: "text" },
  ],
  testimonial: [
    { key: "quote", label: "Quote", type: "text" },
    { key: "author", label: "Author", type: "text" },
    { key: "role", label: "Role", type: "text" },
    { key: "company", label: "Company", type: "text" },
  ],
};

export function PropertiesPanel() {
  const [copied, setCopied] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("design");

  // Store state
  const selectedIds = useEditorStore((s) => s.canvas.selectedIds);
  const getElementById = useEditorStore((s) => s.getElementById);
  const updateElement = useEditorStore((s) => s.updateElement);

  // Get selected element
  const selectedElement = useMemo(() => {
    if (selectedIds.length !== 1) return null;
    return getElementById(selectedIds[0]);
  }, [selectedIds, getElementById]);

  // Get property definitions for selected element
  const properties = useMemo(() => {
    if (!selectedElement) return [];
    return propertyDefinitions[selectedElement.type?.toLowerCase()] || [];
  }, [selectedElement]);

  // Generate code for selected element
  const elementCode = useMemo(() => {
    if (!selectedElement) return "";
    return generateElementCode(selectedElement);
  }, [selectedElement]);

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

  // No selection
  if (!selectedElement) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-3 border-b shrink-0">
          <h3 className="font-semibold text-sm">Properties</h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-muted-foreground">
            <Layers className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Select an element to edit its properties</p>
          </div>
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
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">{selectedIds.length} elements selected</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm capitalize">{selectedElement.type}</h3>
          <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {selectedElement.id.slice(0, 8)}
          </code>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
        <div className="px-3 py-2 border-b shrink-0">
          <TabsList className="w-full">
            <TabsTrigger value="design" className="flex-1">
              Design
            </TabsTrigger>
            <TabsTrigger value="code" className="flex-1">
              Code
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Design Tab */}
        <TabsContent value="design" className="flex-1 m-0 p-0 min-h-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-4">
              {properties.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No configurable properties for this component.
                </p>
              ) : (
                properties.map((prop) => {
                  const value = selectedElement.props?.[prop.key];

                  switch (prop.type) {
                    case "select":
                      return (
                        <SelectProperty
                          key={prop.key}
                          label={prop.label}
                          value={value}
                          options={prop.options}
                          onChange={(v) => handlePropChange(prop.key, v)}
                        />
                      );
                    case "number":
                      return (
                        <NumberProperty
                          key={prop.key}
                          label={prop.label}
                          value={value}
                          onChange={(v) => handlePropChange(prop.key, v)}
                          min={prop.min}
                          max={prop.max}
                          step={prop.step}
                        />
                      );
                    default:
                      return (
                        <TextProperty
                          key={prop.key}
                          label={prop.label}
                          value={value}
                          onChange={(v) => handlePropChange(prop.key, v)}
                        />
                      );
                  }
                })
              )}

              <Separator />

              {/* Style overrides */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                  Custom Styles
                </h4>
                <TextProperty
                  label="CSS Class"
                  value={selectedElement.props?.className}
                  onChange={(v) => handlePropChange("className", v)}
                />
              </div>
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
              <pre className="p-3 text-xs font-mono leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {elementCode || "// No code to display"}
              </pre>
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
