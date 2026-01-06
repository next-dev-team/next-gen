import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

const createId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const useResourceStore = create(
  devtools(
    persist(
      (set, get) => ({
        collections: [{ id: "default", name: "Default", createdAt: null }],
        records: [],
        screenshots: [],

        createCollection: (name) => {
          const n = String(name || "").trim();
          if (!n) return null;
          const id = createId();
          const now = new Date().toISOString();
          set((state) => ({
            collections: [
              ...state.collections,
              { id, name: n, createdAt: now, updatedAt: now },
            ],
          }));
          return id;
        },

        renameCollection: (collectionId, name) => {
          const n = String(name || "").trim();
          if (!n) return false;
          const now = new Date().toISOString();
          set((state) => ({
            collections: state.collections.map((c) =>
              c.id === collectionId ? { ...c, name: n, updatedAt: now } : c
            ),
          }));
          return true;
        },

        deleteCollection: (collectionId) => {
          if (collectionId === "default") return false;
          set((state) => ({
            collections: state.collections.filter((c) => c.id !== collectionId),
            records: state.records.filter((r) => r.collectionId !== collectionId),
          }));
          return true;
        },

        upsertRecord: ({ id, collectionId, key, value }) => {
          const cid = String(collectionId || "default");
          const k = String(key || "").trim();
          if (!k) return null;
          const now = new Date().toISOString();
          const nextId = id ? String(id) : createId();

          set((state) => {
            const exists = state.records.some((r) => r.id === nextId);
            if (exists) {
              return {
                records: state.records.map((r) =>
                  r.id === nextId
                    ? {
                        ...r,
                        collectionId: cid,
                        key: k,
                        value,
                        updatedAt: now,
                      }
                    : r
                ),
              };
            }
            return {
              records: [
                ...state.records,
                {
                  id: nextId,
                  collectionId: cid,
                  key: k,
                  value,
                  createdAt: now,
                  updatedAt: now,
                },
              ],
            };
          });

          return nextId;
        },

        deleteRecord: (recordId) => {
          set((state) => ({
            records: state.records.filter((r) => r.id !== recordId),
          }));
          return true;
        },

        addScreenshot: ({
          name,
          source,
          mode,
          dataUrl,
          mimeType,
          byteLength,
          meta,
          originId,
        }) => {
          const url = String(dataUrl || "");
          if (!url.startsWith("data:image/")) return null;
          const now = new Date().toISOString();
          const nextId = createId();
          const originKey = originId
            ? `${String(source || "unknown")}::${String(originId)}`
            : null;

          const exists = originKey
            ? get().screenshots.some((s) => s.originKey === originKey)
            : false;
          if (exists) return null;

          set((state) => ({
            screenshots: [
              {
                id: nextId,
                originKey,
                name: String(name || "screenshot.png"),
                source: String(source || "unknown"),
                mode: String(mode || "full"),
                createdAt: now,
                mimeType: String(mimeType || "image/png"),
                byteLength: Number(byteLength) || 0,
                dataUrl: url,
                meta: meta && typeof meta === "object" ? meta : null,
              },
              ...state.screenshots,
            ],
          }));

          return nextId;
        },

        deleteScreenshot: (screenshotId) => {
          set((state) => ({
            screenshots: state.screenshots.filter((s) => s.id !== screenshotId),
          }));
          return true;
        },
      }),
      {
        name: "resource-store",
        version: 1,
      }
    )
  )
);

