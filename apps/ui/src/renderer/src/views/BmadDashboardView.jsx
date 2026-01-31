/**
 * BMAD Dashboard View
 *
 * Unified dashboard for BMAD-Method workflow with:
 * - Phase progress tracker
 * - Agent chat interface
 * - Quick actions
 * - Sprint board preview
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Brain,
  FileText,
  Settings,
  Play,
  Check,
  ArrowRight,
  MessageSquare,
  Loader2,
  Zap,
  FolderOpen,
  Download,
  Send,
  RefreshCw,
  ChevronDown,
  User,
  Bot,
} from "lucide-react";
import useBmadStore, { BMAD_PHASES } from "../stores/bmadStore";
import useLlmStore from "../stores/llmStore";
import useKanbanStore from "../stores/kanbanStore";

// Phase status colors
const PHASE_COLORS = {
  completed: "bg-green-500/20 border-green-500 text-green-400",
  active: "bg-blue-500/20 border-blue-500 text-blue-400",
  pending: "bg-slate-700/50 border-slate-600 text-slate-400",
};

// Agent Phase Selector
function AgentSelector({ agents, activeAgent, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.values(agents).map((agent) => (
        <button
          key={agent.id}
          onClick={() => onSelect(agent.id)}
          className={`px-3 py-2 rounded-lg border transition-all ${
            activeAgent === agent.id
              ? "bg-indigo-500/20 border-indigo-500 text-indigo-300"
              : "bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500"
          }`}
        >
          <span className="mr-2">{agent.icon}</span>
          {agent.title}
        </button>
      ))}
    </div>
  );
}

// Chat Message Component
function ChatMessage({ message, agent }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
          isUser
            ? "bg-blue-500/20 text-blue-400"
            : "bg-purple-500/20 text-purple-400"
        }`}
      >
        {isUser ? <User size={16} /> : agent?.icon || <Bot size={16} />}
      </div>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 ${
          isUser
            ? "bg-blue-500/20 border border-blue-500/30"
            : "bg-slate-700/50 border border-slate-600/50"
        }`}
      >
        <div className="text-sm text-slate-300 whitespace-pre-wrap">
          {message.content}
        </div>
        {message.timestamp && (
          <div className="text-xs text-slate-500 mt-2">
            {new Date(message.timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}

// Agent Chat Panel
function AgentChatPanel({ storyId }) {
  const [input, setInput] = useState("");
  const chatRef = useRef(null);

  const {
    activeAgent,
    getAvailableAgents,
    getCurrentAgent,
    setActiveAgent,
    getConversation,
    sendMessage,
    isLoading,
    error,
  } = useLlmStore();

  const { projectContext } = useBmadStore();

  const agents = getAvailableAgents();
  const currentAgent = getCurrentAgent();
  const messages = getConversation(storyId || "default", activeAgent);

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const message = input;
    setInput("");

    try {
      await sendMessage(storyId || "default", activeAgent, message, {
        prd: projectContext.prd,
        architecture: projectContext.architecture,
      });
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-xl">
              {currentAgent?.icon}
            </div>
            <div>
              <h3 className="font-medium text-white">{currentAgent?.title}</h3>
              <p className="text-xs text-slate-400">
                {currentAgent?.description}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveAgent("bmad-master")}
            className="px-3 py-1.5 text-xs bg-slate-700/50 border border-slate-600 rounded-lg text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
          >
            Switch Agent
          </button>
        </div>

        {/* Agent quick select */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {Object.values(agents)
            .filter((a) => a.phase !== "all")
            .slice(0, 6)
            .map((agent) => (
              <button
                key={agent.id}
                onClick={() => setActiveAgent(agent.id)}
                className={`flex-shrink-0 px-2 py-1 text-xs rounded-md transition-colors ${
                  activeAgent === agent.id
                    ? "bg-indigo-500/30 text-indigo-300"
                    : "bg-slate-700/50 text-slate-400 hover:text-slate-300"
                }`}
              >
                {agent.icon} {agent.name}
              </button>
            ))}
        </div>
      </div>

      {/* Messages */}
      <div ref={chatRef} className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-slate-500 py-8">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Start a conversation with {currentAgent?.name}</p>
            <p className="text-xs mt-2">
              Ask for help with {currentAgent?.description?.toLowerCase()}
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <ChatMessage key={i} message={msg} agent={currentAgent} />
          ))
        )}
        {isLoading && (
          <div className="flex items-center gap-2 text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{currentAgent?.name} is thinking...</span>
          </div>
        )}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-700/50">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${currentAgent?.name}...`}
            className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="px-4 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Phase Progress Tracker
