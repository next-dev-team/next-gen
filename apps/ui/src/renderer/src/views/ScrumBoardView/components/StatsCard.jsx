/**
 * StatsCard Component
 *
 * Displays board statistics in a grid of cards.
 */

import * as React from "react";
import { LayoutGrid, Clock, CheckCircle2, TrendingUp } from "lucide-react";

export default function StatsCard({ stats }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
        <div className="flex items-center gap-2 mb-1">
          <LayoutGrid className="h-4 w-4 text-blue-500" />
          <span className="text-xs text-muted-foreground">Total Stories</span>
        </div>
        <div className="text-2xl font-bold text-foreground">
          {stats.total || 0}
        </div>
      </div>

      <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="h-4 w-4 text-amber-500" />
          <span className="text-xs text-muted-foreground">In Progress</span>
        </div>
        <div className="text-2xl font-bold text-foreground">
          {stats.byStatus?.["in-progress"] || 0}
        </div>
      </div>

      <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="text-xs text-muted-foreground">Completed</span>
        </div>
        <div className="text-2xl font-bold text-foreground">
          {stats.byStatus?.done || 0}
        </div>
      </div>

      <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="h-4 w-4 text-purple-500" />
          <span className="text-xs text-muted-foreground">Progress</span>
        </div>
        <div className="text-2xl font-bold text-foreground">
          {stats.completionPercent || 0}%
        </div>
        {stats.totalPoints > 0 && (
          <div className="text-xs text-muted-foreground mt-1">
            {stats.completedPoints}/{stats.totalPoints} pts
          </div>
        )}
      </div>
    </div>
  );
}
