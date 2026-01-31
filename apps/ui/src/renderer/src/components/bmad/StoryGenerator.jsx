/**
 * Story Generator Component
 *
 * AI-powered story generation from PRD and architecture context.
 * Features:
 * - Load project context (PRD, Architecture)
 * - Generate stories using LLM
 * - Preview and edit generated stories
 * - Add stories to Kanban board
 */

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  FileText,
  Loader2,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  ChevronDown,
  AlertCircle,
  Zap,
  RefreshCw,
} from "lucide-react";
import useBmadStore from "../../stores/bmadStore";
import useLlmStore from "../../stores/llmStore";
import useKanbanStore from "../../stores/kanbanStore";

// Priority colors
const PRIORITY_COLORS = {
  critical: "bg-red-500/20 text-red-400 border-red-500/50",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/50",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
  low: "bg-blue-500/20 text-blue-400 border-blue-500/50",
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
      <div className="bg-slate-800 rounded-lg border border-indigo-500 p-4">
        <div className="space-y-3">
          <input
            type="text"
            value={editData.title}
            onChange={(e) =>
              setEditData({ ...editData, title: e.target.value })
            }
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            placeholder="Story title"
          />
          <textarea
            value={editData.description}
            onChange={(e) =>
              setEditData({ ...editData, description: e.target.value })
            }
            rows={3}
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 resize-none"
            placeholder="As a [user], I want [feature] so that [benefit]"
          />
          <div className="grid grid-cols-3 gap-2">
            <select
              value={editData.priority}
              onChange={(e) =>
                setEditData({ ...editData, priority: e.target.value })
              }
              className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
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
              className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
              placeholder="Points"
            />
            <input
              type="text"
              value={editData.epic}
              onChange={(e) =>
                setEditData({ ...editData, epic: e.target.value })
              }
              className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
              placeholder="Epic"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={onCancel}
              className="px-3 py-1 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(editData)}
              className="px-3 py-1 text-sm bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4 hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-white truncate">{story.title}</h4>
          <p className="text-sm text-slate-400 mt-1 line-clamp-2">
            {story.description}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(story)}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <Edit3 size={14} />
          </button>
          <button
            onClick={() => onRemove(story)}
            className="p-1 text-slate-400 hover:text-red-400 transition-colors"
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
        <span className="px-2 py-0.5 text-xs bg-slate-700 rounded text-slate-400">
          {story.storyPoints} pts
        </span>
        {story.epic && (
          <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded">
            {story.epic}
          </span>
        )}
      </div>

      {story.acceptanceCriteria?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-700">
          <p className="text-xs text-slate-500 mb-1">Acceptance Criteria:</p>
          <ul className="text-xs text-slate-400 space-y-0.5">
            {story.acceptanceCriteria.slice(0, 3).map((ac, i) => (
              <li key={i} className="truncate">
                • {ac}
              </li>
            ))}
            {story.acceptanceCriteria.length > 3 && (
              <li className="text-slate-500">
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
  const { generateStories, isLoading, error, activeProvider, activeModel } =
    useLlmStore();
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

  const handleGenerate = async () => {
    if (!hasPrd) {
      setGenerationError("Please create or import a PRD first");
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      const generatedStories = await generateStories(
        projectContext.prd,
        projectContext.architecture,
      );
      setStories(generatedStories);
    } catch (err) {
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
        className={`${isModal ? "px-6 py-3 bg-slate-800/50 border-b border-slate-700" : "p-3 bg-slate-800/30 rounded-lg border border-slate-700 mb-4"} flex items-center gap-4`}
      >
        <div
          className={`flex items-center gap-2 text-sm ${hasPrd ? "text-green-400" : "text-slate-400"}`}
        >
          <div
            className={`w-2 h-2 rounded-full ${hasPrd ? "bg-green-400" : "bg-slate-500"}`}
          />
          PRD {hasPrd ? "Loaded" : "Not found"}
        </div>
        <div
          className={`flex items-center gap-2 text-sm ${hasArchitecture ? "text-green-400" : "text-slate-400"}`}
        >
          <div
            className={`w-2 h-2 rounded-full ${hasArchitecture ? "bg-green-400" : "bg-slate-500"}`}
          />
          Arch {hasArchitecture ? "Loaded" : "Not found"}
        </div>
        <div className="flex-1" />
        <button
          onClick={loadProjectContext}
          className="text-sm text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
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
                <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin text-indigo-400" />
                <h3 className="text-base font-medium text-white mb-2">
                  Generating Stories...
                </h3>
                <p className="text-sm text-slate-400">
                  Analyzing PRD and creating user stories
                </p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 mx-auto mb-3 bg-slate-800 rounded-full flex items-center justify-center">
                  <Zap className="w-6 h-6 text-slate-600" />
                </div>
                <h3 className="text-base font-medium text-white mb-2">
                  Generate Stories from PRD
                </h3>
                <p className="text-sm text-slate-400 mb-4">
                  {hasPrd
                    ? "Click generate to create user stories"
                    : "Import or create a PRD first"}
                </p>
                <button
                  onClick={handleGenerate}
                  disabled={!hasPrd || isGenerating}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm rounded-lg font-medium transition-all"
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
              <h3 className="text-white font-medium text-sm">
                Generated Stories ({stories.length})
              </h3>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
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
          className={`${isModal ? "p-6 border-t border-slate-700" : "pt-3 border-t border-slate-700 mt-3"} flex items-center justify-between`}
        >
          <p className="text-xs text-slate-400">
            {stories.reduce((sum, s) => sum + (s.storyPoints || 0), 0)} total
            pts
          </p>
          <div className="flex items-center gap-2">
            {isModal && (
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleAddToBoard}
              disabled={isAdding}
              className="px-4 py-1.5 bg-green-500 hover:bg-green-600 disabled:bg-slate-700 text-white text-sm rounded-lg font-medium flex items-center gap-2 transition-colors"
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
        <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-500 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    AI Story Generator
                  </h2>
                  <p className="text-sm text-slate-400">
                    Generate user stories from your PRD using {activeProvider}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white transition-colors"
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
    <div className="h-full flex flex-col bg-slate-900/50 rounded-lg border border-slate-700 p-3">
      {/* Header for embedded mode */}
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-700">
        <Sparkles className="w-4 h-4 text-indigo-400" />
        <span className="text-sm font-medium text-white">Story Generator</span>
        <span className="text-xs text-slate-500">
          ({activeProvider || "LLM"})
        </span>
      </div>

      {content}
    </div>
  );
}
