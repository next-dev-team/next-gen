import {
  Briefcase,
  Check,
  ChevronDown,
  Copy,
  Edit,
  ExternalLink,
  Facebook,
  FolderOpen,
  Globe,
  Instagram,
  Linkedin,
  Loader2,
  MoreVertical,
  Network,
  Palette,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  ShoppingCart,
  Shuffle,
  Trash2,
  Twitter,
  User,
  Users,
  X,
  Youtube,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  PLATFORM_PRESETS,
  PROFILE_STATUS,
  SCREEN_RESOLUTIONS,
  TIMEZONES,
  useBrowserProfileStore,
} from "../stores/browserProfileStore";
import { useProxyStore } from "../stores/proxyStore";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Separator } from "./ui/separator";
import { Switch } from "./ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Textarea } from "./ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { cn } from "../lib/utils";

/** Category icons mapping */
const CATEGORY_ICONS = {
  work: Briefcase,
  personal: User,
  social: Users,
  shopping: ShoppingCart,
};

/** Social platform icons */
const SOCIAL_ICONS = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
  youtube: Youtube,
  tiktok: Globe,
};

/** Status colors */
const STATUS_COLORS = {
  [PROFILE_STATUS.IDLE]: "bg-gray-500",
  [PROFILE_STATUS.RUNNING]: "bg-green-500 animate-pulse",
  [PROFILE_STATUS.SYNCING]: "bg-yellow-500 animate-pulse",
  [PROFILE_STATUS.ERROR]: "bg-red-500",
};

/** Profile color options */
const PROFILE_COLORS = [
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#f43f5e", // Rose
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Yellow
  "#22c55e", // Green
  "#14b8a6", // Teal
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#6b7280", // Gray
];

/**
 * Profile Form Dialog
 */
