import React, { useState, useMemo } from "react";
import {
  Search,
  Layout,
  Type,
  FormInput,
  Bell,
  Menu,
  Layers,
  Table,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Square,
  Image,
  Grid3X3,
  FileText,
  CreditCard,
  Quote,
  MousePointerClick,
  PanelBottom,
  Users,
  BarChart,
  Newspaper,
  Copy,
  Check,
  Terminal,
  Clipboard,
  Plus,
  Code,
  Eye,
} from "lucide-react";
import { Input } from "../../ui/input";
import { ScrollArea } from "../../ui/scroll-area";
import { Button } from "../../ui/button";
import { Separator } from "../../ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../ui/tabs";
import { Badge } from "../../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { blocks, blockCategories } from "../../../data/blocks";
import {
  shadcnComponents,
  shadcnCategories,
  getAllCliCommands,
} from "../../../data/shadcnComponents";
import {
  generateElementCode,
  copyToClipboard,
} from "../../../utils/codeGenerator";
import { useEditorStore } from "../../../stores/editorStore";

// Icon mapping
const iconMap = {
  Layout,
  Type,
  FormInput,
  Bell,
  Menu,
  Layers,
  Table,
  Image,
  Grid3X3,
  FileText,
  CreditCard,
  Quote,
  MousePointerClick,
  PanelBottom,
  Users,
  BarChart,
  Newspaper,
  Square,
};

function buildPresetGroups(item) {
  const schema = item?.propSchema || {};
  return Object.entries(schema)
    .filter(
      ([, def]) =>
        def?.type === "select" &&
        Array.isArray(def.options) &&
        def.options.length > 0
    )
    .map(([key, def]) => ({
      id: key,
      label: def.label || key,
      options: def.options,
    }));
}

function createTemplateElement(item, propsOverride) {
  return {
    id: "template",
    type: item.id,
    props: { ...(item.defaultProps || {}), ...(propsOverride || {}) },
    style: {},
    children: [],
  };
}

