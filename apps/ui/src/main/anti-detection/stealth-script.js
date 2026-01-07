/**
 * Anti-Detection Stealth Script
 * Injects into BrowserView to mask automation signals and spoof fingerprints
 * Based on puppeteer-extra-plugin-stealth techniques
 */

/**
 * Generate the stealth JavaScript code based on a device profile
 * @param {Object} profile - The device profile to apply
 * @returns {string} - JavaScript code to inject
 */
function generateStealthScript(profile) {
  return `
(function() {
  'use strict';
  
  // Prevent multiple injections
  if (window.__STEALTH_INJECTED__) return;
  window.__STEALTH_INJECTED__ = true;

  const PROFILE = ${JSON.stringify(profile)};

  // ============================================
  // 1. Override navigator properties
  // ============================================
  
  const navigatorOverrides = {
    userAgent: PROFILE.userAgent,
    appVersion: PROFILE.appVersion,
    platform: PROFILE.platform,
    vendor: PROFILE.vendor,
    language: PROFILE.language,
    languages: PROFILE.languages,
    hardwareConcurrency: PROFILE.hardwareConcurrency,
    maxTouchPoints: PROFILE.maxTouchPoints,
  };
  
  if (PROFILE.deviceMemory !== undefined) {
    navigatorOverrides.deviceMemory = PROFILE.deviceMemory;
  }
  
  if (PROFILE.oscpu !== undefined) {
    navigatorOverrides.oscpu = PROFILE.oscpu;
  }
  
  if (PROFILE.doNotTrack !== undefined) {
    navigatorOverrides.doNotTrack = PROFILE.doNotTrack;
  }

  // Create a proxy for navigator
  const originalNavigator = window.navigator;
  const navigatorProxy = new Proxy(originalNavigator, {
    get: function(target, prop) {
      if (prop in navigatorOverrides) {
        return navigatorOverrides[prop];
      }
      const value = target[prop];
      if (typeof value === 'function') {
        return value.bind(target);
      }
      return value;
    },
    has: function(target, prop) {
      return prop in navigatorOverrides || prop in target;
    }
  });
  
  try {
    Object.defineProperty(window, 'navigator', {
      get: () => navigatorProxy,
      configurable: false
    });
  } catch (e) {}

  // ============================================
  // 2. Override screen properties
  // ============================================
  
  if (PROFILE.screen) {
    const screenOverrides = {
      width: PROFILE.screen.width,
      height: PROFILE.screen.height,
      availWidth: PROFILE.screen.availWidth,
      availHeight: PROFILE.screen.availHeight,
      colorDepth: PROFILE.screen.colorDepth,
      pixelDepth: PROFILE.screen.pixelDepth,
    };
    
    const originalScreen = window.screen;
    const screenProxy = new Proxy(originalScreen, {
      get: function(target, prop) {
        if (prop in screenOverrides) {
          return screenOverrides[prop];
        }
        const value = target[prop];
        if (typeof value === 'function') {
          return value.bind(target);
        }
        return value;
      }
    });
    
    try {
      Object.defineProperty(window, 'screen', {
        get: () => screenProxy,
        configurable: false
      });
    } catch (e) {}
    
    // Override devicePixelRatio
    if (PROFILE.screen.devicePixelRatio) {
      try {
        Object.defineProperty(window, 'devicePixelRatio', {
          get: () => PROFILE.screen.devicePixelRatio,
          configurable: false
        });
      } catch (e) {}
    }
    
    // Override innerWidth/innerHeight
    try {
      Object.defineProperty(window, 'innerWidth', {
        get: () => PROFILE.screen.availWidth,
        configurable: false
      });
      Object.defineProperty(window, 'innerHeight', {
        get: () => PROFILE.screen.availHeight,
        configurable: false
      });
      Object.defineProperty(window, 'outerWidth', {
        get: () => PROFILE.screen.width,
        configurable: false
      });
      Object.defineProperty(window, 'outerHeight', {
        get: () => PROFILE.screen.height,
        configurable: false
      });
    } catch (e) {}
  }

  // ============================================
  // 3. WebGL Fingerprint Spoofing
  // ============================================
  
  if (PROFILE.webgl) {
    const getParameterProxyHandler = {
      apply: function(target, thisArg, args) {
        const param = args[0];
        const gl = thisArg;
        
        // UNMASKED_VENDOR_WEBGL
        if (param === 37445) {
          return PROFILE.webgl.unmaskedVendor || PROFILE.webgl.vendor;
        }
        // UNMASKED_RENDERER_WEBGL
        if (param === 37446) {
          return PROFILE.webgl.unmaskedRenderer || PROFILE.webgl.renderer;
        }
        // VENDOR
        if (param === 0x1F00) {
          return PROFILE.webgl.vendor;
        }
        // RENDERER
        if (param === 0x1F01) {
          return PROFILE.webgl.renderer;
        }
        
        return target.apply(thisArg, args);
      }
    };
    
    // Override WebGLRenderingContext
    if (typeof WebGLRenderingContext !== 'undefined') {
      const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = new Proxy(originalGetParameter, getParameterProxyHandler);
    }
    
    // Override WebGL2RenderingContext
    if (typeof WebGL2RenderingContext !== 'undefined') {
      const originalGetParameter2 = WebGL2RenderingContext.prototype.getParameter;
      WebGL2RenderingContext.prototype.getParameter = new Proxy(originalGetParameter2, getParameterProxyHandler);
    }
  }

  // ============================================
  // 4. Canvas Fingerprint Noise
  // ============================================
  
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const originalToBlob = HTMLCanvasElement.prototype.toBlob;
  const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
  
  // Add subtle noise to canvas to prevent fingerprinting while keeping it functional
  function addCanvasNoise(canvas) {
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const imageData = originalGetImageData.call(ctx, 0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Add very subtle noise (imperceptible but changes fingerprint)
      const noise = Math.floor(Math.random() * 10);
      for (let i = 0; i < data.length; i += 4) {
        // Only modify some pixels slightly
        if (Math.random() < 0.01) {
          data[i] = (data[i] + noise) % 256;     // R
          data[i + 1] = (data[i + 1] + noise) % 256; // G
          data[i + 2] = (data[i + 2] + noise) % 256; // B
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
    } catch (e) {}
  }
  
  HTMLCanvasElement.prototype.toDataURL = function(...args) {
    addCanvasNoise(this);
    return originalToDataURL.apply(this, args);
  };
  
  HTMLCanvasElement.prototype.toBlob = function(...args) {
    addCanvasNoise(this);
    return originalToBlob.apply(this, args);
  };

  // ============================================
  // 5. Timezone Spoofing
  // ============================================
  
  if (PROFILE.timezone) {
    const originalDateTimeFormat = Intl.DateTimeFormat;
    Intl.DateTimeFormat = function(...args) {
      if (args.length === 0 || !args[1] || !args[1].timeZone) {
        args[1] = { ...args[1], timeZone: PROFILE.timezone };
      }
      return new originalDateTimeFormat(...args);
    };
    Intl.DateTimeFormat.prototype = originalDateTimeFormat.prototype;
    
    // Override Date.prototype.getTimezoneOffset
    if (PROFILE.timezoneOffset !== undefined) {
      Date.prototype.getTimezoneOffset = function() {
        return PROFILE.timezoneOffset;
      };
    }
  }

  // ============================================
  // 6. Plugin Spoofing
  // ============================================
  
  if (PROFILE.plugins && PROFILE.plugins.length > 0) {
    const fakePlugins = PROFILE.plugins.map(p => ({
      name: p.name,
      filename: p.filename,
      description: p.description,
      length: 1,
      item: function(i) { return this; },
      namedItem: function(name) { return this; },
      [Symbol.iterator]: function*() { yield this; }
    }));
    
    const pluginArray = {
      length: fakePlugins.length,
      item: function(i) { return fakePlugins[i] || null; },
      namedItem: function(name) { return fakePlugins.find(p => p.name === name) || null; },
      refresh: function() {},
      [Symbol.iterator]: function*() { for (const p of fakePlugins) yield p; }
    };
    
    // Add index access
    fakePlugins.forEach((p, i) => { pluginArray[i] = p; });
    
    try {
      Object.defineProperty(navigator, 'plugins', {
        get: () => pluginArray,
        configurable: false
      });
    } catch (e) {}
  }

  // ============================================
  // 7. Remove Automation Flags
  // ============================================
  
  // Remove webdriver property
  try {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
      configurable: true
    });
    delete navigator.webdriver;
  } catch (e) {}
  
  // Remove chrome automation flags
  if (window.chrome) {
    window.chrome.runtime = undefined;
  }
  
  // Remove Electron-specific properties
  delete window.process;
  delete window.require;
  delete window.module;
  delete window.__dirname;
  delete window.__filename;
  
  // ============================================
  // 8. Permission API Spoofing
  // ============================================
  
  if (navigator.permissions) {
    const originalQuery = navigator.permissions.query;
    navigator.permissions.query = function(parameters) {
      // Return granted for notifications to appear more like a real browser
      if (parameters.name === 'notifications') {
        return Promise.resolve({ state: 'prompt', onchange: null });
      }
      return originalQuery.call(this, parameters);
    };
  }

  // ============================================
  // 9. Battery API Spoofing
  // ============================================
  
  if (PROFILE.battery && navigator.getBattery) {
    navigator.getBattery = function() {
      return Promise.resolve({
        charging: PROFILE.battery.charging,
        chargingTime: PROFILE.battery.chargingTime,
        dischargingTime: PROFILE.battery.dischargingTime,
        level: PROFILE.battery.level,
        addEventListener: function() {},
        removeEventListener: function() {}
      });
    };
  }

  // ============================================
  // 10. MediaDevices Spoofing
  // ============================================
  
  if (PROFILE.mediaDevices && navigator.mediaDevices) {
    const originalEnumerateDevices = navigator.mediaDevices.enumerateDevices;
    navigator.mediaDevices.enumerateDevices = async function() {
      const fakeDevices = [];
      const deviceTypes = ['audioinput', 'audiooutput', 'videoinput'];
      
      deviceTypes.forEach(kind => {
        const count = PROFILE.mediaDevices[kind] || 0;
        for (let i = 0; i < count; i++) {
          fakeDevices.push({
            deviceId: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 16),
            kind: kind,
            label: '',  // Empty for privacy (mimics real behavior without permission)
            groupId: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 16)
          });
        }
      });
      
      return fakeDevices;
    };
  }

  // ============================================
  // 11. Disable Automation Detection Scripts
  // ============================================
  
  // Override some common detection methods
  const originalHasOwnProperty = Object.prototype.hasOwnProperty;
  Object.prototype.hasOwnProperty = function(prop) {
    if (prop === 'webdriver' || prop === '__webdriver_script_fn' || prop === '__driver_evaluate' || prop === '__webdriver_evaluate') {
      return false;
    }
    return originalHasOwnProperty.call(this, prop);
  };

  // ============================================
  // 12. Console.debug hiding
  // ============================================
  
  // Some detection scripts log to console.debug - mask it
  const originalDebug = console.debug;
  console.debug = function(...args) {
    // Filter out detection script logs
    const str = args.join(' ').toLowerCase();
    if (str.includes('webdriver') || str.includes('automation') || str.includes('selenium') || str.includes('puppeteer')) {
      return;
    }
    return originalDebug.apply(console, args);
  };

  // ============================================
  // 13. Function.prototype.toString spoofing
  // ============================================
  
  // Make native function detection harder
  const originalFunctionToString = Function.prototype.toString;
  const nativeCodeString = 'function () { [native code] }';
  
  const overriddenFunctions = new Set([
    navigator.permissions?.query,
    navigator.mediaDevices?.enumerateDevices,
    navigator.getBattery,
    HTMLCanvasElement.prototype.toDataURL,
    HTMLCanvasElement.prototype.toBlob,
    WebGLRenderingContext?.prototype?.getParameter,
    WebGL2RenderingContext?.prototype?.getParameter,
  ].filter(Boolean));
  
  Function.prototype.toString = function() {
    if (overriddenFunctions.has(this)) {
      return nativeCodeString;
    }
    return originalFunctionToString.call(this);
  };

  console.log('[Stealth] Anti-detection protection active');
})();
`;
}

/**
 * Generate a minimal stealth script for performance
 */
function generateMinimalStealthScript(profile) {
  return `
(function() {
  if (window.__STEALTH_MINIMAL__) return;
  window.__STEALTH_MINIMAL__ = true;

  // Essential overrides only
  const ua = ${JSON.stringify(profile.userAgent)};
  const platform = ${JSON.stringify(profile.platform)};
  
  Object.defineProperty(navigator, 'userAgent', { get: () => ua });
  Object.defineProperty(navigator, 'platform', { get: () => platform });
  Object.defineProperty(navigator, 'webdriver', { get: () => false });
  
  delete window.process;
  delete window.require;
  delete window.module;
})();
`;
}

module.exports = {
  generateStealthScript,
  generateMinimalStealthScript,
};
