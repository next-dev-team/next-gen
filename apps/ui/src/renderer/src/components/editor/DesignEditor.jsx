import React, { useState } from "react";
import {
  PanelLeft,
  PanelRight,
  ZoomIn,
  ZoomOut,
  Monitor,
  Tablet,
  Smartphone,
  Code,
  Undo2,
  Redo2,
  Trash2,
  Eye,
  LayoutGrid,
  MousePointer2,
} from "lucide-react";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import { useEditorStore } from "../../stores/editorStore";
import { DesignPanel } from "./panels/DesignPanel";
import { PropertiesPanel } from "./panels/PropertiesPanel";
import { Canvas } from "./canvas/Canvas";
import { FreeformCanvas } from "./canvas/FreeformCanvas";
import { EnhancedCodeExportDialog as CodeExportDialog } from "./export/CodeExportDialog";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { KeyboardShortcutsDialog } from "./dialogs/KeyboardShortcutsDialog";

export function DesignEditor() {
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [canvasMode, setCanvasMode] = useState("layout"); // "layout" | "freeform"

  // UI state
  const zoom = useEditorStore((s) => s.ui.zoom);
  const leftSidebarOpen = useEditorStore((s) => s.ui.leftSidebarOpen);
  const rightSidebarOpen = useEditorStore((s) => s.ui.rightSidebarOpen);
  const devicePreview = useEditorStore((s) => s.ui.devicePreview);
  const leftSidebarWidth = useEditorStore((s) => s.ui.leftSidebarWidth);
  const rightSidebarWidth = useEditorStore((s) => s.ui.rightSidebarWidth);
  const previewMode = useEditorStore((s) => s.ui.previewMode);

  // Actions
  const toggleLeftSidebar = useEditorStore((s) => s.toggleLeftSidebar);
  const toggleRightSidebar = useEditorStore((s) => s.toggleRightSidebar);
  const zoomIn = useEditorStore((s) => s.zoomIn);
  const zoomOut = useEditorStore((s) => s.zoomOut);
  const zoomReset = useEditorStore((s) => s.zoomReset);
  const setDevicePreview = useEditorStore((s) => s.setDevicePreview);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const deleteElements = useEditorStore((s) => s.deleteElements);
  const clearCanvas = useEditorStore((s) => s.clearCanvas);
  const togglePreviewMode = useEditorStore((s) => s.togglePreviewMode);
  const selectedIds = useEditorStore((s) => s.canvas.selectedIds);
  const history = useEditorStore((s) => s.canvas.history);

  const canUndo = history?.past?.length > 0;
  const canRedo = history?.future?.length > 0;

  // Enhanced keyboard shortcuts hook (Figma-like)
  useKeyboardShortcuts({
    onExportCode: () => setCodeDialogOpen(true),
  });

  const zoomPercent = `${Math.round(zoom * 100)}%`;

  const canvasMaxWidth = (() => {
    switch (devicePreview) {
      case "mobile":
        return 390;
      case "tablet":
        return 768;
      case "desktop":
      default:
        return "100%";
    }
  })();

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
            title="Toggle left panel (Ctrl+/)"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <Button
            variant="ghost"
            size="sm"
            onClick={undo}
            disabled={previewMode || !canUndo}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={redo}
            disabled={previewMode || !canRedo}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Canvas Mode Toggle */}
          <div className="flex items-center gap-0.5 rounded-md border bg-background p-0.5">
            <Button
              variant={canvasMode === "layout" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2 gap-1"
              onClick={() => setCanvasMode("layout")}
              title="Layout Mode - drag blocks in order"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="text-xs">Layout</span>
            </Button>
            <Button
              variant={canvasMode === "freeform" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2 gap-1"
              onClick={() => setCanvasMode("freeform")}
              title="Freeform Mode - Figma-like free positioning"
            >
              <MousePointer2 className="h-3.5 w-3.5" />
              <span className="text-xs">Freeform</span>
            </Button>
          </div>
        </div>

        {/* Center: Zoom & Device controls */}
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1 rounded-md border bg-background p-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={zoomOut}
              title="Zoom out (Ctrl+-)"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-3 font-mono text-xs min-w-[60px]"
              onClick={zoomReset}
              title="Reset zoom (Ctrl+0)"
            >
              {zoomPercent}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={zoomIn}
              title="Zoom in (Ctrl++)"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>

          {canvasMode === "layout" && (
            <>
              <Separator orientation="vertical" className="h-6 mx-2" />

              <div className="flex items-center gap-1 rounded-md border bg-background p-1">
                <Button
                  variant={devicePreview === "desktop" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setDevicePreview("desktop")}
                  title="Desktop (1)"
                >
                  <Monitor className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant={devicePreview === "tablet" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setDevicePreview("tablet")}
                  title="Tablet (2)"
                >
                  <Tablet className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant={devicePreview === "mobile" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setDevicePreview("mobile")}
                  title="Mobile (3)"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Right: Export & sidebar toggle */}
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-2 px-2 mr-1">
            <Label
              htmlFor="preview-mode"
              className="text-xs font-medium text-muted-foreground cursor-pointer flex items-center gap-1.5"
            >
              {previewMode ? (
                <Eye className="h-4 w-4 text-primary" />
              ) : (
                <MousePointer2 className="h-4 w-4" />
              )}
              {previewMode ? "Preview" : "Editor"}
            </Label>
            <Switch
              id="preview-mode"
              checked={previewMode}
              onCheckedChange={togglePreviewMode}
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (selectedIds.length > 0) {
                deleteElements(selectedIds);
              }
            }}
            disabled={previewMode || selectedIds.length === 0}
            title="Delete selected (Del)"
          >
            <Trash2 className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Keyboard Shortcuts Help */}
          <KeyboardShortcutsDialog />

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
            title="Toggle right panel (Ctrl+.)"
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
          {(() => {
            switch (canvasMode) {
              case "layout":
                return (
                  /* Layout Mode - Original Canvas */
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
                );
              case "freeform":
                return (
                  /* Freeform Mode - Figma-like Canvas */
                  <div
                    className="absolute inset-0"
                    style={{
                      transform: `scale(${zoom})`,
                      transformOrigin: "top left",
                    }}
                  >
                    <FreeformCanvas />
                  </div>
                );
              default:
                return null;
            }
          })()}

          {/* Mode indicator overlay */}
          <div className="absolute bottom-4 right-4 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded border">
            {(() => {
              switch (canvasMode) {
                case "freeform":
                  return "Freeform: Click Add Element • Right-click to add • Drag to move";
                case "layout":
                default:
                  return "Layout: Drag blocks from sidebar • Ctrl+Scroll to zoom";
              }
            })()}
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
      <CodeExportDialog
        open={codeDialogOpen}
        onOpenChange={setCodeDialogOpen}
      />
    </div>
  );
}
