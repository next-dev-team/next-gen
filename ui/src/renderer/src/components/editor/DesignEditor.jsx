import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  PanelLeft,
  PanelRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  Monitor,
  Tablet,
  Smartphone,
  Code,
  Copy,
  Check,
  Undo2,
  Redo2,
  Trash2,
  Download,
} from "lucide-react";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { useEditorStore } from "../../stores/editorStore";
import { DesignPanel } from "./panels/DesignPanel";
import { PropertiesPanel } from "./panels/PropertiesPanel";
import { Canvas } from "./canvas/Canvas";
import { CodeExportDialog } from "./export/CodeExportDialog";

export function DesignEditor() {
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // UI state
  const zoom = useEditorStore((s) => s.ui.zoom);
  const leftSidebarOpen = useEditorStore((s) => s.ui.leftSidebarOpen);
  const rightSidebarOpen = useEditorStore((s) => s.ui.rightSidebarOpen);
  const devicePreview = useEditorStore((s) => s.ui.devicePreview);
  const leftSidebarWidth = useEditorStore((s) => s.ui.leftSidebarWidth);
  const rightSidebarWidth = useEditorStore((s) => s.ui.rightSidebarWidth);

  // Actions
  const toggleLeftSidebar = useEditorStore((s) => s.toggleLeftSidebar);
  const toggleRightSidebar = useEditorStore((s) => s.toggleRightSidebar);
  const zoomIn = useEditorStore((s) => s.zoomIn);
  const zoomOut = useEditorStore((s) => s.zoomOut);
  const zoomReset = useEditorStore((s) => s.zoomReset);
  const setDevicePreview = useEditorStore((s) => s.setDevicePreview);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const clearCanvas = useEditorStore((s) => s.clearCanvas);
  const deleteElements = useEditorStore((s) => s.deleteElements);
  const selectedIds = useEditorStore((s) => s.canvas.selectedIds);
  const history = useEditorStore((s) => s.canvas.history);

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if typing in input
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.isContentEditable
      ) {
        return;
      }

      const isMod = e.ctrlKey || e.metaKey;

      // Delete selected
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIds.length > 0) {
          e.preventDefault();
          deleteElements(selectedIds);
        }
      }

      // Undo
      if (isMod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Redo
      if ((isMod && e.key === "z" && e.shiftKey) || (isMod && e.key === "y")) {
        e.preventDefault();
        redo();
      }

      // Zoom
      if (isMod && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        zoomIn();
      }
      if (isMod && e.key === "-") {
        e.preventDefault();
        zoomOut();
      }
      if (isMod && e.key === "0") {
        e.preventDefault();
        zoomReset();
      }

      // Export code
      if (isMod && e.key === "e") {
        e.preventDefault();
        setCodeDialogOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIds, deleteElements, undo, redo, zoomIn, zoomOut, zoomReset]);

  const zoomPercent = `${Math.round(zoom * 100)}%`;

  const canvasMaxWidth =
    devicePreview === "mobile"
      ? 390
      : devicePreview === "tablet"
      ? 768
      : "100%";

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-hidden">
      {/* Top Toolbar */}
      <div className="h-12 border-b bg-muted/30 flex items-center justify-between px-2 shrink-0">
        {/* Left: Sidebar toggles & history */}
        <div className="flex items-center gap-1">
          <Button
            variant={leftSidebarOpen ? "secondary" : "ghost"}
            size="sm"
            onClick={toggleLeftSidebar}
            title="Toggle left panel"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <Button
            variant="ghost"
            size="sm"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Center: Zoom & Device controls */}
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1 rounded-md border bg-background p-1">
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={zoomOut}>
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-3 font-mono text-xs min-w-[60px]"
              onClick={zoomReset}
            >
              {zoomPercent}
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={zoomIn}>
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6 mx-2" />

          <div className="flex items-center gap-1 rounded-md border bg-background p-1">
            <Button
              variant={devicePreview === "desktop" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setDevicePreview("desktop")}
              title="Desktop"
            >
              <Monitor className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={devicePreview === "tablet" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setDevicePreview("tablet")}
              title="Tablet"
            >
              <Tablet className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={devicePreview === "mobile" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setDevicePreview("mobile")}
              title="Mobile"
            >
              <Smartphone className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Right: Export & sidebar toggle */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (selectedIds.length > 0) {
                deleteElements(selectedIds);
              }
            }}
            disabled={selectedIds.length === 0}
            title="Delete selected"
          >
            <Trash2 className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <Button
            variant="default"
            size="sm"
            className="gap-1.5"
            onClick={() => setCodeDialogOpen(true)}
          >
            <Code className="h-4 w-4" />
            Export Code
          </Button>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <Button
            variant={rightSidebarOpen ? "secondary" : "ghost"}
            size="sm"
            onClick={toggleRightSidebar}
            title="Toggle right panel"
          >
            <PanelRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Design Panel */}
        {leftSidebarOpen && (
          <div
            className="border-r bg-muted/10 flex flex-col shrink-0 overflow-hidden"
            style={{ width: leftSidebarWidth }}
          >
            <DesignPanel />
          </div>
        )}

        {/* Center - Canvas */}
        <div className="flex-1 relative overflow-hidden bg-[#0a0a0a]">
          <div className="absolute inset-0 overflow-auto p-8">
            <div
              className="mx-auto bg-background rounded-lg border shadow-2xl min-h-full"
              style={{
                maxWidth: canvasMaxWidth,
                transform: `scale(${zoom})`,
                transformOrigin: "top center",
              }}
            >
              <Canvas />
            </div>
          </div>
        </div>

        {/* Right Sidebar - Properties Panel */}
        {rightSidebarOpen && (
          <div
            className="border-l bg-muted/10 flex flex-col shrink-0 overflow-hidden"
            style={{ width: rightSidebarWidth }}
          >
            <PropertiesPanel />
          </div>
        )}
      </div>

      {/* Code Export Dialog */}
      <CodeExportDialog open={codeDialogOpen} onOpenChange={setCodeDialogOpen} />
    </div>
  );
}
