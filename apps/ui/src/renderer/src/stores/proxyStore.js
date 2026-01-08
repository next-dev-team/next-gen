import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

const createId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

/** Proxy types */
export const PROXY_TYPES = {
  HTTP: "http",
  HTTPS: "https",
  SOCKS4: "socks4",
  SOCKS5: "socks5",
};

/** Proxy status */
export const PROXY_STATUS = {
  UNKNOWN: "unknown",
  CHECKING: "checking",
  ACTIVE: "active",
  INACTIVE: "inactive",
  ERROR: "error",
};

/**
 * Parse proxy string into structured object
 * Supports formats:
 * - host:port
 * - host:port:username:password
 * - protocol://host:port
 * - protocol://username:password@host:port
 */
const parseProxyString = (str) => {
  const raw = String(str || "").trim();
  if (!raw) return null;

  try {
    // Try URL format first
    if (raw.includes("://")) {
      const url = new URL(raw);
      return {
        type: url.protocol.replace(":", "") || "http",
        host: url.hostname,
        port: parseInt(url.port, 10) || 80,
        username: url.username || null,
        password: url.password || null,
      };
    }

    // Simple format: host:port[:username:password]
    const parts = raw.split(":");
    if (parts.length >= 2) {
      return {
        type: "http",
        host: parts[0],
        port: parseInt(parts[1], 10) || 80,
        username: parts[2] || null,
        password: parts[3] || null,
      };
    }
  } catch {
    return null;
  }

  return null;
};

/**
 * Format proxy object to string for display
 */
const formatProxyString = (proxy) => {
  if (!proxy || !proxy.host) return "";
  let str = `${proxy.host}:${proxy.port}`;
  if (proxy.username) {
    str += `:${proxy.username}`;
    if (proxy.password) str += `:${proxy.password}`;
  }
  return str;
};

export const useProxyStore = create(
  devtools(
    persist(
      (set, get) => ({
        /** List of saved proxies */
        proxies: [],

        /** Currently selected proxy ID for quick access */
        selectedProxyId: null,

        /** Proxy groups for organization */
        proxyGroups: [{ id: "default", name: "Default", color: "#6366f1" }],

        /** Add a new proxy */
        addProxy: (proxyInput) => {
          const parsed =
            typeof proxyInput === "string"
              ? parseProxyString(proxyInput)
              : proxyInput;

          if (!parsed || !parsed.host || !parsed.port) return null;

          const id = createId();
          const newProxy = {
            id,
            name: `${parsed.host}:${parsed.port}`,
            type: parsed.type || "http",
            host: parsed.host,
            port: parsed.port,
            username: parsed.username || null,
            password: parsed.password || null,
            groupId: "default",
            status: PROXY_STATUS.UNKNOWN,
            lastChecked: null,
            latency: null,
            country: null,
            city: null,
            isp: null,
            createdAt: new Date().toISOString(),
            usageCount: 0,
            tags: [],
          };

          set((state) => ({
            proxies: [...state.proxies, newProxy],
          }));

          return id;
        },

        /** Update an existing proxy */
        updateProxy: (id, patch) => {
          set((state) => ({
            proxies: state.proxies.map((p) =>
              p.id === id
                ? { ...p, ...patch, updatedAt: new Date().toISOString() }
                : p
            ),
          }));
        },

        /** Remove a proxy */
        removeProxy: (id) => {
          // Get the proxy before removing for potential callbacks
          const proxy = get().proxies.find((p) => p.id === id);

          set((state) => ({
            proxies: state.proxies.filter((p) => p.id !== id),
            selectedProxyId:
              state.selectedProxyId === id ? null : state.selectedProxyId,
          }));

          // Emit a custom event for stores listening to deletions
          if (proxy && typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("proxy-deleted", { detail: { proxyId: id } })
            );
          }
        },

        /** Set selected proxy */
        setSelectedProxy: (id) => {
          set({ selectedProxyId: id });
        },

        /** Update proxy status after health check */
        updateProxyStatus: (id, status, latency = null) => {
          set((state) => ({
            proxies: state.proxies.map((p) =>
              p.id === id
                ? {
                    ...p,
                    status,
                    latency,
                    lastChecked: new Date().toISOString(),
                  }
                : p
            ),
          }));
        },

        /** Increment usage count */
        incrementUsageCount: (id) => {
          set((state) => ({
            proxies: state.proxies.map((p) =>
              p.id === id ? { ...p, usageCount: (p.usageCount || 0) + 1 } : p
            ),
          }));
        },

        /** Add proxy group */
        addProxyGroup: (name, color = "#6366f1") => {
          const id = createId();
          set((state) => ({
            proxyGroups: [...state.proxyGroups, { id, name, color }],
          }));
          return id;
        },

        /** Remove proxy group (moves proxies to default) */
        removeProxyGroup: (id) => {
          if (id === "default") return;
          set((state) => ({
            proxyGroups: state.proxyGroups.filter((g) => g.id !== id),
            proxies: state.proxies.map((p) =>
              p.groupId === id ? { ...p, groupId: "default" } : p
            ),
          }));
        },

        /** Bulk import proxies from text */
        importProxies: (text, groupId = "default") => {
          const lines = String(text || "")
            .split(/[\n\r]+/)
            .filter(Boolean);
          const added = [];

          for (const line of lines) {
            const parsed = parseProxyString(line.trim());
            if (parsed && parsed.host && parsed.port) {
              const id = createId();
              added.push({
                id,
                name: `${parsed.host}:${parsed.port}`,
                type: parsed.type || "http",
                host: parsed.host,
                port: parsed.port,
                username: parsed.username || null,
                password: parsed.password || null,
                groupId,
                status: PROXY_STATUS.UNKNOWN,
                lastChecked: null,
                latency: null,
                country: null,
                city: null,
                isp: null,
                createdAt: new Date().toISOString(),
                usageCount: 0,
                tags: [],
              });
            }
          }

          if (added.length > 0) {
            set((state) => ({
              proxies: [...state.proxies, ...added],
            }));
          }

          return added.length;
        },

        /** Export proxies to text */
        exportProxies: (groupId = null) => {
          const { proxies } = get();
          const filtered = groupId
            ? proxies.filter((p) => p.groupId === groupId)
            : proxies;
          return filtered.map((p) => formatProxyString(p)).join("\n");
        },

        /** Clear all proxies */
        clearProxies: () => {
          set({ proxies: [], selectedProxyId: null });
        },

        /** Get proxy by ID */
        getProxyById: (id) => {
          return get().proxies.find((p) => p.id === id) || null;
        },

        /** Check if proxy exists */
        proxyExists: (id) => {
          return get().proxies.some((p) => p.id === id);
        },

        /** Get proxies by status */
        getProxiesByStatus: (status) => {
          return get().proxies.filter((p) => p.status === status);
        },

        /** Get active proxies (for quick assignment) */
        getActiveProxies: () => {
          return get().proxies.filter((p) => p.status === PROXY_STATUS.ACTIVE);
        },
      }),
      {
        name: "proxy-store",
        version: 1,
      }
    ),
    { name: "proxy-store" }
  )
);

export { parseProxyString, formatProxyString };