// Draggable item component
function DraggableItem({
  item,
  type = "component",
  onOpenContextMenu,
  onOpenDetails,
}) {
  const [showCli, setShowCli] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [openGroups, setOpenGroups] = useState(() => ({}));

  const presetGroups = useMemo(() => buildPresetGroups(item), [item]);
  const hasPresets = presetGroups.length > 0;

  const handleDragStart = (e, propsOverride) => {
    const dragData = {
      type: item.id,
      defaultProps: item.defaultProps || {},
      props: { ...(item.defaultProps || {}), ...(propsOverride || {}) },
    };

    e.dataTransfer.setData("application/json", JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = "copy";

    // Create custom drag image
    const dragImage = document.createElement("div");
    dragImage.className =
      "px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium shadow-lg";
    dragImage.textContent = item.name;
    dragImage.style.position = "absolute";
    dragImage.style.top = "-1000px";
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);

    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  const handleCopyCli = async (e) => {
    e.stopPropagation();
    if (item.cli) {
      await copyToClipboard(item.cli);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="group relative"
      onMouseEnter={() => setShowCli(true)}
      onMouseLeave={() => setShowCli(false)}
    >
      <div
        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors"
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpenContextMenu?.(e, { item, type });
        }}
      >
        {hasPresets ? (
          <button
            type="button"
            className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted/60"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded((v) => !v);
            }}
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
        ) : (
          <div className="h-5 w-5" />
        )}

        <div
          draggable
          onDragStart={(e) => handleDragStart(e)}
          className="flex items-center gap-2 flex-1 min-w-0 cursor-grab active:cursor-grabbing"
          onDoubleClick={() => onOpenDetails?.({ item, type })}
        >
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          <Square className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm truncate flex-1">{item.name}</span>
        </div>

        {/* CLI button (show on hover if CLI exists) */}
        {item.cli && showCli && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleCopyCli}
            title="Copy CLI command"
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Terminal className="h-3 w-3" />
            )}
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetails?.({ item, type });
          }}
          title="View details"
        >
          <Eye className="h-3 w-3" />
        </Button>
      </div>

      {/* CLI tooltip */}
      {item.cli && showCli && (
        <div className="absolute left-full ml-2 top-0 z-50 bg-popover border rounded-md px-2 py-1 text-[10px] font-mono text-muted-foreground shadow-lg whitespace-nowrap">
          {item.cli}
        </div>
      )}

      {isExpanded && hasPresets && (
        <div className="mt-1 ml-7 space-y-1">
          {presetGroups.map((group) => {
            const groupOpen = !!openGroups[group.id];
            return (
              <div
                key={group.id}
                className="rounded-md border border-border/50 overflow-hidden"
              >
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-muted/30 transition-colors"
                  onClick={() =>
                    setOpenGroups((prev) => ({
                      ...prev,
                      [group.id]: !prev[group.id],
                    }))
                  }
                >
                  {groupOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className="text-[11px] font-medium text-muted-foreground flex-1">
                    {group.label}
                  </span>
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0 h-4"
                  >
                    {group.options.length}
                  </Badge>
                </button>

                {groupOpen && (
                  <div className="px-2 pb-1 space-y-0.5">
                    {group.options.map((opt) => (
                      <div
                        key={`${group.id}:${opt.value}`}
                        className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted/40 cursor-grab active:cursor-grabbing"
                        draggable
                        onDragStart={(e) =>
                          handleDragStart(e, { [group.id]: opt.value })
                        }
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onOpenContextMenu?.(e, {
                            item,
                            type,
                            presetLabel: `${group.label}: ${opt.label}`,
                            propsOverride: { [group.id]: opt.value },
                          });
                        }}
                      >
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground opacity-60 shrink-0" />
                        <span className="text-xs truncate flex-1">
                          {opt.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Collapsible category section
function CategorySection({
  category,
  items,
  type,
  defaultOpen = false,
  renderItem,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (items.length === 0) return null;

  const Icon = iconMap[category.icon] || Square;

  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-muted/30 transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs font-medium flex-1">{category.name}</span>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
          {items.length}
        </Badge>
      </button>

      {isOpen && (
        <div className="px-2 pb-2 space-y-0.5">
          {items.map((item) => (
            <React.Fragment key={item.id}>
              {renderItem ? (
                renderItem(item)
              ) : (
                <DraggableItem item={item} type={type} />
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

// Install all button
function InstallAllButton({ cli }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyToClipboard(cli);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full gap-2 text-xs"
      onClick={handleCopy}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-green-500" />
          Copied!
        </>
      ) : (
        <>
          <Terminal className="h-3.5 w-3.5" />
          Copy Install All Command
        </>
      )}
    </Button>
  );
}

export function DesignPanel() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("blocks");
  const [sidebarMenu, setSidebarMenu] = useState(null);
  const [details, setDetails] = useState(null);

  const addElement = useEditorStore((s) => s.addElement);
  const setClipboard = useEditorStore((s) => s.setClipboard);
  const pasteFromClipboard = useEditorStore((s) => s.pasteFromClipboard);
  const clipboard = useEditorStore((s) => s.canvas.clipboard);

  // Filter blocks by search
  const filteredBlocks = useMemo(() => {
    if (!searchQuery.trim()) return blocks;
    const query = searchQuery.toLowerCase();
    return blocks.filter(
      (b) =>
        b.name.toLowerCase().includes(query) ||
        b.description?.toLowerCase().includes(query) ||
        b.category?.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Filter components by search
  const filteredComponents = useMemo(() => {
    if (!searchQuery.trim()) return shadcnComponents;
    const query = searchQuery.toLowerCase();
    return shadcnComponents.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.description?.toLowerCase().includes(query) ||
        c.category?.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Group filtered blocks by category
  const groupedBlocks = useMemo(() => {
    return blockCategories.map((cat) => ({
      ...cat,
      items: filteredBlocks.filter((b) => b.category === cat.id),
    }));
  }, [filteredBlocks]);

  // Group filtered components by category
  const groupedComponents = useMemo(() => {
    return shadcnCategories.map((cat) => ({
      ...cat,
      items: filteredComponents.filter((c) => c.category === cat.id),
    }));
  }, [filteredComponents]);

  // Get all CLI commands for batch install
  const allCliCommand = getAllCliCommands();

  return (
    <div className="flex flex-col h-full">
      {/* Header with search */}
      <div className="p-3 border-b shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search blocks & components..."
            className="pl-8 h-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-col flex-1 min-h-0"
      >
        <div className="px-3 py-2 border-b shrink-0">
          <TabsList className="w-full">
            <TabsTrigger value="blocks" className="flex-1 text-xs">
              Blocks
              <Badge
                variant="secondary"
                className="ml-1.5 text-[10px] px-1 py-0 h-4"
              >
                {blocks.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="components" className="flex-1 text-xs">
              Components
              <Badge
                variant="secondary"
                className="ml-1.5 text-[10px] px-1 py-0 h-4"
              >
                {shadcnComponents.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Blocks Tab */}
        <TabsContent value="blocks" className="flex-1 m-0 p-0 min-h-0">
          <ScrollArea className="h-full">
            <div className="py-1">
              {/* Quick tip */}
              <div className="px-3 py-2 text-[10px] text-muted-foreground bg-muted/30 mb-1">
                <strong>Tip:</strong> Drag blocks to canvas. Hover to copy CLI
                command.
              </div>

              {groupedBlocks.map((group, idx) => (
                <CategorySection
                  key={group.id}
                  category={group}
                  items={group.items}
                  type="block"
                  defaultOpen={idx === 0} // First category open by default
                  renderItem={(item) => (
                    <DraggableItem
                      item={item}
                      type="block"
                      onOpenContextMenu={(e, entry) =>
                        setSidebarMenu({
                          x: e.clientX,
                          y: e.clientY,
                          entry,
                        })
                      }
                      onOpenDetails={(entry) => setDetails(entry)}
                    />
                  )}
                />
              ))}

              {filteredBlocks.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No blocks found for "{searchQuery}"
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Components Tab */}
        <TabsContent
          value="components"
          className="flex-1 m-0 p-0 min-h-0 flex flex-col"
        >
          <ScrollArea className="flex-1">
            <div className="py-1">
              {/* Quick tip */}
              <div className="px-3 py-2 text-[10px] text-muted-foreground bg-muted/30 mb-1">
                <strong>Tip:</strong> Hover over components to see CLI commands.
              </div>

              {groupedComponents.map((group, idx) => (
                <CategorySection
                  key={group.id}
                  category={group}
                  items={group.items}
                  type="component"
                  defaultOpen={idx === 0}
                  renderItem={(item) => (
                    <DraggableItem
                      item={item}
                      type="component"
                      onOpenContextMenu={(e, entry) =>
                        setSidebarMenu({
                          x: e.clientX,
                          y: e.clientY,
                          entry,
                        })
                      }
                      onOpenDetails={(entry) => setDetails(entry)}
                    />
                  )}
                />
              ))}

              {filteredComponents.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No components found for "{searchQuery}"
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Install All Components */}
          <div className="p-3 border-t shrink-0 bg-muted/20">
            <InstallAllButton cli={allCliCommand} />
          </div>
        </TabsContent>
      </Tabs>

      <SidebarContextMenu
        position={sidebarMenu}
        clipboardCount={clipboard?.length || 0}
        onClose={() => setSidebarMenu(null)}
        onInsert={() => {
          const entry = sidebarMenu?.entry;
          if (!entry?.item) return;
          addElement(
            {
              type: entry.item.id,
              defaultProps: entry.item.defaultProps || {},
              props: entry.propsOverride || {},
            },
            null,
            null
          );
          setSidebarMenu(null);
        }}
        onCopyForPaste={() => {
          const entry = sidebarMenu?.entry;
          if (!entry?.item) return;
          setClipboard([
            createTemplateElement(entry.item, entry.propsOverride),
          ]);
          setSidebarMenu(null);
        }}
        onPasteNow={() => {
          pasteFromClipboard();
          setSidebarMenu(null);
        }}
        onCopyJson={async () => {
          const entry = sidebarMenu?.entry;
          if (!entry?.item) return;
          const payload = {
            type: entry.item.id,
            props: {
              ...(entry.item.defaultProps || {}),
              ...(entry.propsOverride || {}),
            },
          };
          await copyToClipboard(JSON.stringify(payload, null, 2));
          setSidebarMenu(null);
        }}
        onCopyJsx={async () => {
          const entry = sidebarMenu?.entry;
          if (!entry?.item) return;
          const jsx = generateElementCode(
            createTemplateElement(entry.item, entry.propsOverride)
          );
          await copyToClipboard(jsx);
          setSidebarMenu(null);
        }}
        onCopyCli={async () => {
          const entry = sidebarMenu?.entry;
          if (!entry?.item?.cli) return;
          await copyToClipboard(entry.item.cli);
          setSidebarMenu(null);
        }}
        onViewDetails={() => {
          const entry = sidebarMenu?.entry;
          if (!entry?.item) return;
          setDetails({
            item: entry.item,
            type: entry.type,
            propsOverride: entry.propsOverride,
          });
          setSidebarMenu(null);
        }}
      />

      <ComponentDetailsDialog
        open={!!details?.item}
        entry={details}
        onOpenChange={(open) => {
          if (!open) setDetails(null);
        }}
        onCopyForPaste={() => {
          if (!details?.item) return;
          setClipboard([
            createTemplateElement(details.item, details.propsOverride),
          ]);
        }}
        onInsert={() => {
          if (!details?.item) return;
          addElement(
            {
              type: details.item.id,
              defaultProps: details.item.defaultProps || {},
              props: details.propsOverride || {},
            },
            null,
            null
          );
        }}
      />
    </div>
  );
}

function SidebarContextMenu({
  position,
  clipboardCount,
  onClose,
  onInsert,
  onCopyForPaste,
  onPasteNow,
  onCopyJson,
  onCopyJsx,
  onCopyCli,
  onViewDetails,
}) {
  if (!position?.entry) return null;

  const { entry } = position;
  const header = entry.presetLabel
    ? `${entry.item.name} • ${entry.presetLabel}`
    : entry.item.name;
  const canPaste = clipboardCount > 0;

  const items = [
    { type: "header", label: header },
    { type: "separator" },
    { icon: Plus, label: "Insert", onClick: onInsert },
    { icon: Clipboard, label: "Copy for paste", onClick: onCopyForPaste },
    { icon: Copy, label: "Paste", disabled: !canPaste, onClick: onPasteNow },
    { type: "separator" },
    { icon: Code, label: "Copy JSX", onClick: onCopyJsx },
    { icon: Copy, label: "Copy JSON", onClick: onCopyJson },
    ...(entry.item.cli
      ? [{ icon: Terminal, label: "Copy CLI command", onClick: onCopyCli }]
      : []),
    { type: "separator" },
    { icon: Eye, label: "View details", onClick: onViewDetails },
  ];

  return (
    <>
      <div
        className="fixed inset-0 z-50"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        className="fixed z-50 min-w-[220px] bg-popover border rounded-lg shadow-lg py-1 overflow-hidden"
        style={{ left: position.x, top: position.y }}
      >
        {items.map((item, index) => {
          switch (item.type) {
            case "header":
              return (
                <div
                  key={index}
                  className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                >
                  {item.label}
                </div>
              );

            case "separator":
              return <div key={index} className="h-px bg-border my-1" />;

            default: {
              const Icon = item.icon;
              return (
                <button
                  key={index}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent transition-colors ${
                    item.disabled ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  onClick={item.disabled ? undefined : item.onClick}
                  disabled={item.disabled}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-left">{item.label}</span>
                </button>
              );
            }
          }
        })}
      </div>
    </>
  );
}

function ComponentDetailsDialog({
  open,
  entry,
  onOpenChange,
  onCopyForPaste,
  onInsert,
}) {
  const item = entry?.item;
  const propsOverride = entry?.propsOverride;

  const mergedProps = useMemo(() => {
    if (!item) return {};
    return { ...(item.defaultProps || {}), ...(propsOverride || {}) };
  }, [item, propsOverride]);

  const presetGroups = useMemo(() => buildPresetGroups(item), [item]);
  const jsx = useMemo(() => {
    if (!item) return "";
    return generateElementCode(createTemplateElement(item, propsOverride));
  }, [item, propsOverride]);

  if (!item) return null;

  const buttonVariantOptions =
    item.id === "button" ? item.propSchema?.variant?.options || [] : [];
  const buttonSizeOptions =
    item.id === "button" ? item.propSchema?.size?.options || [] : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[90vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span className="truncate">{item.name}</span>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={onCopyForPaste}
              >
                Copy for paste
              </Button>
              <Button size="sm" className="text-xs" onClick={onInsert}>
                Insert
              </Button>
            </div>
          </DialogTitle>
          {item.description && (
            <DialogDescription>{item.description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0">
          <div className="rounded-lg border p-3 min-h-0">
            <div className="text-xs font-medium mb-2">Preview</div>
            <ScrollArea className="h-[360px]">
              <div className="space-y-4">
                {(() => {
                  switch (item.id) {
                    case "button":
                      return (
                        <>
                          <div>
                            <div className="text-[11px] text-muted-foreground mb-2">
                              Variants
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {buttonVariantOptions.map((opt) => (
                                <Button
                                  key={opt.value}
                                  variant={opt.value}
                                  size={mergedProps.size || "default"}
                                >
                                  {opt.label}
                                </Button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] text-muted-foreground mb-2">
                              Sizes
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {buttonSizeOptions.map((opt) => (
                                <Button
                                  key={opt.value}
                                  variant={mergedProps.variant || "default"}
                                  size={opt.value}
                                >
                                  {opt.label}
                                </Button>
                              ))}
                            </div>
                          </div>
                        </>
                      );
                    default:
                      return (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                            <Square className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <div className="text-sm font-medium">
                            Preview for {item.name}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Preview not available for this component type yet.
                          </div>
                        </div>
                      );
                  }
                })()}
              </div>
            </ScrollArea>
          </div>

          <div className="rounded-lg border p-3 min-h-0">
            <div className="text-xs font-medium mb-2">Props</div>
            <ScrollArea className="h-[360px]">
              <div className="space-y-3">
                <div>
                  <div className="text-[11px] text-muted-foreground mb-1">
                    Current
                  </div>
                  <pre className="text-[11px] rounded-md border bg-muted/20 p-2 overflow-auto">
                    {JSON.stringify(mergedProps, null, 2)}
                  </pre>
                </div>

                {presetGroups.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] text-muted-foreground">
                      Options
                    </div>
                    {presetGroups.map((group) => (
                      <div
                        key={group.id}
                        className="rounded-md border border-border/50 overflow-hidden"
                      >
                        <div className="px-2 py-1.5 bg-muted/30 text-xs font-medium">
                          {group.label}
                        </div>
                        <div className="px-2 py-1.5 flex flex-wrap gap-1">
                          {group.options.map((opt) => (
                            <Badge
                              key={opt.value}
                              variant="secondary"
                              className="text-[10px]"
                            >
                              {opt.label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <div className="text-[11px] text-muted-foreground mb-1">
                    JSX
                  </div>
                  <div className="rounded-md border bg-muted/20 overflow-hidden">
                    <div className="flex items-center justify-between px-2 py-1.5 border-b bg-muted/30">
                      <span className="text-[11px] text-muted-foreground">
                        Code
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs gap-1"
                        onClick={() => copyToClipboard(jsx)}
                      >
                        <Copy className="h-3 w-3" />
                        Copy
                      </Button>
                    </div>
                    <pre className="p-2 text-[11px] overflow-auto">{jsx}</pre>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