function ProfileFormDialog({ open, onOpenChange, editProfile = null, onSave }) {
  const proxies = useProxyStore((s) => s.proxies);
  const [activeTab, setActiveTab] = useState("general");

  const buildFormState = useCallback((profile) => {
    const base = {
      name: "",
      categoryId: "personal",
      color: "#6366f1",
      proxyId: "",
      startUrl: "https://www.google.com",
      timezone: "America/New_York",
      language: "en-US",
      screenWidth: 1920,
      screenHeight: 1080,
      blockWebRTC: true,
      blockCanvasFingerprint: true,
      blockAudioFingerprint: true,
      blockGeolocation: true,
      clearCookiesOnClose: false,
      notes: "",
    };

    if (!profile) return base;

    return {
      ...base,
      name: profile.name || "",
      categoryId: profile.categoryId || base.categoryId,
      color: profile.color || base.color,
      proxyId: profile.proxyId || "",
      startUrl: profile.settings?.startUrl || base.startUrl,
      timezone: profile.fingerprint?.timezone || base.timezone,
      language: profile.fingerprint?.language || base.language,
      screenWidth: profile.fingerprint?.screen?.width || base.screenWidth,
      screenHeight: profile.fingerprint?.screen?.height || base.screenHeight,
      blockWebRTC: profile.settings?.blockWebRTC ?? base.blockWebRTC,
      blockCanvasFingerprint:
        profile.settings?.blockCanvasFingerprint ?? base.blockCanvasFingerprint,
      blockAudioFingerprint:
        profile.settings?.blockAudioFingerprint ?? base.blockAudioFingerprint,
      blockGeolocation:
        profile.settings?.blockGeolocation ?? base.blockGeolocation,
      clearCookiesOnClose:
        profile.settings?.clearCookiesOnClose ?? base.clearCookiesOnClose,
      notes: profile.notes || "",
    };
  }, []);

  const [form, setForm] = useState(() => buildFormState(editProfile));

  useEffect(() => {
    if (!open) return;
    setActiveTab("general");
    setForm(buildFormState(editProfile));
  }, [open, editProfile?.id, buildFormState]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Profile name is required");
      return;
    }
    onSave(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {editProfile ? "Edit Profile" : "Create Profile"}
          </DialogTitle>
          <DialogDescription>
            Configure browser profile with custom fingerprint and proxy settings
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 overflow-hidden"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="fingerprint">Fingerprint</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <form onSubmit={handleSubmit} className="space-y-4 p-1">
              <TabsContent value="general" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <Label>Profile Name</Label>
                  <Input
                    placeholder="My Profile"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={form.categoryId}
                      onValueChange={(v) => setForm({ ...form, categoryId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="work">Work</SelectItem>
                        <SelectItem value="personal">Personal</SelectItem>
                        <SelectItem value="social">Social Media</SelectItem>
                        <SelectItem value="shopping">Shopping</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Proxy</Label>
                    <Select
                      value={form.proxyId}
                      onValueChange={(v) =>
                        setForm({ ...form, proxyId: v === "none" ? "" : v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="No proxy" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No proxy</SelectItem>
                        {Array.isArray(proxies) &&
                          proxies
                            .filter((p) => p && p.id)
                            .map((p) => (
                              <SelectItem key={p.id} value={String(p.id)}>
                                {p.name
                                  ? String(p.name)
                                  : `${p.host}:${p.port}`}
                              </SelectItem>
                            ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Profile Color</Label>
                  <div className="flex flex-wrap gap-2">
                    {PROFILE_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setForm({ ...form, color })}
                        className={cn(
                          "w-8 h-8 rounded-full transition-all",
                          form.color === color &&
                            "ring-2 ring-offset-2 ring-primary"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Start URL</Label>
                  <Input
                    placeholder="https://www.google.com"
                    value={form.startUrl}
                    onChange={(e) =>
                      setForm({ ...form, startUrl: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Account notes, credentials, etc."
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                    className="min-h-[80px]"
                  />
                </div>
              </TabsContent>

              <TabsContent value="fingerprint" className="mt-0 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select
                      value={form.timezone}
                      onValueChange={(v) => setForm({ ...form, timezone: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz} value={tz}>
                            {tz}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select
                      value={form.language}
                      onValueChange={(v) => setForm({ ...form, language: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en-US">English (US)</SelectItem>
                        <SelectItem value="en-GB">English (UK)</SelectItem>
                        <SelectItem value="es-ES">Spanish</SelectItem>
                        <SelectItem value="fr-FR">French</SelectItem>
                        <SelectItem value="de-DE">German</SelectItem>
                        <SelectItem value="ja-JP">Japanese</SelectItem>
                        <SelectItem value="zh-CN">Chinese</SelectItem>
                        <SelectItem value="ko-KR">Korean</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Screen Resolution</Label>
                  <Select
                    value={`${form.screenWidth}x${form.screenHeight}`}
                    onValueChange={(v) => {
                      const [w, h] = v.split("x").map(Number);
                      setForm({ ...form, screenWidth: w, screenHeight: h });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCREEN_RESOLUTIONS.map((r) => (
                        <SelectItem
                          key={r.name}
                          value={`${r.width}x${r.height}`}
                        >
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Shuffle className="h-4 w-4" />
                      Auto-Randomization
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Fingerprint will be randomized each session for maximum
                      privacy
                    </CardDescription>
                  </CardHeader>
                </Card>
              </TabsContent>

              <TabsContent value="privacy" className="mt-0 space-y-4">
                <Card>
                  <CardContent className="pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Block WebRTC</Label>
                        <p className="text-xs text-muted-foreground">
                          Prevents IP leak via WebRTC
                        </p>
                      </div>
                      <Switch
                        checked={form.blockWebRTC}
                        onCheckedChange={(c) =>
                          setForm({ ...form, blockWebRTC: c })
                        }
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Block Canvas Fingerprint</Label>
                        <p className="text-xs text-muted-foreground">
                          Adds noise to canvas fingerprinting
                        </p>
                      </div>
                      <Switch
                        checked={form.blockCanvasFingerprint}
                        onCheckedChange={(c) =>
                          setForm({ ...form, blockCanvasFingerprint: c })
                        }
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Block Audio Fingerprint</Label>
                        <p className="text-xs text-muted-foreground">
                          Adds noise to audio fingerprinting
                        </p>
                      </div>
                      <Switch
                        checked={form.blockAudioFingerprint}
                        onCheckedChange={(c) =>
                          setForm({ ...form, blockAudioFingerprint: c })
                        }
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Block Geolocation</Label>
                        <p className="text-xs text-muted-foreground">
                          Blocks or spoofs geolocation API
                        </p>
                      </div>
                      <Switch
                        checked={form.blockGeolocation}
                        onCheckedChange={(c) =>
                          setForm({ ...form, blockGeolocation: c })
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="advanced" className="mt-0 space-y-4">
                <Card>
                  <CardContent className="pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Clear Cookies on Close</Label>
                        <p className="text-xs text-muted-foreground">
                          Automatically clear cookies when profile closes
                        </p>
                      </div>
                      <Switch
                        checked={form.clearCookiesOnClose}
                        onCheckedChange={(c) =>
                          setForm({ ...form, clearCookiesOnClose: c })
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </form>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleSubmit}>
            {editProfile ? "Update Profile" : "Create Profile"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Profile Card Component
 */
function ProfileCard({
  profile,
  isActive,
  onSelect,
  onStart,
  onEdit,
  onDuplicate,
  onDelete,
  onRandomize,
  proxy,
}) {
  const CategoryIcon = CATEGORY_ICONS[profile.categoryId] || User;
  const statusColor = STATUS_COLORS[profile.status] || "bg-gray-500";

  // Check if profile has a proxy reference but proxy wasn't found (orphaned)
  const hasOrphanedProxy = profile.proxyId && !proxy;

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-200 hover:shadow-lg cursor-pointer",
        isActive && "ring-2 ring-primary"
      )}
      onClick={() => onSelect(profile.id)}
    >
      {/* Color accent */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: profile.color }}
      />

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-10 h-10 rounded-lg text-white"
              style={{ backgroundColor: profile.color }}
            >
              <CategoryIcon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {profile.name}
                <div className={cn("w-2 h-2 rounded-full", statusColor)} />
              </CardTitle>
              <CardDescription className="text-xs flex items-center gap-1">
                {profile.categoryId}
                {proxy && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <Network className="h-3 w-3" />
                          {proxy.host}:{proxy.port}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs font-medium">
                          Proxy:{" "}
                          {proxy.name
                            ? String(proxy.name)
                            : `${proxy.host}:${proxy.port}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Type: {proxy.type?.toUpperCase()}
                        </p>
                        {proxy.status && (
                          <p className="text-xs text-muted-foreground">
                            Status: {proxy.status}
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {hasOrphanedProxy && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                          <Network className="h-3 w-3" />
                          (Missing)
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          Proxy was deleted. Edit profile to assign a new proxy.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </CardDescription>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onStart(profile.id)}>
                <Play className="h-4 w-4 mr-2" />
                Start Browser
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(profile)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(profile.id)}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRandomize(profile.id)}>
                <Shuffle className="h-4 w-4 mr-2" />
                Randomize Fingerprint
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(profile.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        {/* Quick info */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-[10px]">
            {profile.fingerprint?.timezone || "No TZ"}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {profile.fingerprint?.screen?.width}x
            {profile.fingerprint?.screen?.height}
          </Badge>
          {profile.settings?.blockWebRTC && (
            <Badge variant="secondary" className="text-[10px]">
              <Shield className="h-3 w-3 mr-1" />
              WebRTC
            </Badge>
          )}
          {proxy && proxy.status === "active" && (
            <Badge
              variant="secondary"
              className="text-[10px] bg-green-500/10 text-green-600 dark:text-green-400"
            >
              <Network className="h-3 w-3 mr-1" />
              Proxy Active
            </Badge>
          )}
        </div>

        {/* Social accounts */}
        {profile.socialAccounts?.length > 0 && (
          <div className="flex items-center gap-1 mt-2">
            {profile.socialAccounts.slice(0, 4).map((account) => {
              const Icon = SOCIAL_ICONS[account.platform] || Globe;
              return (
                <TooltipProvider key={account.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                        <Icon className="h-3 w-3" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{account.username}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
            {profile.socialAccounts.length > 4 && (
              <span className="text-xs text-muted-foreground ml-1">
                +{profile.socialAccounts.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t">
          <span className="text-[10px] text-muted-foreground">
            {profile.stats?.sessionsCount || 0} sessions
          </span>
          <Button
            size="sm"
            variant="secondary"
            className="h-7 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onStart(profile.id);
            }}
          >
            <Play className="h-3 w-3 mr-1" />
            Start
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Browser Profiles Panel
 */
export function BrowserProfilesPanel({ onStartProfile, activeProfileId }) {
  const profiles = useBrowserProfileStore((s) => s.profiles);
  const categories = useBrowserProfileStore((s) => s.categories);
  const createProfile = useBrowserProfileStore((s) => s.createProfile);
  const updateProfile = useBrowserProfileStore((s) => s.updateProfile);
  const deleteProfile = useBrowserProfileStore((s) => s.deleteProfile);
  const duplicateProfile = useBrowserProfileStore((s) => s.duplicateProfile);
  const randomizeFingerprint = useBrowserProfileStore(
    (s) => s.randomizeFingerprint
  );
  const setActiveProfile = useBrowserProfileStore((s) => s.setActiveProfile);

  const proxies = useProxyStore((s) => s.proxies);
  const getProxyById = useProxyStore((s) => s.getProxyById);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);

  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      if (selectedCategory !== "all" && p.categoryId !== selectedCategory)
        return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) || p.notes?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [profiles, selectedCategory, searchQuery]);

  const handleSaveProfile = useCallback(
    (data) => {
      try {
        if (editingProfile) {
          updateProfile(editingProfile.id, {
            name: data.name,
            categoryId: data.categoryId,
            color: data.color,
            proxyId: data.proxyId || null,
            notes: data.notes,
            settings: {
              ...(editingProfile.settings || {}),
              startUrl: data.startUrl,
              blockWebRTC: data.blockWebRTC,
              blockCanvasFingerprint: data.blockCanvasFingerprint,
              blockAudioFingerprint: data.blockAudioFingerprint,
              blockGeolocation: data.blockGeolocation,
              clearCookiesOnClose: data.clearCookiesOnClose,
            },
            fingerprint: {
              ...(editingProfile.fingerprint || {}),
              timezone: data.timezone,
              language: data.language,
              screen: {
                ...(editingProfile.fingerprint?.screen || {}),
                width: data.screenWidth,
                height: data.screenHeight,
                colorDepth: 24,
              },
            },
          });
          toast.success("Profile updated");
        } else {
          createProfile({
            name: data.name,
            categoryId: data.categoryId,
            color: data.color,
            proxyId: data.proxyId || null,
            notes: data.notes,
            startUrl: data.startUrl,
            blockWebRTC: data.blockWebRTC,
            blockCanvasFingerprint: data.blockCanvasFingerprint,
            blockAudioFingerprint: data.blockAudioFingerprint,
            blockGeolocation: data.blockGeolocation,
            clearCookiesOnClose: data.clearCookiesOnClose,
          });
          toast.success("Profile created");
        }
        setEditingProfile(null);
      } catch (error) {
        console.error("Failed to save profile:", error);
        toast.error("Failed to save profile. please try again.");
      }
    },
    [createProfile, editingProfile, updateProfile]
  );

  const handleEditProfile = useCallback((profile) => {
    setEditingProfile(profile);
    setFormDialogOpen(true);
  }, []);

  const handleDeleteProfile = useCallback(
    (id) => {
      deleteProfile(id);
      toast.success("Profile deleted");
    },
    [deleteProfile]
  );

  const handleDuplicateProfile = useCallback(
    (id) => {
      duplicateProfile(id);
      toast.success("Profile duplicated");
    },
    [duplicateProfile]
  );

  const handleRandomize = useCallback(
    (id) => {
      randomizeFingerprint(id);
      toast.success("Fingerprint randomized");
    },
    [randomizeFingerprint]
  );

  const handleStartProfile = useCallback(
    (id) => {
      setActiveProfile(id);
      onStartProfile?.(id);
    },
    [onStartProfile, setActiveProfile]
  );

  const stats = useMemo(() => {
    return {
      total: profiles.length,
      running: profiles.filter((p) => p.status === PROFILE_STATUS.RUNNING)
        .length,
    };
  }, [profiles]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-linear-to-br from-violet-500 to-purple-500 text-white">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">Browser Profiles</h2>
            <p className="text-xs text-muted-foreground">
              {stats.total} profiles • {stats.running} running
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => {
            setEditingProfile(null);
            setFormDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Profile
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 p-4 border-b">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search profiles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                  {c.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Profile Grid */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {filteredProfiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-medium text-muted-foreground">
                No profiles found
              </h3>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Create a profile to get started with multi-account browsing
              </p>
              <Button
                className="mt-4"
                onClick={() => {
                  setEditingProfile(null);
                  setFormDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Profile
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProfiles.map((profile) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  isActive={activeProfileId === profile.id}
                  onSelect={setActiveProfile}
                  onStart={handleStartProfile}
                  onEdit={handleEditProfile}
                  onDuplicate={handleDuplicateProfile}
                  onDelete={handleDeleteProfile}
                  onRandomize={handleRandomize}
                  proxy={profile.proxyId ? getProxyById(profile.proxyId) : null}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Form Dialog */}
      <ProfileFormDialog
        open={formDialogOpen}
        onOpenChange={(open) => {
          setFormDialogOpen(open);
          if (!open) setEditingProfile(null);
        }}
        editProfile={editingProfile}
        onSave={handleSaveProfile}
      />
    </div>
  );
}

export default BrowserProfilesPanel;
