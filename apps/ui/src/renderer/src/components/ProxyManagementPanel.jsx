import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  Edit,
  ExternalLink,
  FileUp,
  Globe,
  Loader2,
  MoreVertical,
  Network,
  Plus,
  RefreshCw,
  Search,
  Server,
  Trash2,
  Upload,
  Users,
  Wifi,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  formatProxyString,
  PROXY_STATUS,
  PROXY_TYPES,
  useProxyStore,
} from "../stores/proxyStore";
import { useBrowserProfileStore } from "../stores/browserProfileStore";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { ScrollArea } from "./ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { cn } from "../lib/utils";

const STATUS_COLORS = {
  [PROXY_STATUS.UNKNOWN]: "bg-gray-500",
  [PROXY_STATUS.CHECKING]: "bg-yellow-500 animate-pulse",
  [PROXY_STATUS.ACTIVE]: "bg-green-500",
  [PROXY_STATUS.INACTIVE]: "bg-red-500",
  [PROXY_STATUS.ERROR]: "bg-red-600",
};

const STATUS_ICONS = {
  [PROXY_STATUS.UNKNOWN]: Globe,
  [PROXY_STATUS.CHECKING]: Loader2,
  [PROXY_STATUS.ACTIVE]: CheckCircle2,
  [PROXY_STATUS.INACTIVE]: WifiOff,
  [PROXY_STATUS.ERROR]: AlertCircle,
};

/**
 * Add/Edit Proxy Dialog
 */
