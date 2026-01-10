const PROTECTION_CHECK_DEFINITIONS = [
  {
    id: "webrtc",
    label: "WebRTC leak protection",
    settingKey: "blockWebRTC",
  },
  {
    id: "canvas",
    label: "Canvas fingerprint masking",
    settingKey: "blockCanvasFingerprint",
  },
  {
    id: "audio",
    label: "Audio fingerprint masking",
    settingKey: "blockAudioFingerprint",
  },
  {
    id: "webgl",
    label: "WebGL shielding",
    settingKey: "blockWebGL",
  },
  {
    id: "fonts",
    label: "Font enumeration blocking",
    settingKey: "blockFonts",
  },
  {
    id: "geo",
    label: "Geolocation guarding",
    settingKey: "blockGeolocation",
  },
];

const buildProtectionChecks = (profile) =>
  PROTECTION_CHECK_DEFINITIONS.map((check) => ({
    id: check.id,
    label: check.label,
    enabled: Boolean(profile?.settings?.[check.settingKey]),
  }));

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
  const checklistItems = [
    {
      id: "profiles",
      label: "At least one browser profile is configured.",
      done: stats.profiles > 0,
      doneLabel: "Done",
      pendingLabel: "Pending",
    },
    {
      id: "proxy",
      label: "Attach a live proxy for session routing.",
      done: stats.activeProxies > 0,
      doneLabel: "Active",
      pendingLabel: "Pending",
    },
    {
      id: "running",
      label: "Start a profile to activate protections.",
      done: stats.runningProfiles > 0,
      doneLabel: "Running",
      pendingLabel: "Pending",
    },
    {
      id: "active-profile",
      label: "Confirm an active profile is selected.",
      done: Boolean(activeProfileId),
      doneLabel: "Selected",
      pendingLabel: "Pending",
    },
  ];
  const improvementItems = [
    {
      id: "activate-profile",
      label: "Activate a browser profile for protection.",
      done: Boolean(activeProfileId),
      doneLabel: "Done",
      pendingLabel: "Pending",
    },
    {
      id: "active-proxy",
      label: "Assign a working proxy to the active profile.",
      done: activeProxy?.status === "active",
      doneLabel: "Active",
      pendingLabel: "Pending",
    },
    {
      id: "run-profile",
      label: "Start at least one profile session.",
      done: stats.runningProfiles > 0,
      doneLabel: "Running",
      pendingLabel: "Pending",
    },
    {
      id: "enable-protections",
      label: "Enable all fingerprint protections.",
      done: protectionScore === protectionChecks.length,
      doneLabel: "Complete",
      pendingLabel: "Pending",
    },
  ];

  return {
    stats,
    activeProfile,
    activeProxy,
    protectionChecks,
    protectionScore,
    normalizedScore,
    checklistItems,
    improvementItems,
    scoreLabel: getScoreLabel(normalizedScore),
    scoreTone: getScoreTone(normalizedScore),
  };
};