function PhaseProgressTracker() {
  const { currentPhase, phaseProgress, setCurrentPhase, completePhase } =
    useBmadStore();

  return (
    <div className="flex items-center gap-2">
      {BMAD_PHASES.map((phase, index) => {
        const progress = phaseProgress[phase.id];
        const isActive = currentPhase === phase.id;
        const isCompleted = progress?.completed;

        let status = "pending";
        if (isCompleted) status = "completed";
        else if (isActive) status = "active";

        return (
          <React.Fragment key={phase.id}>
            <button
              onClick={() => setCurrentPhase(phase.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${PHASE_COLORS[status]}`}
            >
              <span className="text-lg">{phase.icon}</span>
              <span className="text-sm font-medium">{phase.name}</span>
              {isCompleted && <Check size={14} />}
            </button>
            {index < BMAD_PHASES.length - 1 && (
              <ArrowRight
                size={16}
                className={isCompleted ? "text-green-500" : "text-slate-600"}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Quick Actions Bar
function QuickActionsBar() {
  const { projectContext, saveProjectContext } = useBmadStore();
  const { generateStories, isLoading } = useLlmStore();
  const { addCard, state, activeBoardId } = useKanbanStore();

  const [generating, setGenerating] = useState(false);

  const handleGeneratePrd = () => {
    // This would open a modal or navigate to PRD creation
    console.log("Generate PRD");
  };

  const handleGenerateStories = async () => {
    if (!projectContext.prd) {
      alert("Please create or import a PRD first");
      return;
    }

    setGenerating(true);
    try {
      const stories = await generateStories(
        projectContext.prd,
        projectContext.architecture,
      );

      // Add stories to kanban board
      if (activeBoardId && state?.boards) {
        const board = state.boards.find((b) => b.id === activeBoardId);
        const backlogList = board?.lists?.find(
          (l) => l.name.toLowerCase() === "backlog",
        );

        if (backlogList) {
          for (const story of stories) {
            await addCard(activeBoardId, backlogList.id, {
              title: story.title,
              description: `${story.description}\n\n**Acceptance Criteria:**\n${story.acceptanceCriteria?.map((c) => `- ${c}`).join("\n") || ""}`,
              storyPoints: story.storyPoints,
              priority: story.priority,
              labels: [story.epic],
            });
          }
        }
      }

      alert(`Generated ${stories.length} stories!`);
    } catch (err) {
      alert(`Failed to generate stories: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex gap-3">
      <button
        onClick={handleGeneratePrd}
        className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
      >
        <FileText size={16} />
        Generate PRD
      </button>

      <button
        onClick={handleGenerateStories}
        disabled={generating || !projectContext.prd}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-500/20 border border-indigo-500/50 rounded-lg text-indigo-300 hover:bg-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {generating ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Zap size={16} />
        )}
        {generating ? "Generating..." : "Generate Stories"}
      </button>

      <button
        onClick={() => console.log("Run workflow")}
        className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/50 rounded-lg text-green-300 hover:bg-green-500/30 transition-colors"
      >
        <Play size={16} />
        Run Workflow
      </button>
    </div>
  );
}

// Sprint Board Mini Preview
function SprintBoardPreview() {
  const { state, activeBoardId } = useKanbanStore();

  const board = state?.boards?.find((b) => b.id === activeBoardId);

  if (!board) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
        <FolderOpen className="w-12 h-12 mx-auto mb-3 text-slate-600" />
        <p className="text-slate-400">No board selected</p>
        <p className="text-xs text-slate-500 mt-1">
          Create a BMAD-Method Sprint board to get started
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
        <h3 className="font-medium text-white flex items-center gap-2">
          <Sparkles size={16} className="text-indigo-400" />
          {board.name}
        </h3>
        <button className="text-xs text-slate-400 hover:text-white transition-colors">
          View Full Board →
        </button>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-5 gap-3">
          {board.lists?.slice(0, 5).map((list) => (
            <div key={list.id} className="text-center">
              <div className="text-2xl font-bold text-white">
                {list.cards?.length || 0}
              </div>
              <div className="text-xs text-slate-400 truncate">{list.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Context Panel
function ContextPanel() {
  const { projectContext, projectPath } = useBmadStore();

  const contextItems = [
    {
      label: "PRD",
      value: projectContext.prd,
      path: projectContext.prdPath,
      icon: "📋",
    },
    {
      label: "Architecture",
      value: projectContext.architecture,
      path: projectContext.architecturePath,
      icon: "🏗️",
    },
    {
      label: "Product Brief",
      value: projectContext.productBrief,
      path: projectContext.productBriefPath,
      icon: "📄",
    },
  ];

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="p-4 border-b border-slate-700/50">
        <h3 className="font-medium text-white flex items-center gap-2">
          <FileText size={16} className="text-indigo-400" />
          Project Context
        </h3>
      </div>

      <div className="p-4 space-y-3">
        {contextItems.map((item) => (
          <div
            key={item.label}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              item.value
                ? "bg-green-500/10 border-green-500/30"
                : "bg-slate-700/30 border-slate-600/50"
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{item.icon}</span>
              <span
                className={item.value ? "text-green-400" : "text-slate-400"}
              >
                {item.label}
              </span>
            </div>
            {item.value ? (
              <Check size={14} className="text-green-400" />
            ) : (
              <span className="text-xs text-slate-500">Not found</span>
            )}
          </div>
        ))}

        {projectPath && (
          <div className="text-xs text-slate-500 mt-4">
            Project: {projectPath}
          </div>
        )}
      </div>
    </div>
  );
}

// Main Dashboard Component
export default function BmadDashboardView() {
  const {
    checkInstallation,
    installStatus,
    currentProject,
    loadProjectContext,
  } = useBmadStore();
  const { activeProvider, activeModel, setActiveProvider } = useLlmStore();

  useEffect(() => {
    checkInstallation();
    loadProjectContext();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">BMAD Dashboard</h1>
              <p className="text-sm text-slate-400">
                {currentProject || "No project selected"} • AI-Powered Agile
                Development
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Provider indicator */}
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-sm text-slate-400">
                {activeProvider} • {activeModel}
              </span>
            </div>

            <button className="p-2 text-slate-400 hover:text-white transition-colors">
              <Settings size={20} />
            </button>
          </div>
        </div>

        {/* Phase Progress */}
        <PhaseProgressTracker />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Chat & Actions */}
        <div className="col-span-2 space-y-6">
          {/* Quick Actions */}
          <QuickActionsBar />

          {/* Agent Chat */}
          <div className="h-[500px]">
            <AgentChatPanel storyId="default" />
          </div>
        </div>

        {/* Right Column - Context & Board */}
        <div className="space-y-6">
          <ContextPanel />
          <SprintBoardPreview />
        </div>
      </div>
    </div>
  );
}
