import { useEffect, useCallback } from "react";
import { useEditorStore } from "../../../stores/editorStore";
import { generatePageCode, copyToClipboard } from "../../../utils/codeGenerator";

/**
 * Figma-like keyboard shortcuts
 * 
 * Navigation & View:
 * - Ctrl/Cmd + Scroll: Zoom in/out
 * - Ctrl/Cmd + 0: Reset zoom to 100%
 * - Ctrl/Cmd + 1: Fit to screen
 * - Ctrl/Cmd + +/-: Zoom in/out
 * - Space + Drag: Pan canvas (not implemented - needs drag handler)
 * - F: Fit selection to screen
 * 
 * Selection:
 * - Escape: Deselect all
 * - Ctrl/Cmd + A: Select all
 * - Tab: Select next element
 * - Shift + Tab: Select previous element
 * - Arrow keys: Nudge selection
 * 
 * Editing:
 * - Delete/Backspace: Delete selected
 * - Ctrl/Cmd + D: Duplicate selection
 * - Ctrl/Cmd + C: Copy selection
 * - Ctrl/Cmd + V: Paste
 * - Ctrl/Cmd + X: Cut
 * - Ctrl/Cmd + Z: Undo
 * - Ctrl/Cmd + Shift + Z / Ctrl + Y: Redo
 * 
 * Element Order:
 * - Ctrl/Cmd + ]: Bring forward
 * - Ctrl/Cmd + [: Send backward
 * - Ctrl/Cmd + Shift + ]: Bring to front
 * - Ctrl/Cmd + Shift + [: Send to back
 * 
 * Export:
 * - Ctrl/Cmd + E: Export code
 * - Ctrl/Cmd + Shift + C: Copy code of selection
 * 
 * Panels:
 * - Ctrl/Cmd + /: Toggle left sidebar
 * - Ctrl/Cmd + .: Toggle right sidebar
 * 
 * Device Preview:
 * - 1: Desktop preview
 * - 2: Tablet preview
 * - 3: Mobile preview
 */

