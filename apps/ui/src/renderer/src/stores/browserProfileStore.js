import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

const createId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

/** Set up listener for proxy deletions */
let proxyDeletionListenerSetup = false;
const setupProxyDeletionListener = () => {
  if (proxyDeletionListenerSetup || typeof window === "undefined") return;

  window.addEventListener("proxy-deleted", (event) => {
    const { proxyId } = event.detail;
    if (!proxyId) return;

    // Clear this proxyId from all profiles
    const store = useBrowserProfileStore.getState();
    store.clearProxyFromProfiles(proxyId);
  });

  proxyDeletionListenerSetup = true;
};

/** Profile status */
export const PROFILE_STATUS = {
  IDLE: "idle",
  RUNNING: "running",
  SYNCING: "syncing",
  ERROR: "error",
};

/** Platform presets for fingerprint generation */
export const PLATFORM_PRESETS = {
  WINDOWS_CHROME: {
    platform: "Win32",
    vendor: "Google Inc.",
    oscpu: "Windows NT 10.0; Win64; x64",
    language: "en-US",
  },
  WINDOWS_FIREFOX: {
    platform: "Win32",
    vendor: "",
    oscpu: "Windows NT 10.0; Win64; x64",
    language: "en-US",
  },
  MAC_CHROME: {
    platform: "MacIntel",
    vendor: "Google Inc.",
    oscpu: "Intel Mac OS X 10_15_7",
    language: "en-US",
  },
  MAC_SAFARI: {
    platform: "MacIntel",
    vendor: "Apple Computer, Inc.",
    oscpu: "Intel Mac OS X 10_15_7",
    language: "en-US",
  },
  LINUX_CHROME: {
    platform: "Linux x86_64",
    vendor: "Google Inc.",
    oscpu: "Linux x86_64",
    language: "en-US",
  },
  ANDROID_CHROME: {
    platform: "Linux armv8l",
    vendor: "Google Inc.",
    oscpu: "Linux armv8l",
    language: "en-US",
  },
  IOS_SAFARI: {
    platform: "iPhone",
    vendor: "Apple Computer, Inc.",
    oscpu: "iPhone OS 16_0",
    language: "en-US",
  },
};

/** Common screen resolutions */
export const SCREEN_RESOLUTIONS = [
  { width: 1920, height: 1080, name: "1920x1080 (Full HD)" },
  { width: 2560, height: 1440, name: "2560x1440 (QHD)" },
  { width: 3840, height: 2160, name: "3840x2160 (4K)" },
  { width: 1366, height: 768, name: "1366x768" },
  { width: 1536, height: 864, name: "1536x864" },
  { width: 1440, height: 900, name: "1440x900" },
  { width: 1280, height: 720, name: "1280x720 (HD)" },
  { width: 375, height: 812, name: "375x812 (iPhone X)" },
  { width: 390, height: 844, name: "390x844 (iPhone 12)" },
  { width: 412, height: 915, name: "412x915 (Pixel 6)" },
];

/** Timezones list */
export const TIMEZONES = [
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Bangkok",
  "Australia/Sydney",
  "Pacific/Auckland",
];

/** Generate random fingerprint */
const generateRandomFingerprint = () => {
  const presetKeys = Object.keys(PLATFORM_PRESETS);
  const randomPreset =
    PLATFORM_PRESETS[presetKeys[Math.floor(Math.random() * presetKeys.length)]];
  const randomScreen =
    SCREEN_RESOLUTIONS[Math.floor(Math.random() * SCREEN_RESOLUTIONS.length)];
  const randomTimezone =
    TIMEZONES[Math.floor(Math.random() * TIMEZONES.length)];

  return {
    ...randomPreset,
    screen: {
      width: randomScreen.width,
      height: randomScreen.height,
      colorDepth: 24,
      pixelRatio: Math.random() > 0.5 ? 2 : 1,
    },
    timezone: randomTimezone,
    hardwareConcurrency: [2, 4, 6, 8, 12, 16][Math.floor(Math.random() * 6)],
    deviceMemory: [2, 4, 8, 16, 32][Math.floor(Math.random() * 5)],
    webglVendor: "Google Inc. (NVIDIA)",
    webglRenderer: "ANGLE (NVIDIA, NVIDIA GeForce GTX Series Direct3D11)",
  };
};

