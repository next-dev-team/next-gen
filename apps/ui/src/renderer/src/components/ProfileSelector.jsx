import {
  ChevronDown,
  Globe,
  Laptop,
  Monitor,
  RefreshCw,
  Settings2,
  Shield,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  User,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

const CATEGORY_ICONS = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Laptop,
};

const BROWSER_COLORS = {
  chrome: "text-blue-500",
  firefox: "text-orange-500",
  safari: "text-cyan-500",
  edge: "text-green-500",
};

function getBrowserType(profileId) {
  const id = String(profileId || "").toLowerCase();
  if (id.includes("chrome")) return "chrome";
  if (id.includes("firefox")) return "firefox";
  if (id.includes("safari")) return "safari";
  if (id.includes("edge")) return "edge";
  return "chrome";
}

/**
 * Anti-Detection Profile Selector
 * Allows users to switch browser fingerprint profiles to avoid detection
 */
export function ProfileSelector({ tabId, disabled = false }) {
  const [profiles, setProfiles] = useState([]);
  const [activeProfile, setActiveProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [proxyStr, setProxyStr] = useState("");
  const [hasProxy, setHasProxy] = useState(false);
  const [isSavingProxy, setIsSavingProxy] = useState(false);

  // Load available profiles
  useEffect(() => {
    const loadProfiles = async () => {
      if (!window.electronAPI?.antiDetection?.listProfiles) return;
      try {
        const result = await window.electronAPI.antiDetection.listProfiles();
        setProfiles(result || []);
      } catch (err) {
        console.error("Failed to load profiles:", err);
      }
    };
    loadProfiles();
  }, []);

  // Load active profile for this tab
  useEffect(() => {
    const loadActiveProfile = async () => {
      if (!tabId || !window.electronAPI?.antiDetection?.getActiveProfile)
        return;
      try {
        const result =
          await window.electronAPI.antiDetection.getActiveProfile(tabId);
        setActiveProfile(result);
      } catch (err) {
        console.error("Failed to load active profile:", err);
      }
    };
    loadActiveProfile();
  }, [tabId]);

  // Load proxy for active profile
  useEffect(() => {
    const loadProxy = async () => {
      if (!activeProfile?.id || !window.electronAPI?.antiDetection?.getProxy)
        return;
      try {
        const proxy = await window.electronAPI.antiDetection.getProxy(
          activeProfile.id
        );
        if (proxy) {
          const { host, port, username, password } = proxy;
          let str = `${host}:${port}`;
          if (username) str += `:${username}`;
          if (password) str += `:${password}`;
          setProxyStr(str);
          setHasProxy(true);
        } else {
          setProxyStr("");
          setHasProxy(false);
        }
      } catch (err) {
        console.error("Failed to load proxy:", err);
      }
    };
    loadProxy();
  }, [activeProfile?.id]);

  const handleSwitchProfile = useCallback(
    async (profileId) => {
      if (!tabId || !window.electronAPI?.antiDetection?.switchProfile) return;
      setIsLoading(true);
      try {
        const success = await window.electronAPI.antiDetection.switchProfile(
          tabId,
          profileId
        );
        if (success) {
          const newProfile =
            await window.electronAPI.antiDetection.getActiveProfile(tabId);
          setActiveProfile(newProfile);
          toast.success("Profile switched", {
            description: `Now using: ${newProfile?.name || profileId}`,
          });
          // Reload the page to apply new fingerprint
          if (window.electronAPI?.browserView?.reload) {
            await window.electronAPI.browserView.reload(tabId);
          }
        } else {
          toast.error("Failed to switch profile");
        }
      } catch (err) {
        console.error("Failed to switch profile:", err);
        toast.error("Failed to switch profile", {
          description: String(err?.message || err),
        });
      } finally {
        setIsLoading(false);
        setIsOpen(false);
      }
    },
    [tabId]
  );

  const handleRandomize = useCallback(async () => {
    if (!tabId || !window.electronAPI?.antiDetection?.randomizeProfile) return;
    setIsLoading(true);
    try {
      const newProfile =
        await window.electronAPI.antiDetection.randomizeProfile(tabId);
      if (newProfile) {
        setActiveProfile(newProfile);
        toast.success("Fingerprint randomized", {
          description: `Timezone: ${newProfile.timezone}, Screen: ${newProfile.screen?.width}x${newProfile.screen?.height}`,
        });
        // Reload the page to apply new fingerprint
        if (window.electronAPI?.browserView?.reload) {
          await window.electronAPI.browserView.reload(tabId);
        }
      }
    } catch (err) {
      console.error("Failed to randomize profile:", err);
      toast.error("Failed to randomize profile");
    } finally {
      setIsLoading(false);
    }
  }, [tabId]);

  const handleSaveProxy = useCallback(async () => {
    if (!activeProfile?.id || !window.electronAPI?.antiDetection?.setProxy)
      return;

    setIsSavingProxy(true);
    try {
      await window.electronAPI.antiDetection.setProxy(
        activeProfile.id,
        proxyStr
      );
      toast.success("Proxy settings applied", {
        description: proxyStr ? `Proxy: ${proxyStr}` : "Proxy disabled",
      });

      // Reload the page to apply new proxy settings
      if (window.electronAPI?.browserView?.reload) {
        // Force reload ignoring cache to ensure proxy takes effect
        await window.electronAPI.browserView.reload(tabId, true);
      }
    } catch (err) {
      console.error("Failed to save proxy:", err);
      toast.error("Failed to save proxy settings");
    } finally {
      setIsSavingProxy(false);
    }
  }, [activeProfile?.id, proxyStr, tabId]);

  // Check if anti-detection API is available
  const hasAntiDetection = Boolean(window.electronAPI?.antiDetection);

  // Handle dropdown open/close - hide BrowserView when open
  const handleOpenChange = useCallback(
    (open) => {
      setIsOpen(open);
      // Hide BrowserView when dropdown is open to prevent z-index issues
      if (tabId && window.electronAPI?.browserView?.show) {
        if (open) {
          // Hide the browser view
          window.electronAPI.browserView.show(tabId, false).catch(() => {});
        } else {
          // Show the browser view
          window.electronAPI.browserView.show(tabId, true).catch(() => {});
        }
      }
    },
    [tabId]
  );

  const desktopProfiles = profiles.filter((p) => p.category === "desktop");
  const mobileProfiles = profiles.filter((p) => p.category === "mobile");
  const browserType = getBrowserType(activeProfile?.id);
  const browserColor = BROWSER_COLORS[browserType] || "text-muted-foreground";

  if (!hasAntiDetection) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={true}
                className="h-9 gap-1.5 px-2 opacity-50"
              >
                <ShieldOff className="h-4 w-4 text-muted-foreground" />
                <span className="hidden sm:inline text-xs truncate max-w-[100px]">
                  Anti-Detection
                </span>
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Anti-detection is not available in this environment</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={disabled || isLoading}
                  className="h-9 gap-1.5 px-2"
                >
                  <div className="relative">
                    <ShieldCheck className={`h-4 w-4 ${browserColor}`} />
                    {hasProxy && (
                      <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-background shadow-sm" />
                    )}
                  </div>
                  <div className="flex flex-col items-start min-w-0 text-left">
                    <span className="hidden sm:inline text-[10px] font-medium truncate max-w-[100px]">
                      {activeProfile?.name || "Select Profile"}
                    </span>
                    {activeProfile && (
                      <span className="hidden sm:inline text-[8px] text-muted-foreground leading-none">
                        {hasProxy ? "Proxy Active" : "No Proxy"}
                      </span>
                    )}
                  </div>
                  <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="font-medium">Anti-Detection Profile</p>
              <p className="text-xs text-muted-foreground">
                {activeProfile
                  ? `Current: ${activeProfile.name}`
                  : "Click to select a browser profile"}
              </p>
            </TooltipContent>
          </Tooltip>

          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>Anti-Detection Profiles</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {activeProfile && (
              <>
                <div className="px-2 py-1.5">
                  <div className="text-xs text-muted-foreground mb-1">
                    Current Profile
                  </div>
                  <div className="flex items-center gap-2 rounded-md bg-accent/50 p-2">
                    <Globe className={`h-4 w-4 ${browserColor}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {activeProfile.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {activeProfile.userAgent?.slice(0, 50)}...
                      </div>
                    </div>
                  </div>
                </div>

                <DropdownMenuSeparator />

                {/* Proxy Management */}
                <div className="px-2 py-3 space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <Settings2 className="w-4 h-4 text-muted-foreground" />
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Proxy Settings
                    </Label>
                  </div>
                  <div className="space-y-2">
                    <Input
                      placeholder="host:port:user:pass"
                      value={proxyStr}
                      onChange={(e) => setProxyStr(e.target.value)}
                      className="h-8 text-xs bg-muted/50 border-muted-foreground/20"
                    />
                    <Button
                      size="sm"
                      className="w-full h-8 text-xs"
                      onClick={handleSaveProxy}
                      disabled={isSavingProxy}
                    >
                      {isSavingProxy ? (
                        <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-3 h-3 mr-2" />
                      )}
                      Apply Proxy
                    </Button>
                    <p className="px-1 text-[10px] text-muted-foreground leading-tight">
                      Format: host:port[:username:password]
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
              </>
            )}

            <DropdownMenuLabel className="text-xs flex items-center gap-1">
              <Monitor className="h-3 w-3" />
              Desktop Browsers
            </DropdownMenuLabel>
            {desktopProfiles.map((profile) => {
              const Icon = CATEGORY_ICONS[profile.category] || Monitor;
              const isActive = activeProfile?.id === profile.id;
              return (
                <DropdownMenuItem
                  key={profile.id}
                  onClick={() => handleSwitchProfile(profile.id)}
                  className="gap-2"
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1">{profile.name}</span>
                  {isActive && (
                    <span className="text-xs text-green-500">Active</span>
                  )}
                </DropdownMenuItem>
              );
            })}

            {mobileProfiles.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs flex items-center gap-1">
                  <Smartphone className="h-3 w-3" />
                  Mobile Browsers
                </DropdownMenuLabel>
                {mobileProfiles.map((profile) => {
                  const Icon = CATEGORY_ICONS[profile.category] || Smartphone;
                  const isActive = activeProfile?.id === profile.id;
                  return (
                    <DropdownMenuItem
                      key={profile.id}
                      onClick={() => handleSwitchProfile(profile.id)}
                      className="gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="flex-1">{profile.name}</span>
                      {isActive && (
                        <span className="text-xs text-green-500">Active</span>
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleRandomize}
              className="gap-2 text-primary"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="flex-1">Randomize Fingerprint</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
}

/**
 * Compact status indicator for anti-detection
 */
export function AntiDetectionStatus({ tabId }) {
  const [activeProfile, setActiveProfile] = useState(null);
  const [hasProxy, setHasProxy] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!tabId || !window.electronAPI?.antiDetection?.getActiveProfile)
        return;
      try {
        const profile =
          await window.electronAPI.antiDetection.getActiveProfile(tabId);
        setActiveProfile(profile);

        if (profile?.id && window.electronAPI?.antiDetection?.getProxy) {
          const proxy = await window.electronAPI.antiDetection.getProxy(
            profile.id
          );
          setHasProxy(!!proxy);
        }
      } catch (err) {
        console.error("Failed to load active profile/proxy:", err);
      }
    };
    loadData();
  }, [tabId]);

  if (!activeProfile) return null;

  const browserType = getBrowserType(activeProfile.id);
  const browserColor = BROWSER_COLORS[browserType] || "text-muted-foreground";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="relative">
              <ShieldCheck className={`h-3 w-3 ${browserColor}`} />
              {hasProxy && (
                <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full border border-background" />
              )}
            </div>
            <span className="hidden md:inline">{activeProfile.name}</span>
            {hasProxy && (
              <span className="text-[10px] text-green-500/80 hidden lg:inline">
                (Proxy)
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{activeProfile.name}</p>
            <p className="text-xs text-muted-foreground">
              Platform: {activeProfile.platform}
            </p>
            <p className="text-xs text-muted-foreground break-all">
              UA: {activeProfile.userAgent?.slice(0, 80)}...
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default ProfileSelector;
