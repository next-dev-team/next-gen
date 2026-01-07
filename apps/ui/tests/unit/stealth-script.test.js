/**
 * Unit tests for Stealth Script Generator
 */

const {
  generateStealthScript,
  generateMinimalStealthScript,
} = require("../src/main/anti-detection/stealth-script");
const { getProfile } = require("../src/main/anti-detection/device-profiles");

describe("Stealth Script Generator", () => {
  describe("generateStealthScript()", () => {
    const testProfile = getProfile("chrome-win11");

    test("should generate a non-empty script", () => {
      const script = generateStealthScript(testProfile);
      expect(script).toBeTruthy();
      expect(typeof script).toBe("string");
      expect(script.length).toBeGreaterThan(1000);
    });

    test("should include IIFE wrapper", () => {
      const script = generateStealthScript(testProfile);
      expect(script).toContain("(function()");
      expect(script).toContain("'use strict'");
    });

    test("should prevent multiple injections", () => {
      const script = generateStealthScript(testProfile);
      expect(script).toContain("__STEALTH_INJECTED__");
    });

    test("should include profile data", () => {
      const script = generateStealthScript(testProfile);
      expect(script).toContain(testProfile.userAgent);
      expect(script).toContain(testProfile.platform);
    });

    test("should include navigator override", () => {
      const script = generateStealthScript(testProfile);
      expect(script).toContain("navigatorOverrides");
      expect(script).toContain("userAgent");
      expect(script).toContain("platform");
      expect(script).toContain("vendor");
      expect(script).toContain("hardwareConcurrency");
    });

    test("should include screen override", () => {
      const script = generateStealthScript(testProfile);
      expect(script).toContain("screenOverrides");
      expect(script).toContain("screen.width");
      expect(script).toContain("screen.height");
    });

    test("should include WebGL spoofing", () => {
      const script = generateStealthScript(testProfile);
      expect(script).toContain("WebGLRenderingContext");
      expect(script).toContain("getParameter");
      expect(script).toContain("UNMASKED_VENDOR_WEBGL");
      expect(script).toContain("UNMASKED_RENDERER_WEBGL");
    });

    test("should include canvas fingerprint noise", () => {
      const script = generateStealthScript(testProfile);
      expect(script).toContain("toDataURL");
      expect(script).toContain("toBlob");
      expect(script).toContain("addCanvasNoise");
    });

    test("should include timezone spoofing", () => {
      const script = generateStealthScript(testProfile);
      expect(script).toContain("DateTimeFormat");
      expect(script).toContain("getTimezoneOffset");
    });

    test("should include webdriver removal", () => {
      const script = generateStealthScript(testProfile);
      expect(script).toContain("navigator.webdriver");
    });

    test("should remove Electron globals", () => {
      const script = generateStealthScript(testProfile);
      expect(script).toContain("delete window.process");
      expect(script).toContain("delete window.require");
      expect(script).toContain("delete window.module");
    });

    test("should include permission spoofing", () => {
      const script = generateStealthScript(testProfile);
      expect(script).toContain("permissions.query");
    });

    test("should include battery API spoofing when profile has battery", () => {
      const script = generateStealthScript(testProfile);
      if (testProfile.battery) {
        expect(script).toContain("getBattery");
      }
    });

    test("should include mediaDevices spoofing", () => {
      const script = generateStealthScript(testProfile);
      expect(script).toContain("enumerateDevices");
    });

    test("should include function toString spoofing", () => {
      const script = generateStealthScript(testProfile);
      expect(script).toContain("Function.prototype.toString");
      expect(script).toContain("[native code]");
    });

    test("should work with mobile profiles", () => {
      const mobileProfile = getProfile("chrome-android");
      const script = generateStealthScript(mobileProfile);

      expect(script).toBeTruthy();
      expect(script).toContain(mobileProfile.userAgent);
      expect(script).toContain("Android");
    });

    test("should work with Firefox profile (different vendor)", () => {
      const firefoxProfile = getProfile("firefox-win11");
      const script = generateStealthScript(firefoxProfile);

      expect(script).toBeTruthy();
      expect(script).toContain("Firefox");
    });

    test("should work with Safari profile", () => {
      const safariProfile = getProfile("safari-macos");
      const script = generateStealthScript(safariProfile);

      expect(script).toBeTruthy();
      expect(script).toContain(safariProfile.vendor);
    });
  });

  describe("generateMinimalStealthScript()", () => {
    const testProfile = getProfile("chrome-win11");

    test("should generate a shorter script than full version", () => {
      const fullScript = generateStealthScript(testProfile);
      const minimalScript = generateMinimalStealthScript(testProfile);

      expect(minimalScript).toBeTruthy();
      expect(minimalScript.length).toBeLessThan(fullScript.length);
    });

    test("should include essential overrides", () => {
      const script = generateMinimalStealthScript(testProfile);

      expect(script).toContain("userAgent");
      expect(script).toContain("platform");
      expect(script).toContain("webdriver");
    });

    test("should remove Electron globals", () => {
      const script = generateMinimalStealthScript(testProfile);

      expect(script).toContain("delete window.process");
      expect(script).toContain("delete window.require");
    });

    test("should prevent multiple injections", () => {
      const script = generateMinimalStealthScript(testProfile);
      expect(script).toContain("__STEALTH_MINIMAL__");
    });
  });

  describe("Script Validity", () => {
    test("generated script should be valid JavaScript", () => {
      const testProfile = getProfile("chrome-win11");
      const script = generateStealthScript(testProfile);

      // This will throw if syntax is invalid
      expect(() => new Function(script)).not.toThrow();
    });

    test("minimal script should be valid JavaScript", () => {
      const testProfile = getProfile("chrome-win11");
      const script = generateMinimalStealthScript(testProfile);

      expect(() => new Function(script)).not.toThrow();
    });

    test("script should work with all profiles", () => {
      const {
        getAllProfiles,
      } = require("../src/main/anti-detection/device-profiles");
      const profiles = getAllProfiles();

      profiles.forEach((profile) => {
        const script = generateStealthScript(profile);
        expect(() => new Function(script)).not.toThrow();
      });
    });
  });
});

describe("Stealth Script Content Analysis", () => {
  const testProfile = getProfile("chrome-win11");
  const script = generateStealthScript(testProfile);

  test("should override all critical navigator properties", () => {
    const criticalProperties = [
      "userAgent",
      "appVersion",
      "platform",
      "vendor",
      "language",
      "languages",
      "hardwareConcurrency",
      "maxTouchPoints",
    ];

    criticalProperties.forEach((prop) => {
      expect(script).toContain(prop);
    });
  });

  test("should override screen dimensions", () => {
    expect(script).toContain("screen.width");
    expect(script).toContain("screen.height");
    expect(script).toContain("availWidth");
    expect(script).toContain("availHeight");
    expect(script).toContain("colorDepth");
    expect(script).toContain("pixelDepth");
    expect(script).toContain("devicePixelRatio");
  });

  test("should handle WebGL parameters", () => {
    // UNMASKED_VENDOR_WEBGL = 37445
    // UNMASKED_RENDERER_WEBGL = 37446
    expect(script).toContain("37445");
    expect(script).toContain("37446");
  });

  test("should include plugin spoofing", () => {
    expect(script).toContain("plugins");
    expect(script).toContain("Chrome PDF Viewer");
  });

  test("should include hasOwnProperty override for detection bypass", () => {
    expect(script).toContain("hasOwnProperty");
    expect(script).toContain("__webdriver");
  });

  test("should mask console.debug for detection script bypass", () => {
    expect(script).toContain("console.debug");
  });
});
