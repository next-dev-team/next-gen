const buildProtectionChecks = (profile) => [
  {
    id: "webrtc",
    label: "WebRTC leak protection",
    enabled: Boolean(profile?.settings?.blockWebRTC),
  },
  {
    id: "canvas",
    label: "Canvas fingerprint masking",
    enabled: Boolean(profile?.settings?.blockCanvasFingerprint),
  },
  {
    id: "audio",
    label: "Audio fingerprint masking",
    enabled: Boolean(profile?.settings?.blockAudioFingerprint),
  },
  {
    id: "webgl",
    label: "WebGL shielding",
    enabled: Boolean(profile?.settings?.blockWebGL),
  },
  {
    id: "fonts",
    label: "Font enumeration blocking",
    enabled: Boolean(profile?.settings?.blockFonts),
  },
  {
    id: "geo",
    label: "Geolocation guarding",
    enabled: Boolean(profile?.settings?.blockGeolocation),
  },
];

const getScoreTone = (normalizedScore) => {
  if (normalizedScore >= 80) return "bg-emerald-500";
  if (normalizedScore >= 60) return "bg-amber-500";
  return "bg-rose-500";
};

const getScoreLabel = (normalizedScore) => {
  if (normalizedScore >= 80) return "High";
  if (normalizedScore >= 60) return "Medium";
  return "Low";
};

export const getSecurityScore = ({
  profiles = [],
  proxies = [],
  activeProfileId = null,
} = {}) => {
  const stats = {
    proxies: proxies.length,
    activeProxies: proxies.filter((proxy) => proxy.status === "active").length,
    profiles: profiles.length,
    runningProfiles: profiles.filter((profile) => profile.status === "running")
      .length,
  };

  const activeProfile = profiles.find(
    (profile) => profile.id === activeProfileId
  );
  const activeProxy = proxies.find(
    (proxy) => proxy.id === activeProfile?.proxyId
  );

  const protectionChecks = buildProtectionChecks(activeProfile);
  const protectionScore = protectionChecks.filter((item) => item.enabled).length;
  const rawScore =
    30 +
    (stats.profiles > 0 ? 10 : 0) +
    (activeProfileId ? 10 : 0) +
    (stats.runningProfiles > 0 ? 10 : 0) +
    (activeProxy?.status === "active" ? 15 : 0) +
    protectionScore * 5;
  const normalizedScore = Math.min(Math.max(rawScore, 0), 100);

  return {
    stats,
    activeProfile,
    activeProxy,
    protectionChecks,
    protectionScore,
    normalizedScore,
    scoreLabel: getScoreLabel(normalizedScore),
    scoreTone: getScoreTone(normalizedScore),
  };
};
