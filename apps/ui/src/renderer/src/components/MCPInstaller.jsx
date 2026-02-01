import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  FolderOpen,
  Server,
  Check,
  X,
  AlertCircle,
  Loader2,
  Copy,
  ExternalLink,
  RefreshCw,
  Settings2,
  ChevronRight,
  FileCode,
  Terminal,
  Globe,
  Zap,
  Shield,
  Download,
  Sparkles,
  Lock,
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

// Helper to detect platform in browser context
const isMac = () =>
  navigator.platform?.toLowerCase().includes("mac") ||
  navigator.userAgent?.toLowerCase().includes("mac");

// MCP Server configurations
const MCP_SERVERS = [
  {
    id: "claude",
    name: "Claude Desktop",
    description: "Configure MCP servers for Claude Desktop on macOS/Windows",
    icon: Sparkles,
    gradient: "from-orange-500 to-amber-500",
    configPath: {
      mac: "~/Library/Application Support/Claude/claude_desktop_config.json",
      win: "%APPDATA%/Claude/claude_desktop_config.json",
    },
  },
  {
    id: "cursor",
    name: "Cursor",
    description: "Configure MCP servers for Cursor IDE",
    icon: Terminal,
    gradient: "from-blue-500 to-cyan-500",
    configPath: {
      mac: "~/.cursor/mcp.json",
      win: "%USERPROFILE%/.cursor/mcp.json",
    },
  },
  {
    id: "vscode",
    name: "VS Code",
    description: "Configure MCP servers for VS Code with Copilot",
    icon: FileCode,
    gradient: "from-violet-500 to-purple-500",
    configPath: {
      mac: "~/.vscode/mcp-servers.json",
      win: "%USERPROFILE%/.vscode/mcp-servers.json",
    },
  },
  {
    id: "custom",
    name: "Custom Project",
    description: "Install MCP configuration to any project directory",
    icon: FolderOpen,
    gradient: "from-emerald-500 to-teal-500",
    configPath: null,
  },
];

// Available MCP server types to install
const AVAILABLE_MCP_PROVIDERS = [
  {
    id: "next-gen-scrum",
    name: "Next Gen Scrum",
    description: "Scrum/Kanban board management via MCP",
    command: "node",
    args: ["path/to/scrum-mcp-server.js"],
    transport: "sse",
    url: "http://localhost:3847/sse",
    category: "productivity",
    icon: Server,
    recommended: true,
  },
  {
    id: "filesystem",
    name: "Filesystem",
    description: "File and directory operations",
    command: "npx",
    args: [
      "-y",
      "@modelcontextprotocol/server-filesystem",
      "/path/to/directory",
    ],
    transport: "stdio",
    category: "system",
    icon: FolderOpen,
  },
  {
    id: "github",
    name: "GitHub",
    description: "GitHub API integration for repositories and issues",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    transport: "stdio",
    env: { GITHUB_TOKEN: "${GITHUB_TOKEN}" },
    category: "developer",
    icon: Globe,
  },
  {
    id: "postgresql",
    name: "PostgreSQL",
    description: "PostgreSQL database operations",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-postgres", "postgresql://..."],
    transport: "stdio",
    category: "database",
    icon: Server,
  },
  {
    id: "brave-search",
    name: "Brave Search",
    description: "Web search via Brave Search API",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-brave-search"],
    transport: "stdio",
    env: { BRAVE_API_KEY: "${BRAVE_API_KEY}" },
    category: "search",
    icon: Globe,
  },
  {
    id: "puppeteer",
    name: "Puppeteer",
    description: "Browser automation and web scraping",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-puppeteer"],
    transport: "stdio",
    category: "browser",
    icon: Globe,
  },
];