export function useKeyboardShortcuts({ onExportCode, enabled = true }) {
  // Store actions
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const deleteElements = useEditorStore((s) => s.deleteElements);
  const duplicateElements = useEditorStore((s) => s.duplicateElements);
  const copyToClipboardStore = useEditorStore((s) => s.copyToClipboard);
  const pasteFromClipboard = useEditorStore((s) => s.pasteFromClipboard);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const setSelection = useEditorStore((s) => s.setSelection);
  const moveElement = useEditorStore((s) => s.moveElement);
  const zoomIn = useEditorStore((s) => s.zoomIn);
  const zoomOut = useEditorStore((s) => s.zoomOut);
  const zoomReset = useEditorStore((s) => s.zoomReset);
  const setZoom = useEditorStore((s) => s.setZoom);
  const toggleLeftSidebar = useEditorStore((s) => s.toggleLeftSidebar);
  const toggleRightSidebar = useEditorStore((s) => s.toggleRightSidebar);
  const setDevicePreview = useEditorStore((s) => s.setDevicePreview);

  // Store state
  const selectedIds = useEditorStore((s) => s.canvas.selectedIds);
  const elements = useEditorStore((s) => s.canvas.elements);
  const getElementById = useEditorStore((s) => s.getElementById);

  // Check if target is editable (input, textarea, contenteditable)
  const isEditableTarget = useCallback((target) => {
    if (!target) return false;
    const tagName = target.tagName?.toLowerCase();
    return (
      tagName === "input" ||
      tagName === "textarea" ||
      target.isContentEditable ||
      target.getAttribute("contenteditable") === "true"
    );
  }, []);

  // Handle keyboard events
  const handleKeyDown = useCallback((e) => {
    const isMod = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;
    const key = e.key.toLowerCase();

    // Skip if typing in input (except for some shortcuts)
    const isEditing = isEditableTarget(e.target);

    // ============ ALWAYS WORK (even when editing) ============
    
    // Escape - blur input or deselect
    if (key === "escape") {
      if (isEditing) {
        e.target.blur();
      } else {
        clearSelection();
      }
      return;
    }

    // Skip remaining shortcuts if editing text
    if (isEditing) return;

    // ============ VIEW SHORTCUTS ============
    
    // Ctrl + 0: Reset zoom
    if (isMod && key === "0") {
      e.preventDefault();
      zoomReset();
      return;
    }

    // Ctrl + 1: Fit to screen (zoom to 100%)
    if (isMod && key === "1") {
      e.preventDefault();
      setZoom(1);
      return;
    }

    // Ctrl + +/=: Zoom in
    if (isMod && (key === "+" || key === "=")) {
      e.preventDefault();
      zoomIn();
      return;
    }

    // Ctrl + -: Zoom out
    if (isMod && key === "-") {
      e.preventDefault();
      zoomOut();
      return;
    }

    // ============ SELECTION SHORTCUTS ============

    // Ctrl + A: Select all
    if (isMod && key === "a") {
      e.preventDefault();
      const allIds = elements.map((el) => el.id);
      setSelection(allIds);
      return;
    }

    // Tab: Select next element
    if (key === "tab" && !isMod) {
      e.preventDefault();
      if (elements.length === 0) return;
      
      const currentIndex = selectedIds.length === 1 
        ? elements.findIndex((el) => el.id === selectedIds[0])
        : -1;
      
      const nextIndex = isShift
        ? (currentIndex - 1 + elements.length) % elements.length
        : (currentIndex + 1) % elements.length;
      
      setSelection([elements[nextIndex].id]);
      return;
    }

    // ============ EDITING SHORTCUTS ============

    // Delete/Backspace: Delete selected
    if ((key === "delete" || key === "backspace") && selectedIds.length > 0) {
      e.preventDefault();
      deleteElements(selectedIds);
      return;
    }

    // Ctrl + D: Duplicate
    if (isMod && key === "d" && selectedIds.length > 0) {
      e.preventDefault();
      duplicateElements(selectedIds);
      return;
    }

    // Ctrl + C: Copy
    if (isMod && key === "c" && !isShift && selectedIds.length > 0) {
      e.preventDefault();
      copyToClipboardStore();
      return;
    }

    // Ctrl + V: Paste
    if (isMod && key === "v") {
      e.preventDefault();
      pasteFromClipboard();
      return;
    }

    // Ctrl + X: Cut
    if (isMod && key === "x" && selectedIds.length > 0) {
      e.preventDefault();
      copyToClipboardStore();
      deleteElements(selectedIds);
      return;
    }

    // Ctrl + Z: Undo
    if (isMod && key === "z" && !isShift) {
      e.preventDefault();
      undo();
      return;
    }

    // Ctrl + Shift + Z or Ctrl + Y: Redo
    if ((isMod && key === "z" && isShift) || (isMod && key === "y")) {
      e.preventDefault();
      redo();
      return;
    }

    // ============ ELEMENT ORDER SHORTCUTS ============

    // Ctrl + ]: Bring forward
    if (isMod && key === "]" && !isShift && selectedIds.length === 1) {
      e.preventDefault();
      const index = elements.findIndex((el) => el.id === selectedIds[0]);
      if (index < elements.length - 1) {
        moveElement(selectedIds[0], null, index + 2);
      }
      return;
    }

    // Ctrl + [: Send backward
    if (isMod && key === "[" && !isShift && selectedIds.length === 1) {
      e.preventDefault();
      const index = elements.findIndex((el) => el.id === selectedIds[0]);
      if (index > 0) {
        moveElement(selectedIds[0], null, index - 1);
      }
      return;
    }

    // Ctrl + Shift + ]: Bring to front
    if (isMod && key === "]" && isShift && selectedIds.length === 1) {
      e.preventDefault();
      moveElement(selectedIds[0], null, elements.length);
      return;
    }

    // Ctrl + Shift + [: Send to back
    if (isMod && key === "[" && isShift && selectedIds.length === 1) {
      e.preventDefault();
      moveElement(selectedIds[0], null, 0);
      return;
    }

    // ============ ARROW KEYS: Nudge ============

    if (selectedIds.length > 0) {
      const nudgeAmount = isShift ? 10 : 1;
      
      if (key === "arrowup") {
        e.preventDefault();
        // Could add position nudging here if elements had position
        return;
      }
      if (key === "arrowdown") {
        e.preventDefault();
        return;
      }
      if (key === "arrowleft") {
        e.preventDefault();
        return;
      }
      if (key === "arrowright") {
        e.preventDefault();
        return;
      }
    }

    // ============ EXPORT SHORTCUTS ============

    // Ctrl + E: Export code
    if (isMod && key === "e") {
      e.preventDefault();
      onExportCode?.();
      return;
    }

    // Ctrl + Shift + C: Copy code of selection
    if (isMod && isShift && key === "c" && selectedIds.length > 0) {
      e.preventDefault();
      const element = getElementById(selectedIds[0]);
      if (element) {
        const code = generatePageCode([element], { componentName: "Component", includeImports: true });
        copyToClipboard(code);
      }
      return;
    }

    // ============ PANEL SHORTCUTS ============

    // Ctrl + /: Toggle left sidebar
    if (isMod && key === "/") {
      e.preventDefault();
      toggleLeftSidebar();
      return;
    }

    // Ctrl + .: Toggle right sidebar
    if (isMod && key === ".") {
      e.preventDefault();
      toggleRightSidebar();
      return;
    }

    // ============ DEVICE PREVIEW (number keys) ============

    // 1: Desktop
    if (key === "1" && !isMod && !isShift) {
      setDevicePreview("desktop");
      return;
    }

    // 2: Tablet
    if (key === "2" && !isMod && !isShift) {
      setDevicePreview("tablet");
      return;
    }

    // 3: Mobile
    if (key === "3" && !isMod && !isShift) {
      setDevicePreview("mobile");
      return;
    }

  }, [
    isEditableTarget,
    selectedIds,
    elements,
    getElementById,
    undo,
    redo,
    deleteElements,
    duplicateElements,
    copyToClipboardStore,
    pasteFromClipboard,
    clearSelection,
    setSelection,
    moveElement,
    zoomIn,
    zoomOut,
    zoomReset,
    setZoom,
    toggleLeftSidebar,
    toggleRightSidebar,
    setDevicePreview,
    onExportCode,
  ]);

  // Handle wheel for zoom
  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const currentZoom = useEditorStore.getState().ui.zoom;
      setZoom(Math.max(0.1, Math.min(3, currentZoom + delta)));
    }
  }, [setZoom]);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", handleWheel);
    };
  }, [enabled, handleKeyDown, handleWheel]);
}

