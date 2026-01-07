/**
 * Anti-Detection Manager for Electron BrowserView
 * Manages profiles, sessions, and applies anti-fingerprinting measures
 */

const { session, ipcMain } = require("electron");
const {
  getAllProfiles,
  getProfile,
  getRandomProfile,
  randomizeProfile,
  createCustomProfile,
} = require("./device-profiles");
const {
  generateStealthScript,
  generateMinimalStealthScript,
} = require("./stealth-script");

// Store active profiles for each tab
const activeProfiles = new Map();
// Store session instances
const tabSessions = new Map();

/**
 * Create a partition session for a tab with anti-detection measures
 * @param {string} tabId - The tab identifier
 * @param {string} profileId - Optional profile ID to use
 * @returns {Electron.Session}
 */
function createAntiDetectionSession(tabId, profileId = null) {
  const profile = profileId
    ? getProfile(profileId)
    : getRandomProfile("desktop");
  if (!profile) {
    console.error(`Profile not found: ${profileId}`);
    return null;
  }

  // Create a partition for isolation
  const partition = `persist:tab-${tabId}`;
  const ses = session.fromPartition(partition);

  // Store the profile
  activeProfiles.set(tabId, profile);
  tabSessions.set(tabId, ses);

  // Set up anti-detection measures
  setupSessionAntiDetection(ses, profile);

  return ses;
}

/**
 * Set up anti-detection measures for a session
 * @param {Electron.Session} ses - The session to configure
 * @param {Object} profile - The device profile
 */
function setupSessionAntiDetection(ses, profile) {
  // 1. Set User Agent
  ses.setUserAgent(profile.userAgent, profile.languages.join(", "));

  // 2. Modify request headers to appear more human
  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    const headers = { ...details.requestHeaders };

    // Clean up suspicious headers
    delete headers["X-DevTools-Emulate-Network-Conditions-Client-Id"];
    delete headers["X-Requested-With"];

    // Ensure consistent User-Agent
    headers["User-Agent"] = profile.userAgent;

    // Add Accept-Language based on profile
    headers["Accept-Language"] = profile.languages.join(", ") + ";q=0.9";

    // Add realistic Accept header
    if (!headers["Accept"]) {
      headers["Accept"] =
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8";
    }

    // Add SEC headers for Chromium browsers
    if (profile.userAgent.includes("Chrome")) {
      headers["Sec-CH-UA"] = generateSecChUa(profile);
      headers["Sec-CH-UA-Mobile"] = profile.category === "mobile" ? "?1" : "?0";
      headers["Sec-CH-UA-Platform"] = getPlatformHint(profile);
      headers["Sec-Fetch-Dest"] = headers["Sec-Fetch-Dest"] || "document";
      headers["Sec-Fetch-Mode"] = headers["Sec-Fetch-Mode"] || "navigate";
      headers["Sec-Fetch-Site"] = headers["Sec-Fetch-Site"] || "none";
      headers["Sec-Fetch-User"] = "?1";
    }

    // Remove Electron-specific headers
    delete headers["Electron"];

    callback({ requestHeaders: headers });
  });

  // 3. Handle response headers
  ses.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders };

    // Remove potentially problematic headers
    // These can sometimes reveal automation

    callback({ responseHeaders: headers });
  });

  // 4. Set permissions handler to mimic real browser
  ses.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = [
      "clipboard-read",
      "clipboard-sanitized-write",
      "media",
      "geolocation",
      "notifications",
      "fullscreen",
      "pointerLock",
    ];

    // Allow permissions that real browsers would prompt for
    // In stealth mode, we generally allow to appear as real user
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });

  // 5. Set permission check handler
  ses.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    // Return true for most checks to appear as having normal permissions
    return true;
  });

  // 6. Disable cache for fresh fingerprint on each session (optional)
  // ses.clearCache();
}

/**
 * Generate Sec-CH-UA header value
 */
function generateSecChUa(profile) {
  if (profile.userAgent.includes("Chrome")) {
    const match = profile.userAgent.match(/Chrome\/(\d+)/);
    const version = match ? match[1] : "122";
    return `"Chromium";v="${version}", "Google Chrome";v="${version}", "Not(A:Brand";v="24"`;
  }
  if (profile.userAgent.includes("Edg")) {
    const match = profile.userAgent.match(/Edg\/(\d+)/);
    const version = match ? match[1] : "122";
    return `"Chromium";v="${version}", "Microsoft Edge";v="${version}", "Not(A:Brand";v="24"`;
  }
  return `"Chromium";v="122", "Not(A:Brand";v="24"`;
}

