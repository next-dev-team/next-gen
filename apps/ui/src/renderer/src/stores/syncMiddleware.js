/**
 * Sync Middleware for Proxy and Profile Stores
 * Ensures data consistency between stores with bidirectional sync.
 */

import { useBrowserProfileStore } from "./browserProfileStore";
import { useProxyStore } from "./proxyStore";

/**
 * Initialize synchronization between stores
 * Call this once when the app starts
 */
export function initializeStoreSync() {
  // Subscribe to proxy store changes
  useProxyStore.subscribe((state, prevState) => {
    // Check for deleted proxies
    const currentProxyIds = new Set(state.proxies.map((p) => p.id));
    const deletedProxyIds = prevState.proxies
      .filter((p) => !currentProxyIds.has(p.id))
      .map((p) => p.id);

    if (deletedProxyIds.length > 0) {
      // Clear proxyId from profiles that reference deleted proxies
      const profileStore = useBrowserProfileStore.getState();
      deletedProxyIds.forEach((deletedProxyId) => {
        const affectedProfiles = profileStore.profiles.filter(
          (p) => p.proxyId === deletedProxyId
        );
        affectedProfiles.forEach((profile) => {
          profileStore.updateProfile(profile.id, { proxyId: null });
        });
      });
    }
  });

  // Subscribe to profile store changes for cleanup
  useBrowserProfileStore.subscribe((state, prevState) => {
    // Handle profile deletion cleanup
    const currentProfileIds = new Set(state.profiles.map((p) => p.id));
    const deletedProfileIds = prevState.profiles
      .filter((p) => !currentProfileIds.has(p.id))
      .map((p) => p.id);

    // Could extend to notify IPC about profile cleanup if needed
    if (deletedProfileIds.length > 0 && window.electronAPI?.antiDetection) {
      deletedProfileIds.forEach((id) => {
        // Clean up active profile assignments
        window.electronAPI.antiDetection.cleanupProfile?.(id);
      });
    }
  });

  console.log("[StoreSync] Initialization complete");

  // Run initial cleanup
  cleanupOrphanedProxyReferences();
}

/**
 * Get synced proxy info for a profile
 * Ensures the proxy still exists in the proxy store
 */
export function getSyncedProxyForProfile(profileId) {
  const profile = useBrowserProfileStore.getState().getProfileById(profileId);
  if (!profile || !profile.proxyId) return null;

  const proxy = useProxyStore.getState().getProxyById(profile.proxyId);
  if (!proxy) {
    // Proxy was deleted but profile still references it - clean up
    useBrowserProfileStore
      .getState()
      .updateProfile(profileId, { proxyId: null });
    return null;
  }

  return proxy;
}

/**
 * Assign proxy to profile with validation
 */
export function assignProxyToProfile(profileId, proxyId) {
  const proxyStore = useProxyStore.getState();
  const profileStore = useBrowserProfileStore.getState();

  // Validate proxy exists
  if (proxyId && !proxyStore.getProxyById(proxyId)) {
    console.warn(
      `[StoreSync] Attempted to assign non-existent proxy ${proxyId}`
    );
    return false;
  }

  // Update profile
  profileStore.updateProfile(profileId, { proxyId: proxyId || null });

  // Increment proxy usage count if assigning
  if (proxyId) {
    proxyStore.incrementUsageCount(proxyId);
  }

  return true;
}

/**
 * Get profiles using a specific proxy
 */
export function getProfilesUsingProxy(proxyId) {
  if (!proxyId) return [];
  const profiles = useBrowserProfileStore.getState().profiles;
  return profiles.filter((p) => p.proxyId === proxyId);
}

/**
 * Sync profile status with running browser tabs
 * Call this when tab states change
 */
export function syncProfileStatus(tabId, isRunning) {
  const profileStore = useBrowserProfileStore.getState();
  const activeProfileId = profileStore.activeProfileId;

  if (activeProfileId) {
    profileStore.setProfileStatus(
      activeProfileId,
      isRunning ? "running" : "idle"
    );
  }
}

/**
 * Validate and clean up orphaned proxy references
 * Call this periodically or on app start
 */
export function cleanupOrphanedProxyReferences() {
  const profiles = useBrowserProfileStore.getState().profiles;
  const proxyIds = new Set(useProxyStore.getState().proxies.map((p) => p.id));

  let cleanedCount = 0;
  profiles.forEach((profile) => {
    if (profile.proxyId && !proxyIds.has(profile.proxyId)) {
      useBrowserProfileStore
        .getState()
        .updateProfile(profile.id, { proxyId: null });
      cleanedCount++;
    }
  });

  if (cleanedCount > 0) {
    console.log(
      `[StoreSync] Cleaned up ${cleanedCount} orphaned proxy references`
    );
  }

  return cleanedCount;
}

export default {
  initializeStoreSync,
  getSyncedProxyForProfile,
  assignProxyToProfile,
  getProfilesUsingProxy,
  syncProfileStatus,
  cleanupOrphanedProxyReferences,
};
