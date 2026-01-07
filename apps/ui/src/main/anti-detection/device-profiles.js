/**
 * Device Profiles for Anti-Detection
 * Contains realistic browser fingerprints for various devices and browsers
 */

const DEVICE_PROFILES = {
  // Chrome on Windows 11
  "chrome-win11": {
    id: "chrome-win11",
    name: "Chrome on Windows 11",
    category: "desktop",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    appVersion:
      "5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    platform: "Win32",
    vendor: "Google Inc.",
    oscpu: undefined,
    languages: ["en-US", "en"],
    language: "en-US",
    timezone: "America/New_York",
    timezoneOffset: 300,
    screen: {
      width: 1920,
      height: 1080,
      availWidth: 1920,
      availHeight: 1040,
      colorDepth: 24,
      pixelDepth: 24,
      devicePixelRatio: 1,
    },
    webgl: {
      vendor: "Google Inc. (NVIDIA)",
      renderer:
        "ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0, D3D11)",
      unmaskedVendor: "Google Inc. (NVIDIA)",
      unmaskedRenderer:
        "ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    },
    hardwareConcurrency: 8,
    deviceMemory: 8,
    maxTouchPoints: 0,
    doNotTrack: null,
    plugins: [
      { name: "Chrome PDF Viewer", filename: "internal-pdf-viewer" },
      { name: "Chromium PDF Viewer", filename: "internal-pdf-viewer" },
      {
        name: "Microsoft Edge PDF Viewer",
        filename: "internal-pdf-viewer",
      },
      { name: "PDF Viewer", filename: "internal-pdf-viewer" },
      { name: "WebKit built-in PDF", filename: "internal-pdf-viewer" },
    ],
    mediaDevices: {
      audioInputs: 1,
      audioOutputs: 2,
      videoInputs: 1,
    },
    battery: {
      charging: true,
      chargingTime: 0,
      dischargingTime: Infinity,
      level: 1,
    },
  },

  // Chrome on macOS
  "chrome-macos": {
    id: "chrome-macos",
    name: "Chrome on macOS",
    category: "desktop",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    appVersion:
      "5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    platform: "MacIntel",
    vendor: "Google Inc.",
    oscpu: undefined,
    languages: ["en-US", "en"],
    language: "en-US",
    timezone: "America/Los_Angeles",
    timezoneOffset: 480,
    screen: {
      width: 2560,
      height: 1440,
      availWidth: 2560,
      availHeight: 1415,
      colorDepth: 30,
      pixelDepth: 30,
      devicePixelRatio: 2,
    },
    webgl: {
      vendor: "Google Inc. (Apple)",
      renderer: "ANGLE (Apple, Apple M1 Pro, OpenGL 4.1 Metal - 76.3)",
      unmaskedVendor: "Google Inc. (Apple)",
      unmaskedRenderer: "ANGLE (Apple, Apple M1 Pro, OpenGL 4.1 Metal - 76.3)",
    },
    hardwareConcurrency: 10,
    deviceMemory: 8,
    maxTouchPoints: 0,
    doNotTrack: null,
    plugins: [
      { name: "Chrome PDF Viewer", filename: "internal-pdf-viewer" },
      { name: "Chromium PDF Viewer", filename: "internal-pdf-viewer" },
      { name: "PDF Viewer", filename: "internal-pdf-viewer" },
      { name: "WebKit built-in PDF", filename: "internal-pdf-viewer" },
    ],
    mediaDevices: {
      audioInputs: 1,
      audioOutputs: 1,
      videoInputs: 1,
    },
    battery: null,
  },

  // Chrome on Linux
  "chrome-linux": {
    id: "chrome-linux",
    name: "Chrome on Linux",
    category: "desktop",
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    appVersion:
      "5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    platform: "Linux x86_64",
    vendor: "Google Inc.",
    oscpu: undefined,
    languages: ["en-US", "en"],
    language: "en-US",
    timezone: "Europe/London",
    timezoneOffset: 0,
    screen: {
      width: 1920,
      height: 1080,
      availWidth: 1920,
      availHeight: 1053,
      colorDepth: 24,
      pixelDepth: 24,
      devicePixelRatio: 1,
    },
    webgl: {
      vendor: "Google Inc. (Intel)",
      renderer:
        "ANGLE (Intel, Mesa Intel(R) UHD Graphics (CML GT2), OpenGL 4.6)",
      unmaskedVendor: "Google Inc. (Intel)",
      unmaskedRenderer:
        "ANGLE (Intel, Mesa Intel(R) UHD Graphics (CML GT2), OpenGL 4.6)",
    },
    hardwareConcurrency: 4,
    deviceMemory: 8,
    maxTouchPoints: 0,
    doNotTrack: "1",
    plugins: [
      { name: "Chrome PDF Viewer", filename: "internal-pdf-viewer" },
      { name: "Chromium PDF Viewer", filename: "internal-pdf-viewer" },
      { name: "PDF Viewer", filename: "internal-pdf-viewer" },
    ],
    mediaDevices: {
      audioInputs: 1,
      audioOutputs: 1,
      videoInputs: 0,
    },
    battery: {
      charging: false,
      chargingTime: Infinity,
      dischargingTime: 12600,
      level: 0.75,
    },
  },

  // Firefox on Windows 11
  "firefox-win11": {
    id: "firefox-win11",
    name: "Firefox on Windows 11",
    category: "desktop",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
    appVersion: "5.0 (Windows)",
    platform: "Win32",
    vendor: "",
    oscpu: "Windows NT 10.0; Win64; x64",
    languages: ["en-US", "en"],
    language: "en-US",
    timezone: "America/Chicago",
    timezoneOffset: 360,
    screen: {
      width: 1920,
      height: 1080,
      availWidth: 1920,
      availHeight: 1040,
      colorDepth: 24,
      pixelDepth: 24,
      devicePixelRatio: 1,
    },
    webgl: {
      vendor: "Mozilla",
      renderer: "Mozilla",
      unmaskedVendor: "NVIDIA Corporation",
      unmaskedRenderer: "NVIDIA GeForce RTX 3080/PCIe/SSE2",
    },
    hardwareConcurrency: 16,
    deviceMemory: undefined,
    maxTouchPoints: 0,
    doNotTrack: "unspecified",
    plugins: [],
    mediaDevices: {
      audioInputs: 1,
      audioOutputs: 2,
      videoInputs: 1,
    },
    battery: null,
  },

  // Safari on macOS
  "safari-macos": {
    id: "safari-macos",
    name: "Safari on macOS",
    category: "desktop",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
    appVersion:
      "5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
    platform: "MacIntel",
    vendor: "Apple Computer, Inc.",
    oscpu: undefined,
    languages: ["en-US"],
    language: "en-US",
    timezone: "America/Los_Angeles",
    timezoneOffset: 480,
    screen: {
      width: 1680,
      height: 1050,
      availWidth: 1680,
      availHeight: 985,
      colorDepth: 30,
      pixelDepth: 30,
      devicePixelRatio: 2,
    },
    webgl: {
      vendor: "Apple Inc.",
      renderer: "Apple GPU",
      unmaskedVendor: "Apple Inc.",
      unmaskedRenderer: "Apple M1",
    },
    hardwareConcurrency: 8,
    deviceMemory: undefined,
    maxTouchPoints: 0,
    doNotTrack: null,
    plugins: [],
    mediaDevices: {
      audioInputs: 1,
      audioOutputs: 1,
      videoInputs: 1,
    },
    battery: null,
  },

  // Edge on Windows 11
  "edge-win11": {
    id: "edge-win11",
    name: "Edge on Windows 11",
    category: "desktop",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.2365.66",
    appVersion:
      "5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.2365.66",
    platform: "Win32",
    vendor: "Google Inc.",
    oscpu: undefined,
    languages: ["en-US", "en"],
    language: "en-US",
    timezone: "America/New_York",
    timezoneOffset: 300,
    screen: {
      width: 1920,
      height: 1080,
      availWidth: 1920,
      availHeight: 1040,
      colorDepth: 24,
      pixelDepth: 24,
      devicePixelRatio: 1.25,
    },
    webgl: {
      vendor: "Google Inc. (AMD)",
      renderer:
        "ANGLE (AMD, AMD Radeon RX 6800 XT Direct3D11 vs_5_0 ps_5_0, D3D11)",
      unmaskedVendor: "Google Inc. (AMD)",
      unmaskedRenderer:
        "ANGLE (AMD, AMD Radeon RX 6800 XT Direct3D11 vs_5_0 ps_5_0, D3D11)",
    },
    hardwareConcurrency: 12,
    deviceMemory: 8,
    maxTouchPoints: 0,
    doNotTrack: null,
    plugins: [
      { name: "Chrome PDF Viewer", filename: "internal-pdf-viewer" },
      { name: "Chromium PDF Viewer", filename: "internal-pdf-viewer" },
      {
        name: "Microsoft Edge PDF Viewer",
        filename: "internal-pdf-viewer",
      },
      { name: "PDF Viewer", filename: "internal-pdf-viewer" },
      { name: "WebKit built-in PDF", filename: "internal-pdf-viewer" },
    ],
    mediaDevices: {
      audioInputs: 2,
      audioOutputs: 3,
      videoInputs: 1,
    },
    battery: {
      charging: true,
      chargingTime: 0,
      dischargingTime: Infinity,
      level: 1,
    },
  },

  // Chrome on Android
  "chrome-android": {
    id: "chrome-android",
    name: "Chrome on Android",
    category: "mobile",
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
    appVersion:
      "5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
    platform: "Linux armv81",
    vendor: "Google Inc.",
    oscpu: undefined,
    languages: ["en-US", "en"],
    language: "en-US",
    timezone: "America/New_York",
    timezoneOffset: 300,
    screen: {
      width: 412,
      height: 915,
      availWidth: 412,
      availHeight: 867,
      colorDepth: 24,
      pixelDepth: 24,
      devicePixelRatio: 2.625,
    },
    webgl: {
      vendor: "Qualcomm",
      renderer: "Adreno (TM) 740",
      unmaskedVendor: "Qualcomm",
      unmaskedRenderer: "Adreno (TM) 740",
    },
    hardwareConcurrency: 8,
    deviceMemory: 8,
    maxTouchPoints: 5,
    doNotTrack: null,
    plugins: [],
    mediaDevices: {
      audioInputs: 1,
      audioOutputs: 1,
      videoInputs: 2,
    },
    battery: {
      charging: false,
      chargingTime: Infinity,
      dischargingTime: 18000,
      level: 0.85,
    },
  },

  // Safari on iOS
  "safari-ios": {
    id: "safari-ios",
    name: "Safari on iOS",
    category: "mobile",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Mobile/15E148 Safari/604.1",
    appVersion:
      "5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Mobile/15E148 Safari/604.1",
    platform: "iPhone",
    vendor: "Apple Computer, Inc.",
    oscpu: undefined,
    languages: ["en-US"],
    language: "en-US",
    timezone: "America/Los_Angeles",
    timezoneOffset: 480,
    screen: {
      width: 390,
      height: 844,
      availWidth: 390,
      availHeight: 844,
      colorDepth: 32,
      pixelDepth: 32,
      devicePixelRatio: 3,
    },
    webgl: {
      vendor: "Apple Inc.",
      renderer: "Apple GPU",
      unmaskedVendor: "Apple Inc.",
      unmaskedRenderer: "Apple A16 GPU",
    },
    hardwareConcurrency: 6,
    deviceMemory: undefined,
    maxTouchPoints: 5,
    doNotTrack: null,
    plugins: [],
    mediaDevices: {
      audioInputs: 1,
      audioOutputs: 1,
      videoInputs: 2,
    },
    battery: null,
  },

  // Chrome on Samsung Galaxy
  "chrome-samsung": {
    id: "chrome-samsung",
    name: "Chrome on Samsung Galaxy",
    category: "mobile",
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
    appVersion:
      "5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
    platform: "Linux armv81",
    vendor: "Google Inc.",
    oscpu: undefined,
    languages: ["en-US", "en"],
    language: "en-US",
    timezone: "Europe/London",
    timezoneOffset: 0,
    screen: {
      width: 384,
      height: 854,
      availWidth: 384,
      availHeight: 806,
      colorDepth: 24,
      pixelDepth: 24,
      devicePixelRatio: 3.5,
    },
    webgl: {
      vendor: "ARM",
      renderer: "Mali-G720 Immortalis MC12",
      unmaskedVendor: "ARM",
      unmaskedRenderer: "Mali-G720 Immortalis MC12",
    },
    hardwareConcurrency: 8,
    deviceMemory: 12,
    maxTouchPoints: 10,
    doNotTrack: null,
    plugins: [],
    mediaDevices: {
      audioInputs: 2,
      audioOutputs: 1,
      videoInputs: 3,
    },
    battery: {
      charging: true,
      chargingTime: 1800,
      dischargingTime: Infinity,
      level: 0.62,
    },
  },
};

// Timezone options for randomization
const TIMEZONES = [
  { name: "America/New_York", offset: 300 },
  { name: "America/Chicago", offset: 360 },
  { name: "America/Denver", offset: 420 },
  { name: "America/Los_Angeles", offset: 480 },
  { name: "Europe/London", offset: 0 },
  { name: "Europe/Paris", offset: -60 },
  { name: "Europe/Berlin", offset: -60 },
  { name: "Asia/Tokyo", offset: -540 },
  { name: "Asia/Singapore", offset: -480 },
  { name: "Australia/Sydney", offset: -660 },
];

// Screen resolution options for randomization
const SCREEN_RESOLUTIONS = [
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
  { width: 1680, height: 1050 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 3840, height: 2160 },
];

/**
 * Get all available profiles
 */
function getAllProfiles() {
  return Object.values(DEVICE_PROFILES);
}

/**
 * Get a specific profile by ID
 */
function getProfile(profileId) {
  return DEVICE_PROFILES[profileId] || null;
}

/**
 * Get profiles by category
 */
function getProfilesByCategory(category) {
  return getAllProfiles().filter((p) => p.category === category);
}

/**
 * Get a random profile, optionally filtered by category
 */
function getRandomProfile(category = null) {
  const profiles = category
    ? getProfilesByCategory(category)
    : getAllProfiles();
  if (profiles.length === 0) return null;
  return profiles[Math.floor(Math.random() * profiles.length)];
}

/**
 * Create a custom profile based on an existing one
 */
function createCustomProfile(baseProfileId, customizations = {}) {
  const base = getProfile(baseProfileId);
  if (!base) return null;

  return {
    ...base,
    ...customizations,
    id: customizations.id || `custom-${Date.now()}`,
    screen: {
      ...base.screen,
      ...(customizations.screen || {}),
    },
    webgl: {
      ...base.webgl,
      ...(customizations.webgl || {}),
    },
    mediaDevices: {
      ...base.mediaDevices,
      ...(customizations.mediaDevices || {}),
    },
  };
}

/**
 * Apply randomization to a profile
 * Makes slight variations to avoid detection from consistent fingerprints
 */
function randomizeProfile(profile) {
  const randomTimezone =
    TIMEZONES[Math.floor(Math.random() * TIMEZONES.length)];
  const randomResolution =
    SCREEN_RESOLUTIONS[Math.floor(Math.random() * SCREEN_RESOLUTIONS.length)];

  return {
    ...profile,
    id: `${profile.id}-${Date.now()}`,
    timezone: randomTimezone.name,
    timezoneOffset: randomTimezone.offset,
    screen: {
      ...profile.screen,
      width: randomResolution.width,
      height: randomResolution.height,
      availWidth: randomResolution.width,
      availHeight: randomResolution.height - 40,
    },
    // Slightly randomize hardware concurrency (within realistic bounds)
    hardwareConcurrency: Math.max(
      2,
      Math.min(
        16,
        profile.hardwareConcurrency + Math.floor(Math.random() * 5) - 2
      )
    ),
  };
}

module.exports = {
  DEVICE_PROFILES,
  getAllProfiles,
  getProfile,
  getProfilesByCategory,
  getRandomProfile,
  createCustomProfile,
  randomizeProfile,
};
