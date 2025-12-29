import React, { useState, useMemo } from "react";
import {
  Search,
  Layout,
  Type,
  FormInput,
  Megaphone,
  BarChart,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Square,
  RectangleHorizontal,
  MousePointerClick,
  Heading,
  AlignLeft,
  CreditCard,
  HelpCircle,
  Quote,
  SeparatorHorizontal,
  Grid3X3,
} from "lucide-react";
import { Input } from "../../ui/input";
import { ScrollArea } from "../../ui/scroll-area";
import { Button } from "../../ui/button";
import { Separator } from "../../ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../ui/tabs";
import { blocks, blockCategories, getBlocksByCategory } from "../../../data/blocks";
import { components } from "../../../data/components";

// Icon mapping
const iconMap = {
  Layout: Layout,
  Type: Type,
  FormInput: FormInput,
  Megaphone: Megaphone,
  BarChart: BarChart,
  Grid3X3: Grid3X3,
  MousePointerClick: MousePointerClick,
  SeparatorHorizontal: SeparatorHorizontal,
  Heading: Heading,
  AlignLeft: AlignLeft,
  Square: Square,
  CreditCard: CreditCard,
  HelpCircle: HelpCircle,
  Quote: Quote,
};

// Categorize shadcn components
const componentCategories = [
  {
    id: "inputs",
    name: "Inputs",
    items: components.filter((c) => c.category === "Inputs"),
  },
  {
    id: "surfaces",
    name: "Surfaces",
    items: components.filter((c) => c.category === "Surfaces"),
  },
  {
    id: "feedback",
    name: "Feedback",
    items: components.filter((c) => c.category === "Feedback"),
  },
  {
    id: "data-display",
    name: "Data Display",
    items: components.filter((c) => c.category === "Data Display"),
  },
  {
    id: "navigation",
    name: "Navigation",
    items: components.filter((c) => c.category === "Navigation"),
  },
];

// Draggable item component
function DraggableItem({ item, type = "component" }) {
  const handleDragStart = (e) => {
    // Set drag data
    const dragData = {
      type: type === "block" ? item.id : item.id,
      defaultProps: type === "block" ? item.defaultProps : {},
      props: {},
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

    // Clean up
    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  const Icon = type === "block" ? iconMap[item.icon] || Square : Square;

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-grab hover:bg-muted/50 active:cursor-grabbing transition-colors group"
    >
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-sm truncate">{item.name}</span>
    </div>
  );
}

// Collapsible category section
function CategorySection({ category, items, type, defaultOpen = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (items.length === 0) return null;

  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-muted/30 transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {category.name || category}
        </span>
        <span className="text-xs text-muted-foreground/60 ml-auto">{items.length}</span>
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
        b.description?.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Filter components by search
  const filteredComponents = useMemo(() => {
    if (!searchQuery.trim()) return components;
    const query = searchQuery.toLowerCase();
    return components.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.description?.toLowerCase().includes(query)
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
    return componentCategories.map((cat) => ({
      ...cat,
      items: filteredComponents.filter((c) => c.category === cat.name),
    }));
  }, [filteredComponents]);

  return (
    <div className="flex flex-col h-full">
      {/* Header with search */}
      <div className="p-3 border-b shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
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
            <TabsTrigger value="blocks" className="flex-1">
              Blocks
            </TabsTrigger>
            <TabsTrigger value="components" className="flex-1">
              Components
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Blocks Tab */}
        <TabsContent value="blocks" className="flex-1 m-0 p-0 min-h-0">
          <ScrollArea className="h-full">
            <div className="py-1">
              {groupedBlocks.map((group) => (
                <CategorySection
                  key={group.id}
                  category={group}
                  items={group.items}
                  type="block"
                  defaultOpen={group.id === "layout"}
                />
              ))}

              {filteredBlocks.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No blocks found
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Components Tab */}
        <TabsContent value="components" className="flex-1 m-0 p-0 min-h-0">
          <ScrollArea className="h-full">
            <div className="py-1">
              {groupedComponents.map((group) => (
                <CategorySection
                  key={group.id}
                  category={group}
                  items={group.items}
                  type="component"
                  defaultOpen={group.id === "inputs"}
                />
              ))}

              {filteredComponents.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No components found
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