function ProxyFormDialog({ open, onOpenChange, editProxy = null, onSave }) {
  const [form, setForm] = useState({
    type: editProxy?.type || "http",
    host: editProxy?.host || "",
    port: editProxy?.port || "",
    username: editProxy?.username || "",
    password: editProxy?.password || "",
    name: editProxy?.name || "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.host || !form.port) {
      toast.error("Host and port are required");
      return;
    }
    onSave({
      ...form,
      port: parseInt(form.port, 10),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            {editProxy ? "Edit Proxy" : "Add Proxy"}
          </DialogTitle>
          <DialogDescription>
            Enter proxy server details. Supports HTTP, HTTPS, SOCKS4, and
            SOCKS5.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Proxy Name (Optional)</Label>
            <Input
              placeholder="My Proxy"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PROXY_TYPES).map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Port</Label>
              <Input
                type="number"
                placeholder="8080"
                value={form.port}
                onChange={(e) => setForm({ ...form, port: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Host</Label>
            <Input
              placeholder="proxy.example.com"
              value={form.host}
              onChange={(e) => setForm({ ...form, host: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Username (Optional)</Label>
              <Input
                placeholder="username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Password (Optional)</Label>
              <Input
                type="password"
                placeholder="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">{editProxy ? "Update" : "Add Proxy"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Import Proxies Dialog
 */
function ImportProxiesDialog({ open, onOpenChange }) {
  const [text, setText] = useState("");
  const importProxies = useProxyStore((s) => s.importProxies);

  const handleImport = () => {
    const count = importProxies(text);
    if (count > 0) {
      toast.success(`Imported ${count} proxies`);
      setText("");
      onOpenChange(false);
    } else {
      toast.error("No valid proxies found");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Proxies
          </DialogTitle>
          <DialogDescription>
            Paste proxy list, one per line. Supports formats: host:port,
            host:port:user:pass, protocol://host:port
          </DialogDescription>
        </DialogHeader>

        <Textarea
          placeholder="192.168.1.1:8080
proxy.example.com:3128:user:pass
socks5://10.0.0.1:1080"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-[200px] font-mono text-sm"
        />

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleImport} disabled={!text.trim()}>
            <FileUp className="h-4 w-4 mr-2" />
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Proxy List Item
 */
function ProxyListItem({
  proxy,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onCheck,
  isChecking,
  connectedProfiles = [],
}) {
  const StatusIcon = STATUS_ICONS[proxy.status] || Globe;
  const statusColor = STATUS_COLORS[proxy.status] || "bg-gray-500";
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleCopy = () => {
    const str = formatProxyString(proxy);
    navigator.clipboard.writeText(str);
    toast.success("Proxy copied to clipboard");
  };

  const handleDelete = () => {
    if (connectedProfiles.length > 0) {
      setShowDeleteConfirm(true);
    } else {
      onDelete(proxy.id);
    }
  };

  const confirmDelete = () => {
    onDelete(proxy.id);
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <div
        className={cn(
          "group flex items-center gap-3 p-3 rounded-lg border transition-all duration-200",
          isSelected
            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
            : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
        )}
      >
        {/* Status Indicator */}
        <button
          type="button"
          onClick={() => onSelect(proxy.id)}
          className="flex items-center justify-center"
        >
          <div className="relative">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                isSelected ? "bg-primary/20" : "bg-muted"
              )}
            >
              <StatusIcon
                className={cn(
                  "h-4 w-4",
                  proxy.status === PROXY_STATUS.CHECKING && "animate-spin",
                  proxy.status === PROXY_STATUS.ACTIVE && "text-green-500",
                  proxy.status === PROXY_STATUS.ERROR && "text-red-500"
                )}
              />
            </div>
            <div
              className={cn(
                "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background",
                statusColor
              )}
            />
          </div>
        </button>

        {/* Proxy Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate text-sm">
              {proxy.name || `${proxy.host}:${proxy.port}`}
            </span>
            <Badge variant="outline" className="text-[10px] uppercase shrink-0">
              {proxy.type}
            </Badge>
            {/* Profile connection indicator */}
            {connectedProfiles.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="secondary"
                      className="text-[10px] shrink-0 gap-1"
                    >
                      <Users className="h-3 w-3" />
                      {connectedProfiles.length}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs font-medium mb-1">
                      Connected Profiles:
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-0.5">
                      {connectedProfiles.slice(0, 5).map((p) => (
                        <li key={p.id}>{p.name}</li>
                      ))}
                      {connectedProfiles.length > 5 && (
                        <li>+{connectedProfiles.length - 5} more</li>
                      )}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
            <span className="truncate">
              {proxy.host}:{proxy.port}
            </span>
            {proxy.latency && (
              <span className="flex items-center gap-1 shrink-0">
                <Zap className="h-3 w-3" />
                {proxy.latency}ms
              </span>
            )}
            {proxy.country && <span className="shrink-0">{proxy.country}</span>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => onCheck(proxy.id)}
                  disabled={isChecking}
                >
                  {isChecking ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Check proxy</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={handleCopy}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(proxy)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
                {connectedProfiles.length > 0 && (
                  <span className="ml-1 text-[10px]">
                    ({connectedProfiles.length} profiles)
                  </span>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Delete Proxy
            </DialogTitle>
            <DialogDescription>
              This proxy is used by {connectedProfiles.length} profile
              {connectedProfiles.length > 1 ? "s" : ""}:
            </DialogDescription>
          </DialogHeader>

          <div className="py-3">
            <ul className="text-sm text-muted-foreground space-y-1 max-h-32 overflow-auto">
              {connectedProfiles.map((p) => (
                <li key={p.id} className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: p.color || "#6366f1" }}
                  />
                  {p.name}
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground mt-3">
              Deleting this proxy will remove it from all connected profiles.
            </p>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete Proxy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Proxy Management Panel
 */
export function ProxyManagementPanel({ onSelectProxy, selectedProxyId }) {
  const proxies = useProxyStore((s) => s.proxies);
  const proxyGroups = useProxyStore((s) => s.proxyGroups);
  const addProxy = useProxyStore((s) => s.addProxy);
  const updateProxy = useProxyStore((s) => s.updateProxy);
  const removeProxy = useProxyStore((s) => s.removeProxy);
  const updateProxyStatus = useProxyStore((s) => s.updateProxyStatus);
  const exportProxies = useProxyStore((s) => s.exportProxies);
  const clearProxies = useProxyStore((s) => s.clearProxies);

  // Get profiles for profile-proxy sync display
  const profiles = useBrowserProfileStore((s) => s.profiles);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingProxy, setEditingProxy] = useState(null);
  const [checkingProxies, setCheckingProxies] = useState(new Set());

  // Create a map of proxyId -> profiles using that proxy
  const proxyToProfilesMap = useMemo(() => {
    const map = new Map();
    profiles.forEach((profile) => {
      if (profile.proxyId) {
        if (!map.has(profile.proxyId)) {
          map.set(profile.proxyId, []);
        }
        map.get(profile.proxyId).push(profile);
      }
    });
    return map;
  }, [profiles]);

  const filteredProxies = useMemo(() => {
    return proxies.filter((p) => {
      if (selectedGroup !== "all" && p.groupId !== selectedGroup) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          p.host.toLowerCase().includes(q) ||
          p.name?.toLowerCase().includes(q) ||
          String(p.port).includes(q)
        );
      }
      return true;
    });
  }, [proxies, selectedGroup, searchQuery]);

  const handleSaveProxy = useCallback(
    (data) => {
      if (editingProxy) {
        updateProxy(editingProxy.id, data);
        toast.success("Proxy updated");
      } else {
        const id = addProxy(data);
        if (id) {
          toast.success("Proxy added");
        } else {
          toast.error("Failed to add proxy");
        }
      }
      setEditingProxy(null);
    },
    [addProxy, editingProxy, updateProxy]
  );

  const handleEditProxy = useCallback((proxy) => {
    setEditingProxy(proxy);
    setFormDialogOpen(true);
  }, []);

  const handleDeleteProxy = useCallback(
    (id) => {
      removeProxy(id);
      toast.success("Proxy deleted");
    },
    [removeProxy]
  );

  const handleCheckProxy = useCallback(
    async (id) => {
      setCheckingProxies((prev) => new Set([...prev, id]));
      updateProxyStatus(id, PROXY_STATUS.CHECKING);

      try {
        // Simulate health check (in production, call actual API)
        await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));
        const isActive = Math.random() > 0.3;
        const latency = Math.floor(50 + Math.random() * 200);
        updateProxyStatus(
          id,
          isActive ? PROXY_STATUS.ACTIVE : PROXY_STATUS.INACTIVE,
          isActive ? latency : null
        );
        toast.success(isActive ? "Proxy is active" : "Proxy is inactive");
      } catch {
        updateProxyStatus(id, PROXY_STATUS.ERROR);
        toast.error("Failed to check proxy");
      } finally {
        setCheckingProxies((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [updateProxyStatus]
  );

  const handleCheckAll = useCallback(async () => {
    for (const proxy of filteredProxies) {
      await handleCheckProxy(proxy.id);
    }
  }, [filteredProxies, handleCheckProxy]);

  const handleExport = useCallback(() => {
    const text = exportProxies(selectedGroup === "all" ? null : selectedGroup);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "proxies.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Proxies exported");
  }, [exportProxies, selectedGroup]);

  const stats = useMemo(() => {
    return {
      total: proxies.length,
      active: proxies.filter((p) => p.status === PROXY_STATUS.ACTIVE).length,
      inactive: proxies.filter((p) => p.status === PROXY_STATUS.INACTIVE)
        .length,
    };
  }, [proxies]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-linear-to-br from-blue-500 to-cyan-500 text-white">
            <Network className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">Proxy Management</h2>
            <p className="text-xs text-muted-foreground">
              {stats.total} proxies • {stats.active} active
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setImportDialogOpen(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExport}
            disabled={proxies.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingProxy(null);
              setFormDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Proxy
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 p-4 border-b">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search proxies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={selectedGroup} onValueChange={setSelectedGroup}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Groups" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Groups</SelectItem>
            {proxyGroups.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: g.color }}
                  />
                  {g.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          size="sm"
          variant="ghost"
          onClick={handleCheckAll}
          disabled={filteredProxies.length === 0 || checkingProxies.size > 0}
        >
          <RefreshCw
            className={cn(
              "h-4 w-4 mr-2",
              checkingProxies.size > 0 && "animate-spin"
            )}
          />
          Check All
        </Button>
      </div>

      {/* Proxy List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {filteredProxies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Server className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-medium text-muted-foreground">
                No proxies found
              </h3>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Add or import proxies to get started
              </p>
              <Button
                className="mt-4"
                onClick={() => {
                  setEditingProxy(null);
                  setFormDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Proxy
              </Button>
            </div>
          ) : (
            filteredProxies.map((proxy) => (
              <ProxyListItem
                key={proxy.id}
                proxy={proxy}
                isSelected={selectedProxyId === proxy.id}
                onSelect={onSelectProxy}
                onEdit={handleEditProxy}
                onDelete={handleDeleteProxy}
                onCheck={handleCheckProxy}
                isChecking={checkingProxies.has(proxy.id)}
                connectedProfiles={proxyToProfilesMap.get(proxy.id) || []}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Form Dialog */}
      <ProxyFormDialog
        open={formDialogOpen}
        onOpenChange={(open) => {
          setFormDialogOpen(open);
          if (!open) setEditingProxy(null);
        }}
        editProxy={editingProxy}
        onSave={handleSaveProxy}
      />

      {/* Import Dialog */}
      <ImportProxiesDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />
    </div>
  );
}

export default ProxyManagementPanel;
