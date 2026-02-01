import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  Puzzle,
  Search,
  Download,
  Trash2,
  Settings2,
  ExternalLink,
  Check,
  X,
  RefreshCw,
  Power,
  Star,
  Clock,
  Package,
  ChevronRight,
  Terminal,
  Globe,
  Code2,
  Palette,
  Zap,
  Shield,
  BarChart,
  MessagesSquare,
  FileCode,
  ImageIcon,
  Bot,
  Loader2,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";
import { Switch } from "./ui/switch";
import { cn } from "../lib/utils";
import { toast } from "sonner";

const PLUGINS_STORAGE_KEY = "installed-plugins";

// Plugin categories
const CATEGORIES = [
  { id: "all", label: "All", icon: Package },
  { id: "ai", label: "AI & ML", icon: Bot },
  { id: "dev", label: "Developer", icon: Code2 },
  { id: "productivity", label: "Productivity", icon: Zap },
  { id: "browser", label: "Browser", icon: Globe },
  { id: "design", label: "Design", icon: Palette },
  { id: "security", label: "Security", icon: Shield },
  { id: "analytics", label: "Analytics", icon: BarChart },
];

// Available plugins (marketplace)
const AVAILABLE_PLUGINS = [
  {
    id: "code-formatter",
    name: "Code Formatter",
    description:
      "Format code in multiple languages using Prettier and other formatters",
    version: "1.2.0",
    author: "Next Dev Team",
    category: "dev",
    icon: FileCode,
    gradient: "from-blue-500 to-cyan-500",
    downloads: 15420,
    rating: 4.8,
    features: [
      "Multi-language support",
      "Custom configurations",
      "Auto-format on save",
    ],
    permissions: ["file-access", "settings"],
  },
  {
    id: "ai-assistant",
    name: "AI Assistant",
    description: "Intelligent code completion and suggestions powered by GPT",
    version: "2.0.1",
    author: "AI Labs",
    category: "ai",
    icon: Bot,
    gradient: "from-violet-500 to-purple-500",
    downloads: 42350,
    rating: 4.9,
    features: ["Code completion", "Bug detection", "Refactoring suggestions"],
    permissions: ["api-access", "file-access"],
  },
  {
    id: "screenshot-plus",
    name: "Screenshot Plus",
    description: "Advanced screenshot tools with annotations and cloud sync",
    version: "1.5.0",
    author: "Capture Inc",
    category: "productivity",
    icon: ImageIcon,
    gradient: "from-emerald-500 to-teal-500",
    downloads: 28900,
    rating: 4.7,
    features: ["Annotations", "Cloud sync", "Screen recording"],
    permissions: ["screen-capture", "cloud-storage"],
  },
  {
    id: "proxy-manager",
    name: "Proxy Manager",
    description: "Advanced proxy management with rotation and health checks",
    version: "1.1.0",
    author: "Network Tools",
    category: "browser",
    icon: Globe,
    gradient: "from-orange-500 to-red-500",
    downloads: 12540,
    rating: 4.5,
    features: ["Auto-rotation", "Health monitoring", "Geo-selection"],
    permissions: ["network", "settings"],
  },
  {
    id: "color-picker",
    name: "Color Picker Pro",
    description: "Advanced color picker with palettes and accessibility checks",
    version: "1.3.2",
    author: "Design Studio",
    category: "design",
    icon: Palette,
    gradient: "from-pink-500 to-rose-500",
    downloads: 19800,
    rating: 4.6,
    features: ["Eyedropper", "Palette generator", "Accessibility checker"],
    permissions: ["screen-capture", "clipboard"],
  },
  {
    id: "security-scanner",
    name: "Security Scanner",
    description: "Scan code and dependencies for vulnerabilities",
    version: "2.1.0",
    author: "SecureCode",
    category: "security",
    icon: Shield,
    gradient: "from-red-500 to-orange-500",
    downloads: 8920,
    rating: 4.8,
    features: ["Dependency scanning", "Code analysis", "Auto-fix suggestions"],
    permissions: ["file-access", "network"],
  },
  {
    id: "analytics-dashboard",
    name: "Analytics Dashboard",
    description: "Track usage, performance, and productivity metrics",
    version: "1.0.5",
    author: "Metrics Co",
    category: "analytics",
    icon: BarChart,
    gradient: "from-indigo-500 to-violet-500",
    downloads: 6540,
    rating: 4.4,
    features: ["Usage tracking", "Performance metrics", "Custom reports"],
    permissions: ["analytics", "settings"],
  },
  {
    id: "terminal-plus",
    name: "Terminal Plus",
    description: "Enhanced terminal with themes, tabs, and split views",
    version: "1.4.0",
    author: "CLI Masters",
    category: "dev",
    icon: Terminal,
    gradient: "from-slate-600 to-zinc-600",
    downloads: 32100,
    rating: 4.7,
    features: ["Multi-tab", "Split views", "Custom themes"],
    permissions: ["terminal", "file-access"],
  },
  {
    id: "chat-gpt",
    name: "ChatGPT Integration",
    description: "Direct integration with OpenAI ChatGPT for conversations",
    version: "1.8.0",
    author: "OpenAI Fan",
    category: "ai",
    icon: MessagesSquare,
    gradient: "from-green-500 to-emerald-500",
    downloads: 55200,
    rating: 4.9,
    features: ["Chat interface", "Code generation", "Context awareness"],
    permissions: ["api-access", "clipboard"],
  },
  {
    id: "quick-notes",
    name: "Quick Notes",
    description: "Fast note-taking with markdown support and cloud sync",
    version: "1.2.3",
    author: "Notes Team",
    category: "productivity",
    icon: FileCode,
    gradient: "from-amber-500 to-yellow-500",
    downloads: 21300,
    rating: 4.5,
    features: ["Markdown editor", "Tags", "Cloud sync"],
    permissions: ["file-access", "cloud-storage"],
  },
];

