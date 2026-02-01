import React, { useState, useEffect, useCallback } from "react";
import {
  Menu,
  Eye,
  EyeOff,
  GripVertical,
  Settings2,
  RefreshCw,
  Check,
  ChevronRight,
  Rocket,
  AppWindow,
  Folder,
  LayoutGrid,
  Table,
  Globe,
  TestTube,
  Settings,
  Camera,
  Github,
  Search,
  RotateCcw,
  Lock,
  Unlock,
} from "lucide-react";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { cn } from "../lib/utils";
import { toast } from "sonner";

const MENU_STORAGE_KEY = "menu-visibility-settings";

// Default menu items with their configurations
const DEFAULT_MENU_ITEMS = [
  {
    id: "nav:generator",
    label: "Generator",
    icon: Rocket,
    category: "Tools",
    visible: true,
    locked: false,
    order: 0,
    description: "Project scaffolding and templates",
  },
  {
    id: "nav:projects",
    label: "Projects",
    icon: AppWindow,
    category: "Tools",
    visible: true,
    locked: false,
    order: 1,
    description: "Manage and launch projects",
  },
  {
    id: "nav:resources",
    label: "Resources",
    icon: Folder,
    category: "Tools",
    visible: true,
    locked: false,
    order: 2,
    description: "Screenshots and assets",
  },
  {
    id: "nav:ui",
    label: "UI Builder",
    icon: LayoutGrid,
    category: "Tools",
    visible: true,
    locked: false,
    order: 3,
    description: "Component editor and designer",
  },
  {
    id: "nav:scrum-board",
    label: "Scrum Board",
    icon: Table,
    category: "Tools",
    visible: true,
    locked: false,
    order: 4,
    description: "Kanban task management",
  },
  {
    id: "nav:browser",
    label: "Browser",
    icon: Globe,
    category: "Browser",
    visible: true,
    locked: false,
    order: 5,
    description: "Built-in web browser",
  },
  {
    id: "nav:tests",
    label: "Tests",
    icon: TestTube,
    category: "Tools",
    visible: true,
    locked: false,
    order: 6,
    description: "Test management",
  },
  {
    id: "nav:settings",
    label: "Settings",
    icon: Settings,
    category: "System",
    visible: true,
    locked: true,
    order: 7,
    description: "App preferences",
  },
];

const CAPTURE_ITEMS = [
  {
    id: "capture:app:full",
    label: "Screenshot (App)",
    icon: Camera,
    category: "Capture",
    visible: true,
    locked: false,
    order: 0,
    description: "Capture full app window",
  },
  {
    id: "capture:app:area",
    label: "Screenshot (Area)",
    icon: Camera,
    category: "Capture",
    visible: true,
    locked: false,
    order: 1,
    description: "Capture selected area",
  },
  {
    id: "capture:screen:full",
    label: "Screenshot (Screen)",
    icon: Camera,
    category: "Capture",
    visible: true,
    locked: false,
    order: 2,
    description: "Capture external display",
  },
];

const SHORTCUT_ITEMS = [
  {
    id: "openExternal:github",
    label: "Open GitHub",
    icon: Github,
    category: "Shortcuts",
    visible: true,
    locked: false,
    order: 0,
    description: "Open GitHub repository",
  },
  {
    id: "dock:toggleAutoHide",
    label: "Toggle Dock Auto-hide",
    icon: Search,
    category: "Shortcuts",
    visible: true,
    locked: false,
    order: 1,
    description: "Toggle dock visibility",
  },
];