/**
 * Keyboard shortcuts help dialog content
 */
export const keyboardShortcuts = [
  {
    category: "View",
    shortcuts: [
      { keys: ["Ctrl", "0"], description: "Reset zoom to 100%" },
      { keys: ["Ctrl", "+"], description: "Zoom in" },
      { keys: ["Ctrl", "-"], description: "Zoom out" },
      { keys: ["Ctrl", "Scroll"], description: "Zoom in/out" },
      { keys: ["1"], description: "Desktop preview" },
      { keys: ["2"], description: "Tablet preview" },
      { keys: ["3"], description: "Mobile preview" },
    ],
  },
  {
    category: "Selection",
    shortcuts: [
      { keys: ["Esc"], description: "Deselect all" },
      { keys: ["Ctrl", "A"], description: "Select all elements" },
      { keys: ["Tab"], description: "Select next element" },
      { keys: ["Shift", "Tab"], description: "Select previous element" },
    ],
  },
  {
    category: "Editing",
    shortcuts: [
      { keys: ["Delete"], description: "Delete selected" },
      { keys: ["Ctrl", "D"], description: "Duplicate" },
      { keys: ["Ctrl", "C"], description: "Copy" },
      { keys: ["Ctrl", "V"], description: "Paste" },
      { keys: ["Ctrl", "X"], description: "Cut" },
      { keys: ["Ctrl", "Z"], description: "Undo" },
      { keys: ["Ctrl", "Shift", "Z"], description: "Redo" },
    ],
  },
  {
    category: "Layer Order",
    shortcuts: [
      { keys: ["Ctrl", "]"], description: "Bring forward" },
      { keys: ["Ctrl", "["], description: "Send backward" },
      { keys: ["Ctrl", "Shift", "]"], description: "Bring to front" },
      { keys: ["Ctrl", "Shift", "["], description: "Send to back" },
    ],
  },
  {
    category: "Export",
    shortcuts: [
      { keys: ["Ctrl", "E"], description: "Export code" },
      { keys: ["Ctrl", "Shift", "C"], description: "Copy code of selection" },
    ],
  },
  {
    category: "Panels",
    shortcuts: [
      { keys: ["Ctrl", "/"], description: "Toggle left sidebar" },
      { keys: ["Ctrl", "."], description: "Toggle right sidebar" },
    ],
  },
];
