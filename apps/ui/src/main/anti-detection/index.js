/**
 * Anti-Detection Manager for Electron BrowserView
 * Manages profiles, sessions, and applies anti-fingerprinting measures
 */

const { session, ipcMain, app } = require("electron");
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
const proxyManager = require("./proxy-manager");

// Store active profiles for each tab
const activeProfiles = new Map();
// Store session instances
const tabSessions = new Map();

const proxyAuthBySession = new WeakMap();
let proxyLoginHandlerInstalled = false;

function ensureProxyLoginHandler() {
  if (proxyLoginHandlerInstalled) return;
  proxyLoginHandlerInstalled = true;

  app.on("login", (event, webContents, _details, authInfo, callback) => {
    if (!authInfo || !authInfo.isProxy) return;
    const ses = webContents?.session;
    if (!ses) return;
    const creds = proxyAuthBySession.get(ses);
    if (!creds) return;
    event.preventDefault();
    callback(creds.username, creds.password);
  });
}

/**
 * Create a partition session for a tab with anti-detection measures
 * @param {string} tabId - The tab identifier
 * @param {string|Object} profileOrId - Optional profile ID or object to use
 * @returns {Promise<Electron.Session>}
 */
async function createAntiDetectionSession(tabId, profileOrId = null) {
  // If no profileId provided, check if we already have one for this tab
  // This handles cases where switchProfile was called before session creation
  const existingProfile = activeProfiles.get(tabId);

  let profile;
  if (profileOrId && typeof profileOrId === "object") {
    profile = profileOrId;
  } else if (profileOrId && typeof profileOrId === "string") {
    profile = getProfile(profileOrId);
  } else if (existingProfile) {
    profile = existingProfile;
    console.log(
      `[Anti-Detection] Using existing profile ${profile.id} for tab ${tabId}`
    );
  } else {
    profile = getRandomProfile("desktop");
  }

  if (!profile) {
    console.error(`Profile not found: ${profileOrId || "random"}`);
    return null;
  }

  // Create a partition for isolation
  const partition = `persist:tab-${tabId}`;
  const ses = session.fromPartition(partition);

  console.log(
    `[Anti-Detection] Created session for tab ${tabId} with partition ${partition}. Storage path: ${ses.getStoragePath()}`
  );

  // Store the profile
  activeProfiles.set(tabId, profile);
  tabSessions.set(tabId, ses);

  // Set up anti-detection measures
  await setupSessionAntiDetection(ses, profile);

  return ses;
}

/**
 * Set up anti-detection measures for a session
 * @param {Electron.Session} ses - The session to configure
 * @param {Object} profile - The device profile
 */
