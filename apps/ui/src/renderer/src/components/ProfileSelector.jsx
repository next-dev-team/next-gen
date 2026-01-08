import {
  ChevronDown,
  Globe,
  Laptop,
  Monitor,
  Network,
  RefreshCw,
  Settings2,
  Shield,
  ShieldCheck,
  ShieldOff,
  ShoppingCart,
  Smartphone,
  User,
  Users,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { useBrowserProfileStore } from "../stores/browserProfileStore";
import { useProxyStore, formatProxyString } from "../stores/proxyStore";
import { getSyncedProxyForProfile } from "../stores/syncMiddleware";

const CATEGORY_ICONS = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Laptop,
  work: Monitor,
  personal: User,
  social: Users,
  shopping: ShoppingCart,
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

const createBackendProfilePayload = (profile, proxy) => {
  if (!profile || !profile.fingerprint) return profile;
  const fallbackLanguage = String(profile.fingerprint.language || "en-US");
  const fallbackLanguages = [fallbackLanguage];
  if (fallbackLanguage.includes("-")) {
    fallbackLanguages.push(fallbackLanguage.split("-")[0]);
  }

  const languages =
    Array.isArray(profile.fingerprint.languages) &&
    profile.fingerprint.languages.length
      ? profile.fingerprint.languages
      : fallbackLanguages;

  return {
    ...profile,
    category: profile.categoryId,
    userAgent: profile.fingerprint.userAgent || profile.userAgent,
    languages,
    platform: profile.fingerprint.platform,
    timezone: profile.fingerprint.timezone,
    screen: profile.fingerprint.screen,
    webgl: {
      vendor: profile.fingerprint.webglVendor,
      renderer: profile.fingerprint.webglRenderer,
      unmaskedVendor: profile.fingerprint.webglVendor,
      unmaskedRenderer: profile.fingerprint.webglRenderer,
    },
    hardwareConcurrency: profile.fingerprint.hardwareConcurrency,
    deviceMemory: profile.fingerprint.deviceMemory,
    proxy: proxy,
  };
};

/**
 * Anti-Detection Profile Selector
 * Allows users to switch browser fingerprint profiles to avoid detection
 */
export function ProfileSelector({ tabId, disabled = false }) {
  // Use store for profiles instead of IPC
  const profiles = useBrowserProfileStore((s) => s.profiles);
  const getProfileById = useBrowserProfileStore((s) => s.getProfileById);
  const setActiveProfileStore = useBrowserProfileStore(
    (s) => s.setActiveProfile
  );
  const globalActiveProfileId = useBrowserProfileStore(
    (s) => s.activeProfileId
  );

  const [activeProfile, setActiveProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [proxyStr, setProxyStr] = useState("");
  const [hasProxy, setHasProxy] = useState(false);
  const [activeProxy, setActiveProxy] = useState(null);
  const autoApplyStateRef = useRef({
    lastAttemptKey: null,
    lastAttemptAt: 0,
    lastFailureKey: null,
    lastFailureAt: 0,
  });
  const switchStateRef = useRef({
    inFlight: false,
    pendingProfileId: null,
    pendingOptions: null,
  });
  // Disabled inline proxy edit in favor of store management
  // const [isSavingProxy, setIsSavingProxy] = useState(false);

  // Load active profile for this tab from Main process
  // This is still needed because "Active for Tab X" is a runtime Main state
  useEffect(() => {
    const loadActiveProfile = async () => {
      if (!tabId || !window.electronAPI?.antiDetection?.getActiveProfile)
        return;
      try {
        const result =
          await window.electronAPI.antiDetection.getActiveProfile(tabId);

        // If we get a result from IPC, try to match it with our store
        // to get the full rich object with proxy linkage
        if (result && result.id) {
          const storeProfile = getProfileById(result.id);
          setActiveProfile(storeProfile || result);
          // Also sync to store if this is the first load
          if (storeProfile) {
            setActiveProfileStore(storeProfile.id);
          }
        } else {
          setActiveProfile(result);
        }
      } catch (err) {
        console.error("Failed to load active profile:", err);
      }
    };
    loadActiveProfile();
  }, [tabId, getProfileById, profiles, setActiveProfileStore]); // Re-run if profiles change

  // Load proxy for active profile using the sync middleware
  useEffect(() => {
    if (!activeProfile?.id) return;

    // Get proxy from store via active profile
    const proxy = getSyncedProxyForProfile(activeProfile.id);
    setActiveProxy(proxy);

    if (proxy) {
      setHasProxy(true);
      setProxyStr(formatProxyString(proxy));
    } else {
      setHasProxy(false);
      setProxyStr("");
    }
  }, [activeProfile, profiles]); // Re-run when active profile or profiles list changes

  // Auto-sync active profile changes to backend (Live Updates)
  useEffect(() => {
    const syncProfileToBackend = async () => {
      // Only sync if we have a valid active profile ID and we are not loading the initial switch
      if (
        !activeProfile?.id ||
        isLoading ||
        !tabId ||
        !window.electronAPI?.antiDetection?.switchProfile
      )
        return;

      // Check if this profile is managed by store (custom profile)
      const storeProfile = getProfileById(activeProfile.id);
      if (!storeProfile) return;

      // Construct payload
      const proxy = getSyncedProxyForProfile(storeProfile.id);
      const profileToSend = createBackendProfilePayload(storeProfile, proxy);

      // We assume activeProfile.id match means we are already on this profile,
      // so we are just pushing updates.
      try {
        await window.electronAPI.antiDetection.switchProfile(
          tabId,
          profileToSend
        );
      } catch (err) {
        console.error("Failed to auto-sync profile:", err);
      }
    };

    // We debounce slightly to avoid rapid updates if store changes fast
    const timer = setTimeout(syncProfileToBackend, 500);
    return () => clearTimeout(timer);
  }, [activeProfile, tabId, isLoading, getProfileById]);

  const handleSwitchProfile = useCallback(
    async (profileId, options = {}) => {
      if (!tabId || !window.electronAPI?.antiDetection?.switchProfile)
        return false;

      const showToast = options.showToast !== false;
      const closeMenu = options.closeMenu !== false;
      const toastId = `switch-profile-${String(tabId)}`;

      const state = switchStateRef.current;
      state.pendingProfileId = profileId;
      state.pendingOptions = { showToast, closeMenu };

      if (state.inFlight) return false;

      state.inFlight = true;
      setIsLoading(true);

      let lastOk = false;
      let lastCloseMenu = closeMenu;
      let lastShowToast = showToast;
      let lastTargetId = profileId;

      try {
        while (state.pendingProfileId) {
          const targetId = state.pendingProfileId;
          const targetOptions = state.pendingOptions || {
            showToast,
            closeMenu,
          };
          state.pendingProfileId = null;
          state.pendingOptions = null;

          lastCloseMenu = Boolean(targetOptions.closeMenu);
          lastShowToast = Boolean(targetOptions.showToast);
          lastTargetId = targetId;

          let profileToSend = targetId;
          const profile = getProfileById(targetId);

          if (profile) {
            const proxy = getSyncedProxyForProfile(targetId);
            profileToSend = createBackendProfilePayload(profile, proxy);
          }

          const success = await window.electronAPI.antiDetection.switchProfile(
            tabId,
            profileToSend
          );

          if (success) {
            const newProfile =
              await window.electronAPI.antiDetection.getActiveProfile(tabId);
            setActiveProfile(newProfile);

            if (newProfile?.id) {
              setActiveProfileStore(newProfile.id);
            }

            if (lastShowToast) {
              toast.success("Profile switched", {
                id: toastId,
                description: `Now using: ${newProfile?.name || targetId}`,
              });
            }

            if (window.electronAPI?.browserView?.reload) {
              await window.electronAPI.browserView.reload(tabId);
            }

            lastOk = true;
            continue;
          }

          if (lastShowToast) {
            toast.error("Failed to switch profile", { id: toastId });
          }
          lastOk = false;
          if (!state.pendingProfileId) break;
        }

        return lastOk;
      } catch (err) {
        console.error("Failed to switch profile:", err);
        if (lastShowToast) {
          toast.error("Failed to switch profile", {
            id: toastId,
            description: String(err?.message || err),
          });
        }
        return false;
      } finally {
        state.inFlight = false;
        setIsLoading(false);
        if (lastCloseMenu) setIsOpen(false);

        const nextTargetId = state.pendingProfileId;
        const nextOptions = state.pendingOptions;
        state.pendingProfileId = null;
        state.pendingOptions = null;

        if (nextTargetId && nextTargetId !== lastTargetId) {
          Promise.resolve()
            .then(() => handleSwitchProfile(nextTargetId, nextOptions || {}))
            .catch(() => {});
        }
      }
    },
    [tabId, getProfileById, setActiveProfileStore, setActiveProfile, setIsOpen]
  );

  useEffect(() => {
    if (!tabId) return;
    if (disabled) return;
    if (!globalActiveProfileId) return;
    if (isLoading) return;
    if (activeProfile?.id === globalActiveProfileId) return;

    const desiredKey = `${String(tabId)}::${String(globalActiveProfileId)}`;
    const now = Date.now();
    const attemptCooldownMs = 800;
    const failureCooldownMs = 4000;

    if (
      autoApplyStateRef.current.lastFailureKey === desiredKey &&
      now - autoApplyStateRef.current.lastFailureAt < failureCooldownMs
    )
      return;

    if (
      autoApplyStateRef.current.lastAttemptKey === desiredKey &&
      now - autoApplyStateRef.current.lastAttemptAt < attemptCooldownMs
    )
      return;

    autoApplyStateRef.current.lastAttemptKey = desiredKey;
    autoApplyStateRef.current.lastAttemptAt = now;

    const timer = setTimeout(() => {
      handleSwitchProfile(globalActiveProfileId, {
        showToast: false,
        closeMenu: false,
      })
        .then((ok) => {
          if (ok) {
            if (autoApplyStateRef.current.lastFailureKey === desiredKey) {
              autoApplyStateRef.current.lastFailureKey = null;
              autoApplyStateRef.current.lastFailureAt = 0;
            }
            return;
          }
          autoApplyStateRef.current.lastFailureKey = desiredKey;
          autoApplyStateRef.current.lastFailureAt = Date.now();
        })
        .catch(() => {
          autoApplyStateRef.current.lastFailureKey = desiredKey;
          autoApplyStateRef.current.lastFailureAt = Date.now();
        });
    }, 400);

    return () => clearTimeout(timer);
  }, [
    activeProfile?.id,
    disabled,
    globalActiveProfileId,
    handleSwitchProfile,
    isLoading,
    tabId,
  ]);

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
                        {(
                          activeProfile.userAgent ||
                          activeProfile.fingerprint?.userAgent
                        )?.slice(0, 50)}
                        ...
                      </div>
                    </div>
                  </div>
                </div>

                <DropdownMenuSeparator />

                {/* Proxy Management (Read Only) */}
                <div className="px-2 py-3 space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <Settings2 className="w-4 h-4 text-muted-foreground" />
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Proxy Status
                    </Label>
                  </div>

                  {activeProxy ? (
                    <div className="bg-muted/30 rounded-md p-2 border border-border/50">
                      <div className="flex items-center gap-2 mb-1">
                        <Network className="h-3.5 w-3.5 text-green-500" />
                        <span className="text-xs font-medium text-green-600 dark:text-green-400">
                          Proxy Active
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground break-all font-mono">
                        {activeProxy.host}:{activeProxy.port}
                      </div>
                      {activeProxy.country && (
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {activeProxy.country}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-muted/30 rounded-md p-2 border border-border/50">
                      <div className="flex items-center gap-2">
                        <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          No proxy assigned
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="text-[10px] text-muted-foreground px-1">
                    To manage proxies, go to Browser Profiles panel.
                  </div>
                </div>
                <DropdownMenuSeparator />
              </>
            )}

            <DropdownMenuLabel className="text-xs flex items-center gap-1">
              <Monitor className="h-3 w-3" />
              Profiles
            </DropdownMenuLabel>
            <div className="max-h-60 overflow-y-auto">
              {profiles.map((profile) => {
                const Icon =
                  CATEGORY_ICONS[profile.categoryId] ||
                  CATEGORY_ICONS.personal ||
                  User;
                const isActive = activeProfile?.id === profile.id;
                return (
                  <DropdownMenuItem
                    key={profile.id}
                    onClick={() => handleSwitchProfile(profile.id)}
                    className="gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1 truncate">{profile.name}</span>
                    {isActive && (
                      <span className="text-xs text-green-500 shrink-0">
                        Active
                      </span>
                    )}
                  </DropdownMenuItem>
                );
              })}
              {profiles.length === 0 && (
                <div className="px-2 py-2 text-xs text-muted-foreground text-center">
                  No profiles found. Create one in Profiles panel.
                </div>
              )}
            </div>

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
  const profiles = useBrowserProfileStore((s) => s.profiles);

  useEffect(() => {
    const loadData = async () => {
      if (!tabId || !window.electronAPI?.antiDetection?.getActiveProfile)
        return;
      try {
        const profile =
          await window.electronAPI.antiDetection.getActiveProfile(tabId);
        setActiveProfile(profile);

        if (profile?.id) {
          // Use sync middleware to check if this profile has a proxy
          const proxy = getSyncedProxyForProfile(profile.id);
          setHasProxy(!!proxy);
        }
      } catch (err) {
        console.error("Failed to load active profile/proxy:", err);
      }
    };
    loadData();
  }, [tabId, profiles]); // Re-run if profiles change (e.g. proxy assigned/unassigned)

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
