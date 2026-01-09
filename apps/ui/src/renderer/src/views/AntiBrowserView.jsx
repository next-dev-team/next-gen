import { Globe, Network, Settings2, Shield, ShieldCheck, Users } from "lucide-react";
import React, { useCallback, useState } from "react";
import { toast } from "sonner";
import BrowserProfilesPanel from "../components/BrowserProfilesPanel";
import ProxyManagementPanel from "../components/ProxyManagementPanel";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";
import { cn } from "../lib/utils";
import { getSecurityScore } from "../lib/securityScore";
import { useBrowserProfileStore } from "../stores/browserProfileStore";
import { useBrowserTabsStore } from "../stores/browserTabsStore";
import { useProxyStore } from "../stores/proxyStore";

/**
 * Anti-Browser Enterprise View
 * Main view with tabs for Proxy Management, Browser Profiles, and Browser
 */
export function AntiBrowserView({ children }) {
  const [activeMainTab, setActiveMainTab] = useState("browser");
  const [selectedProxyId, setSelectedProxyId] = useState(null);
  const activeProfileId = useBrowserProfileStore((s) => s.activeProfileId);
  const setActiveProfile = useBrowserProfileStore((s) => s.setActiveProfile);
  const profiles = useBrowserProfileStore((s) => s.profiles);
  const proxies = useProxyStore((s) => s.proxies);
  const openUrlTab = useBrowserTabsStore((s) => s.openUrlTab);

  const handleProxySelect = useCallback((id) => {
    setSelectedProxyId(id);
  }, []);

  const handleStartProfile = useCallback(
    (profileId) => {
      const profile = profiles.find((p) => p.id === profileId);
      if (!profile) return;

      setActiveProfile(profileId);

      const startUrl = String(profile?.settings?.startUrl || "").trim();
      if (startUrl) {
        openUrlTab(startUrl, profile.name);
      }

      toast.success(`Starting profile: ${profile.name}`, {
        description: profile.proxyId
          ? `With proxy assigned`
          : "No proxy configured",
      });

      // Switch to browser tab after starting
      setActiveMainTab("browser");
    },
    [openUrlTab, profiles, setActiveProfile]
  );

  const {
    stats,
    activeProxy,
    protectionChecks,
    protectionScore,
    checklistItems,
    improvementItems,
    normalizedScore,
    scoreLabel,
    scoreTone,
  } = getSecurityScore({ profiles, proxies, activeProfileId });

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Enterprise Header with Tabs */}
      <div className="flex items-center gap-4 border-b bg-linear-to-r from-background via-background to-muted/20 px-4 py-2">
        {/* Logo/Brand */}
        <div className="flex items-center gap-2 pr-4 border-r">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-linear-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/20">
            <Shield className="h-4 w-4" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold bg-linear-to-r from-indigo-400 to-pink-400 bg-clip-text text-transparent">
              Anti-Browser
            </h1>
            <p className="text-[10px] text-muted-foreground leading-tight">
              Enterprise Edition
            </p>
          </div>
        </div>

        {/* Main Navigation Tabs */}
        <Tabs
          value={activeMainTab}
          onValueChange={setActiveMainTab}
          className="flex-1"
        >
          <TabsList className="h-10 bg-muted/50 p-1">
            <TabsTrigger
              value="proxy"
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Network className="h-4 w-4" />
              <span className="hidden sm:inline">Proxy Management</span>
              <span className="sm:hidden">Proxy</span>
              {stats.proxies > 0 && (
                <span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-medium text-primary">
                  {stats.proxies}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="profiles"
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Browser Profiles</span>
              <span className="sm:hidden">Profiles</span>
              {stats.profiles > 0 && (
                <span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-medium text-primary">
                  {stats.profiles}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="browser"
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Browser</span>
              {stats.runningProfiles > 0 && (
                <span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-green-500/20 px-1.5 text-[10px] font-medium text-green-500">
                  {stats.runningProfiles}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="score"
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <ShieldCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Security Score</span>
              <span className="sm:hidden">Score</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Quick Stats */}
        <div className="hidden lg:flex items-center gap-4 pl-4 border-l">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>
                    {stats.activeProxies}/{stats.proxies}
                  </span>
                  <span className="hidden xl:inline">proxies</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {stats.activeProxies} active proxies of {stats.proxies} total
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>{stats.profiles}</span>
                  <span className="hidden xl:inline">profiles</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {stats.profiles} browser profiles configured
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Settings Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8">
                <Settings2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeMainTab === "proxy" && (
          <ProxyManagementPanel
            selectedProxyId={selectedProxyId}
            onSelectProxy={handleProxySelect}
          />
        )}

        {activeMainTab === "profiles" && (
          <BrowserProfilesPanel
            activeProfileId={activeProfileId}
            onStartProfile={handleStartProfile}
          />
        )}

        {activeMainTab === "browser" && (
          <div className="h-full">{children}</div>
        )}

        {activeMainTab === "score" && (
          <div className="h-full overflow-auto p-6">
            <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
              <Card className="border-muted/60">
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl">
                        Anti-Browser Security Score
                      </CardTitle>
                      <CardDescription>
                        Confidence indicator for your current protection setup.
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs uppercase">
                      {scoreLabel} Trust
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-4xl font-semibold">
                        {normalizedScore}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        of 100 secure points
                      </p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>Based on proxy routing and profile protections.</p>
                      <p>Enable more safeguards to improve trust.</p>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full transition-all", scoreTone)}
                      style={{ width: `${normalizedScore}%` }}
                    />
                  </div>
                  <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                    <div className="flex items-center justify-between rounded-md border border-muted/50 px-3 py-2">
                      <span>Profiles configured</span>
                      <span className="font-medium text-foreground">
                        {stats.profiles}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-muted/50 px-3 py-2">
                      <span>Active proxies</span>
                      <span className="font-medium text-foreground">
                        {stats.activeProxies}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-muted/50 px-3 py-2">
                      <span>Running profiles</span>
                      <span className="font-medium text-foreground">
                        {stats.runningProfiles}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-muted/50 px-3 py-2">
                      <span>Active profile</span>
                      <span className="font-medium text-foreground">
                        {activeProfileId ? "Selected" : "None"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-muted/50 px-3 py-2">
                      <span>Protection checks enabled</span>
                      <span className="font-medium text-foreground">
                        {protectionScore}/{protectionChecks.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-muted/50 px-3 py-2">
                      <span>Active proxy status</span>
                      <span className="font-medium text-foreground">
                        {activeProxy?.status || "Not set"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div className="grid gap-6">
                <Card className="border-muted/60">
                  <CardHeader>
                    <CardTitle className="text-lg">Network identity</CardTitle>
                    <CardDescription>
                      Basic IP and routing details for the active profile.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center justify-between rounded-md border border-muted/50 px-3 py-2">
                      <span>Exit IP / Host</span>
                      <span className="font-medium text-foreground">
                        {activeProxy?.host || "Not set"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-muted/50 px-3 py-2">
                      <span>Proxy type</span>
                      <span className="font-medium text-foreground">
                        {activeProxy?.type || "Not set"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-muted/50 px-3 py-2">
                      <span>Location</span>
                      <span className="font-medium text-foreground">
                        {activeProxy?.country || activeProxy?.city
                          ? `${activeProxy?.city || "Unknown"}, ${
                              activeProxy?.country || "Unknown"
                            }`
                          : "Unknown"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-muted/50 px-3 py-2">
                      <span>ISP</span>
                      <span className="font-medium text-foreground">
                        {activeProxy?.isp || "Unknown"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-muted/60">
                  <CardHeader>
                    <CardTitle className="text-lg">Protection coverage</CardTitle>
                    <CardDescription>
                      Shows which anti-fingerprint checks are active.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm">
                      {protectionChecks.map((check) => (
                        <li
                          key={check.id}
                          className="flex items-center justify-between"
                        >
                          <span>{check.label}</span>
                          <Badge variant={check.enabled ? "default" : "outline"}>
                            {check.enabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Card className="border-muted/60">
                <CardHeader>
                  <CardTitle className="text-lg">Next improvements</CardTitle>
                  <CardDescription>
                    Follow these steps to raise your security score.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-sm">
                    {improvementItems.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between"
                      >
                        <span>{item.label}</span>
                        <Badge variant={item.done ? "default" : "outline"}>
                          {item.done ? item.doneLabel : item.pendingLabel}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card className="border-muted/60">
                <CardHeader>
                  <CardTitle className="text-lg">Score checklist</CardTitle>
                  <CardDescription>
                    Improve trust by completing these safeguards.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-sm">
                    {checklistItems.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between"
                      >
                        <span>{item.label}</span>
                        <Badge variant={item.done ? "default" : "outline"}>
                          {item.done ? item.doneLabel : item.pendingLabel}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AntiBrowserView;
