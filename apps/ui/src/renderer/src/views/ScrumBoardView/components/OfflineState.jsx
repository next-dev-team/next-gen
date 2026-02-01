/**
 * OfflineState Component
 *
 * Displayed when the server is offline or unreachable.
 */

import * as React from "react";
import { WifiOff, Settings, RefreshCw } from "lucide-react";
import { Button } from "../../../components/ui/button";

export default function OfflineState({
  onReconnect,
  onOpenSettings,
  serverRunning,
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-8 h-full flex flex-col items-center justify-center gap-6 text-center">
      <div className="p-4 rounded-full bg-muted/50">
        <WifiOff className="h-12 w-12 text-muted-foreground" />
      </div>
      <div className="max-w-md space-y-2">
        <h3 className="text-xl font-semibold">Connection Lost</h3>
        <p className="text-muted-foreground">
          {serverRunning
            ? "The Kanban server is running but cannot be reached. It may be blocked or busy."
            : "The Kanban server is currently stopped. Please start the server to access the board."}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={onOpenSettings}>
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
        <Button onClick={onReconnect}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Reconnecting
        </Button>
      </div>
    </div>
  );
}
