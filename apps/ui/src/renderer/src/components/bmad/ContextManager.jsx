/**
 * Context Manager Component
 *
 * Manages project context files (PRD, Architecture, Product Brief).
 * Features:
 * - View and edit context files
 * - Import/export context
 * - File status indicators
 * - Context versioning
 */

import React, { useState, useEffect } from "react";
import {
  FileText,
  Upload,
  Download,
  Save,
  RefreshCw,
  Check,
  X,
  Edit3,
  Eye,
  AlertCircle,
  Loader2,
  Copy,
  ExternalLink,
} from "lucide-react";
import useBmadStore from "../../stores/bmadStore";

// Context file types
const CONTEXT_TYPES = [
  {
    id: "prd",
    name: "PRD",
    icon: "📋",
    description: "Product Requirements Document",
    filename: "prd.md",
  },
  {
    id: "architecture",
    name: "Architecture",
    icon: "🏗️",
    description: "Technical Architecture",
    filename: "architecture.md",
  },
  {
    id: "productBrief",
    name: "Product Brief",
    icon: "📄",
    description: "High-level Product Brief",
    filename: "product-brief.md",
  },
];

// Context File Card
function ContextFileCard({ type, content, path, onEdit, onRefresh }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasContent = !!content;
  const wordCount = content ? content.split(/\s+/).filter(Boolean).length : 0;

  return (
    <div
      className={`rounded-lg border transition-all ${
        hasContent
          ? "bg-green-500/10 border-green-500/30"
          : "bg-slate-800/50 border-slate-700"
      }`}
    >
      <div
        className="p-4 cursor-pointer flex items-center gap-4"
        onClick={() => hasContent && setIsExpanded(!isExpanded)}
      >
        <div
          className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
            hasContent ? "bg-green-500/20" : "bg-slate-700"
          }`}
        >
          {type.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className={`font-medium ${hasContent ? "text-white" : "text-slate-400"}`}
            >
              {type.name}
            </h3>
            {hasContent && <Check size={14} className="text-green-400" />}
          </div>
          <p className="text-sm text-slate-500">{type.description}</p>
          {hasContent && (
            <p className="text-xs text-slate-500 mt-1">
              {wordCount} words • {type.filename}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasContent ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                title="Edit"
              >
                <Edit3 size={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRefresh();
                }}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                title="Refresh"
              >
                <RefreshCw size={16} />
              </button>
            </>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="px-3 py-1.5 text-sm bg-indigo-500/20 text-indigo-400 rounded hover:bg-indigo-500/30 transition-colors"
            >
              Create
            </button>
          )}
        </div>
      </div>

      {isExpanded && hasContent && (
        <div className="px-4 pb-4">
          <div className="bg-slate-900/50 rounded-lg p-4 max-h-64 overflow-y-auto">
            <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono">
              {content.slice(0, 2000)}
              {content.length > 2000 && (
                <span className="text-slate-500">... (truncated)</span>
              )}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// Context Editor Modal
function ContextEditor({ type, initialContent, onSave, onClose }) {
  const [content, setContent] = useState(initialContent || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(content);
      onClose();
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{type.icon}</span>
            <div>
              <h2 className="font-semibold text-white">{type.name}</h2>
              <p className="text-xs text-slate-400">{type.filename}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-hidden">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-full bg-slate-950 text-slate-300 font-mono text-sm p-4 resize-none focus:outline-none"
            placeholder={`# ${type.name}\n\nStart writing your ${type.name.toLowerCase()} here...`}
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {content.split(/\s+/).filter(Boolean).length} words
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-slate-700 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              {isSaving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Context Manager Component
export default function ContextManager() {
  const {
    projectContext,
    projectPath,
    loadProjectContext,
    saveProjectContext,
  } = useBmadStore();

  const [editingType, setEditingType] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    handleRefresh();
  }, [projectPath]);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await loadProjectContext();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (typeId, content) => {
    await saveProjectContext(typeId, content);
  };

  const handleImport = async (typeId) => {
    if (window.electronAPI?.selectFile) {
      const result = await window.electronAPI.selectFile({
        filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
      });
      if (result?.content) {
        await saveProjectContext(typeId, result.content);
        await loadProjectContext();
      }
    }
  };

  const handleExport = async (typeId, content) => {
    if (window.electronAPI?.saveFile) {
      const type = CONTEXT_TYPES.find((t) => t.id === typeId);
      await window.electronAPI.saveFile({
        content,
        defaultPath: type?.filename,
        filters: [{ name: "Markdown", extensions: ["md"] }],
      });
    }
  };

  const getContent = (typeId) => {
    switch (typeId) {
      case "prd":
        return projectContext.prd;
      case "architecture":
        return projectContext.architecture;
      case "productBrief":
        return projectContext.productBrief;
      default:
        return null;
    }
  };

  const getPath = (typeId) => {
    switch (typeId) {
      case "prd":
        return projectContext.prdPath;
      case "architecture":
        return projectContext.architecturePath;
      case "productBrief":
        return projectContext.productBriefPath;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText size={20} className="text-indigo-400" />
            Project Context
          </h2>
          <p className="text-sm text-slate-400">
            {projectPath || "No project selected"}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Context Files */}
      <div className="space-y-3">
        {CONTEXT_TYPES.map((type) => (
          <ContextFileCard
            key={type.id}
            type={type}
            content={getContent(type.id)}
            path={getPath(type.id)}
            onEdit={() => setEditingType(type)}
            onRefresh={handleRefresh}
          />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="pt-4 border-t border-slate-700">
        <h3 className="text-sm font-medium text-slate-400 mb-3">
          Quick Actions
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleImport("prd")}
            className="px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:text-white hover:border-slate-600 flex items-center gap-2 transition-colors"
          >
            <Upload size={14} />
            Import PRD
          </button>
          <button
            onClick={() => handleImport("architecture")}
            className="px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:text-white hover:border-slate-600 flex items-center gap-2 transition-colors"
          >
            <Upload size={14} />
            Import Architecture
          </button>
          {projectContext.prd && (
            <button
              onClick={() => handleExport("prd", projectContext.prd)}
              className="px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:text-white hover:border-slate-600 flex items-center gap-2 transition-colors"
            >
              <Download size={14} />
              Export PRD
            </button>
          )}
        </div>
      </div>

      {/* Editor Modal */}
      {editingType && (
        <ContextEditor
          type={editingType}
          initialContent={getContent(editingType.id)}
          onSave={(content) => handleSave(editingType.id, content)}
          onClose={() => setEditingType(null)}
        />
      )}
    </div>
  );
}
