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
} from "lucide-react";
import { Input } from "../../ui/input";
import { ScrollArea } from "../../ui/scroll-area";
import { Button } from "../../ui/button";
import { Separator } from "../../ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../ui/tabs";
import { Badge } from "../../ui/badge";
import { blocks, blockCategories } from "../../../data/blocks";
import { shadcnComponents, shadcnCategories, getAllCliCommands } from "../../../data/shadcnComponents";
import { copyToClipboard } from "../../../utils/codeGenerator";

// Icon mapping
const iconMap = {
  Layout, Type, FormInput, Bell, Menu, Layers, Table, Image, Grid3X3,
  FileText, CreditCard, Quote, MousePointerClick, PanelBottom, Users,
  BarChart, Newspaper, Square,
};

// Draggable item component
function DraggableItem({ item, type = "component" }) {
  const [showCli, setShowCli] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleDragStart = (e) => {
    const dragData = {
      type: item.id,
      defaultProps: item.defaultProps || {},
      props: item.defaultProps || {},
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
        draggable
        onDragStart={handleDragStart}
        className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-grab hover:bg-muted/50 active:cursor-grabbing transition-colors"
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        <Square className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm truncate flex-1">{item.name}</span>
        
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
      </div>
      
      {/* CLI tooltip */}
      {item.cli && showCli && (
        <div className="absolute left-full ml-2 top-0 z-50 bg-popover border rounded-md px-2 py-1 text-[10px] font-mono text-muted-foreground shadow-lg whitespace-nowrap">
          {item.cli}
        </div>
      )}
    </div>
  );
}

// Collapsible category section
function CategorySection({ category, items, type, defaultOpen = false }) {
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
            <DraggableItem key={item.id} item={item} type={type} />
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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
        <div className="px-3 py-2 border-b shrink-0">
          <TabsList className="w-full">
            <TabsTrigger value="blocks" className="flex-1 text-xs">
              Blocks
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0 h-4">
                {blocks.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="components" className="flex-1 text-xs">
              Components
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0 h-4">
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
                <strong>Tip:</strong> Drag blocks to canvas. Hover to copy CLI command.
              </div>

              {groupedBlocks.map((group, idx) => (
                <CategorySection
                  key={group.id}
                  category={group}
                  items={group.items}
                  type="block"
                  defaultOpen={idx === 0} // First category open by default
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
        <TabsContent value="components" className="flex-1 m-0 p-0 min-h-0 flex flex-col">
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
    </div>
  );
}
