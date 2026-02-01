/**
 * Phase Progress Component
 *
 * Visual progress tracker for BMAD workflow phases.
 * Features:
 * - Phase navigation
 * - Progress indicators
 * - Phase completion status
 * - Time tracking
 */

import React from "react";
import { Check, ArrowRight, Clock, Play, Pause } from "lucide-react";
import useBmadStore, { BMAD_PHASES } from "../../stores/bmadStore";

// Phase status styles - using semantic colors that work in both light and dark modes
const PHASE_STYLES = {
  completed: {
    container:
      "bg-green-500/20 border-green-500/50 text-green-600 dark:text-green-400",
    icon: "bg-green-500/20 text-green-600 dark:text-green-400",
    connector: "bg-green-500",
  },
  active: {
    container: "bg-primary/20 border-primary text-primary",
    icon: "bg-primary/20 text-primary",
    connector: "bg-border",
  },
  pending: {
    container: "bg-muted border-border text-muted-foreground",
    icon: "bg-muted text-muted-foreground",
    connector: "bg-border",
  },
};

// Format duration
function formatDuration(startDate, endDate = null) {
  if (!startDate) return null;
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  const diff = end - start;

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// Single Phase Card
function PhaseCard({ phase, progress, isActive, isCompleted, onClick }) {
  const status = isCompleted ? "completed" : isActive ? "active" : "pending";
  const styles = PHASE_STYLES[status];

  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center gap-2 px-4 py-3 rounded-xl border transition-all hover:scale-105 ${styles.container}`}
    >
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${styles.icon}`}
      >
        {isCompleted ? <Check size={20} /> : phase.icon}
      </div>

      <div className="text-center">
        <div className="text-sm font-medium">{phase.name}</div>
        {progress.startedAt && (
          <div className="text-xs opacity-70 flex items-center gap-1 mt-1">
            <Clock size={10} />
            {formatDuration(progress.startedAt, progress.completedAt)}
          </div>
        )}
      </div>

      {isActive && !isCompleted && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full animate-pulse" />
      )}
    </button>
  );
}

// Phase Connector
function PhaseConnector({ isCompleted }) {
  return (
    <div className="flex items-center px-2">
      <div
        className={`h-0.5 w-8 transition-colors ${
          isCompleted ? "bg-green-500" : "bg-border"
        }`}
      />
      <ArrowRight
        size={16}
        className={isCompleted ? "text-green-500" : "text-muted-foreground"}
      />
    </div>
  );
}

// Progress Bar
function ProgressBar({ phases, phaseProgress }) {
  const completedCount = phases.filter(
    (p) => phaseProgress[p.id]?.completed,
  ).length;
  const percentage = (completedCount / phases.length) * 100;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-muted-foreground">Overall Progress</span>
        <span className="text-foreground font-medium">
          {completedCount}/{phases.length} phases
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-green-500 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Compact horizontal progress tracker
export function PhaseProgressCompact() {
  const { currentPhase, phaseProgress, setCurrentPhase } = useBmadStore();

  return (
    <div className="flex items-center gap-1">
      {BMAD_PHASES.map((phase, index) => {
        const progress = phaseProgress[phase.id];
        const isActive = currentPhase === phase.id;
        const isCompleted = progress?.completed;

        return (
          <React.Fragment key={phase.id}>
            <PhaseCard
              phase={phase}
              progress={progress}
              isActive={isActive}
              isCompleted={isCompleted}
              onClick={() => setCurrentPhase(phase.id)}
            />
            {index < BMAD_PHASES.length - 1 && (
              <PhaseConnector isCompleted={isCompleted} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Vertical timeline progress tracker
export function PhaseProgressVertical() {
  const { currentPhase, phaseProgress, setCurrentPhase, completePhase } =
    useBmadStore();

  return (
    <div className="space-y-4">
      <ProgressBar phases={BMAD_PHASES} phaseProgress={phaseProgress} />

      <div className="space-y-3">
        {BMAD_PHASES.map((phase, index) => {
          const progress = phaseProgress[phase.id];
          const isActive = currentPhase === phase.id;
          const isCompleted = progress?.completed;
          const status = isCompleted
            ? "completed"
            : isActive
              ? "active"
              : "pending";
          const styles = PHASE_STYLES[status];

          return (
            <div key={phase.id} className="flex gap-4">
              {/* Timeline connector */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${styles.icon}`}
                >
                  {isCompleted ? (
                    <Check size={18} />
                  ) : (
                    <span>{phase.icon}</span>
                  )}
                </div>
                {index < BMAD_PHASES.length - 1 && (
                  <div className={`w-0.5 flex-1 my-2 ${styles.connector}`} />
                )}
              </div>

              {/* Phase content */}
              <div className="flex-1 pb-4">
                <button
                  onClick={() => setCurrentPhase(phase.id)}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${styles.container}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{phase.name}</h3>
                      <p className="text-xs opacity-70 mt-1">
                        {phase.description}
                      </p>
                    </div>
                    {isActive && !isCompleted && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          completePhase(phase.id);
                        }}
                        className="px-3 py-1.5 text-xs bg-green-500/20 text-green-400 border border-green-500/50 rounded-lg hover:bg-green-500/30 transition-colors"
                      >
                        Complete
                      </button>
                    )}
                  </div>

                  {/* Phase meta */}
                  <div className="flex items-center gap-4 mt-3 text-xs opacity-60">
                    <span>Agents: {phase.agents.join(", ")}</span>
                    {progress.startedAt && (
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {formatDuration(
                          progress.startedAt,
                          progress.completedAt,
                        )}
                      </span>
                    )}
                  </div>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Mini progress indicator
export function PhaseProgressMini() {
  const { phaseProgress } = useBmadStore();
  const completedCount = BMAD_PHASES.filter(
    (p) => phaseProgress[p.id]?.completed,
  ).length;

  return (
    <div className="flex items-center gap-2">
      {BMAD_PHASES.map((phase) => {
        const isCompleted = phaseProgress[phase.id]?.completed;
        return (
          <div
            key={phase.id}
            className={`w-3 h-3 rounded-full transition-colors ${
              isCompleted ? "bg-green-500" : "bg-muted"
            }`}
            title={`${phase.name}: ${isCompleted ? "Complete" : "Pending"}`}
          />
        );
      })}
      <span className="text-xs text-muted-foreground ml-1">
        {completedCount}/{BMAD_PHASES.length}
      </span>
    </div>
  );
}

// Default export - full progress component
export default function PhaseProgress({ variant = "compact" }) {
  switch (variant) {
    case "vertical":
      return <PhaseProgressVertical />;
    case "mini":
      return <PhaseProgressMini />;
    case "compact":
    default:
      return <PhaseProgressCompact />;
  }
}
