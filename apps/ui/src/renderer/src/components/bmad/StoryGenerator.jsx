/**
 * Story Generator Component
 *
 * AI-powered story generation from PRD and architecture context.
 * Features:
 * - Load project context (PRD, Architecture)
 * - Generate stories using API
 * - Preview and edit generated stories
 * - Add stories to Kanban board
 */

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Loader2,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  AlertCircle,
  Zap,
  RefreshCw,
} from "lucide-react";
import useBmadStore from "../../stores/bmadStore";
import useKanbanStore from "../../stores/kanbanStore";

// API endpoint
const API_URL = "http://127.0.0.1:3333/api/chat";

// Priority colors - using theme-aware colors
const PRIORITY_COLORS = {
  critical: "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/50",
  high: "bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/50",
  medium:
    "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/50",
  low: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/50",
};

// Story Card Preview
function StoryPreview({
  story,
  onEdit,
  onRemove,
  isEditing,
  onSave,
  onCancel,
}) {
  const [editData, setEditData] = useState(story);

  useEffect(() => {
    setEditData(story);
  }, [story]);

  if (isEditing) {
    return (
      <div className="bg-card rounded-lg border border-primary p-4">
        <div className="space-y-3">
          <input
            type="text"
            value={editData.title}
            onChange={(e) =>
              setEditData({ ...editData, title: e.target.value })
            }
            className="w-full bg-muted border border-input rounded px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary"
            placeholder="Story title"
          />
          <textarea
            value={editData.description}
            onChange={(e) =>
              setEditData({ ...editData, description: e.target.value })
            }
            rows={3}
            className="w-full bg-muted border border-input rounded px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary resize-none"
            placeholder="As a [user], I want [feature] so that [benefit]"
          />
          <div className="grid grid-cols-3 gap-2">
            <select
              value={editData.priority}
              onChange={(e) =>
                setEditData({ ...editData, priority: e.target.value })
              }
              className="bg-muted border border-input rounded px-2 py-1 text-sm text-foreground focus:outline-none focus:border-primary"
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <input
              type="number"
              value={editData.storyPoints}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  storyPoints: parseInt(e.target.value) || 0,
                })
              }
              min="0"
              max="21"
              className="bg-muted border border-input rounded px-2 py-1 text-sm text-foreground focus:outline-none focus:border-primary"
              placeholder="Points"
            />
            <input
              type="text"
              value={editData.epic}
              onChange={(e) =>
                setEditData({ ...editData, epic: e.target.value })
              }
              className="bg-muted border border-input rounded px-2 py-1 text-sm text-foreground focus:outline-none focus:border-primary"
              placeholder="Epic"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={onCancel}
              className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(editData)}
              className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card/50 rounded-lg border border-border p-4 hover:border-border/80 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground truncate">
            {story.title}
          </h4>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {story.description}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(story)}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Edit3 size={14} />
          </button>
          <button
            onClick={() => onRemove(story)}
            className="p-1 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <span
          className={`px-2 py-0.5 text-xs rounded border ${PRIORITY_COLORS[story.priority] || PRIORITY_COLORS.medium}`}
        >
          {story.priority}
        </span>
        <span className="px-2 py-0.5 text-xs bg-muted rounded text-muted-foreground">
          {story.storyPoints} pts
        </span>
        {story.epic && (
          <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded">
            {story.epic}
          </span>
        )}
      </div>

      {story.acceptanceCriteria?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground mb-1">
            Acceptance Criteria:
          </p>
          <ul className="text-xs text-muted-foreground space-y-0.5">
            {story.acceptanceCriteria.slice(0, 3).map((ac, i) => (
              <li key={i} className="truncate">
                • {ac}
              </li>
            ))}
            {story.acceptanceCriteria.length > 3 && (
              <li className="text-muted-foreground/70">
                +{story.acceptanceCriteria.length - 3} more...
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// Main Story Generator Component
export default function StoryGenerator({
  onClose,
  onStoriesAdded,
  onAddStory,
  projectPath,
}) {
  const { projectContext, loadProjectContext } = useBmadStore();
  const { addCard, state, activeBoardId } = useKanbanStore();

  const [stories, setStories] = useState([]);
  const [editingStory, setEditingStory] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [generationError, setGenerationError] = useState(null);

  // Check if we're in modal mode or embedded mode
  const isModal = typeof onClose === "function";

  useEffect(() => {
    loadProjectContext();
  }, []);

  const hasPrd = !!projectContext.prd;
  const hasArchitecture = !!projectContext.architecture;

  // Generate stories using the API
  const handleGenerate = async () => {
    if (!hasPrd) {
      setGenerationError("Please create or import a PRD first");
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      const prompt = `You are a Scrum Master AI assistant. Based on the following PRD and architecture documents, generate user stories for development.

PRD Document:
${projectContext.prd}

${projectContext.architecture ? `Architecture Document:\n${projectContext.architecture}` : ""}

Generate 5-10 user stories in JSON format. Each story should have:
- title: A concise title
- description: User story format "As a [user], I want [feature] so that [benefit]"
- priority: One of "critical", "high", "medium", or "low"
- storyPoints: Estimated points (1, 2, 3, 5, 8, 13)
- epic: The feature category/epic name
- acceptanceCriteria: Array of acceptance criteria strings

Respond ONLY with a valid JSON array of stories, no other text.`;

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          provider: "codex",
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const responseContent =
        data.text || data.content || data.message || data.response || "";

      // Try to parse JSON from the response
      let generatedStories = [];
      try {
        // Try to extract JSON from the response
        const jsonMatch = responseContent.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          generatedStories = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No valid JSON array found in response");
        }
      } catch (parseErr) {
        console.error("Failed to parse stories:", parseErr);
        throw new Error("Failed to parse generated stories. Please try again.");
      }

      setStories(generatedStories);
    } catch (err) {
      console.error("Generation error:", err);
      setGenerationError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditStory = (story) => {
    setEditingStory(story);
  };

  const handleSaveEdit = (updatedStory) => {
    setStories(stories.map((s) => (s === editingStory ? updatedStory : s)));
    setEditingStory(null);
  };

  const handleRemoveStory = (story) => {
    setStories(stories.filter((s) => s !== story));
  };

  const handleAddToBoard = async () => {
    if (!activeBoardId || stories.length === 0) return;

    setIsAdding(true);
    try {
      const board = state?.boards?.find((b) => b.id === activeBoardId);
      const backlogList = board?.lists?.find(
        (l) => l.name.toLowerCase() === "backlog",
      );

      if (!backlogList) {
        throw new Error("Backlog list not found");
      }

      for (const story of stories) {
        // Use onAddStory if provided (embedded mode), otherwise use addCard directly
        const storyData = {
          title: story.title,
          description: `${story.description}\n\n**Acceptance Criteria:**\n${story.acceptanceCriteria?.map((c) => `- ${c}`).join("\n") || ""}${story.technicalNotes ? `\n\n**Technical Notes:**\n${story.technicalNotes}` : ""}`,
          storyPoints: story.storyPoints,
          priority: story.priority,
          labels: story.epic ? [story.epic] : [],
        };

        if (onAddStory) {
          await onAddStory(storyData);
        } else {
          await addCard(activeBoardId, backlogList.id, storyData);
        }
      }

      onStoriesAdded?.(stories.length);
      setStories([]); // Clear stories after adding
      if (isModal) {
        onClose?.();
      }
    } catch (err) {
      setGenerationError(`Failed to add stories: ${err.message}`);
    } finally {
      setIsAdding(false);
    }
  };

  // Content that's shared between modal and embedded mode
  const content = (
    <>
      {/* Context Status */}
      <div
        className={`${isModal ? "px-6 py-3 bg-muted/50 border-b border-border" : "p-3 bg-muted/30 rounded-lg border border-border mb-4"} flex items-center gap-4`}
      >
        <div
          className={`flex items-center gap-2 text-sm ${hasPrd ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}
        >
          <div
            className={`w-2 h-2 rounded-full ${hasPrd ? "bg-green-500" : "bg-muted-foreground/50"}`}
          />
          PRD {hasPrd ? "Loaded" : "Not found"}
        </div>
        <div
          className={`flex items-center gap-2 text-sm ${hasArchitecture ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}
        >
          <div
            className={`w-2 h-2 rounded-full ${hasArchitecture ? "bg-green-500" : "bg-muted-foreground/50"}`}
          />
          Arch {hasArchitecture ? "Loaded" : "Not found"}
        </div>
        <div className="flex-1" />
        <button
          onClick={loadProjectContext}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Content */}
      <div
        className={
          isModal ? "flex-1 overflow-y-auto p-6" : "flex-1 overflow-y-auto"
        }
      >
        {generationError && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-medium">Generation Error</p>
              <p className="text-sm text-red-300/80 mt-1">{generationError}</p>
            </div>
          </div>
        )}

        {stories.length === 0 ? (
          <div className={`text-center ${isModal ? "py-12" : "py-8"}`}>
            {isGenerating ? (
              <>
                <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin text-primary" />
                <h3 className="text-base font-medium text-foreground mb-2">
                  Generating Stories...
                </h3>
                <p className="text-sm text-muted-foreground">
                  Analyzing PRD and creating user stories
                </p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 mx-auto mb-3 bg-muted rounded-full flex items-center justify-center">
                  <Zap className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="text-base font-medium text-foreground mb-2">
                  Generate Stories from PRD
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {hasPrd
                    ? "Click generate to create user stories"
                    : "Import or create a PRD first"}
                </p>
                <button
                  onClick={handleGenerate}
                  disabled={!hasPrd || isGenerating}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground text-sm rounded-lg font-medium transition-all"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles size={16} />
                    Generate Stories
                  </span>
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-foreground font-medium text-sm">
                Generated Stories ({stories.length})
              </h3>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
              >
                <RefreshCw
                  size={12}
                  className={isGenerating ? "animate-spin" : ""}
                />
                Regenerate
              </button>
            </div>

            <div
              className={`grid ${isModal ? "grid-cols-2" : "grid-cols-1"} gap-3`}
            >
              {stories.map((story, index) => (
                <StoryPreview
                  key={index}
                  story={story}
                  onEdit={handleEditStory}
                  onRemove={handleRemoveStory}
                  isEditing={editingStory === story}
                  onSave={handleSaveEdit}
                  onCancel={() => setEditingStory(null)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      {stories.length > 0 && (
        <div
          className={`${isModal ? "p-6 border-t border-border" : "pt-3 border-t border-border mt-3"} flex items-center justify-between`}
        >
          <p className="text-xs text-muted-foreground">
            {stories.reduce((sum, s) => sum + (s.storyPoints || 0), 0)} total
            pts
          </p>
          <div className="flex items-center gap-2">
            {isModal && (
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleAddToBoard}
              disabled={isAdding}
              className="px-4 py-1.5 bg-green-500 hover:bg-green-600 disabled:bg-muted text-white text-sm rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              {isAdding ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Plus size={14} />
              )}
              Add to Board
            </button>
          </div>
        </div>
      )}
    </>
  );

  // Modal mode - with backdrop and fixed positioning
  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-background rounded-2xl border border-border w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    AI Story Generator
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Generate user stories from your PRD using AI
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {content}
        </div>
      </div>
    );
  }

  // Embedded mode - just the content, no modal wrapper
  return (
    <div className="h-full flex flex-col bg-card/50 rounded-lg border border-border p-3">
      {/* Header for embedded mode */}
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground">
          Story Generator
        </span>
      </div>

      {content}
    </div>
  );
}
