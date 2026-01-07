/**
 * Unit tests for Anti-Detection Device Profiles
 */

const { test, expect } = require("@playwright/test");

const {
  DEVICE_PROFILES,
  getAllProfiles,
  getProfile,
  getProfilesByCategory,
  getRandomProfile,
  createCustomProfile,
  randomizeProfile,
} = require("../../src/main/anti-detection/device-profiles");

test.describe("Device Profiles", () => {
  test.describe("DEVICE_PROFILES", () => {
    test("should have at least 8 predefined profiles", () => {
      expect(Object.keys(DEVICE_PROFILES).length).toBeGreaterThanOrEqual(8);
    });

    test("each profile should have required properties", () => {
      Object.values(DEVICE_PROFILES).forEach((profile) => {
        expect(profile).toHaveProperty("id");
        expect(profile).toHaveProperty("name");
        expect(profile).toHaveProperty("category");
        expect(profile).toHaveProperty("userAgent");
        expect(profile).toHaveProperty("platform");
        expect(profile).toHaveProperty("vendor");
        expect(profile).toHaveProperty("languages");
        expect(profile).toHaveProperty("language");
        expect(profile).toHaveProperty("timezone");
        expect(profile).toHaveProperty("timezoneOffset");
        expect(profile).toHaveProperty("screen");
        expect(profile).toHaveProperty("webgl");
        expect(profile).toHaveProperty("hardwareConcurrency");
        expect(profile).toHaveProperty("maxTouchPoints");
        expect(profile).toHaveProperty("plugins");
        expect(profile).toHaveProperty("mediaDevices");
      });
    });

    test("should have desktop category profiles", () => {
      const desktopProfiles = Object.values(DEVICE_PROFILES).filter(
        (p) => p.category === "desktop"
      );
      expect(desktopProfiles.length).toBeGreaterThanOrEqual(5);
    });

    test("should have mobile category profiles", () => {
      const mobileProfiles = Object.values(DEVICE_PROFILES).filter(
        (p) => p.category === "mobile"
      );
      expect(mobileProfiles.length).toBeGreaterThanOrEqual(2);
    });

    test("screen properties should be valid", () => {
      Object.values(DEVICE_PROFILES).forEach((profile) => {
        expect(profile.screen.width).toBeGreaterThan(0);
        expect(profile.screen.height).toBeGreaterThan(0);
        expect(profile.screen.colorDepth).toBeGreaterThan(0);
        expect(profile.screen.devicePixelRatio).toBeGreaterThan(0);
      });
    });

    test("webgl properties should be defined", () => {
      Object.values(DEVICE_PROFILES).forEach((profile) => {
        expect(profile.webgl.vendor).toBeTruthy();
        expect(profile.webgl.renderer).toBeTruthy();
      });
    });

    test("mobile profiles should have touch points > 0", () => {
      const mobileProfiles = Object.values(DEVICE_PROFILES).filter(
        (p) => p.category === "mobile"
      );
      mobileProfiles.forEach((profile) => {
        expect(profile.maxTouchPoints).toBeGreaterThan(0);
      });
    });

    test("desktop profiles should have touch points = 0", () => {
      const desktopProfiles = Object.values(DEVICE_PROFILES).filter(
        (p) => p.category === "desktop"
      );
      desktopProfiles.forEach((profile) => {
        expect(profile.maxTouchPoints).toBe(0);
      });
    });
  });

  test.describe("getAllProfiles()", () => {
    test("should return array of all profiles", () => {
      const profiles = getAllProfiles();
      expect(Array.isArray(profiles)).toBe(true);
      expect(profiles.length).toBe(Object.keys(DEVICE_PROFILES).length);
    });
  });

  test.describe("getProfile()", () => {
    test("should return profile by ID", () => {
      const profile = getProfile("chrome-win11");
      expect(profile).toBeTruthy();
      expect(profile.id).toBe("chrome-win11");
      expect(profile.userAgent).toContain("Chrome");
    });

    test("should return null for non-existent profile", () => {
      const profile = getProfile("non-existent-profile");
      expect(profile).toBeNull();
    });
  });

  test.describe("getProfilesByCategory()", () => {
    test("should return desktop profiles", () => {
      const profiles = getProfilesByCategory("desktop");
      expect(profiles.length).toBeGreaterThan(0);
      profiles.forEach((p) => {
        expect(p.category).toBe("desktop");
      });
    });

    test("should return mobile profiles", () => {
      const profiles = getProfilesByCategory("mobile");
      expect(profiles.length).toBeGreaterThan(0);
      profiles.forEach((p) => {
        expect(p.category).toBe("mobile");
      });
    });

    test("should return empty array for unknown category", () => {
      const profiles = getProfilesByCategory("unknown");
      expect(profiles).toEqual([]);
    });
  });

  test.describe("getRandomProfile()", () => {
    test("should return a random profile", () => {
      const profile = getRandomProfile();
      expect(profile).toBeTruthy();
      expect(profile.id).toBeTruthy();
    });

    test("should return profile from specified category", () => {
      const profile = getRandomProfile("mobile");
      expect(profile.category).toBe("mobile");
    });
  });

  test.describe("createCustomProfile()", () => {
    test("should create custom profile from base", () => {
      const custom = createCustomProfile("chrome-win11", {
        id: "custom-test",
        timezone: "Europe/London",
      });

      expect(custom).toBeTruthy();
      expect(custom.id).toBe("custom-test");
      expect(custom.timezone).toBe("Europe/London");
      // Should inherit base properties
      expect(custom.userAgent).toContain("Chrome");
    });

    test("should merge screen customizations", () => {
      const custom = createCustomProfile("chrome-win11", {
        screen: { width: 3840, height: 2160 },
      });

      expect(custom.screen.width).toBe(3840);
      expect(custom.screen.height).toBe(2160);
      // Should keep other screen properties from base
      expect(custom.screen.colorDepth).toBeTruthy();
    });

    test("should return null for non-existent base profile", () => {
      const custom = createCustomProfile("non-existent", {});
      expect(custom).toBeNull();
    });
  });

  test.describe("randomizeProfile()", () => {
    test("should return profile with randomized properties", () => {
      const base = getProfile("chrome-win11");
      const randomized = randomizeProfile(base);

      expect(randomized).toBeTruthy();
      expect(randomized.id).not.toBe(base.id); // ID should change
      expect(randomized.timezone).toBeTruthy();
      expect(randomized.screen).toBeTruthy();
    });

    test("should keep base profile structure", () => {
      const base = getProfile("firefox-win11");
      const randomized = randomizeProfile(base);

      expect(randomized.userAgent).toBe(base.userAgent);
      expect(randomized.platform).toBe(base.platform);
      expect(randomized.webgl).toEqual(base.webgl);
    });
  });
});

