/**
 * Proxy Manager for Anti-Detection Profiles
 * Handles secure storage of proxy credentials and configuration
 */

const { safeStorage, app } = require("electron");
const path = require("path");

// We'll use electron-store for persistence
let store = null;

async function getStore() {
  if (!store) {
    const StoreModule = await import("electron-store");
    const StoreClass = StoreModule.default || StoreModule;
    store = new StoreClass({ name: "proxy-configs" });
  }
  return store;
}

/**
 * Parse a proxy string in the format host:port:username:password
 * @param {string} proxyStr
 * @returns {Object|null}
 */
function parseProxyString(proxyStr) {
  if (!proxyStr || typeof proxyStr !== "string") return null;

  const parts = proxyStr.split(":");
  if (parts.length < 2) return null;

  const config = {
    host: parts[0],
    port: parseInt(parts[1], 10),
  };

  if (parts.length >= 3) {
    config.username = parts[2];
  }

  if (parts.length >= 4) {
    config.password = parts.slice(3).join(":"); // Password might contain colons
  }

  return config;
}

/**
 * Securely encrypt a password
 * @param {string} password
 * @returns {string|null} - Base64 encoded encrypted password
 */
function encryptPassword(password) {
  if (!password) return null;
  if (!safeStorage.isEncryptionAvailable()) {
    console.warn("Encryption not available, storing password in plain text");
    return password;
  }
  return safeStorage.encryptString(password).toString("base64");
}

/**
 * Decrypt a password
 * @param {string} encryptedPassword - Base64 encoded encrypted password
 * @returns {string|null}
 */
function decryptPassword(encryptedPassword) {
  if (!encryptedPassword) return null;
  if (!safeStorage.isEncryptionAvailable()) {
    return encryptedPassword;
  }
  try {
    const buffer = Buffer.from(encryptedPassword, "base64");
    return safeStorage.decryptString(buffer);
  } catch (error) {
    console.error("Failed to decrypt password:", error);
    return null;
  }
}

/**
 * Save proxy configuration for a profile
 * @param {string} profileId
 * @param {Object|string} proxyData - Proxy object or string
 */
async function setProxyForProfile(profileId, proxyData) {
  const s = await getStore();
  let config =
    typeof proxyData === "string" ? parseProxyString(proxyData) : proxyData;

  if (!config) {
    s.delete(`proxies.${profileId}`);
    return;
  }

  // Encrypt password if present
  if (config.password) {
    config.encryptedPassword = encryptPassword(config.password);
    delete config.password;
  }

  s.set(`proxies.${profileId}`, config);
}

/**
 * Get proxy configuration for a profile
 * @param {string} profileId
 * @returns {Object|null}
 */
async function getProxyForProfile(profileId) {
  const s = await getStore();
  const config = s.get(`proxies.${profileId}`);
  if (!config) {
    console.log(`[ProxyManager] No proxy configured for profile ${profileId}`);
    return null;
  }

  // Decrypt password if present
  if (config.encryptedPassword) {
    config.password = decryptPassword(config.encryptedPassword);
  }

  console.log(
    `[ProxyManager] Retrieved proxy for ${profileId}: ${config.host}:${config.port} (hasAuth: ${!!(config.username && config.password)})`
  );

  return config;
}

/**
 * Get all proxy configurations
 */
async function getAllProxies() {
  const s = await getStore();
  return s.get("proxies") || {};
}

module.exports = {
  parseProxyString,
  setProxyForProfile,
  getProxyForProfile,
  getAllProxies,
};