/**
 * Get platform hint from profile
 */
function getPlatformHint(profile) {
  if (profile.platform.includes("Win")) return '"Windows"';
  if (profile.platform.includes("Mac")) return '"macOS"';
  if (profile.platform.includes("Linux")) return '"Linux"';
  if (profile.platform.includes("iPhone")) return '"iOS"';
  if (
    profile.platform.includes("armv") ||
    profile.userAgent.includes("Android")
  )
    return '"Android"';
  return '"Unknown"';
}

/**
 * Apply stealth script to a webContents
 * @param {Electron.WebContents} webContents
 * @param {string} tabId
 * @param {boolean} minimal - Use minimal script for better performance
 */
async function injectStealthScript(webContents, tabId, minimal = false) {
  // Check if webContents is still valid
  if (!webContents || webContents.isDestroyed()) {
    return;
  }

  const profile = activeProfiles.get(tabId);
  if (!profile) {
    // Don't warn for missing profile - it may not have been created yet
    return;
  }

  const script = minimal
    ? generateMinimalStealthScript(profile)
    : generateStealthScript(profile);

  try {
    // Double-check before executing
    if (webContents.isDestroyed()) return;
    await webContents.executeJavaScript(script);
  } catch (error) {
    // Only log if it's not a navigation/destroyed error
    const msg = String(error?.message || "");
    if (
      !msg.includes("destroyed") &&
      !msg.includes("disposed") &&
      !msg.includes("navigation")
    ) {
      console.error("Failed to inject stealth script:", error.message);
    }
  }
}

/**
 * Get the active profile for a tab
 */
function getActiveProfile(tabId) {
  return activeProfiles.get(tabId) || null;
}

/**
 * Switch the profile for a tab
 */
function switchProfile(tabId, profileId) {
  const profile = getProfile(profileId);
  if (!profile) return false;

  activeProfiles.set(tabId, profile);

  const ses = tabSessions.get(tabId);
  if (ses) {
    setupSessionAntiDetection(ses, profile);
  }

  return true;
}

/**
 * Apply a random variation to the current profile
 */
function randomizeCurrentProfile(tabId) {
  const current = activeProfiles.get(tabId);
  if (!current) return null;

  const randomized = randomizeProfile(current);
  activeProfiles.set(tabId, randomized);

  const ses = tabSessions.get(tabId);
  if (ses) {
    setupSessionAntiDetection(ses, randomized);
  }

  return randomized;
}

/**
 * Clean up resources for a tab
 */
function cleanupTab(tabId) {
  activeProfiles.delete(tabId);
  tabSessions.delete(tabId);
}

/**
 * Get all available profiles
 */
function listProfiles() {
  return getAllProfiles().map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    userAgent: p.userAgent,
  }));
}

/**
 * Initialize IPC handlers for anti-detection
 */
function initAntiDetectionIPC() {
  ipcMain.handle("anti-detection:list-profiles", async () => {
    return listProfiles();
  });

  ipcMain.handle(
    "anti-detection:get-active-profile",
    async (event, { tabId }) => {
      return getActiveProfile(tabId);
    }
  );

  ipcMain.handle(
    "anti-detection:switch-profile",
    async (event, { tabId, profileId }) => {
      return switchProfile(tabId, profileId);
    }
  );

  ipcMain.handle(
    "anti-detection:randomize-profile",
    async (event, { tabId }) => {
      return randomizeCurrentProfile(tabId);
    }
  );

  ipcMain.handle(
    "anti-detection:create-custom-profile",
    async (event, { baseProfileId, customizations }) => {
      return createCustomProfile(baseProfileId, customizations);
    }
  );
}

module.exports = {
  createAntiDetectionSession,
  setupSessionAntiDetection,
  injectStealthScript,
  getActiveProfile,
  switchProfile,
  randomizeCurrentProfile,
  cleanupTab,
  listProfiles,
  initAntiDetectionIPC,
  getAllProfiles,
  getProfile,
  getRandomProfile,
};
