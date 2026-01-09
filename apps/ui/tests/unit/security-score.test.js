describe("getSecurityScore", () => {
  test("returns a low baseline score when no data is configured", async () => {
    const { getSecurityScore } = await import(
      "../../src/renderer/src/lib/securityScore.js"
    );

    const result = getSecurityScore();

    expect(result.normalizedScore).toBe(30);
    expect(result.scoreLabel).toBe("Low");
    expect(result.stats).toEqual({
      proxies: 0,
      activeProxies: 0,
      profiles: 0,
      runningProfiles: 0,
    });
    expect(result.protectionScore).toBe(0);
  });

  test("reaches a high score with active protections and proxy", async () => {
    const { getSecurityScore } = await import(
      "../../src/renderer/src/lib/securityScore.js"
    );

    const profiles = [
      {
        id: "profile-1",
        status: "running",
        proxyId: "proxy-1",
        settings: {
          blockWebRTC: true,
          blockCanvasFingerprint: true,
          blockAudioFingerprint: true,
          blockWebGL: true,
          blockFonts: true,
          blockGeolocation: true,
        },
      },
    ];
    const proxies = [
      {
        id: "proxy-1",
        status: "active",
      },
    ];

    const result = getSecurityScore({
      profiles,
      proxies,
      activeProfileId: "profile-1",
    });

    expect(result.protectionScore).toBe(6);
    expect(result.normalizedScore).toBe(100);
    expect(result.scoreLabel).toBe("High");
  });
});
