import {
  ChevronDown,
  Globe,
  Laptop,
  Monitor,
  RefreshCw,
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
                  <ShieldCheck className={`h-4 w-4 ${browserColor}`} />
                  <span className="hidden sm:inline text-xs max-w-[100px] truncate">
                    {activeProfile?.name || "Select Profile"}
                  </span>
                  <ChevronDown className="h-3 w-3 opacity-50" />
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

  if (!activeProfile) return null;

  const browserType = getBrowserType(activeProfile.id);
  const browserColor = BROWSER_COLORS[browserType] || "text-muted-foreground";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <ShieldCheck className={`h-3 w-3 ${browserColor}`} />
            <span className="hidden md:inline">{activeProfile.name}</span>
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