async function setupSessionAntiDetection(ses, profile) {
  // 1. Set User Agent
  const fallbackUa =
    (typeof ses.getUserAgent === "function" ? ses.getUserAgent() : "") ||
    String(app.userAgentFallback || "");
  const userAgent =
    typeof profile?.userAgent === "string" && profile.userAgent.trim()
      ? profile.userAgent
      : fallbackUa;

  const languages =
    Array.isArray(profile?.languages) && profile.languages.length
      ? profile.languages.filter(Boolean).map((l) => String(l))
      : profile?.language
        ? [String(profile.language)]
        : ["en-US", "en"];
  const acceptLanguage = languages.join(", ");

  if (userAgent) {
    ses.setUserAgent(userAgent, acceptLanguage);
  }

  // 1.1 Apply Proxy if configured
  // Check profile.proxy first (from frontend object)
  const proxyConfig =
    profile.proxy || (await proxyManager.getProxyForProfile(profile.id));

  ensureProxyLoginHandler();

  if (proxyConfig) {
    const proxyRules = `http=${proxyConfig.host}:${proxyConfig.port};https=${proxyConfig.host}:${proxyConfig.port}`;

    console.log(
      `[Proxy] Applying for profile ${profile.id} in session ${ses.getStoragePath() || "memory"}: ${proxyRules}`
    );

    try {
      await ses.setProxy({
        proxyRules: proxyRules,
        proxyBypassRules: "<local>",
      });

      await ses.forceReloadProxyConfig();
      const resolved = await ses.resolveProxy("http://example.com");
      console.log(
        `[Proxy] resolveProxy for profile ${profile.id}: ${String(resolved || "")}`
      );
    } catch (err) {
      console.error(
        `[Proxy] Failed to setProxy for profile ${profile.id}:`,
        err
      );
    }

    if (proxyConfig.username && proxyConfig.password) {
      proxyAuthBySession.set(ses, {
        username: proxyConfig.username,
        password: proxyConfig.password,
      });
    } else {
      proxyAuthBySession.delete(ses);
    }
  } else {
    console.log(`[Proxy] No proxy for profile ${profile.id}, resetting.`);
    await ses.setProxy({ proxyRules: "" });
    proxyAuthBySession.delete(ses);
  }

  // 2. Modify request headers to appear more human
  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    const headers = { ...details.requestHeaders };

    // Clean up suspicious headers
    delete headers["X-DevTools-Emulate-Network-Conditions-Client-Id"];
    delete headers["X-Requested-With"];

    // Ensure consistent User-Agent
    if (userAgent) headers["User-Agent"] = userAgent;

    // Add Accept-Language based on profile
    if (acceptLanguage) {
      headers["Accept-Language"] = `${acceptLanguage};q=0.9`;
    }

    // Add realistic Accept header
    if (!headers["Accept"]) {
      headers["Accept"] =
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8";
    }

    if (userAgent && userAgent.includes("Chrome")) {
      const profileWithUserAgent = { ...profile, userAgent };
      if (!headers["Sec-CH-UA"]) {
        headers["Sec-CH-UA"] = generateSecChUa(profileWithUserAgent);
      }
      if (!headers["Sec-CH-UA-Mobile"]) {
        headers["Sec-CH-UA-Mobile"] =
          profile?.category === "mobile" ? "?1" : "?0";
      }
      if (!headers["Sec-CH-UA-Platform"]) {
        headers["Sec-CH-UA-Platform"] = getPlatformHint(profileWithUserAgent);
      }
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
  const userAgent =
    typeof profile?.userAgent === "string" ? profile.userAgent : "";

  if (userAgent.includes("Edg")) {
    const match = userAgent.match(/Edg\/(\d+)/);
    const version = match ? match[1] : "122";
    return `"Chromium";v="${version}", "Microsoft Edge";v="${version}", "Not(A:Brand";v="24"`;
  }

  if (userAgent.includes("Chrome")) {
    const match = userAgent.match(/Chrome\/(\d+)/);
    const version = match ? match[1] : "122";
    return `"Chromium";v="${version}", "Google Chrome";v="${version}", "Not(A:Brand";v="24"`;
  }

  return `"Chromium";v="122", "Not(A:Brand";v="24"`;
}

/**
 * Get platform hint from profile
 */
function getPlatformHint(profile) {
  const platform =
    typeof profile?.platform === "string" ? profile.platform : "";
  const userAgent =
    typeof profile?.userAgent === "string" ? profile.userAgent : "";

  if (platform.includes("Win")) return '"Windows"';
  if (platform.includes("Mac")) return '"macOS"';
  if (platform.includes("Linux")) return '"Linux"';
  if (platform.includes("iPhone")) return '"iOS"';
  if (platform.includes("armv") || userAgent.includes("Android"))
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
async function switchProfile(tabId, profileOrId) {
  let profile;
  if (profileOrId && typeof profileOrId === "object") {
    profile = profileOrId;
  } else {
    profile = getProfile(profileOrId);
  }
  if (!profile) return false;

  activeProfiles.set(tabId, profile);

  const ses = tabSessions.get(tabId);
  if (ses) {
    await setupSessionAntiDetection(ses, profile);
  }

  return true;
}

/**
 * Apply a random variation to the current profile
 */
async function randomizeCurrentProfile(tabId) {
  const current = activeProfiles.get(tabId);
  if (!current) return null;

  const randomized = randomizeProfile(current);
  activeProfiles.set(tabId, randomized);

  const ses = tabSessions.get(tabId);
  if (ses) {
    await setupSessionAntiDetection(ses, randomized);
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
    async (event, { tabId, profileId, profile }) => {
      return switchProfile(tabId, profile || profileId);
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

  // Proxy Management IPCs
  ipcMain.handle(
    "anti-detection:set-proxy",
    async (event, { profileId, proxyData }) => {
      console.log(`[Proxy] Setting proxy for profile ${profileId}`);
      await proxyManager.setProxyForProfile(profileId, proxyData);

      // Re-apply proxy if this profile is active in any session
      let appliedCount = 0;
      for (const [tabId, profile] of activeProfiles.entries()) {
        if (profile.id === profileId) {
          const ses = tabSessions.get(tabId);
          if (ses) {
            console.log(
              `[Proxy] Re-applying to active session for tab ${tabId}`
            );
            await setupSessionAntiDetection(ses, profile);
            appliedCount++;
          }
        }
      }
      console.log(`[Proxy] Re-applied to ${appliedCount} active sessions`);
      return true;
    }
  );

  ipcMain.handle("anti-detection:get-proxy", async (event, { profileId }) => {
    return proxyManager.getProxyForProfile(profileId);
  });

  ipcMain.handle("anti-detection:get-all-proxies", async () => {
    return proxyManager.getAllProxies();
  });
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
  generateSecChUa,
  getPlatformHint,
};
