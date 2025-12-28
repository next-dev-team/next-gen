import React, { useEffect, useRef, useState } from "react";
import {
  Search,
  Copy,
  Terminal,
  Maximize2,
  Check,
  Hammer,
  Book,
  Palette,
  FileJson,
  Shield,
  History,
  Download,
  Upload,
} from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { components } from "../data/components";
import { PuckEditor, PuckPreview } from "./PuckEditor";
import { DesignSystemEditor } from "./DesignSystemEditor";
import { usePuckStore } from "../stores/puckStore";

export default function ComponentBuilder() {
  const [mainTab, setMainTab] = useState("builder");
  const [selectedId, setSelectedId] = useState(components[0].id);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedCli, setCopiedCli] = useState(false);
  const [builderMode, setBuilderMode] = useState("editor");
  const [zoom, setZoom] = useState(1);
  const builderRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const [previewDevice, setPreviewDevice] = useState("desktop");
  const [newBlockName, setNewBlockName] = useState("");
  const [newBlockPreset, setNewBlockPreset] = useState("Card");
  const [templateName, setTemplateName] = useState("");
  const fileInputRef = useRef(null);

  const blockRegistry = usePuckStore((s) => s.blockRegistry);
  const registerBlock = usePuckStore((s) => s.registerBlock);
  const unregisterBlock = usePuckStore((s) => s.unregisterBlock);
  const addContentBlock = usePuckStore((s) => s.addContentBlock);
  const auditLog = usePuckStore((s) => s.auditLog);
  const clearAuditLog = usePuckStore((s) => s.clearAuditLog);
  const puckData = usePuckStore((s) => s.puckData);
  const setPuckData = usePuckStore((s) => s.setPuckData);
  const templates = usePuckStore((s) => s.templates);
  const saveTemplate = usePuckStore((s) => s.saveTemplate);
  const loadTemplate = usePuckStore((s) => s.loadTemplate);
  const deleteTemplate = usePuckStore((s) => s.deleteTemplate);
  const logAuditEvent = usePuckStore((s) => s.logAuditEvent);

  const selectedComponent =
    components.find((c) => c.id === selectedId) || components[0];

  const filteredComponents = components.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const copyToClipboard = (text, setCopied) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const previewMaxWidth =
    previewDevice === "mobile" ? 390 : previewDevice === "tablet" ? 768 : 1280;

  const clampZoom = (value) => Math.min(3, Math.max(0.25, value));

  const zoomIn = () => setZoom((z) => clampZoom(Number((z * 1.1).toFixed(3))));
  const zoomOut = () => setZoom((z) => clampZoom(Number((z / 1.1).toFixed(3))));
  const zoomReset = () => setZoom(1);

  const getLibraryKey = (component) => `Library__${component.id}`;

  const normalizeKey = (key) =>
    key
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9-_]/g, "");

  const addComponentToBuilder = (component) => {
    if (!component) return;
    addContentBlock(getLibraryKey(component));
    setMainTab("builder");
    setBuilderMode("editor");
  };

  useEffect(() => {
    const onWheel = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (mainTab !== "builder") return;

      const frameRoot = document.getElementById("frame-root");
      const inEditorCanvas = frameRoot ? frameRoot.contains(e.target) : false;
      const inPreviewCanvas = previewCanvasRef.current
        ? previewCanvasRef.current.contains(e.target)
        : false;

      if (!inEditorCanvas && !inPreviewCanvas) return;

      e.preventDefault();

      setZoom((prev) => {
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        return clampZoom(Number((prev * factor).toFixed(3)));
      });
    };

    window.addEventListener("wheel", onWheel, {
      passive: false,
      capture: true,
    });
    return () => window.removeEventListener("wheel", onWheel, true);
  }, [mainTab]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (mainTab !== "builder") return;

      const frameRoot = document.getElementById("frame-root");
      const active = document.activeElement;
      const inEditorCanvas = frameRoot
        ? frameRoot.contains(active) || frameRoot.contains(e.target)
        : false;
      const inPreviewCanvas = previewCanvasRef.current
        ? previewCanvasRef.current.contains(active) ||
          previewCanvasRef.current.contains(e.target)
        : false;

      if (!inEditorCanvas && !inPreviewCanvas) return;

      if (e.key === "0") {
        e.preventDefault();
        zoomReset();
        return;
      }

      if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        zoomOut();
        return;
      }

      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoomIn();
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [mainTab]);

  const zoomPercent = `${Math.round(zoom * 100)}%`;

  const handleAddBlock = () => {
    const trimmed = newBlockName.trim();
    if (!trimmed) return;
    registerBlock(trimmed, newBlockPreset);
    addContentBlock(normalizeKey(trimmed));
    setNewBlockName("");
    setMainTab("builder");
    setBuilderMode("editor");
  };

  const safeParseJson = (raw) => {
    if (typeof raw !== "string") return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  };

  const exportPageJson = () => {
    const data = puckData || { root: { props: {} }, content: [] };
    const serialized = JSON.stringify(data, null, 2);
    const blob = new Blob([serialized], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `page-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    logAuditEvent("page.export", { bytes: serialized.length });
  };

  const importPageJson = async (file) => {
    if (!file) return;
    const text = await file.text();
    const parsed = safeParseJson(text);
    if (!parsed || typeof parsed !== "object") return;
    const next = {
      root:
        parsed.root && typeof parsed.root === "object"
          ? parsed.root
          : { props: {} },
      content: Array.isArray(parsed.content) ? parsed.content : [],
    };
    setPuckData(next);
    logAuditEvent("page.import", { bytes: text.length });
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden rounded-lg border bg-background shadow-sm">
      <Tabs
        value={mainTab}
        onValueChange={setMainTab}
        className="flex flex-col h-full w-full"
      >
        <div className="border-b p-2 bg-muted/20">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="builder" className="gap-2">
              <Hammer className="h-4 w-4" />
              Page Builder
            </TabsTrigger>
            <TabsTrigger value="library" className="gap-2">
              <Book className="h-4 w-4" />
              Components
            </TabsTrigger>
            <TabsTrigger value="blocks" className="gap-2">
              <Hammer className="h-4 w-4" />
              Blocks
            </TabsTrigger>
            <TabsTrigger value="design-system" className="gap-2">
              <Palette className="h-4 w-4" />
              Design System
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <History className="h-4 w-4" />
              Audit
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="builder" className="flex-1 m-0 p-0 overflow-hidden">
          <div ref={builderRef} className="flex flex-col h-full w-full">
            <Tabs
              value={builderMode}
              onValueChange={setBuilderMode}
              className="flex flex-col h-full w-full"
            >
              <div className="border-b px-2 py-2 bg-muted/5 flex items-center justify-between gap-2">
                <TabsList className="bg-muted/50">
                  <TabsTrigger value="editor">Editor</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-8 gap-1"
                      >
                        <FileJson className="h-3.5 w-3.5" />
                        Templates
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Templates</DialogTitle>
                        <DialogDescription>
                          Save, load, export, and import page templates.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-3">
                          <div className="text-sm font-medium">
                            Save Current Page
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              value={templateName}
                              onChange={(e) =>
                                setTemplateName(e.currentTarget.value)
                              }
                              placeholder="Template name"
                            />
                            <Button
                              type="button"
                              onClick={() => {
                                const trimmed = templateName.trim();
                                if (!trimmed) return;
                                saveTemplate(trimmed, puckData);
                                logAuditEvent("template.save", {
                                  name: trimmed,
                                });
                                setTemplateName("");
                              }}
                            >
                              Save
                            </Button>
                          </div>

                          <div className="text-sm font-medium">Page JSON</div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              className="gap-1"
                              onClick={exportPageJson}
                            >
                              <Download className="h-3.5 w-3.5" />
                              Export
                            </Button>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="application/json"
                              className="hidden"
                              onChange={(e) =>
                                importPageJson(e.currentTarget.files?.[0])
                              }
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              className="gap-1"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <Upload className="h-3.5 w-3.5" />
                              Import
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="text-sm font-medium">
                            Saved Templates
                          </div>
                          <div className="rounded-md border overflow-hidden">
                            <ScrollArea className="h-[260px]">
                              {!templates || templates.length === 0 ? (
                                <div className="p-4 text-sm text-muted-foreground">
                                  No templates saved.
                                </div>
                              ) : (
                                <div className="divide-y">
                                  {templates.map((t) => (
                                    <div
                                      key={t.id}
                                      className="flex items-center justify-between gap-2 p-3"
                                    >
                                      <div className="min-w-0">
                                        <div className="font-medium truncate">
                                          {t.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {new Date(
                                            t.updatedAt || t.createdAt
                                          ).toLocaleString()}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          type="button"
                                          size="sm"
                                          onClick={() => loadTemplate(t.id)}
                                        >
                                          Load
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="destructive"
                                          onClick={() => deleteTemplate(t.id)}
                                        >
                                          Delete
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </ScrollArea>
                          </div>
                        </div>
                      </div>

                      <DialogFooter>
                        <DialogClose asChild>
                          <Button type="button" variant="secondary">
                            Close
                          </Button>
                        </DialogClose>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <div className="flex items-center gap-1 rounded-md border bg-background p-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={zoomOut}
                    >
                      -
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 font-mono"
                      onClick={zoomReset}
                    >
                      {zoomPercent}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={zoomIn}
                    >
                      +
                    </Button>
                  </div>

                  <div className="hidden sm:flex items-center gap-1 rounded-md border bg-background p-1">
                    <Button
                      type="button"
                      variant={
                        previewDevice === "mobile" ? "secondary" : "ghost"
                      }
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => setPreviewDevice("mobile")}
                    >
                      Mobile
                    </Button>
                    <Button
                      type="button"
                      variant={
                        previewDevice === "tablet" ? "secondary" : "ghost"
                      }
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => setPreviewDevice("tablet")}
                    >
                      Tablet
                    </Button>
                    <Button
                      type="button"
                      variant={
                        previewDevice === "desktop" ? "secondary" : "ghost"
                      }
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => setPreviewDevice("desktop")}
                    >
                      Desktop
                    </Button>
                  </div>
                </div>
              </div>

              <TabsContent
                value="editor"
                className="flex-1 m-0 p-0 min-h-0 overflow-hidden"
              >
                <div className="h-full w-full overflow-auto">
                  <div
                    className="puck-zoom-scope"
                    style={{ "--puck-zoom": String(zoom) }}
                  >
                    <PuckEditor />
                  </div>
                </div>
              </TabsContent>

              <TabsContent
                value="preview"
                className="flex-1 m-0 p-0 min-h-0 overflow-hidden"
              >
                <div className="h-full w-full overflow-auto bg-muted/20">
                  <div className="p-6">
                    <div
                      className="mx-auto w-full rounded-lg border bg-background shadow-sm"
                      style={{ maxWidth: previewMaxWidth }}
                    >
                      <div ref={previewCanvasRef} style={{ zoom }}>
                        <PuckPreview />
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>

        <TabsContent value="blocks" className="flex-1 overflow-hidden m-0 p-0">
          <ScrollArea className="h-full w-full">
            <div className="p-6 space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Input
                  placeholder="Block name"
                  value={newBlockName}
                  onChange={(e) => setNewBlockName(e.currentTarget.value)}
                />
                <Select
                  value={newBlockPreset}
                  onValueChange={setNewBlockPreset}
                >
                  <SelectTrigger className="sm:w-[220px]">
                    <SelectValue placeholder="Preset" />
                  </SelectTrigger>
                  <SelectContent>
                    {["Card", "Hero", "Button", "Badge", "Input"].map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  onClick={handleAddBlock}
                  className="sm:w-[140px]"
                >
                  Add Block
                </Button>
              </div>

              <div className="space-y-3">
                {Object.keys(blockRegistry || {}).length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No custom blocks
                  </div>
                ) : (
                  Object.entries(blockRegistry).map(([key, entry]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-3 rounded-md border bg-card p-3"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {entry?.name || key}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {entry?.preset || "Card"}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => unregisterBlock(key)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent
          value="library"
          className="flex-1 overflow-hidden m-0 p-0 relative"
        >
          <div className="absolute inset-0 flex h-full w-full overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 border-r bg-muted/10 flex flex-col h-full">
              <div className="p-4 border-b">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search components..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {[
                    "Inputs",
                    "Surfaces",
                    "Feedback",
                    "Data Display",
                    "Navigation",
                  ].map((category) => {
                    const categoryComponents = filteredComponents.filter(
                      (c) => c.category === category
                    );
                    if (categoryComponents.length === 0) return null;
                    return (
                      <div key={category}>
                        <h4 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {category}
                        </h4>
                        <div className="space-y-1">
                          {categoryComponents.map((component) => (
                            <Button
                              key={component.id}
                              variant={
                                selectedId === component.id
                                  ? "secondary"
                                  : "ghost"
                              }
                              className="w-full justify-start text-sm"
                              onClick={() => setSelectedId(component.id)}
                            >
                              {component.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {filteredComponents.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      No components found
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
              <div className="p-6 border-b flex justify-between items-start bg-card shrink-0">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    {selectedComponent.name}
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    {selectedComponent.description}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-8"
                    onClick={() => addComponentToBuilder(selectedComponent)}
                  >
                    Add to Builder
                  </Button>
                  <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-1.5 text-xs font-mono text-muted-foreground border">
                    <Terminal className="h-3.5 w-3.5" />
                    {selectedComponent.cli}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 ml-2 hover:bg-background"
                      onClick={() =>
                        copyToClipboard(selectedComponent.cli, setCopiedCli)
                      }
                    >
                      {copiedCli ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <Tabs
                defaultValue="preview"
                className="flex-1 flex flex-col overflow-hidden"
              >
                <div className="px-6 border-b flex items-center justify-between bg-muted/5 shrink-0">
                  <TabsList className="my-2 bg-muted/50">
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                    <TabsTrigger value="code">Code</TabsTrigger>
                  </TabsList>
                  <div className="flex items-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 gap-1">
                          <Maximize2 className="h-3.5 w-3.5" />
                          Expand
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-[90vw] h-[90vh] flex flex-col p-0 gap-0">
                        <div className="p-4 border-b flex items-center justify-between">
                          <h3 className="font-semibold">
                            {selectedComponent.name}
                          </h3>
                        </div>
                        <div className="flex-1 flex items-center justify-center bg-muted/20 p-8 overflow-auto">
                          {selectedComponent.preview}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <TabsContent
                  value="preview"
                  className="flex-1 m-0 p-0 relative overflow-hidden"
                >
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/20 p-8 overflow-auto">
                    <div className="scale-100 transition-transform">
                      {selectedComponent.preview}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent
                  value="code"
                  className="flex-1 m-0 p-0 relative overflow-hidden"
                >
                  <div className="absolute inset-0">
                    <ScrollArea className="h-full w-full">
                      <div className="relative">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="absolute right-4 top-4 h-8 gap-1 z-10"
                          onClick={() =>
                            copyToClipboard(
                              selectedComponent.code,
                              setCopiedCode
                            )
                          }
                        >
                          {copiedCode ? (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          Copy
                        </Button>
                        <pre className="p-6 text-sm font-mono leading-relaxed">
                          {selectedComponent.code}
                        </pre>
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </TabsContent>

        <TabsContent
          value="design-system"
          className="flex-1 overflow-hidden m-0 p-0 relative"
        >
          <ScrollArea className="h-full w-full">
            <DesignSystemEditor />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="audit" className="flex-1 overflow-auto p-4">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">Audit Log</h2>
                <p className="text-muted-foreground">
                  Track system changes and user actions.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={clearAuditLog}
                disabled={!auditLog || auditLog.length === 0}
              >
                Clear
              </Button>
            </div>
            <div className="rounded-md border">
              <div className="grid grid-cols-4 gap-4 p-4 font-medium border-b bg-muted/50">
                <div>Timestamp</div>
                <div>User</div>
                <div className="col-span-2">Action</div>
              </div>
              <ScrollArea className="h-[500px]">
                {!auditLog || auditLog.length === 0 ? (
                  <div className="p-8 text-sm text-muted-foreground text-center">
                    No audit events yet.
                  </div>
                ) : (
                  auditLog.map((log) => (
                    <div
                      key={log.id}
                      className="grid grid-cols-4 gap-4 p-4 border-b last:border-0 text-sm"
                    >
                      <div className="text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                      <div className="font-medium">
                        {log.user}
                        {log.role ? (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {log.role}
                          </span>
                        ) : null}
                      </div>
                      <div className="col-span-2">{log.action}</div>
                    </div>
                  ))
                )}
              </ScrollArea>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
