import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileJson, Play, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import { Switch } from "../ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { cn } from "../../lib/utils";
import { useBrowserTabsStore } from "../../stores/browserTabsStore";
import * as gen from "@gen";

function safeJsonParse(text) {
  const raw = String(text ?? "").trim();
  if (!raw) return { ok: true, value: {} };
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch (err) {
    return { ok: false, error: err };
  }
}

function prettyJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function extractFirstHttpUrl(text) {
  const raw = String(text ?? "");
  const match = raw.match(/https?:\/\/[^\s'"`]+/i);
  return match ? match[0] : "";
}

function TextArea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        "min-h-[7rem] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

function HookRunner({ hookName, hookFn, paramsText, autoRun, useMockClient }) {
  const queryClient = useQueryClient();
  const needsParams = useMemo(() => Number(hookFn?.length || 0) >= 1, [hookFn]);
  const parsedParams = useMemo(() => safeJsonParse(paramsText), [paramsText]);
  const [mockText, setMockText] = useState("{}");
  const parsedMockText = useMemo(() => safeJsonParse(mockText), [mockText]);

  const enabled = Boolean(
    autoRun &&
      !useMockClient &&
      (needsParams ? Boolean(parsedParams.ok) : true)
  );

  const queryOptions = useMemo(
    () => ({ enabled, retry: false }),
    [enabled]
  );

  const query = needsParams
    ? hookFn(parsedParams.ok ? parsedParams.value : {}, { query: queryOptions })
    : hookFn({ query: queryOptions });

  const clearCache = useCallback(() => {
    if (!query?.queryKey) return;
    queryClient.removeQueries({ queryKey: query.queryKey });
  }, [query?.queryKey, queryClient]);

  const run = useCallback(() => {
    if (!query?.refetch) return;
    query.refetch();
  }, [query]);

  const applyMock = useCallback(() => {
    if (!query?.queryKey) return;
    if (!parsedMockText.ok) {
      toast.error("Invalid mock JSON", {
        description: String(parsedMockText.error?.message || parsedMockText.error),
      });
      return;
    }
    queryClient.setQueryData(query.queryKey, parsedMockText.value);
  }, [parsedMockText, query?.queryKey, queryClient]);

  const errorText =
    query?.error != null
      ? query.error?.message
        ? String(query.error.message)
        : prettyJson(query.error)
      : "";

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileJson className="h-4 w-4 text-muted-foreground" />
            <div className="truncate text-sm font-medium">{hookName}</div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {needsParams ? "Params + options" : "Options"}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={run}
            disabled={useMockClient || (needsParams && !parsedParams.ok)}
          >
            <Play className="mr-2 h-4 w-4" />
            Run
          </Button>
          <Button size="sm" variant="outline" onClick={clearCache}
            disabled={!query?.queryKey}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Badge variant={autoRun ? "secondary" : "outline"}>auto</Badge>
          <Badge variant={useMockClient ? "secondary" : "outline"}>mock</Badge>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Badge variant={query?.isFetching ? "secondary" : "outline"}>
            {query?.isFetching ? "fetching" : "idle"}
          </Badge>
          {query?.isSuccess ? <Badge>success</Badge> : null}
          {query?.isError ? <Badge variant="destructive">error</Badge> : null}
        </div>
      </div>

      {needsParams ? (
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Params (JSON)</Label>
            {!parsedParams.ok ? (
              <span className="text-xs text-destructive">Invalid JSON</span>
            ) : null}
          </div>
          <TextArea
            value={paramsText}
            readOnly
            className="min-h-[6rem] font-mono text-[12px]"
          />
        </div>
      ) : null}

      {useMockClient ? (
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Mock response (JSON)</Label>
            <Button
              size="sm"
              variant="outline"
              onClick={applyMock}
              disabled={!query?.queryKey}
            >
              Apply
            </Button>
          </div>
          <TextArea
            value={mockText}
            onChange={(e) => setMockText(e.target.value)}
            className="min-h-[7rem] font-mono text-[12px]"
          />
          {!parsedMockText.ok ? (
            <div className="text-xs text-destructive">
              {String(parsedMockText.error?.message || parsedMockText.error)}
            </div>
          ) : null}
        </div>
      ) : null}

      <Separator />

      <div className="grid gap-2">
        <Label className="text-xs">Result</Label>
        <ScrollArea className="flex-1 rounded-md border bg-muted/20">
          <pre className="p-3 text-[12px] leading-relaxed">
            {query?.isError ? errorText : prettyJson(query?.data)}
          </pre>
        </ScrollArea>
      </div>
    </div>
  );
}

export default function KubbHooksPlaygroundPanel() {
  const kubbPlayground = useBrowserTabsStore((s) => s.kubbPlayground);
  const setKubbPlaygroundState = useBrowserTabsStore(
    (s) => s.setKubbPlaygroundState
  );

  const [includeSuspense, setIncludeSuspense] = useState(false);

  const allHooks = useMemo(() => {
    return Object.entries(gen)
      .filter(([name, value]) => name.startsWith("use") && typeof value === "function")
      .map(([name, value]) => ({ name, fn: value }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const filteredHooks = useMemo(() => {
    const q = String(kubbPlayground?.hooksSearch || "")
      .trim()
      .toLowerCase();
    return allHooks.filter((h) => {
      if (!includeSuspense && /suspense/i.test(h.name)) return false;
      if (!q) return true;
      return h.name.toLowerCase().includes(q);
    });
  }, [allHooks, includeSuspense, kubbPlayground?.hooksSearch]);

  const selected = useMemo(() => {
    const id = String(kubbPlayground?.selectedHookId || "");
    return filteredHooks.find((h) => h.name === id) || null;
  }, [filteredHooks, kubbPlayground?.selectedHookId]);

  useEffect(() => {
    if (selected || filteredHooks.length === 0) return;
    setKubbPlaygroundState({ selectedHookId: filteredHooks[0].name });
  }, [filteredHooks, selected, setKubbPlaygroundState]);

  useEffect(() => {
    const mode = String(kubbPlayground?.configMode || "path");
    const errors = [];
    if (mode === "path") {
      if (!String(kubbPlayground?.configPath || "").trim()) {
        errors.push("Config path is required");
      }
    }
    if (mode === "text") {
      if (!String(kubbPlayground?.configText || "").trim()) {
        errors.push("Config text is required");
      }
    }
    if (mode === "url") {
      const url = String(kubbPlayground?.openApiUrl || "").trim();
      if (!/^https?:\/\//i.test(url)) {
        errors.push("OpenAPI URL must start with http:// or https://");
      }
    }

    const prev = Array.isArray(kubbPlayground?.validationErrors)
      ? kubbPlayground.validationErrors
      : [];
    const same =
      prev.length === errors.length && prev.every((e, i) => e === errors[i]);
    if (!same) setKubbPlaygroundState({ validationErrors: errors });
  }, [kubbPlayground, setKubbPlaygroundState]);

  const extractUrl = useCallback(() => {
    const found = extractFirstHttpUrl(kubbPlayground?.configText);
    if (!found) {
      toast.error("No URL found in config text");
      return;
    }
    setKubbPlaygroundState({ openApiUrl: found });
    toast.success("OpenAPI URL extracted");
  }, [kubbPlayground?.configText, setKubbPlaygroundState]);

  const setHooksSearch = useCallback(
    (value) => setKubbPlaygroundState({ hooksSearch: value }),
    [setKubbPlaygroundState]
  );

  const setParamsText = useCallback(
    (value) => setKubbPlaygroundState({ paramsText: value }),
    [setKubbPlaygroundState]
  );

  const setSelectedHook = useCallback(
    (name) => setKubbPlaygroundState({ selectedHookId: name }),
    [setKubbPlaygroundState]
  );

  const activeSubTab = String(kubbPlayground?.activeSubTab || "kubb-hooks");

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">Kubb Hooks</div>
          <div className="text-xs text-muted-foreground truncate">
            Run generated React Query hooks and inspect results
          </div>
        </div>
        <Tabs
          value={activeSubTab}
          onValueChange={(v) => setKubbPlaygroundState({ activeSubTab: v })}
        >
          <TabsList>
            <TabsTrigger value="kubb-hooks">Hooks</TabsTrigger>
            <TabsTrigger value="openapi-url">Config</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="min-h-0 flex-1">
        <Tabs value={activeSubTab} className="h-full">
          <TabsContent value="kubb-hooks" className="m-0 h-full">
            <div className="flex h-full min-h-0">
              <div className="flex w-[320px] flex-col border-r">
                <div className="p-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={kubbPlayground?.hooksSearch || ""}
                      onChange={(e) => setHooksSearch(e.target.value)}
                      placeholder="Search hooks"
                      className="pl-9"
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={includeSuspense}
                        onCheckedChange={setIncludeSuspense}
                      />
                      <Label className="text-xs">Include suspense</Label>
                    </div>
                    <Badge variant="outline" className="text-[11px]">
                      {filteredHooks.length}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <ScrollArea className="flex-1">
                  <div className="flex flex-col p-2">
                    {filteredHooks.map((h) => {
                      const isActive = h.name === kubbPlayground?.selectedHookId;
                      return (
                        <button
                          key={h.name}
                          type="button"
                          className={cn(
                            "flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-xs transition-colors",
                            isActive
                              ? "bg-accent text-accent-foreground"
                              : "hover:bg-accent/70"
                          )}
                          onClick={() => setSelectedHook(h.name)}
                        >
                          <span className="truncate">{h.name}</span>
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {Number(h.fn?.length || 0) >= 1 ? "params" : ""}
                          </span>
                        </button>
                      );
                    })}
                    {filteredHooks.length === 0 ? (
                      <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                        No hooks found.
                      </div>
                    ) : null}
                  </div>
                </ScrollArea>
              </div>

              <div className="min-w-0 flex-1">
                {selected ? (
                  <div className="flex h-full flex-col">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={Boolean(kubbPlayground?.autoRun)}
                          onCheckedChange={(v) =>
                            setKubbPlaygroundState({ autoRun: Boolean(v) })
                          }
                          disabled={Boolean(kubbPlayground?.useMockClient)}
                        />
                        <Label className="text-xs">Auto-run</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={Boolean(kubbPlayground?.useMockClient)}
                          onCheckedChange={(v) =>
                            setKubbPlaygroundState({ useMockClient: Boolean(v) })
                          }
                        />
                        <Label className="text-xs">Mock data</Label>
                      </div>
                      <div className="flex-1" />
                      <Badge variant="outline" className="text-[11px]">
                        {Number(selected.fn?.length || 0) >= 1
                          ? "params + options"
                          : "options"}
                      </Badge>
                    </div>

                    <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-2">
                      <div className="min-h-0 border-b lg:border-b-0 lg:border-r">
                        <div className="p-4">
                          <Label className="text-xs">Params (JSON)</Label>
                          <TextArea
                            value={kubbPlayground?.paramsText || "{}"}
                            onChange={(e) => setParamsText(e.target.value)}
                            className="mt-2 min-h-[10rem] font-mono text-[12px]"
                            placeholder='{"id": 1}'
                          />
                        </div>
                      </div>

                      <div className="min-h-0">
                        <HookRunner
                          key={selected.name}
                          hookName={selected.name}
                          hookFn={selected.fn}
                          paramsText={kubbPlayground?.paramsText || "{}"}
                          autoRun={Boolean(kubbPlayground?.autoRun)}
                          useMockClient={Boolean(kubbPlayground?.useMockClient)}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-sm text-muted-foreground">
                    Select a hook to run.
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="openapi-url" className="m-0 h-full">
            <div className="flex h-full flex-col gap-4 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant={
                    kubbPlayground?.configMode === "path" ? "secondary" : "outline"
                  }
                  onClick={() => setKubbPlaygroundState({ configMode: "path" })}
                >
                  Path
                </Button>
                <Button
                  size="sm"
                  variant={
                    kubbPlayground?.configMode === "text" ? "secondary" : "outline"
                  }
                  onClick={() => setKubbPlaygroundState({ configMode: "text" })}
                >
                  Text
                </Button>
                <Button
                  size="sm"
                  variant={
                    kubbPlayground?.configMode === "url" ? "secondary" : "outline"
                  }
                  onClick={() => setKubbPlaygroundState({ configMode: "url" })}
                >
                  OpenAPI URL
                </Button>
              </div>

              {kubbPlayground?.configMode === "path" ? (
                <div className="grid gap-2">
                  <Label className="text-xs">Kubb config path</Label>
                  <Input
                    value={kubbPlayground?.configPath || ""}
                    onChange={(e) =>
                      setKubbPlaygroundState({ configPath: e.target.value })
                    }
                    placeholder="ui/kubb.config.ts"
                  />
                </div>
              ) : null}

              {kubbPlayground?.configMode === "text" ? (
                <div className="grid gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs">Kubb config text</Label>
                    <Button size="sm" variant="outline" onClick={extractUrl}>
                      Extract URL
                    </Button>
                  </div>
                  <TextArea
                    value={kubbPlayground?.configText || ""}
                    onChange={(e) =>
                      setKubbPlaygroundState({ configText: e.target.value })
                    }
                    className="min-h-[14rem] font-mono text-[12px]"
                    placeholder="Paste kubb.config.ts contents"
                  />
                </div>
              ) : null}

              <div className="grid gap-2">
                <Label className="text-xs">OpenAPI URL</Label>
                <Input
                  value={kubbPlayground?.openApiUrl || ""}
                  onChange={(e) =>
                    setKubbPlaygroundState({ openApiUrl: e.target.value })
                  }
                  placeholder="https://example.com/openapi.json"
                />
                <div className="text-xs text-muted-foreground">
                  This panel does not regenerate hooks yet; it stores config inputs
                </div>
              </div>

              {Array.isArray(kubbPlayground?.validationErrors) &&
              kubbPlayground.validationErrors.length > 0 ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
                  <div className="text-sm font-medium text-destructive">
                    Validation
                  </div>
                  <ul className="mt-2 list-disc pl-5 text-xs text-destructive">
                    {kubbPlayground.validationErrors.map((e, idx) => (
                      <li key={`${idx}-${e}`}>{e}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  No validation issues.
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
