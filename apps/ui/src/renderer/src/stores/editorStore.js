import { create } from "zustand";
import { persist } from "zustand/middleware";

// Generate unique IDs
const createId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

// Initial canvas state
const initialCanvasState = {
  elements: [],
  selectedIds: [],
  hoveredId: null,
  clipboard: null,
  history: {
    past: [],
    future: [],
  },
};

// Initial UI state
const initialUIState = {
  zoom: 1,
  panX: 0,
  panY: 0,
  previewMode: false,
  leftSidebarOpen: true,
  rightSidebarOpen: true,
  leftSidebarWidth: 280,
  rightSidebarWidth: 300,
  activeLeftTab: "components",
  devicePreview: "desktop",
};

export const useEditorStore = create(
  persist(
    (set, get) => ({
      // Canvas State
      canvas: { ...initialCanvasState },

      // UI State
      ui: { ...initialUIState },

      // ============ CANVAS ACTIONS ============

      // Add element to canvas
      addElement: (element, parentId = null, index = null) => {
        if (get().ui.previewMode) return null;
        const id = createId();
        const newElement = {
          id,
          type: element.type,
          props: { ...element.defaultProps, ...element.props },
          style: element.style || {},
          children: [],
        };

        set((state) => {
          const elements = [...state.canvas.elements];

          if (parentId) {
            // Add as child of parent
            const addToParent = (els) =>
              els.map((el) => {
                if (el.id === parentId) {
                  const children = [...el.children];
                  if (index !== null) {
                    children.splice(index, 0, newElement);
                  } else {
                    children.push(newElement);
                  }
                  return { ...el, children };
                }
                return { ...el, children: addToParent(el.children) };
              });
            return {
              canvas: {
                ...state.canvas,
                elements: addToParent(elements),
                history: pushHistory(state.canvas),
              },
            };
          }

          // Add to root level
          if (index !== null) {
            elements.splice(index, 0, newElement);
          } else {
            elements.push(newElement);
          }

          return {
            canvas: {
              ...state.canvas,
              elements,
              selectedIds: [id],
              history: pushHistory(state.canvas),
            },
          };
        });

        return id;
      },

      // Update element props
      updateElement: (id, updates) => {
        if (get().ui.previewMode) return;
        set((state) => {
          const updateInTree = (els) =>
            els.map((el) => {
              if (el.id === id) {
                // Deep merge props if provided
                const newProps = updates.props
                  ? { ...el.props, ...updates.props }
                  : el.props;

                // Deep merge style if provided
                const newStyle = updates.style
                  ? { ...el.style, ...updates.style }
                  : el.style;

                return {
                  ...el,
                  props: newProps,
                  style: newStyle,
                  // Allow updating other fields like type, children
                  ...(updates.type ? { type: updates.type } : {}),
                  ...(updates.children ? { children: updates.children } : {}),
                };
              }
              return { ...el, children: updateInTree(el.children) };
            });

          return {
            canvas: {
              ...state.canvas,
              elements: updateInTree(state.canvas.elements),
              history: pushHistory(state.canvas),
            },
          };
        });
      },

      // Delete element(s)
      deleteElements: (ids) => {
        if (get().ui.previewMode) return;
        set((state) => {
          const removeFromTree = (els) =>
            els
              .filter((el) => !ids.includes(el.id))
              .map((el) => ({ ...el, children: removeFromTree(el.children) }));

          return {
            canvas: {
              ...state.canvas,
              elements: removeFromTree(state.canvas.elements),
              selectedIds: [],
              history: pushHistory(state.canvas),
            },
          };
        });
      },

      // Move element
      moveElement: (id, newParentId, newIndex) => {
        if (get().ui.previewMode) return;
        set((state) => {
          let movedElement = null;

          // Remove element from current position
          const removeElement = (els) =>
            els.filter((el) => {
              if (el.id === id) {
                movedElement = el;
                return false;
              }
              el.children = removeElement(el.children);
              return true;
            });

          const elements = removeElement([...state.canvas.elements]);

          if (!movedElement) return state;

          // Add to new position
          if (newParentId) {
            const addToParent = (els) =>
              els.map((el) => {
                if (el.id === newParentId) {
                  const children = [...el.children];
                  children.splice(newIndex ?? children.length, 0, movedElement);
                  return { ...el, children };
                }
                return { ...el, children: addToParent(el.children) };
              });
            return {
              canvas: {
                ...state.canvas,
                elements: addToParent(elements),
                history: pushHistory(state.canvas),
              },
            };
          }

          elements.splice(newIndex ?? elements.length, 0, movedElement);
          return {
            canvas: {
              ...state.canvas,
              elements,
              history: pushHistory(state.canvas),
            },
          };
        });
      },

      // Duplicate element(s)
      duplicateElements: (ids) => {
        if (get().ui.previewMode) return;
        set((state) => {
          const duplicateInTree = (els) => {
            const result = [];
            els.forEach((el) => {
              result.push({ ...el, children: duplicateInTree(el.children) });
              if (ids.includes(el.id)) {
                const duplicated = deepCloneWithNewIds(el);
                result.push(duplicated);
              }
            });
            return result;
          };

          const newElements = duplicateInTree(state.canvas.elements);
          return {
            canvas: {
              ...state.canvas,
              elements: newElements,
              history: pushHistory(state.canvas),
            },
          };
        });
      },

      // Selection
      setSelection: (ids) => {
        if (get().ui.previewMode) return;
        set((state) => ({
          canvas: { ...state.canvas, selectedIds: ids },
        }));
      },

      addToSelection: (id) => {
        if (get().ui.previewMode) return;
        set((state) => ({
          canvas: {
            ...state.canvas,
            selectedIds: state.canvas.selectedIds.includes(id)
              ? state.canvas.selectedIds
              : [...state.canvas.selectedIds, id],
          },
        }));
      },

      clearSelection: () => {
        set((state) => ({
          canvas: { ...state.canvas, selectedIds: [] },
        }));
      },

      setHovered: (id) => {
        if (get().ui.previewMode) return;
        set((state) => ({
          canvas: { ...state.canvas, hoveredId: id },
        }));
      },

      // Clipboard
      copyToClipboard: () => {
        const { selectedIds, elements } = get().canvas;
        const findElements = (els, ids) =>
          els.filter((el) => ids.includes(el.id)).map(deepCloneWithNewIds);

        set((state) => ({
          canvas: {
            ...state.canvas,
            clipboard: findElements(elements, selectedIds),
          },
        }));
      },

      setClipboard: (elements) => {
        set((state) => ({
          canvas: {
            ...state.canvas,
            clipboard: Array.isArray(elements)
              ? elements.map(deepCloneWithNewIds)
              : null,
          },
        }));
      },

      pasteFromClipboard: () => {
        if (get().ui.previewMode) return;
        const { clipboard } = get().canvas;
        if (!clipboard || clipboard.length === 0) return;

        set((state) => {
          const pastedElements = clipboard.map(deepCloneWithNewIds);
          return {
            canvas: {
              ...state.canvas,
              elements: [...state.canvas.elements, ...pastedElements],
              selectedIds: pastedElements.map((el) => el.id),
              history: pushHistory(state.canvas),
            },
          };
        });
      },

      // History (Undo/Redo)
      undo: () => {
        if (get().ui.previewMode) return;
        set((state) => {
          const { past, future } = state.canvas.history;
          if (past.length === 0) return state;

          const previous = past[past.length - 1];
          const newPast = past.slice(0, -1);

          return {
            canvas: {
              ...state.canvas,
              elements: previous.elements,
              selectedIds: previous.selectedIds,
              history: {
                past: newPast,
                future: [
                  {
                    elements: state.canvas.elements,
                    selectedIds: state.canvas.selectedIds,
                  },
                  ...future,
                ],
              },
            },
          };
        });
      },

      redo: () => {
        if (get().ui.previewMode) return;
        set((state) => {
          const { past, future } = state.canvas.history;
          if (future.length === 0) return state;

          const next = future[0];
          const newFuture = future.slice(1);

          return {
            canvas: {
              ...state.canvas,
              elements: next.elements,
              selectedIds: next.selectedIds,
              history: {
                past: [
                  ...past,
                  {
                    elements: state.canvas.elements,
                    selectedIds: state.canvas.selectedIds,
                  },
                ],
                future: newFuture,
              },
            },
          };
        });
      },

      clearCanvas: () => {
        if (get().ui.previewMode) return;
        set((state) => ({
          canvas: {
            ...state.canvas,
            elements: [],
            selectedIds: [],
            history: pushHistory(state.canvas),
          },
        }));
      },

      // ============ UI ACTIONS ============

      setZoom: (zoom) => {
        set((state) => ({
          ui: { ...state.ui, zoom: Math.max(0.1, Math.min(3, zoom)) },
        }));
      },

      zoomIn: () => {
        set((state) => ({
          ui: { ...state.ui, zoom: Math.min(3, state.ui.zoom * 1.2) },
        }));
      },

      zoomOut: () => {
        set((state) => ({
          ui: { ...state.ui, zoom: Math.max(0.1, state.ui.zoom / 1.2) },
        }));
      },

      zoomReset: () => {
        set((state) => ({ ui: { ...state.ui, zoom: 1 } }));
      },

      setPan: (x, y) => {
        set((state) => ({ ui: { ...state.ui, panX: x, panY: y } }));
      },

      toggleLeftSidebar: () => {
        set((state) => ({
          ui: { ...state.ui, leftSidebarOpen: !state.ui.leftSidebarOpen },
        }));
      },

      toggleRightSidebar: () => {
        set((state) => ({
          ui: { ...state.ui, rightSidebarOpen: !state.ui.rightSidebarOpen },
        }));
      },

      setActiveLeftTab: (tab) => {
        set((state) => ({ ui: { ...state.ui, activeLeftTab: tab } }));
      },

      setDevicePreview: (device) => {
        set((state) => ({ ui: { ...state.ui, devicePreview: device } }));
      },

      setPreviewMode: (enabled) => {
        set((state) => ({
          ui: { ...state.ui, previewMode: !!enabled },
          canvas: { ...state.canvas, selectedIds: [], hoveredId: null },
        }));
      },

      togglePreviewMode: () => {
        const enabled = !get().ui.previewMode;
        set((state) => ({
          ui: { ...state.ui, previewMode: enabled },
          canvas: { ...state.canvas, selectedIds: [], hoveredId: null },
        }));
      },

      // ============ HELPERS ============

      getSelectedElements: () => {
        const { elements, selectedIds } = get().canvas;
        const findInTree = (els) => {
          const found = [];
          els.forEach((el) => {
            if (selectedIds.includes(el.id)) found.push(el);
            found.push(...findInTree(el.children));
          });
          return found;
        };
        return findInTree(elements);
      },

      getElementById: (id) => {
        const findInTree = (els) => {
          for (const el of els) {
            if (el.id === id) return el;
            const found = findInTree(el.children);
            if (found) return found;
          }
          return null;
        };
        return findInTree(get().canvas.elements);
      },
    }),
    {
      name: "editor-store",
      version: 2,
      partialize: (state) => ({
        canvas: {
          elements: state.canvas.elements,
        },
        ui: (({ previewMode, ...ui }) => ui)(state.ui),
      }),
      // Deep merge to preserve non-persisted state like history, selectedIds, etc.
      merge: (persistedState, currentState) => ({
        ...currentState,
        canvas: {
          ...currentState.canvas,
          elements: persistedState?.canvas?.elements || [],
        },
        ui: {
          ...currentState.ui,
          ...persistedState?.ui,
        },
      }),
    }
  )
);

// Helper functions
function pushHistory(canvas) {
  return {
    past: [
      ...canvas.history.past.slice(-49),
      { elements: canvas.elements, selectedIds: canvas.selectedIds },
    ],
    future: [],
  };
}

function deepCloneWithNewIds(element) {
  return {
    ...element,
    id: createId(),
    props: { ...element.props },
    style: { ...element.style },
    children: element.children.map(deepCloneWithNewIds),
  };
}
