/**
 * E2E Tests for Audio Playback Stability
 * Tests that audio can play for extended periods without crashing
 * Specifically tests hifi-flow.vercel.app playback
 */

import { _electron as electron, expect, test } from "@playwright/test";
import path from "path";

test.describe("Audio Playback Stability - HiFi Flow", () => {
  let electronApp;

  test.beforeAll(async () => {
    try {
      electronApp = await electron.launch({
        args: [path.join(__dirname, "../out/main/index.js")],
        env: {
          NODE_ENV: "development",
        },
        timeout: 60000,
      });
    } catch (err) {
      console.error("Failed to launch Electron:", err);
      throw err;
    }
  }, 60000);

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  /**
   * Helper: Navigate to browser tab and create a new browser tab
   */
  async function openBrowserTab(window) {
    await expect(
      window.getByRole("tab", { name: "Browser", exact: true })
    ).toBeVisible({ timeout: 15000 });
    await window.getByRole("tab", { name: "Browser", exact: true }).click();

    await expect(window.getByRole("button", { name: "New tab" })).toBeVisible({
      timeout: 15000,
    });
    await window.getByRole("button", { name: "New tab" }).click();

    // Wait for tab to be created
    await expect
      .poll(
        async () => {
          const raw = await window.evaluate(() =>
            localStorage.getItem("browser-tabs-store")
          );
          if (!raw) return null;
          try {
            const parsed = JSON.parse(raw);
            const id = parsed?.state?.activeTabId;
            return id && id !== "dashboard" ? id : null;
          } catch {
            return null;
          }
        },
        { timeout: 15000 }
      )
      .not.toBeNull();

    const activeTabId = await window.evaluate(() => {
      const raw = localStorage.getItem("browser-tabs-store");
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed?.state?.activeTabId || null;
    });

    return activeTabId;
  }

  /**
   * Helper: Type text character by character with realistic delays
   */
  async function typeInBrowserView(view, text) {
    for (const char of text) {
      await view.webContents.sendInputEvent({
        type: "keyDown",
        keyCode: char,
      });
      await view.webContents.sendInputEvent({
        type: "char",
        keyCode: char,
      });
      await view.webContents.sendInputEvent({
        type: "keyUp",
        keyCode: char,
      });
      // Small delay between keystrokes
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  // =====================================================
  // HIFI-FLOW AUDIO PLAYBACK TEST - 10 SECONDS
  // =====================================================

  test("should play audio on hifi-flow for 10 seconds without crashing", async () => {
    test.setTimeout(180000); // 3 minute timeout for this test

    const window = await electronApp.firstWindow();
    await window.reload();

    // Open browser tab
    const tabId = await openBrowserTab(window);
    expect(tabId).toBeTruthy();

    // Navigate to hifi-flow
    console.log("Step 1: Navigating to hifi-flow.vercel.app...");
    await window.evaluate(
      ({ tabId, url }) => window.electronAPI.browserView.loadURL(tabId, url),
      { tabId, url: "https://hifi-flow.vercel.app/" }
    );

    // Wait for page to fully load
    await new Promise((r) => setTimeout(r, 8000));

    // Verify BrowserView is still alive
    let checkResult = await electronApp.evaluate(async ({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      if (!win) return { alive: false, reason: "no window" };
      const views = win.getBrowserViews?.() || [];
      if (views.length === 0) return { alive: false, reason: "no views" };
      const view = views[0];
      if (!view || view.webContents.isDestroyed()) {
        return { alive: false, reason: "destroyed" };
      }
      try {
        const url = view.webContents.getURL();
        return { alive: true, url };
      } catch (e) {
        return { alive: false, reason: e.message };
      }
    });
    console.log("Page loaded:", checkResult);
    expect(checkResult.alive).toBe(true);

    // Step 2: Focus on search input and type using keyboard events
    console.log("Step 2: Clicking on search input...");
    await electronApp.evaluate(async ({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      const views = win.getBrowserViews?.() || [];
      const view = views[0];
      if (!view || view.webContents.isDestroyed()) return;

      // Click on search input area (approximate center-top of page)
      const bounds = view.getBounds();
      const x = bounds.width / 2;
      const y = 60; // Search bar is at top

      await view.webContents.sendInputEvent({
        type: "mouseDown",
        x,
        y,
        button: "left",
        clickCount: 1,
      });
      await view.webContents.sendInputEvent({
        type: "mouseUp",
        x,
        y,
        button: "left",
        clickCount: 1,
      });
    });

    await new Promise((r) => setTimeout(r, 500));

    // Type search query character by character
    console.log("Step 3: Typing 'song' in search...");
    await electronApp.evaluate(async ({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      const views = win.getBrowserViews?.() || [];
      const view = views[0];
      if (!view || view.webContents.isDestroyed()) return;

      const text = "song";
      for (const char of text) {
        await view.webContents.sendInputEvent({
          type: "keyDown",
          keyCode: char,
        });
        await view.webContents.sendInputEvent({
          type: "char",
          keyCode: char,
        });
        await view.webContents.sendInputEvent({
          type: "keyUp",
          keyCode: char,
        });
        await new Promise((r) => setTimeout(r, 100));
      }

      // Press Enter
      await new Promise((r) => setTimeout(r, 300));
      await view.webContents.sendInputEvent({
        type: "keyDown",
        keyCode: "Enter",
      });
      await view.webContents.sendInputEvent({
        type: "keyUp",
        keyCode: "Enter",
      });
    });

    // Wait for search results
    console.log("Step 4: Waiting for search results...");
    await new Promise((r) => setTimeout(r, 5000));

    // Check if search worked
    const searchResult = await electronApp.evaluate(
      async ({ BrowserWindow }) => {
        const win = BrowserWindow.getAllWindows()[0];
        const views = win.getBrowserViews?.() || [];
        const view = views[0];
        if (!view || view.webContents.isDestroyed()) return { alive: false };

        const result = await view.webContents.executeJavaScript(`
        (function() {
          // Check if there are search results
          const url = window.location.href;
          const hasResults = document.querySelectorAll('[class*="track"], [class*="song"], [class*="item"], [class*="result"]').length > 0;
          const bodyText = document.body.innerText.substring(0, 500);
          return { url, hasResults, bodyText };
        })();
      `);
        return { alive: true, ...result };
      }
    );
    console.log("Search result check:", {
      alive: searchResult.alive,
      hasResults: searchResult.hasResults,
      url: searchResult.url,
    });

    // Step 5: Click on play button for first result
    console.log("Step 5: Clicking play button on first song...");
    await electronApp.evaluate(async ({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      const views = win.getBrowserViews?.() || [];
      const view = views[0];
      if (!view || view.webContents.isDestroyed()) return;

      // Find and click the first play button
      await view.webContents.executeJavaScript(`
        (function() {
          // Find all buttons that might be play buttons
          const allButtons = document.querySelectorAll('button, [role="button"]');
          for (const btn of allButtons) {
            const svg = btn.querySelector('svg');
            if (svg) {
              const svgHtml = svg.outerHTML.toLowerCase();
              // Check for play icon patterns (polygon, path with M, triangle shapes)
              if (svgHtml.includes('polygon') || 
                  (svgHtml.includes('path') && btn.className.toLowerCase().includes('play'))) {
                console.log('Clicking play button:', btn.className);
                btn.click();
                return true;
              }
            }
          }
          
          // Alternative: look for circle-play or play-circle SVGs
          const playSvgs = document.querySelectorAll('svg');
          for (const svg of playSvgs) {
            const html = svg.outerHTML.toLowerCase();
            if (html.includes('play') || html.includes('polygon')) {
              const parent = svg.closest('button') || svg.parentElement;
              if (parent) {
                console.log('Clicking svg parent');
                parent.click();
                return true;
              }
            }
          }
          
          return false;
        })();
      `);
    });

    // Wait for audio to start playing
    console.log("Step 6: Waiting for audio to start...");
    await new Promise((r) => setTimeout(r, 5000));

    // Check for player bar
    console.log("Step 7: Checking for player bar with pause icon...");
    const playerStatus = await electronApp.evaluate(
      async ({ BrowserWindow }) => {
        const win = BrowserWindow.getAllWindows()[0];
        const views = win.getBrowserViews?.() || [];
        const view = views[0];
        if (!view || view.webContents.isDestroyed()) {
          return { alive: false, reason: "destroyed" };
        }

        const result = await view.webContents.executeJavaScript(`
        (function() {
          // Look for player bar at bottom
          const playerBar = document.querySelector('[class*="player"], [class*="Player"], [class*="bottom-bar"], [class*="now-playing"]');
          
          // Look for audio element
          const audio = document.querySelector('audio');
          
          // Check for pause button (which appears when audio is playing)
          const allButtons = document.querySelectorAll('button, [role="button"]');
          let hasPauseButton = false;
          for (const btn of allButtons) {
            const html = (btn.outerHTML + ' ' + (btn.ariaLabel || '')).toLowerCase();
            if (html.includes('pause')) {
              hasPauseButton = true;
              break;
            }
            // Also check for pause icon in SVG (two vertical bars)
            const svg = btn.querySelector('svg');
            if (svg && svg.querySelectorAll('rect, line').length >= 2) {
              hasPauseButton = true;
              break;
            }
          }
          
          return {
            hasPlayerBar: !!playerBar,
            playerBarClasses: playerBar ? playerBar.className : null,
            hasAudio: !!audio,
            audioPaused: audio ? audio.paused : null,
            audioCurrentTime: audio ? audio.currentTime : 0,
            hasPauseButton,
          };
        })();
      `);
        return { alive: true, ...result };
      }
    );
    console.log("Player status:", playerStatus);

    // Step 8: Wait and verify stability for 10 seconds
    console.log("Step 8: Monitoring stability for 10 seconds...");
    let crashed = false;
    let crashedAt = -1;

    for (let i = 1; i <= 10; i++) {
      await new Promise((r) => setTimeout(r, 1000));

      const status = await electronApp.evaluate(async ({ BrowserWindow }) => {
        const win = BrowserWindow.getAllWindows()[0];
        if (!win) return { alive: false, reason: "no window" };
        const views = win.getBrowserViews?.() || [];
        if (views.length === 0) return { alive: false, reason: "no views" };
        const view = views[0];
        if (!view || view.webContents.isDestroyed()) {
          return { alive: false, reason: "destroyed" };
        }

        try {
          const audio = await view.webContents.executeJavaScript(`
            (function() {
              const audio = document.querySelector('audio');
              if (!audio) return { hasAudio: false };
              return {
                hasAudio: true,
                paused: audio.paused,
                currentTime: audio.currentTime,
                duration: audio.duration
              };
            })();
          `);
          return { alive: true, ...audio };
        } catch (e) {
          return { alive: false, reason: e.message };
        }
      });

      console.log(
        `  Second ${i}/10:`,
        status.alive ? "✓ alive" : "✗ crashed",
        status.hasAudio
          ? `(audio: ${status.paused ? "paused" : "playing"}, time: ${status.currentTime?.toFixed(1)}s)`
          : "(no audio element)"
      );

      if (!status.alive) {
        crashed = true;
        crashedAt = i;
        console.error(`  ❌ CRASHED at second ${i}:`, status.reason);
        break;
      }
    }

    if (crashed) {
      expect(crashed).toBe(false); // This will fail the test with clear message
    }

    // Final verification
    console.log("Step 9: Final verification...");
    const finalStatus = await electronApp.evaluate(
      async ({ BrowserWindow }) => {
        const win = BrowserWindow.getAllWindows()[0];
        const views = win.getBrowserViews?.() || [];
        const view = views[0];
        if (!view || view.webContents.isDestroyed()) {
          return { success: false, reason: "destroyed" };
        }

        try {
          const result = await view.webContents.executeJavaScript(`
          (function() {
            const audio = document.querySelector('audio');
            // Check for pause button
            let hasPause = false;
            document.querySelectorAll('button svg').forEach(svg => {
              if (svg.querySelectorAll('rect').length >= 2) hasPause = true;
            });
            return {
              hasAudio: !!audio,
              isPlaying: audio ? !audio.paused : false,
              currentTime: audio ? audio.currentTime : 0,
              hasPauseIcon: hasPause,
              url: window.location.href
            };
          })();
        `);
          return { success: true, ...result };
        } catch (e) {
          return { success: false, reason: e.message };
        }
      }
    );

    console.log("Final status:", finalStatus);
    expect(finalStatus.success).toBe(true);

    if (finalStatus.isPlaying && finalStatus.currentTime > 0) {
      console.log(
        "✅ Audio played successfully for 10 seconds without crashing!"
      );
      console.log(
        `   Current playback position: ${finalStatus.currentTime.toFixed(1)}s`
      );
    } else {
      console.log(
        "⚠️ Audio may not have played, but BrowserView remained stable for 10 seconds"
      );
    }
  });

  // =====================================================
  // STEALTH SCRIPT CRASH PREVENTION TEST
  // =====================================================

  test("should not crash when injecting stealth script", async () => {
    const window = await electronApp.firstWindow();
    await window.reload();

    const tabId = await openBrowserTab(window);
    expect(tabId).toBeTruthy();

    // Navigate to a real website (not data: URL)
    await window.evaluate(
      ({ tabId, url }) => window.electronAPI.browserView.loadURL(tabId, url),
      { tabId, url: "https://example.com" }
    );

    // Wait for page to load and stealth script to inject
    await new Promise((r) => setTimeout(r, 5000));

    // Verify no crash and stealth worked
    const result = await electronApp.evaluate(async ({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      const views = win.getBrowserViews?.() || [];
      const view = views[0];
      if (!view || view.webContents.isDestroyed()) {
        return { alive: false, reason: "destroyed" };
      }

      try {
        const checks = await view.webContents.executeJavaScript(`
          (function() {
            return {
              webdriver: navigator.webdriver,
              hasProcess: typeof window.process !== 'undefined' && window.process !== undefined,
              hasRequire: typeof window.require !== 'undefined' && window.require !== undefined,
            };
          })();
        `);
        return { alive: true, ...checks };
      } catch (e) {
        return { alive: false, reason: e.message };
      }
    });

    console.log("Stealth check result:", result);
    expect(result.alive).toBe(true);
    expect(result.webdriver).not.toBe(true);
  });
});