export const useBrowserProfileStore = create(
  devtools(
    persist(
      (set, get) => ({
        /** List of browser profiles */
        profiles: [],

        /** Currently active profile ID */
        activeProfileId: null,

        /** Profile categories/groups */
        categories: [
          { id: "work", name: "Work", color: "#3b82f6", icon: "briefcase" },
          { id: "personal", name: "Personal", color: "#22c55e", icon: "user" },
          {
            id: "social",
            name: "Social Media",
            color: "#f59e0b",
            icon: "share2",
          },
          {
            id: "shopping",
            name: "Shopping",
            color: "#ec4899",
            icon: "shoppingCart",
          },
        ],

        /** Create a new profile */
        createProfile: (data = {}) => {
          try {
            const id = createId();
            // Ensure fingerprint generation doesn't crash
            let fingerprint;
            try {
              fingerprint = data.fingerprint || generateRandomFingerprint();
            } catch (err) {
              console.error("Fingerprint generation failed:", err);
              // Fallback fingerprint
              fingerprint = {
                platform: "Win32",
                vendor: "Google Inc.",
                language: "en-US",
                timezone: "America/New_York",
                screen: {
                  width: 1920,
                  height: 1080,
                  colorDepth: 24,
                  pixelRatio: 1,
                },
                hardwareConcurrency: 4,
                deviceMemory: 8,
                webglVendor: "Google Inc.",
                webglRenderer: "ANGLE (NVIDIA)",
              };
            }

            const newProfile = {
              id,
              name: data.name || `Profile ${get().profiles.length + 1}`,
              categoryId: data.categoryId || "personal",
              color: data.color || "#6366f1",
              icon: data.icon || "user",
              status: PROFILE_STATUS.IDLE,
              createdAt: new Date().toISOString(),
              lastUsed: null,

              // Proxy assignment
              proxyId: data.proxyId || null,

              // Fingerprint settings
              fingerprint: {
                userAgent: data.userAgent || null,
                platform: fingerprint?.platform || "Win32",
                vendor: fingerprint?.vendor || "Google Inc.",
                language: fingerprint?.language || "en-US",
                languages: data.languages || ["en-US", "en"],
                timezone: fingerprint?.timezone || "America/New_York",
                screen: fingerprint?.screen || { width: 1920, height: 1080 },
                hardwareConcurrency: fingerprint?.hardwareConcurrency || 4,
                deviceMemory: fingerprint?.deviceMemory || 8,
                webglVendor: fingerprint?.webglVendor || "Google Inc.",
                webglRenderer: fingerprint?.webglRenderer || "ANGLE",
              },

              // Browser settings
              settings: {
                startUrl: data.startUrl || "https://www.google.com",
                blockWebRTC: data.blockWebRTC ?? true,
                blockCanvasFingerprint: data.blockCanvasFingerprint ?? true,
                blockAudioFingerprint: data.blockAudioFingerprint ?? true,
                blockWebGL: data.blockWebGL ?? false,
                blockFonts: data.blockFonts ?? false,
                blockGeolocation: data.blockGeolocation ?? true,
                customGeolocation: data.customGeolocation || null,
                clearCookiesOnClose: data.clearCookiesOnClose ?? false,
                clearHistoryOnClose: data.clearHistoryOnClose ?? false,
              },

              // Social accounts linked
              socialAccounts: data.socialAccounts || [],

              // Notes
              notes: data.notes || "",

              // Usage stats
              stats: {
                sessionsCount: 0,
                totalDuration: 0,
                lastSessionDuration: 0,
              },
            };

            set((state) => ({
              profiles: [...state.profiles, newProfile],
            }));

            return id;
          } catch (error) {
            console.error("Failed to create profile in store:", error);
            // Re-throw so UI can handle it (show toast)
            throw error;
          }
        },

        /** Update profile */
        updateProfile: (id, patch) => {
          set((state) => ({
            profiles: state.profiles.map((p) =>
              p.id === id
                ? { ...p, ...patch, updatedAt: new Date().toISOString() }
                : p
            ),
          }));
        },

        /** Delete profile */
        deleteProfile: (id) => {
          set((state) => ({
            profiles: state.profiles.filter((p) => p.id !== id),
            activeProfileId:
              state.activeProfileId === id ? null : state.activeProfileId,
          }));
        },

        /** Duplicate profile */
        duplicateProfile: (id) => {
          const original = get().profiles.find((p) => p.id === id);
          if (!original) return null;

          const newId = createId();
          const duplicate = {
            ...original,
            id: newId,
            name: `${original.name} (Copy)`,
            createdAt: new Date().toISOString(),
            lastUsed: null,
            stats: {
              sessionsCount: 0,
              totalDuration: 0,
              lastSessionDuration: 0,
            },
          };

          set((state) => ({
            profiles: [...state.profiles, duplicate],
          }));

          return newId;
        },

        /** Set active profile */
        setActiveProfile: (id) => {
          set({ activeProfileId: id });
          if (id) {
            set((state) => ({
              profiles: state.profiles.map((p) =>
                p.id === id ? { ...p, lastUsed: new Date().toISOString() } : p
              ),
            }));
          }
        },

        /** Randomize profile fingerprint */
        randomizeFingerprint: (id) => {
          const newFingerprint = generateRandomFingerprint();
          set((state) => ({
            profiles: state.profiles.map((p) =>
              p.id === id
                ? {
                    ...p,
                    fingerprint: { ...p.fingerprint, ...newFingerprint },
                    updatedAt: new Date().toISOString(),
                  }
                : p
            ),
          }));
        },

        /** Assign proxy to profile */
        assignProxy: (profileId, proxyId) => {
          set((state) => ({
            profiles: state.profiles.map((p) =>
              p.id === profileId
                ? { ...p, proxyId, updatedAt: new Date().toISOString() }
                : p
            ),
          }));
        },

        /** Update profile status */
        setProfileStatus: (id, status) => {
          set((state) => ({
            profiles: state.profiles.map((p) =>
              p.id === id ? { ...p, status } : p
            ),
          }));
        },

        /** Increment session count */
        incrementSessionCount: (id) => {
          set((state) => ({
            profiles: state.profiles.map((p) =>
              p.id === id
                ? {
                    ...p,
                    stats: {
                      ...p.stats,
                      sessionsCount: (p.stats?.sessionsCount || 0) + 1,
                    },
                  }
                : p
            ),
          }));
        },

        /** Add social account to profile */
        addSocialAccount: (profileId, account) => {
          set((state) => ({
            profiles: state.profiles.map((p) =>
              p.id === profileId
                ? {
                    ...p,
                    socialAccounts: [
                      ...(p.socialAccounts || []),
                      {
                        id: createId(),
                        ...account,
                        addedAt: new Date().toISOString(),
                      },
                    ],
                  }
                : p
            ),
          }));
        },

        /** Remove social account from profile */
        removeSocialAccount: (profileId, accountId) => {
          set((state) => ({
            profiles: state.profiles.map((p) =>
              p.id === profileId
                ? {
                    ...p,
                    socialAccounts: (p.socialAccounts || []).filter(
                      (a) => a.id !== accountId
                    ),
                  }
                : p
            ),
          }));
        },

        /** Add category */
        addCategory: (name, color = "#6366f1", icon = "folder") => {
          const id = createId();
          set((state) => ({
            categories: [...state.categories, { id, name, color, icon }],
          }));
          return id;
        },

        /** Remove category */
        removeCategory: (id) => {
          set((state) => ({
            categories: state.categories.filter((c) => c.id !== id),
            profiles: state.profiles.map((p) =>
              p.categoryId === id ? { ...p, categoryId: "personal" } : p
            ),
          }));
        },

        /** Get profile by ID */
        getProfileById: (id) => {
          return get().profiles.find((p) => p.id === id) || null;
        },

        /** Get profiles by category */
        getProfilesByCategory: (categoryId) => {
          return get().profiles.filter((p) => p.categoryId === categoryId);
        },

        /** Get profiles using a specific proxy */
        getProfilesByProxy: (proxyId) => {
          if (!proxyId) return [];
          return get().profiles.filter((p) => p.proxyId === proxyId);
        },

        /** Clear proxy from all profiles (used when proxy is deleted) */
        clearProxyFromProfiles: (proxyId) => {
          set((state) => ({
            profiles: state.profiles.map((p) =>
              p.proxyId === proxyId
                ? { ...p, proxyId: null, updatedAt: new Date().toISOString() }
                : p
            ),
          }));
        },

        /** Validate and clean orphaned proxy references */
        cleanOrphanedProxyRefs: (validProxyIds) => {
          const validSet = new Set(validProxyIds);
          set((state) => ({
            profiles: state.profiles.map((p) =>
              p.proxyId && !validSet.has(p.proxyId)
                ? { ...p, proxyId: null, updatedAt: new Date().toISOString() }
                : p
            ),
          }));
        },

        /** Export all profiles */
        exportProfiles: () => {
          return JSON.stringify(get().profiles, null, 2);
        },

        /** Import profiles */
        importProfiles: (json) => {
          try {
            const imported = JSON.parse(json);
            if (!Array.isArray(imported)) return 0;

            const newProfiles = imported.map((p) => ({
              ...p,
              id: createId(),
              createdAt: new Date().toISOString(),
              lastUsed: null,
            }));

            set((state) => ({
              profiles: [...state.profiles, ...newProfiles],
            }));

            return newProfiles.length;
          } catch {
            return 0;
          }
        },
      }),
      {
        name: "browser-profile-store",
        version: 1,
      }
    ),
    { name: "browser-profile-store" }
  )
);

// Initialize the proxy deletion listener
setupProxyDeletionListener();

export { generateRandomFingerprint };
