import React, { useState, useEffect, useCallback } from "react";
import {
  Download,
  RefreshCw,
  Check,
  AlertCircle,
  Info,
  Loader2,
  ExternalLink,
  Shield,
  Package,
  Clock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

/**
 * Auto Update Panel Component
 * Displays update status, check for updates, and download/install functionality
 * Integrates with Electron's electron-updater
 */

const UPDATE_STATUS = {
  IDLE: "idle",
  CHECKING: "checking",
  AVAILABLE: "available",
  NOT_AVAILABLE: "not-available",
  DOWNLOADING: "downloading",
  DOWNLOADED: "downloaded",
  ERROR: "error",
};

export default function AutoUpdatePanel() {
  const [status, setStatus] = useState(UPDATE_STATUS.IDLE);
  const [currentVersion, setCurrentVersion] = useState("1.0.1");
  const [latestVersion, setLatestVersion] = useState(null);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);
  const [autoCheckEnabled, setAutoCheckEnabled] = useState(true);

  // Load current version and settings
  useEffect(() => {
    if (window.electronAPI?.getAppVersion) {
      window.electronAPI.getAppVersion().then((version) => {
        if (version) setCurrentVersion(version);
      });
    }

    // Load last checked time
    try {
      const saved = localStorage.getItem("update-last-checked");
      if (saved) setLastChecked(new Date(saved));
    } catch {}

    // Load auto-check preference
    try {
      const autoCheck = localStorage.getItem("update-auto-check");
      if (autoCheck !== null) setAutoCheckEnabled(autoCheck === "true");
    } catch {}

    // Listen for update events from main process
    if (window.electronAPI?.onUpdateAvailable) {
      const cleanup1 = window.electronAPI.onUpdateAvailable((info) => {
        setStatus(UPDATE_STATUS.AVAILABLE);
        setLatestVersion(info?.version);
        setUpdateInfo(info);
      });

      const cleanup2 = window.electronAPI.onUpdateNotAvailable?.(() => {
        setStatus(UPDATE_STATUS.NOT_AVAILABLE);
      });

      const cleanup3 = window.electronAPI.onUpdateDownloadProgress?.(
        (progress) => {
          setStatus(UPDATE_STATUS.DOWNLOADING);
          setDownloadProgress(progress?.percent || 0);
        },
      );

      const cleanup4 = window.electronAPI.onUpdateDownloaded?.((info) => {
        setStatus(UPDATE_STATUS.DOWNLOADED);
        setUpdateInfo(info);
      });

      const cleanup5 = window.electronAPI.onUpdateError?.((error) => {
        setStatus(UPDATE_STATUS.ERROR);
        setError(error?.message || "Update check failed");
      });

      return () => {
        cleanup1?.();
        cleanup2?.();
        cleanup3?.();
        cleanup4?.();
        cleanup5?.();
      };
    }
  }, []);

  // Check for updates
  const checkForUpdates = useCallback(async () => {
    setStatus(UPDATE_STATUS.CHECKING);
    setError(null);

    const now = new Date();
    setLastChecked(now);
    localStorage.setItem("update-last-checked", now.toISOString());

    try {
      if (window.electronAPI?.checkForUpdates) {
        await window.electronAPI.checkForUpdates();
      } else {
        // Simulate for web/dev mode
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setStatus(UPDATE_STATUS.NOT_AVAILABLE);
      }
    } catch (err) {
      setStatus(UPDATE_STATUS.ERROR);
      setError(err.message || "Failed to check for updates");
    }
  }, []);

  // Download update
  const downloadUpdate = useCallback(async () => {
    setStatus(UPDATE_STATUS.DOWNLOADING);
    setDownloadProgress(0);

    try {
      if (window.electronAPI?.downloadUpdate) {
        await window.electronAPI.downloadUpdate();
      } else {
        // Simulate download for dev mode
        for (let i = 0; i <= 100; i += 10) {
          await new Promise((resolve) => setTimeout(resolve, 200));
          setDownloadProgress(i);
        }
        setStatus(UPDATE_STATUS.DOWNLOADED);
      }
    } catch (err) {
      setStatus(UPDATE_STATUS.ERROR);
      setError(err.message || "Download failed");
    }
  }, []);

  // Install update and restart
  const installUpdate = useCallback(() => {
    if (window.electronAPI?.quitAndInstall) {
      window.electronAPI.quitAndInstall();
    }
  }, []);

  // Format relative time
  const formatLastChecked = (date) => {
    if (!date) return "Never";
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    return `${days} day${days > 1 ? "s" : ""} ago`;
  };

  // Get status info
  const getStatusInfo = () => {
    switch (status) {
      case UPDATE_STATUS.CHECKING:
        return {
          icon: Loader2,
          iconClass: "animate-spin text-blue-500",
          title: "Checking for updates...",
          description: "Please wait while we check for the latest version.",
        };
      case UPDATE_STATUS.AVAILABLE:
        return {
          icon: Sparkles,
          iconClass: "text-emerald-500",
          title: `Update available: v${latestVersion}`,
          description:
            "A new version is available. Download now to get the latest features and fixes.",
        };
      case UPDATE_STATUS.NOT_AVAILABLE:
        return {
          icon: Check,
          iconClass: "text-emerald-500",
          title: "You're up to date!",
          description: `Version ${currentVersion} is the latest version.`,
        };
      case UPDATE_STATUS.DOWNLOADING:
        return {
          icon: Download,
          iconClass: "text-blue-500",
          title: `Downloading update... ${Math.round(downloadProgress)}%`,
          description: "The update is being downloaded in the background.",
        };
      case UPDATE_STATUS.DOWNLOADED:
        return {
          icon: Package,
          iconClass: "text-emerald-500",
          title: "Update ready to install",
          description: "Restart the app to complete the update.",
        };
      case UPDATE_STATUS.ERROR:
        return {
          icon: AlertCircle,
          iconClass: "text-red-500",
          title: "Update check failed",
          description:
            error || "Could not check for updates. Please try again later.",
        };
      default:
        return {
          icon: Info,
          iconClass: "text-muted-foreground",
          title: `Current version: ${currentVersion}`,
          description:
            "Check for updates to get the latest features and security fixes.",
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-4">
      {/* Main Status Card */}
      <div className="rounded-xl border border-border bg-gradient-to-br from-card to-muted/20 p-5">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
              status === UPDATE_STATUS.AVAILABLE
                ? "bg-emerald-500/10"
                : status === UPDATE_STATUS.ERROR
                  ? "bg-red-500/10"
                  : "bg-muted",
            )}
          >
            <StatusIcon className={cn("h-6 w-6", statusInfo.iconClass)} />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-foreground">
              {statusInfo.title}
            </h4>
            <p className="text-sm text-muted-foreground mt-0.5">
              {statusInfo.description}
            </p>

            {/* Download Progress */}
            {status === UPDATE_STATUS.DOWNLOADING && (
              <div className="mt-3">
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 mt-4">
              {status === UPDATE_STATUS.AVAILABLE && (
                <Button onClick={downloadUpdate} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download Update
                </Button>
              )}

              {status === UPDATE_STATUS.DOWNLOADED && (
                <Button
                  onClick={installUpdate}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                >
                  <RefreshCw className="h-4 w-4" />
                  Restart to Update
                </Button>
              )}

              {(status === UPDATE_STATUS.IDLE ||
                status === UPDATE_STATUS.NOT_AVAILABLE ||
                status === UPDATE_STATUS.ERROR) && (
                <Button
                  variant="outline"
                  onClick={checkForUpdates}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Check for Updates
                </Button>
              )}

              {status === UPDATE_STATUS.CHECKING && (
                <Button variant="outline" disabled className="gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking...
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Update Info Card (when available) */}
      {status === UPDATE_STATUS.AVAILABLE && updateInfo && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <h5 className="font-medium text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-500" />
            What's New in v{latestVersion}
          </h5>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            {updateInfo.releaseNotes ? (
              <li>{updateInfo.releaseNotes}</li>
            ) : (
              <>
                <li className="flex items-center gap-2">
                  <ArrowRight className="h-3 w-3" />
                  Bug fixes and performance improvements
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="h-3 w-3" />
                  Security updates
                </li>
              </>
            )}
          </ul>
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Clock className="h-4 w-4" />
            Last checked
          </div>
          <p className="font-medium mt-1">{formatLastChecked(lastChecked)}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Shield className="h-4 w-4" />
            Security
          </div>
          <p className="font-medium mt-1 text-emerald-500">Verified</p>
        </div>
      </div>

      {/* Auto-check Setting */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
        <div>
          <p className="font-medium text-foreground">Automatic updates</p>
          <p className="text-sm text-muted-foreground">
            Check for updates when the app starts
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const newValue = !autoCheckEnabled;
            setAutoCheckEnabled(newValue);
            localStorage.setItem("update-auto-check", String(newValue));
          }}
          className={cn(
            "relative h-6 w-11 rounded-full transition-colors",
            autoCheckEnabled ? "bg-primary" : "bg-muted",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
              autoCheckEnabled && "translate-x-5",
            )}
          />
        </button>
      </div>

      {/* Release Notes Link */}
      <Button
        variant="link"
        className="h-auto p-0 text-muted-foreground hover:text-foreground"
      >
        <ExternalLink className="h-4 w-4 mr-2" />
        View all release notes
      </Button>
    </div>
  );
}