export default function MCPInstaller({ open, onOpenChange }) {
  const [activeTab, setActiveTab] = useState("install");
  const [selectedTarget, setSelectedTarget] = useState("claude");
  const [customPath, setCustomPath] = useState("");
  const [selectedProviders, setSelectedProviders] = useState([
    "next-gen-scrum",
  ]);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installStatus, setInstallStatus] = useState(null);
  const [copied, setCopied] = useState(false);
  const [httpsEnabled, setHttpsEnabled] = useState(false);
  const [mcpPort, setMcpPort] = useState("3847");

  const target = useMemo(
    () => MCP_SERVERS.find((s) => s.id === selectedTarget),
    [selectedTarget],
  );

  // Generate MCP configuration
  const generateConfig = useCallback(() => {
    const mcpServers = {};

    selectedProviders.forEach((providerId) => {
      const provider = AVAILABLE_MCP_PROVIDERS.find((p) => p.id === providerId);
      if (!provider) return;

      if (provider.transport === "sse") {
        mcpServers[providerId] = {
          transport: "sse",
          url: httpsEnabled
            ? `https://localhost:${mcpPort}/sse`
            : `http://localhost:${mcpPort}/sse`,
        };
      } else {
        const config = {
          command: provider.command,
          args: provider.args,
        };
        if (provider.env) {
          config.env = provider.env;
        }
        mcpServers[providerId] = config;
      }
    });

    return {
      mcpServers,
    };
  }, [selectedProviders, httpsEnabled, mcpPort]);

  // Handle installation
  const handleInstall = useCallback(async () => {
    if (selectedTarget === "custom" && !customPath) {
      toast.error("Please select a project directory");
      return;
    }

    setIsInstalling(true);
    setInstallStatus(null);

    try {
      const config = generateConfig();
      const configJson = JSON.stringify(config, null, 2);

      if (window.electronAPI?.writeMcpConfig) {
        const targetPath =
          selectedTarget === "custom"
            ? customPath
            : target.configPath[isMac() ? "mac" : "win"];

        await window.electronAPI.writeMcpConfig(targetPath, configJson);
        setInstallStatus("success");
        toast.success(
          `MCP configuration installed to ${target?.name || "project"}`,
        );
      } else {
        // Simulate for web/dev mode
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setInstallStatus("success");
        toast.success("Configuration generated (preview mode)");
      }
    } catch (error) {
      setInstallStatus("error");
      toast.error(error.message || "Failed to install MCP configuration");
    } finally {
      setIsInstalling(false);
    }
  }, [selectedTarget, customPath, target, generateConfig]);

  // Handle folder selection
  const handleSelectFolder = useCallback(async () => {
    if (window.electronAPI?.selectDirectory) {
      const result = await window.electronAPI.selectDirectory();
      if (result) {
        setCustomPath(result);
      }
    } else {
      toast.error("Folder selection is only available in the desktop app");
    }
  }, []);

  // Copy config to clipboard
  const handleCopyConfig = useCallback(async () => {
    const config = generateConfig();
    try {
      await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
      setCopied(true);
      toast.success("Configuration copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  }, [generateConfig]);

  // Toggle provider selection
  const toggleProvider = useCallback((providerId) => {
    setSelectedProviders((prev) =>
      prev.includes(providerId)
        ? prev.filter((id) => id !== providerId)
        : [...prev, providerId],
    );
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            MCP Configuration Installer
          </DialogTitle>
          <DialogDescription>
            Install Model Context Protocol (MCP) servers to your IDE or project
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="install" className="gap-2">
              <Download className="h-4 w-4" />
              Install
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <FileCode className="h-4 w-4" />
              Preview Config
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="install"
            className="flex-1 flex gap-6 overflow-hidden mt-4"
          >
            {/* Left: Target Selection */}
            <div className="w-64 shrink-0 flex flex-col gap-4">
              <div>
                <Label className="text-sm font-medium">Install Target</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Choose where to install MCP servers
                </p>
              </div>

              <div className="space-y-2">
                {MCP_SERVERS.map((server) => {
                  const Icon = server.icon;
                  return (
                    <button
                      key={server.id}
                      type="button"
                      onClick={() => setSelectedTarget(server.id)}
                      className={cn(
                        "flex items-center gap-3 w-full p-3 rounded-xl border text-left transition-all",
                        selectedTarget === server.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/50",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-md",
                          server.gradient,
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{server.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {server.description}
                        </p>
                      </div>
                      {selectedTarget === server.id && (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Custom Path */}
              {selectedTarget === "custom" && (
                <div className="space-y-2">
                  <Label>Project Directory</Label>
                  <div className="flex gap-2">
                    <Input
                      value={customPath}
                      onChange={(e) => setCustomPath(e.target.value)}
                      placeholder="Select folder..."
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleSelectFolder}
                    >
                      <FolderOpen className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Provider Selection */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Label className="text-sm font-medium">MCP Servers</Label>
                  <p className="text-xs text-muted-foreground">
                    Select which MCP servers to install
                  </p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {selectedProviders.length} selected
                </span>
              </div>

              <ScrollArea className="flex-1 -mr-4 pr-4">
                <div className="space-y-2">
                  {AVAILABLE_MCP_PROVIDERS.map((provider) => {
                    const Icon = provider.icon;
                    const isSelected = selectedProviders.includes(provider.id);

                    return (
                      <button
                        key={provider.id}
                        type="button"
                        onClick={() => toggleProvider(provider.id)}
                        className={cn(
                          "flex items-center gap-3 w-full p-3 rounded-xl border text-left transition-all",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-muted-foreground/50",
                          provider.recommended &&
                            !isSelected &&
                            "border-emerald-500/30",
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {isSelected ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{provider.name}</p>
                            {provider.recommended && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-medium">
                                Recommended
                              </span>
                            )}
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {provider.transport}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {provider.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Settings */}
              <div className="pt-4 mt-4 border-t border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Enable HTTPS</p>
                    <p className="text-xs text-muted-foreground">
                      Use secure connection for SSE transport
                    </p>
                  </div>
                  <Switch
                    checked={httpsEnabled}
                    onCheckedChange={setHttpsEnabled}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Label className="text-sm">MCP Port</Label>
                    <Input
                      value={mcpPort}
                      onChange={(e) => setMcpPort(e.target.value)}
                      placeholder="3847"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-sm opacity-0">Action</Label>
                    <Button
                      className="w-full mt-1"
                      onClick={handleInstall}
                      disabled={isInstalling || selectedProviders.length === 0}
                    >
                      {isInstalling ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Installing...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Install Configuration
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="preview"
            className="flex-1 flex flex-col overflow-hidden mt-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <Label className="text-sm font-medium">
                  Configuration Preview
                </Label>
                <p className="text-xs text-muted-foreground">
                  JSON configuration that will be written to the target
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleCopyConfig}>
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>

            <ScrollArea className="flex-1 rounded-xl border border-border bg-slate-950 overflow-hidden">
              <pre className="p-4 text-sm text-slate-300 font-mono">
                <code>{JSON.stringify(generateConfig(), null, 2)}</code>
              </pre>
            </ScrollArea>

            {target && target.configPath && (
              <div className="mt-4 p-3 rounded-lg border border-border bg-muted/30">
                <p className="text-sm font-medium">Target Path</p>
                <code className="text-xs text-muted-foreground">
                  {target.configPath[isMac() ? "mac" : "win"] ||
                    target.configPath.mac}
                </code>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Status Message */}
        {installStatus && (
          <div
            className={cn(
              "flex items-center gap-2 p-3 rounded-lg mt-4",
              installStatus === "success"
                ? "bg-emerald-500/10 text-emerald-600"
                : "bg-red-500/10 text-red-600",
            )}
          >
            {installStatus === "success" ? (
              <>
                <Check className="h-4 w-4" />
                MCP configuration installed successfully!
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4" />
                Installation failed. Please check the target path.
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
