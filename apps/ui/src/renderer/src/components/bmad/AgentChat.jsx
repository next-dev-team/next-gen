/**
 * Agent Chat Component
 *
 * Standalone chat component for interacting with BMAD agents.
 * Features:
 * - Agent selection
 * - Conversation history per story
 * - Context-aware responses
 * - Continue conversation
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  User,
  Bot,
  Loader2,
  MessageSquare,
  RefreshCw,
  Trash2,
  ChevronDown,
  Sparkles,
  Copy,
  Check,
} from "lucide-react";
import useLlmStore from "../../stores/llmStore";
import useBmadStore from "../../stores/bmadStore";

// Chat Message Component
function ChatMessage({ message, agent, onCopy }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
          isUser
            ? "bg-blue-500/20 text-blue-400"
            : "bg-purple-500/20 text-purple-400"
        }`}
      >
        {isUser ? <User size={16} /> : agent?.icon || <Bot size={16} />}
      </div>
      <div
        className={`max-w-[80%] rounded-xl px-4 py-3 ${
          isUser
            ? "bg-blue-500/20 border border-blue-500/30"
            : "bg-slate-700/50 border border-slate-600/50"
        }`}
      >
        <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
          {message.content}
        </div>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-600/30">
          <span className="text-xs text-slate-500">
            {message.timestamp
              ? new Date(message.timestamp).toLocaleTimeString()
              : ""}
          </span>
          {!isUser && (
            <button
              onClick={handleCopy}
              className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
            >
              {copied ? (
                <>
                  <Check size={12} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={12} />
                  Copy
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Agent Selector Dropdown
function AgentSelector({ agents, activeAgent, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const currentAgent = agents[activeAgent];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-slate-600 transition-colors w-full"
      >
        <span className="text-xl">{currentAgent?.icon}</span>
        <div className="flex-1 text-left">
          <div className="text-sm font-medium text-white">
            {currentAgent?.title}
          </div>
          <div className="text-xs text-slate-400">{currentAgent?.name}</div>
        </div>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10 max-h-64 overflow-y-auto">
          {Object.values(agents).map((agent) => (
            <button
              key={agent.id}
              onClick={() => {
                onSelect(agent.id);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700/50 transition-colors ${
                activeAgent === agent.id ? "bg-indigo-500/20" : ""
              }`}
            >
              <span className="text-lg">{agent.icon}</span>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-white">
                  {agent.title}
                </div>
                <div className="text-xs text-slate-400">
                  {agent.description}
                </div>
              </div>
              {activeAgent === agent.id && (
                <Check size={16} className="text-indigo-400" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Suggested Prompts
function SuggestedPrompts({ agent, onSelect }) {
  const prompts = {
    pm: [
      "Help me create a PRD for this project",
      "What features should we prioritize for MVP?",
      "Review my existing requirements",
    ],
    analyst: [
      "Help me brainstorm ideas for my product",
      "What market research should I consider?",
      "Analyze this competitor product",
    ],
    architect: [
      "Design the system architecture",
      "What tech stack should we use?",
      "Review this architecture for scalability",
    ],
    sm: [
      "Break down this feature into stories",
      "Help estimate story points",
      "Plan the next sprint",
    ],
    dev: [
      "How should I implement this feature?",
      "Review my code approach",
      "Help debug this issue",
    ],
  };

  const agentPrompts = prompts[agent] || prompts.pm;

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">Suggested prompts:</p>
      <div className="flex flex-wrap gap-2">
        {agentPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => onSelect(prompt)}
            className="px-3 py-1.5 text-xs bg-slate-700/50 border border-slate-600 rounded-full text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

// Main Agent Chat Component
export default function AgentChat({ storyId = "default", className = "" }) {
  const [input, setInput] = useState("");
  const chatRef = useRef(null);

  const {
    activeAgent,
    getAvailableAgents,
    getCurrentAgent,
    setActiveAgent,
    getConversation,
    sendMessage,
    clearConversation,
    isLoading,
    error,
  } = useLlmStore();

  const { projectContext } = useBmadStore();

  const agents = getAvailableAgents();
  const currentAgent = getCurrentAgent();
  const messages = getConversation(storyId, activeAgent);

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
      await sendMessage(storyId, activeAgent, message, {
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

  const handleClear = () => {
    if (confirm(`Clear conversation with ${currentAgent?.name}?`)) {
      clearConversation(storyId, activeAgent);
    }
  };

  const handleSuggestedPrompt = (prompt) => {
    setInput(prompt);
  };

  return (
    <div
      className={`flex flex-col bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50">
        <AgentSelector
          agents={agents}
          activeAgent={activeAgent}
          onSelect={setActiveAgent}
        />
      </div>

      {/* Messages */}
      <div ref={chatRef} className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-700/50 rounded-full flex items-center justify-center text-3xl">
              {currentAgent?.icon || <Sparkles size={24} />}
            </div>
            <h3 className="text-white font-medium mb-1">
              Chat with {currentAgent?.name}
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              {currentAgent?.description}
            </p>
            <SuggestedPrompts
              agent={activeAgent}
              onSelect={handleSuggestedPrompt}
            />
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <ChatMessage key={i} message={msg} agent={currentAgent} />
            ))}
            {isLoading && (
              <div className="flex items-center gap-3 text-slate-400">
                <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Loader2 size={16} className="animate-spin text-purple-400" />
                </div>
                <span className="text-sm">
                  {currentAgent?.name} is thinking...
                </span>
              </div>
            )}
          </>
        )}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-700/50">
        {messages.length > 0 && (
          <div className="flex justify-end mb-2">
            <button
              onClick={handleClear}
              className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1 transition-colors"
            >
              <Trash2 size={12} />
              Clear chat
            </button>
          </div>
        )}
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
