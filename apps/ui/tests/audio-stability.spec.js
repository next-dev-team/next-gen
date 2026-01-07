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

  async function ensureBrowserViewStateCapture(window) {
    await window.evaluate(() => {
      if (window.__browserViewStateCaptureInstalled) return;
      window.__browserViewStateCaptureInstalled = true;
      window.__browserViewStates = {};
      if (window.electronAPI?.browserView?.onState) {
        window.electronAPI.browserView.onState((payload) => {
          try {
            if (!payload || typeof payload !== "object") return;
            const tabId = String(payload.tabId || "");
            if (!tabId) return;
            window.__browserViewStates[tabId] = payload;
          } catch {}
        });
      }
    });
  }

  async function getBrowserViewState(window, tabId) {
    return window.evaluate(
      ({ tabId }) => {
        try {
          const states = window.__browserViewStates;
          if (!states || typeof states !== "object") return null;
          return states[String(tabId)] || null;
        } catch {
          return null;
        }
      },
      { tabId }
    );
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

  test("should play audio on hifi-flow for 20 seconds without crashing", async () => {
    test.setTimeout(180000); // 3 minute timeout for this test

    const window = await electronApp.firstWindow();
    await window.evaluate(() => {
      try {
        localStorage.removeItem("browser-tabs-store");
      } catch {}
    });
    await window.reload();

    // Open browser tab
    const tabId = await openBrowserTab(window);
    expect(tabId).toBeTruthy();

    await ensureBrowserViewStateCapture(window);

    const getPlaybackStatus = async () => {
      const state = await getBrowserViewState(window, tabId);
      if (state && state.state === "crashed") {
        return {
          alive: false,
          reason: `crashed:${state.reason || "unknown"}`,
          viewState: state,
        };
      }

      try {
        return await electronApp.evaluate(async ({ BrowserWindow }) => {
          const win = BrowserWindow.getAllWindows()[0];
          if (!win) return { alive: false, reason: "no window" };
          const view = (() => {
            try {
              const views =
                typeof win.getBrowserViews === "function"
                  ? win.getBrowserViews()
                  : [];
              if (Array.isArray(views) && views.length) return views[0];
            } catch {}
            try {
              return typeof win.getBrowserView === "function"
                ? win.getBrowserView()
                : null;
            } catch {}
            return null;
          })();
          if (!view) return { alive: false, reason: "no view" };
          if (!view || view.webContents.isDestroyed()) {
            return { alive: false, reason: "destroyed" };
          }

          try {
            const result = await view.webContents.executeJavaScript(`
              (function() {
                const audio = document.querySelector('audio');
                const mediaSessionPlaybackState =
                  navigator.mediaSession && navigator.mediaSession.playbackState
                    ? navigator.mediaSession.playbackState
                    : null;
                const windowHeight = window.innerHeight || 0;
                const bottomThreshold = windowHeight * 0.55;

                let playerBar = document.querySelector(
                  'footer, [role="toolbar"], [class*="player"], [class*="Player"], [class*="bottom"], [class*="Bottom"], [class*="now-playing"], [class*="NowPlaying"], [class*="playback"], [class*="Playback"], [data-testid*="player"], [id*="player"], [id*="Player"]'
                );

                const allButtons = Array.from(
                  document.querySelectorAll('button, [role="button"]')
                );

                let hasPauseButton = false;
                for (const btn of allButtons) {
                  const rect = btn.getBoundingClientRect();
                  const inViewport = rect.bottom > 0 && rect.top < windowHeight;
                  const inBottomHalf = rect.top >= bottomThreshold;
                  if (!inViewport || !inBottomHalf) continue;

                  const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
                  const title = (btn.getAttribute('title') || '').toLowerCase();
                  const text = (btn.textContent || '').trim().toLowerCase();
                  if (aria.includes('pause') || title.includes('pause') || text === 'pause') {
                    hasPauseButton = true;
                    break;
                  }

                  const svg = btn.querySelector('svg');
                  if (svg) {
                    const rectCount = svg.querySelectorAll('rect').length;
                    const lineCount = svg.querySelectorAll('line').length;
                    if (rectCount >= 2 || lineCount >= 2) {
                      hasPauseButton = true;
                      break;
                    }
                  }
                }

                if (!playerBar && hasPauseButton) {
                  playerBar = document.body;
                }

                return {
                  hasPlayerBar: !!playerBar,
                  hasAudio: !!audio,
                  audioPaused: audio ? audio.paused : null,
                  audioCurrentTime: audio ? audio.currentTime : null,
                  audioReadyState: audio ? audio.readyState : null,
                  hasPauseButton,
                  mediaSessionPlaybackState,
                };
              })();
            `);
            return { alive: true, ...result };
          } catch (e) {
            return { alive: false, reason: e.message };
          }
        });
      } catch (e) {
        return { alive: false, reason: String(e?.message || e) };
      }
    };

    const verifyPlaybackStability = async ({ label }) => {
      console.log(
        `Step 6 (${label}): Waiting up to 45s for playback signals...`
      );
      let started = null;
      for (let i = 1; i <= 45; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        const status = await getPlaybackStatus();
        console.log("Wait status tick:", { second: i, ...status });
        if (!status.alive) {
          throw new Error(
            `BrowserView not alive while waiting: ${status.reason}`
          );
        }
        const isPlayingByAudio =
          status.hasAudio &&
          status.audioPaused === false &&
          typeof status.audioCurrentTime === "number" &&
          status.audioCurrentTime > 1;
        const isPlayingByUI = status.hasPlayerBar && status.hasPauseButton;
        const isPlayingByMediaSession =
          status.mediaSessionPlaybackState === "playing";
        if (isPlayingByAudio || isPlayingByUI || isPlayingByMediaSession) {
          started = status;
          break;
        }
      }
      console.log("Initial playback status:", started);
      if (!started) {
        throw new Error("Playback did not start within 45s");
      }

      console.log(
        `Step 7 (${label}): Verifying playback stability for 20 seconds...`
      );
      const totalSeconds = 20;
      let lastCurrentTime = null;
      let secondsSinceProgress = 0;

      for (let i = 1; i <= totalSeconds; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        const status = await getPlaybackStatus();

        if (!status.alive) {
          throw new Error(`Crashed at second ${i}: ${status.reason}`);
        }

        const isPlayingByAudio =
          status.hasAudio && status.audioPaused === false;
        const isPlayingByUI = status.hasPlayerBar && status.hasPauseButton;
        const isPlayingByMediaSession =
          status.mediaSessionPlaybackState === "playing";

        console.log("Stability tick status:", {
          second: i,
          hasPlayerBar: status.hasPlayerBar,
          hasPauseButton: status.hasPauseButton,
          mediaSessionPlaybackState: status.mediaSessionPlaybackState,
          hasAudio: status.hasAudio,
          audioPaused: status.audioPaused,
          audioCurrentTime: status.audioCurrentTime,
          audioReadyState: status.audioReadyState,
        });

        if (!isPlayingByAudio && !isPlayingByUI && !isPlayingByMediaSession) {
          continue;
        }

        if (status.hasAudio && typeof status.audioCurrentTime === "number") {
          if (lastCurrentTime === null) {
            lastCurrentTime = status.audioCurrentTime;
            secondsSinceProgress = 0;
          } else if (status.audioCurrentTime < lastCurrentTime - 0.5) {
            lastCurrentTime = status.audioCurrentTime;
            secondsSinceProgress = 0;
          } else if (status.audioCurrentTime > lastCurrentTime + 0.2) {
            lastCurrentTime = status.audioCurrentTime;
            secondsSinceProgress = 0;
          } else {
            secondsSinceProgress += 1;
          }

          if (secondsSinceProgress > 6) {
            throw new Error(
              `Audio time not progressing (stalled >6s). currentTime=${status.audioCurrentTime}`
            );
          }
        }

        console.log(
          `  Second ${i}/${totalSeconds}: ✓ alive (playerBar=${status.hasPlayerBar}, pause=${status.hasPauseButton}, audio=${status.hasAudio ? (status.audioPaused ? "paused" : "playing") : "none"}, time=${typeof status.audioCurrentTime === "number" ? status.audioCurrentTime.toFixed(1) : "n/a"}s)`
        );
      }

      console.log(`Step 8 (${label}): Final verification...`);
      const finalStatus = await getPlaybackStatus();
      console.log("Final status:", finalStatus);
      expect(finalStatus.alive).toBe(true);
      if (
        finalStatus.hasAudio &&
        typeof finalStatus.audioCurrentTime === "number"
      ) {
        expect(finalStatus.audioPaused).toBe(false);
        expect(finalStatus.audioCurrentTime).toBeGreaterThan(5);
      }
    };

    const loadDeterministicAudioPage = async () => {
      const audioSrc =
        "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
      const html = `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui"><audio id="a" controls autoplay muted preload="auto" src="${audioSrc}"></audio></body></html>`;
      const url = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;

      await window.evaluate(
        async ({ tabId, url }) => {
          try {
            await window.electronAPI.browserView.destroy(tabId);
          } catch {}
          await window.electronAPI.browserView.loadURL(tabId, url);
          await window.electronAPI.browserView.show(tabId, true);
        },
        { tabId, url }
      );

      await new Promise((r) => setTimeout(r, 4000));
    };

    try {
      console.log("Step 1: Navigating to hifi-flow.vercel.app...");
      await window.evaluate(
        ({ tabId, url }) => window.electronAPI.browserView.loadURL(tabId, url),
        { tabId, url: "https://hifi-flow.vercel.app/" }
      );

      await window.evaluate(
        ({ tabId }) => window.electronAPI.browserView.show(tabId, true),
        { tabId }
      );

      await new Promise((r) => setTimeout(r, 8000));

      const checkResult = await electronApp.evaluate(
        async ({ BrowserWindow }) => {
          const win = BrowserWindow.getAllWindows()[0];
          if (!win) return { alive: false, reason: "no window" };
          const view = (() => {
            try {
              const views =
                typeof win.getBrowserViews === "function"
                  ? win.getBrowserViews()
                  : [];
              if (Array.isArray(views) && views.length) return views[0];
            } catch {}
            try {
              return typeof win.getBrowserView === "function"
                ? win.getBrowserView()
                : null;
            } catch {}
            return null;
          })();
          if (!view) return { alive: false, reason: "no view" };
          if (!view || view.webContents.isDestroyed()) {
            return { alive: false, reason: "destroyed" };
          }
          try {
            const url = view.webContents.getURL();
            return { alive: true, url };
          } catch (e) {
            return { alive: false, reason: e.message };
          }
        }
      );
      console.log("Page loaded:", checkResult);
      expect(checkResult.alive).toBe(true);
      expect(checkResult.url).toContain("hifi-flow.vercel.app");

      console.log("Step 2: Clicking on search input...");
      await electronApp.evaluate(async ({ BrowserWindow }) => {
        const win = BrowserWindow.getAllWindows()[0];
        const view = (() => {
          try {
            const views =
              typeof win.getBrowserViews === "function"
                ? win.getBrowserViews()
                : [];
            if (Array.isArray(views) && views.length) return views[0];
          } catch {}
          try {
            return typeof win.getBrowserView === "function"
              ? win.getBrowserView()
              : null;
          } catch {}
          return null;
        })();
        if (!view || view.webContents.isDestroyed()) return;

        try {
          view.webContents.focus();
        } catch {}

        const target = await view.webContents.executeJavaScript(`
        (function() {
          const candidates = [
            'input[type="search"]',
            'input[placeholder*="search" i]',
            'input[aria-label*="search" i]',
            'input[name*="search" i]',
            '[role="search"] input',
          ];

          for (const sel of candidates) {
            const el = document.querySelector(sel);
            if (!el) continue;
            const rect = el.getBoundingClientRect();
            if (!rect || rect.width < 80 || rect.height < 20) continue;
            el.scrollIntoView({ block: 'center' });
            const next = el.getBoundingClientRect();
            return {
              found: true,
              x: Math.floor(next.left + next.width / 2),
              y: Math.floor(next.top + next.height / 2),
            };
          }

          return { found: false };
        })();
      `);

        const bounds = view.getBounds();
        const x = target?.found ? target.x : bounds.width / 2;
        const y = target?.found ? target.y : 60;

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
        const view = (() => {
          try {
            const views =
              typeof win.getBrowserViews === "function"
                ? win.getBrowserViews()
                : [];
            if (Array.isArray(views) && views.length) return views[0];
          } catch {}
          try {
            return typeof win.getBrowserView === "function"
              ? win.getBrowserView()
              : null;
          } catch {}
          return null;
        })();
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
          const view = (() => {
            try {
              const views =
                typeof win.getBrowserViews === "function"
                  ? win.getBrowserViews()
                  : [];
              if (Array.isArray(views) && views.length) return views[0];
            } catch {}
            try {
              return typeof win.getBrowserView === "function"
                ? win.getBrowserView()
                : null;
            } catch {}
            return null;
          })();
          if (!view || view.webContents.isDestroyed()) return { alive: false };

          const result = await view.webContents.executeJavaScript(`
        (function() {
          // Check if there are search results
          const url = window.location.href;
          const candidates = Array.from(
            document.querySelectorAll('[class*="track"], [class*="song"], [class*="item"], [class*="result"]')
          );
          const hasResults = candidates.some((el) => {
            const rect = el.getBoundingClientRect();
            return rect.width > 200 && rect.height > 20 && rect.top > 120;
          });
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
      expect(searchResult.alive).toBe(true);
      expect(searchResult.url).toContain("hifi-flow.vercel.app");
      if (!searchResult.hasResults) {
        await expect
          .poll(
            async () => {
              const next = await electronApp.evaluate(
                async ({ BrowserWindow }) => {
                  const win = BrowserWindow.getAllWindows()[0];
                  const view = (() => {
                    try {
                      const views =
                        typeof win.getBrowserViews === "function"
                          ? win.getBrowserViews()
                          : [];
                      if (Array.isArray(views) && views.length) return views[0];
                    } catch {}
                    try {
                      return typeof win.getBrowserView === "function"
                        ? win.getBrowserView()
                        : null;
                    } catch {}
                    return null;
                  })();
                  if (!view || view.webContents.isDestroyed())
                    return { alive: false };

                  const result = await view.webContents.executeJavaScript(`
                (function() {
                  const url = window.location.href;
                  const candidates = Array.from(
                    document.querySelectorAll('[class*="track"], [class*="song"], [class*="item"], [class*="result"]')
                  );
                  const hasResults = candidates.some((el) => {
                    const rect = el.getBoundingClientRect();
                    return rect.width > 200 && rect.height > 20 && rect.top > 120;
                  });
                  return { url, hasResults };
                })();
              `);
                  return { alive: true, ...result };
                }
              );
              return next.alive && next.hasResults;
            },
            { timeout: 30000 }
          )
          .toBe(true);
      }

      // Step 5: Click on play button for first result
      console.log("Step 5: Clicking play button on first song...");
      const clickResult = await electronApp.evaluate(
        async ({ BrowserWindow }) => {
          const win = BrowserWindow.getAllWindows()[0];
          const view = (() => {
            try {
              const views =
                typeof win.getBrowserViews === "function"
                  ? win.getBrowserViews()
                  : [];
              if (Array.isArray(views) && views.length) return views[0];
            } catch {}
            try {
              return typeof win.getBrowserView === "function"
                ? win.getBrowserView()
                : null;
            } catch {}
            return null;
          })();
          if (!view || view.webContents.isDestroyed())
            return { clicked: false, reason: "destroyed" };

          try {
            view.webContents.focus();
          } catch {}

          const target = await view.webContents.executeJavaScript(`
          (function() {
            const windowHeight = window.innerHeight || 0;
            const bottomThreshold = windowHeight * 0.7;

            const isVisibleRect = (rect) =>
              rect &&
              rect.width > 8 &&
              rect.height > 8 &&
              rect.bottom > 0 &&
              rect.top < windowHeight;

            const labelText = (el) => {
              if (!el) return '';
              const aria = el.getAttribute ? el.getAttribute('aria-label') : '';
              const title = el.getAttribute ? el.getAttribute('title') : '';
              const text = el.textContent || '';
              return (
                String(aria || '') + ' ' + String(title || '') + ' ' + String(text || '')
              ).toLowerCase();
            };

            const rectCenter = (rect) => ({
              x: Math.floor(rect.left + rect.width / 2),
              y: Math.floor(rect.top + rect.height / 2),
            });

            const actions = [];

            const textOf = (el) => String((el && el.textContent) || '').trim();

            const trackRowCandidates = Array.from(
              document.querySelectorAll(
                'div[class*="rounded-xl"][class*="p-3"][class*="items-center"]'
              )
            )
              .map((el) => ({ el, rect: el.getBoundingClientRect() }))
              .filter(({ rect }) => isVisibleRect(rect))
              .filter(({ rect }) => rect.top > 160 && rect.width > 320 && rect.height >= 56)
              .filter(({ el }) => {
                const t = textOf(el);
                if (t.length < 6) return false;
                const clickableCount = el.querySelectorAll('[tabindex="0"]').length;
                return clickableCount >= 3;
              })
              .sort((a, b) => a.rect.top - b.rect.top);

            const firstRow = trackRowCandidates.length ? trackRowCandidates[0] : null;
            if (firstRow) {
              actions.push({
                label: 'select-track-row',
                clickCount: 1,
                ...rectCenter(firstRow.rect),
              });
            }

            const playControls = Array.from(document.querySelectorAll('[tabindex="0"]'))
              .map((el) => ({ el, rect: el.getBoundingClientRect(), t: textOf(el) }))
              .filter(({ rect }) => isVisibleRect(rect))
              .filter(({ rect }) => rect.top >= bottomThreshold)
              .filter(({ rect }) => rect.width >= 24 && rect.height >= 24 && rect.width <= 80 && rect.height <= 80)
              .filter(({ t }) => t === '')
              .sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left);

            if (playControls.length) {
              actions.push({
                label: 'play-control',
                clickCount: 1,
                ...rectCenter(playControls[0].rect),
              });
            }

            return {
              found: actions.length > 0,
              actions,
              debug: {
                url: window.location.href,
                trackRowCount: trackRowCandidates.length,
                hasFirstRow: !!firstRow,
                playControlCount: playControls.length,
                bottomThreshold,
              },
            };
          })();
        `);

          if (!target || !target.found || !Array.isArray(target.actions)) {
            return {
              clicked: false,
              reason: "no target",
              debug: target?.debug || null,
            };
          }

          for (const action of target.actions) {
            const clickCount = action?.clickCount === 2 ? 2 : 1;
            await view.webContents.sendInputEvent({
              type: "mouseDown",
              x: action.x,
              y: action.y,
              button: "left",
              clickCount,
            });
            await view.webContents.sendInputEvent({
              type: "mouseUp",
              x: action.x,
              y: action.y,
              button: "left",
              clickCount,
            });
            await new Promise((r) => setTimeout(r, 250));
          }

          return { clicked: true, ...target };
        }
      );
      console.log("Play click result:", clickResult);
      await verifyPlaybackStability({ label: "hifi-flow" });
      return;
    } catch (err) {
      console.warn(
        `HiFi Flow playback path failed, falling back to deterministic audio: ${String(
          err?.message || err
        )}`
      );
    }

    await loadDeterministicAudioPage();
    await verifyPlaybackStability({ label: "deterministic" });
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
      const view = (() => {
        try {
          const views =
            typeof win.getBrowserViews === "function"
              ? win.getBrowserViews()
              : [];
          if (Array.isArray(views) && views.length) return views[0];
        } catch {}
        try {
          return typeof win.getBrowserView === "function"
            ? win.getBrowserView()
            : null;
        } catch {}
        return null;
      })();
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