export default function MenuManagement() {
  const [menuItems, setMenuItems] = useState(DEFAULT_MENU_ITEMS);
  const [captureItems, setCaptureItems] = useState(CAPTURE_ITEMS);
  const [shortcutItems, setShortcutItems] = useState(SHORTCUT_ITEMS);
  const [draggedItem, setDraggedItem] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  // Load saved settings
  useEffect(() => {
    try {
      const saved = localStorage.getItem(MENU_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.menuItems) {
          // Merge with defaults to handle new items
          const merged = DEFAULT_MENU_ITEMS.map((def) => {
            const saved = parsed.menuItems.find((s) => s.id === def.id);
            return saved ? { ...def, ...saved } : def;
          });
          setMenuItems(merged);
        }
        if (parsed.captureItems) {
          const merged = CAPTURE_ITEMS.map((def) => {
            const saved = parsed.captureItems.find((s) => s.id === def.id);
            return saved ? { ...def, ...saved } : def;
          });
          setCaptureItems(merged);
        }
        if (parsed.shortcutItems) {
          const merged = SHORTCUT_ITEMS.map((def) => {
            const saved = parsed.shortcutItems.find((s) => s.id === def.id);
            return saved ? { ...def, ...saved } : def;
          });
          setShortcutItems(merged);
        }
      }
    } catch {}
  }, []);

  // Save settings
  const saveSettings = useCallback(() => {
    try {
      const settings = {
        menuItems: menuItems.map(({ id, visible, locked, order }) => ({
          id,
          visible,
          locked,
          order,
        })),
        captureItems: captureItems.map(({ id, visible, locked, order }) => ({
          id,
          visible,
          locked,
          order,
        })),
        shortcutItems: shortcutItems.map(({ id, visible, locked, order }) => ({
          id,
          visible,
          locked,
          order,
        })),
      };
      localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(settings));

      // Dispatch event for other components to listen
      window.dispatchEvent(
        new CustomEvent("menu-settings-changed", { detail: settings }),
      );

      setIsDirty(false);
      toast.success("Menu settings saved");
    } catch (err) {
      toast.error("Failed to save settings");
    }
  }, [menuItems, captureItems, shortcutItems]);

  // Toggle visibility
  const toggleVisibility = useCallback((itemId, items, setItems) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId && !item.locked
          ? { ...item, visible: !item.visible }
          : item,
      ),
    );
    setIsDirty(true);
  }, []);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setMenuItems(DEFAULT_MENU_ITEMS);
    setCaptureItems(CAPTURE_ITEMS);
    setShortcutItems(SHORTCUT_ITEMS);
    setIsDirty(true);
    toast.success("Reset to defaults");
  }, []);

  // Show all items
  const showAll = useCallback((items, setItems) => {
    setItems((prev) =>
      prev.map((item) => (item.locked ? item : { ...item, visible: true })),
    );
    setIsDirty(true);
  }, []);

  // Hide all items
  const hideAll = useCallback((items, setItems) => {
    setItems((prev) =>
      prev.map((item) => (item.locked ? item : { ...item, visible: false })),
    );
    setIsDirty(true);
  }, []);

  // Drag and drop handlers
  const handleDragStart = useCallback((e, item, type) => {
    setDraggedItem({ item, type });
    e.dataTransfer.effectAllowed = "move";
    e.currentTarget.classList.add("opacity-50");
  }, []);

  const handleDragEnd = useCallback((e) => {
    setDraggedItem(null);
    e.currentTarget.classList.remove("opacity-50");
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    (e, targetItem, type, items, setItems) => {
      e.preventDefault();
      if (!draggedItem || draggedItem.type !== type) return;

      const sourceItem = draggedItem.item;
      if (sourceItem.id === targetItem.id) return;

      const newItems = [...items];
      const sourceIndex = newItems.findIndex((i) => i.id === sourceItem.id);
      const targetIndex = newItems.findIndex((i) => i.id === targetItem.id);

      newItems.splice(sourceIndex, 1);
      newItems.splice(targetIndex, 0, sourceItem);

      // Update order
      newItems.forEach((item, index) => {
        item.order = index;
      });

      setItems(newItems);
      setIsDirty(true);
    },
    [draggedItem],
  );

  // Render item row
  const renderItem = (item, items, setItems, type) => {
    const Icon = item.icon;

    return (
      <div
        key={item.id}
        draggable={!item.locked}
        onDragStart={(e) => handleDragStart(e, item, type)}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, item, type, items, setItems)}
        className={cn(
          "group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
          "border border-transparent hover:border-border hover:bg-muted/50",
          item.locked && "opacity-75",
          draggedItem?.item.id === item.id && "opacity-50",
        )}
      >
        {/* Drag Handle */}
        <div
          className={cn(
            "cursor-grab text-muted-foreground/50",
            item.locked && "cursor-not-allowed opacity-50",
          )}
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Icon */}
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
            item.visible
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "font-medium truncate",
                !item.visible && "text-muted-foreground",
              )}
            >
              {item.label}
            </span>
            {item.locked && (
              <Lock className="h-3 w-3 text-muted-foreground/50" />
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {item.description}
          </p>
        </div>

        {/* Visibility Toggle */}
        <button
          type="button"
          onClick={() => toggleVisibility(item.id, items, setItems)}
          disabled={item.locked}
          className={cn(
            "p-2 rounded-md transition-colors",
            item.visible
              ? "text-emerald-500 hover:bg-emerald-500/10"
              : "text-muted-foreground hover:bg-muted",
            item.locked && "cursor-not-allowed opacity-50",
          )}
          title={item.visible ? "Hide" : "Show"}
        >
          {item.visible ? (
            <Eye className="h-4 w-4" />
          ) : (
            <EyeOff className="h-4 w-4" />
          )}
        </button>
      </div>
    );
  };

  // Count visible items
  const countVisible = (items) => items.filter((i) => i.visible).length;

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold">Menu Visibility</h4>
          <p className="text-sm text-muted-foreground">
            Customize which items appear in the dock and launchpad
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetToDefaults}
            className="text-muted-foreground"
          >
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Reset
          </Button>
          {isDirty && (
            <Button size="sm" onClick={saveSettings}>
              <Check className="h-4 w-4 mr-1.5" />
              Save Changes
            </Button>
          )}
        </div>
      </div>

      {/* Navigation Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">
            Navigation ({countVisible(menuItems)}/{menuItems.length} visible)
          </Label>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => showAll(menuItems, setMenuItems)}
              className="h-7 px-2 text-xs"
            >
              Show All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => hideAll(menuItems, setMenuItems)}
              className="h-7 px-2 text-xs"
            >
              Hide All
            </Button>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {menuItems
            .sort((a, b) => a.order - b.order)
            .map((item) => renderItem(item, menuItems, setMenuItems, "menu"))}
        </div>
      </div>

      {/* Capture Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">
            Capture Actions ({countVisible(captureItems)}/{captureItems.length}{" "}
            visible)
          </Label>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => showAll(captureItems, setCaptureItems)}
              className="h-7 px-2 text-xs"
            >
              Show All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => hideAll(captureItems, setCaptureItems)}
              className="h-7 px-2 text-xs"
            >
              Hide All
            </Button>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {captureItems
            .sort((a, b) => a.order - b.order)
            .map((item) =>
              renderItem(item, captureItems, setCaptureItems, "capture"),
            )}
        </div>
      </div>

      {/* Shortcut Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">
            Shortcuts ({countVisible(shortcutItems)}/{shortcutItems.length}{" "}
            visible)
          </Label>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => showAll(shortcutItems, setShortcutItems)}
              className="h-7 px-2 text-xs"
            >
              Show All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => hideAll(shortcutItems, setShortcutItems)}
              className="h-7 px-2 text-xs"
            >
              Hide All
            </Button>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {shortcutItems
            .sort((a, b) => a.order - b.order)
            .map((item) =>
              renderItem(item, shortcutItems, setShortcutItems, "shortcut"),
            )}
        </div>
      </div>

      {/* Help Text */}
      <p className="text-xs text-muted-foreground">
        <strong>Tip:</strong> Drag items to reorder them. Items marked with{" "}
        <Lock className="inline h-3 w-3" /> cannot be hidden.
      </p>
    </div>
  );
}
