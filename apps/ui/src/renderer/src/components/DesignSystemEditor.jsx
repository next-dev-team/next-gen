import React from "react";
import { usePuckStore, shadcnTokenKeys } from "../stores/puckStore";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

const tokenGroups = [
  {
    title: "Surfaces",
    keys: ["background", "foreground", "card", "card-foreground", "popover", "popover-foreground"],
  },
  {
    title: "Brand",
    keys: ["primary", "primary-foreground", "secondary", "secondary-foreground", "accent", "accent-foreground"],
  },
  {
    title: "Status",
    keys: ["destructive", "destructive-foreground"],
  },
  {
    title: "Borders",
    keys: ["border", "input", "ring", "radius"],
  },
];

const labelize = (key) =>
  key
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");

export function DesignSystemEditor() {
  const {
    designSystem,
    setDesignMode,
    updateDesignTokens,
    updateTypography,
    resetDesignSystem,
  } = usePuckStore();

  const handleTokenChange = (mode, key, value) => {
    if (!shadcnTokenKeys.includes(key)) return;
    updateDesignTokens(mode, { [key]: value });
  };

  const activeTokens = designSystem.tokens?.[designSystem.mode] || {};

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Design System</h2>
          <p className="text-muted-foreground">
            Enterprise-grade design system manager with real-time accessibility checks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={designSystem.mode} onValueChange={setDesignMode}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Theme mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={resetDesignSystem}>
            Reset
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Typography</CardTitle>
            <CardDescription>Applies across blocks and components.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="ds-font">Font Family</Label>
              <Input
                id="ds-font"
                value={designSystem.fontFamily}
                onChange={(e) => updateTypography({ fontFamily: e.target.value })}
                placeholder="Inter, sans-serif"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ds-size">Base Font Size</Label>
              <Input
                id="ds-size"
                value={designSystem.baseFontSize}
                onChange={(e) => updateTypography({ baseFontSize: e.target.value })}
                placeholder="16px"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>Quick sanity check for tokens.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border p-4 bg-card text-card-foreground shadow-sm">
              <div className="text-sm text-muted-foreground">Card Surface</div>
              <div className="text-lg font-semibold">Enterprise Ready UI</div>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="destructive">Destructive</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
           <CardHeader>
            <CardTitle>Accessibility Audit</CardTitle>
            <CardDescription>WCAG 2.1 AA Contrast Checks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
               ["Background", "foreground", "background"],
               ["Primary", "primary-foreground", "primary"],
               ["Secondary", "secondary-foreground", "secondary"],
               ["Card", "card-foreground", "card"],
            ].map(([label, fgKey, bgKey]) => {
                const ratio = getContrastRatio(activeTokens[fgKey], activeTokens[bgKey]);
                const status = getWCAGStatus(ratio);
                return (
                    <div key={label} className="flex items-center justify-between text-sm border-b pb-2 last:border-0 last:pb-0">
                        <span>{label}</span>
                        <div className="flex items-center gap-2">
                            <span className="font-mono">{ratio ? ratio.toFixed(2) + ":1" : "N/A"}</span>
                            <span className={`font-bold ${status.color}`}>{status.label}</span>
                        </div>
                    </div>
                )
            })}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="light" className="w-full">
        <TabsList>
          <TabsTrigger value="light">Light Tokens</TabsTrigger>
          <TabsTrigger value="dark">Dark Tokens</TabsTrigger>
        </TabsList>

        {["light", "dark"].map((mode) => (
          <TabsContent key={mode} value={mode} className="mt-4">
            <div className="grid gap-6 md:grid-cols-2">
              {tokenGroups.map((group) => (
                <Card key={group.title}>
                  <CardHeader>
                    <CardTitle>{group.title}</CardTitle>
                    <CardDescription>
                      {mode === "light" ? "Light theme" : "Dark theme"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {group.keys.map((key) => (
                      <div key={key} className="grid gap-2">
                        <Label htmlFor={`${mode}-${key}`}>{labelize(key)}</Label>
                        <Input
                          id={`${mode}-${key}`}
                          value={designSystem.tokens?.[mode]?.[key] ?? ""}
                          onChange={(e) => handleTokenChange(mode, key, e.target.value)}
                          placeholder={key === "radius" ? "0.5rem" : "221.2 83.2% 53.3%"}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