export default function PluginManager({ open, onOpenChange }) {
  const [activeTab, setActiveTab] = useState("discover");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [installedPlugins, setInstalledPlugins] = useState([]);
  const [selectedPlugin, setSelectedPlugin] = useState(null);
  const [installing, setInstalling] = useState(null);

  // Load installed plugins
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PLUGINS_STORAGE_KEY);
      if (saved) {
        setInstalledPlugins(JSON.parse(saved));
      }
    } catch {}
  }, []);

  // Save installed plugins
  const savePlugins = useCallback((plugins) => {
    setInstalledPlugins(plugins);
    localStorage.setItem(PLUGINS_STORAGE_KEY, JSON.stringify(plugins));
  }, []);

  // Filter plugins
  const filteredPlugins = useMemo(() => {
    let plugins = AVAILABLE_PLUGINS;

    if (selectedCategory !== "all") {
      plugins = plugins.filter((p) => p.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      plugins = plugins.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.author.toLowerCase().includes(query),
      );
    }

    return plugins;
  }, [selectedCategory, searchQuery]);

  // Install plugin
  const handleInstall = useCallback(
    async (plugin) => {
      setInstalling(plugin.id);

      // Simulate installation
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const installedPlugin = {
        ...plugin,
        installedAt: new Date().toISOString(),
        enabled: true,
        lastUpdated: null,
      };

      savePlugins([...installedPlugins, installedPlugin]);
      setInstalling(null);
      toast.success(`${plugin.name} installed successfully!`);
    },
    [installedPlugins, savePlugins],
  );

  // Uninstall plugin
  const handleUninstall = useCallback(
    (pluginId) => {
      const plugin = installedPlugins.find((p) => p.id === pluginId);
      const newPlugins = installedPlugins.filter((p) => p.id !== pluginId);
      savePlugins(newPlugins);
      toast.success(`${plugin?.name || "Plugin"} uninstalled`);
      if (selectedPlugin?.id === pluginId) {
        setSelectedPlugin(null);
      }
    },
    [installedPlugins, savePlugins, selectedPlugin],
  );

  // Toggle plugin enabled/disabled
  const handleToggle = useCallback(
    (pluginId, enabled) => {
      const newPlugins = installedPlugins.map((p) =>
        p.id === pluginId ? { ...p, enabled } : p,
      );
      savePlugins(newPlugins);
      toast.success(enabled ? "Plugin enabled" : "Plugin disabled");
    },
    [installedPlugins, savePlugins],
  );

  // Check if plugin is installed
  const isInstalled = useCallback(
    (pluginId) => {
      return installedPlugins.some((p) => p.id === pluginId);
    },
    [installedPlugins],
  );

  // Format download count
  const formatDownloads = (count) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count;
  };

  // Render plugin card
  const renderPluginCard = (plugin, installed = false) => {
    const Icon = plugin.icon;
    const isPluginInstalled = isInstalled(plugin.id);
    const isInstalling = installing === plugin.id;

    return (
      <div
        key={plugin.id}
        className={cn(
          "group relative rounded-xl border border-border/50 bg-card/50 p-4 transition-all duration-200 hover:border-border hover:bg-card hover:shadow-md",
          selectedPlugin?.id === plugin.id &&
            "ring-2 ring-primary ring-offset-2 ring-offset-background",
        )}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg",
              `${plugin.gradient}`,
            )}
          >
            <Icon className="h-6 w-6" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground truncate">
                {plugin.name}
              </h3>
              <span className="text-xs text-muted-foreground">
                v{plugin.version}
              </span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
              {plugin.description}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {plugin.rating}
              </span>
              <span className="flex items-center gap-1">
                <Download className="h-3 w-3" />
                {formatDownloads(plugin.downloads)}
              </span>
              <span className="truncate">{plugin.author}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {installed ? (
              <>
                <Switch
                  checked={plugin.enabled}
                  onCheckedChange={(checked) =>
                    handleToggle(plugin.id, checked)
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleUninstall(plugin.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            ) : isPluginInstalled ? (
              <Button variant="secondary" size="sm" disabled>
                <Check className="h-4 w-4 mr-1" />
                Installed
              </Button>
            ) : (
              <Button
                size="sm"
                className="bg-gradient-to-r from-primary to-primary/80"
                onClick={() => handleInstall(plugin)}
                disabled={isInstalling}
              >
                {isInstalling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Installing
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-1" />
                    Install
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* View Details Button */}
        <button
          type="button"
          onClick={() => setSelectedPlugin(plugin)}
          className="absolute inset-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label={`View details for ${plugin.name}`}
        >
          <span className="sr-only">View details</span>
        </button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Puzzle className="h-5 w-5 text-primary" />
            Plugin Manager
          </DialogTitle>
          <DialogDescription>
            Extend your app with plugins from the marketplace
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex gap-6 overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex-1 flex flex-col"
            >
              <div className="flex items-center gap-4 mb-4">
                <TabsList>
                  <TabsTrigger value="discover" className="gap-2">
                    <Package className="h-4 w-4" />
                    Discover
                  </TabsTrigger>
                  <TabsTrigger value="installed" className="gap-2">
                    <Puzzle className="h-4 w-4" />
                    Installed ({installedPlugins.length})
                  </TabsTrigger>
                </TabsList>

                {/* Search */}
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search plugins..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
              </div>

              <TabsContent
                value="discover"
                className="flex-1 flex gap-4 overflow-hidden mt-0"
              >
                {/* Categories Sidebar */}
                <div className="w-44 shrink-0">
                  <ScrollArea className="h-full">
                    <div className="space-y-1 pr-2">
                      {CATEGORIES.map((category) => {
                        const Icon = category.icon;
                        return (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => setSelectedCategory(category.id)}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                              selectedCategory === category.id
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground",
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            {category.label}
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>

                {/* Plugins Grid */}
                <ScrollArea className="flex-1">
                  <div className="space-y-3 pr-4">
                    {filteredPlugins.map((plugin) => renderPluginCard(plugin))}
                    {filteredPlugins.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
                        <p>No plugins found</p>
                        <p className="text-sm mt-1">
                          Try adjusting your search or category
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent
                value="installed"
                className="flex-1 overflow-hidden mt-0"
              >
                <ScrollArea className="h-full">
                  <div className="space-y-3 pr-4">
                    {installedPlugins.map((plugin) =>
                      renderPluginCard(plugin, true),
                    )}
                    {installedPlugins.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        <Puzzle className="h-12 w-12 mx-auto mb-3 opacity-40" />
                        <p>No plugins installed</p>
                        <p className="text-sm mt-1">
                          Discover plugins from the marketplace to extend your
                          app
                        </p>
                        <Button
                          variant="outline"
                          className="mt-4"
                          onClick={() => setActiveTab("discover")}
                        >
                          Browse Plugins
                        </Button>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>

          {/* Details Panel */}
          {selectedPlugin && (
            <div className="w-80 border-l border-border pl-6 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Plugin Details</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setSelectedPlugin(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <div className="space-y-4">
                  {/* Plugin Header */}
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg",
                        `${selectedPlugin.gradient}`,
                      )}
                    >
                      {React.createElement(selectedPlugin.icon, {
                        className: "h-7 w-7",
                      })}
                    </div>
                    <div>
                      <h4 className="font-semibold">{selectedPlugin.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        v{selectedPlugin.version} by {selectedPlugin.author}
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 py-3 border-y border-border">
                    <div className="text-center flex-1">
                      <div className="flex items-center justify-center gap-1 text-amber-400">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="font-semibold">
                          {selectedPlugin.rating}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Rating
                      </p>
                    </div>
                    <div className="text-center flex-1">
                      <div className="font-semibold text-foreground">
                        {formatDownloads(selectedPlugin.downloads)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Downloads
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      Description
                    </Label>
                    <p className="text-sm mt-1.5">
                      {selectedPlugin.description}
                    </p>
                  </div>

                  {/* Features */}
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      Features
                    </Label>
                    <ul className="mt-1.5 space-y-1.5">
                      {selectedPlugin.features.map((feature, idx) => (
                        <li
                          key={idx}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Permissions */}
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      Permissions Required
                    </Label>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {selectedPlugin.permissions.map((perm) => (
                        <span
                          key={perm}
                          className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground"
                        >
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-border">
                    {isInstalled(selectedPlugin.id) ? (
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1">
                          <Settings2 className="h-4 w-4 mr-2" />
                          Settings
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          onClick={() => handleUninstall(selectedPlugin.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Uninstall
                        </Button>
                      </div>
                    ) : (
                      <Button
                        className="w-full bg-gradient-to-r from-primary to-primary/80"
                        onClick={() => handleInstall(selectedPlugin)}
                        disabled={installing === selectedPlugin.id}
                      >
                        {installing === selectedPlugin.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Installing...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-2" />
                            Install Plugin
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