test.describe("Profile Content Validation", () => {
  test.describe("Chrome profiles", () => {
    test("chrome-win11 should have valid Windows Chrome UA", () => {
      const profile = getProfile("chrome-win11");
      expect(profile.userAgent).toContain("Windows NT 10.0");
      expect(profile.userAgent).toContain("Chrome");
      expect(profile.userAgent).not.toContain("Edg");
      expect(profile.platform).toBe("Win32");
    });

    test("chrome-macos should have valid macOS Chrome UA", () => {
      const profile = getProfile("chrome-macos");
      expect(profile.userAgent).toContain("Macintosh");
      expect(profile.userAgent).toContain("Chrome");
      expect(profile.platform).toBe("MacIntel");
    });

    test("chrome-linux should have valid Linux Chrome UA", () => {
      const profile = getProfile("chrome-linux");
      expect(profile.userAgent).toContain("Linux x86_64");
      expect(profile.userAgent).toContain("Chrome");
    });

    test("chrome-android should have valid Android UA", () => {
      const profile = getProfile("chrome-android");
      expect(profile.userAgent).toContain("Android");
      expect(profile.userAgent).toContain("Mobile");
      expect(profile.category).toBe("mobile");
    });
  });

  test.describe("Firefox profiles", () => {
    test("firefox-win11 should have valid Firefox UA", () => {
      const profile = getProfile("firefox-win11");
      expect(profile.userAgent).toContain("Firefox");
      expect(profile.userAgent).toContain("Gecko");
      expect(profile.vendor).toBe("");
    });
  });

  test.describe("Safari profiles", () => {
    test("safari-macos should have valid Safari UA", () => {
      const profile = getProfile("safari-macos");
      expect(profile.userAgent).toContain("Safari");
      expect(profile.userAgent).toContain("Version");
      expect(profile.userAgent).not.toContain("Chrome");
      expect(profile.vendor).toBe("Apple Computer, Inc.");
    });

    test("safari-ios should have valid iOS Safari UA", () => {
      const profile = getProfile("safari-ios");
      expect(profile.userAgent).toContain("iPhone");
      expect(profile.userAgent).toContain("Safari");
      expect(profile.platform).toBe("iPhone");
      expect(profile.category).toBe("mobile");
    });
  });

  test.describe("Edge profiles", () => {
    test("edge-win11 should have valid Edge UA", () => {
      const profile = getProfile("edge-win11");
      expect(profile.userAgent).toContain("Edg");
      expect(profile.userAgent).toContain("Chrome");
    });
  });
});
