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
import useBmadStore from "../../stores/bmadStore";

// API endpoint
const API_URL = "http://127.0.0.1:3333/api/chat";

// Available agents configuration
const AGENTS = {
  pm: {
    id: "pm",
    name: "Product Manager",
    title: "PM Agent",
    icon: "📊",
    description: "Helps with PRD and product requirements",
  },
  analyst: {
    id: "analyst",
    name: "Analyst",
    title: "Analyst Agent",
    icon: "🔍",
    description: "Analyzes market and competitors",
  },
  architect: {
    id: "architect",
    name: "Architect",
    title: "Architect Agent",
    icon: "🏗️",
    description: "Designs system architecture",
  },
  sm: {
    id: "sm",
    name: "Scrum Master",
    title: "SM Agent",
    icon: "📋",
    description: "Helps with sprint planning and stories",
  },
  dev: {
    id: "dev",
    name: "Developer",
    title: "Dev Agent",
    icon: "💻",
    description: "Helps with implementation",
  },
};

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
            ? "bg-primary/20 text-primary"
            : "bg-purple-500/20 text-purple-500 dark:text-purple-400"
        }`}
      >
        {isUser ? <User size={16} /> : agent?.icon || <Bot size={16} />}
      </div>
      <div
        className={`max-w-[80%] rounded-xl px-4 py-3 ${
          isUser
            ? "bg-primary/10 border border-primary/30"
            : "bg-muted border border-border"
        }`}
      >
        <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
          {message.content}
        </div>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
          <span className="text-xs text-muted-foreground">
            {message.timestamp
              ? new Date(message.timestamp).toLocaleTimeString()
              : ""}
          </span>
          {!isUser && (
            <button
              onClick={handleCopy}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
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
        className="flex items-center gap-3 px-4 py-3 bg-muted/50 border border-border rounded-lg hover:border-primary/50 transition-colors w-full"
      >
        <span className="text-xl">{currentAgent?.icon}</span>
        <div className="flex-1 text-left">
          <div className="text-sm font-medium text-foreground">
            {currentAgent?.title}
          </div>
          <div className="text-xs text-muted-foreground">
            {currentAgent?.name}
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-xl z-10 max-h-64 overflow-y-auto">
          {Object.values(agents).map((agent) => (
            <button
              key={agent.id}
              onClick={() => {
                onSelect(agent.id);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors ${
                activeAgent === agent.id ? "bg-primary/10" : ""
              }`}
            >
              <span className="text-lg">{agent.icon}</span>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-foreground">
                  {agent.title}
                </div>
                <div className="text-xs text-muted-foreground">
                  {agent.description}
                </div>
              </div>
              {activeAgent === agent.id && (
                <Check size={16} className="text-primary" />
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
      <p className="text-xs text-muted-foreground">Suggested prompts:</p>
      <div className="flex flex-wrap gap-2">
        {agentPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => onSelect(prompt)}
            className="px-3 py-1.5 text-xs bg-muted border border-border rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
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
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeAgent, setActiveAgent] = useState("pm");
  const chatRef = useRef(null);

  const { projectContext } = useBmadStore();

  const agents = AGENTS;
  const currentAgent = agents[activeAgent];

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  // Build system prompt based on agent and context
  const buildSystemPrompt = () => {
    const agentRoles = {
      pm: "You are a Product Manager AI assistant. Help with product requirements, PRDs, and feature prioritization.",
      analyst:
        "You are a Business Analyst AI assistant. Help with market analysis, research, and competitor analysis.",
      architect:
        "You are a Software Architect AI assistant. Help with system design, architecture decisions, and technical planning.",
      sm: "You are a Scrum Master AI assistant. Help with sprint planning, user stories, and agile practices.",
      dev: "You are a Senior Developer AI assistant. Help with implementation, code review, and debugging.",
    };

    let prompt = agentRoles[activeAgent] || agentRoles.pm;

    if (projectContext.prd) {
      prompt += `\n\nProject PRD Context:\n${projectContext.prd.slice(0, 2000)}`;
    }
    if (projectContext.architecture) {
      prompt += `\n\nArchitecture Context:\n${projectContext.architecture.slice(0, 2000)}`;
    }

    return prompt;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      // Build messages array with system prompt
      const apiMessages = [
        { role: "system", content: buildSystemPrompt() },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: input },
      ];

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: apiMessages,
          provider: "codex",
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      const assistantMessage = {
        role: "assistant",
        content:
          data.text ||
          data.content ||
          data.message ||
          data.response ||
          "No response received",
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("Failed to send message:", err);
      setError(err.message || "Failed to send message");
    } finally {
      setIsLoading(false);
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
      setMessages([]);
      setError(null);
    }
  };

  const handleSuggestedPrompt = (prompt) => {
    setInput(prompt);
  };

  return (
    <div
      className={`flex flex-col bg-card rounded-xl border border-border overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
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
            <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center text-3xl">
              {currentAgent?.icon || <Sparkles size={24} />}
            </div>
            <h3 className="text-foreground font-medium mb-1">
              Chat with {currentAgent?.name}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
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
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Loader2
                    size={16}
                    className="animate-spin text-purple-500 dark:text-purple-400"
                  />
                </div>
                <span className="text-sm">
                  {currentAgent?.name} is thinking...
                </span>
              </div>
            )}
          </>
        )}
        {error && (
          <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-3 text-destructive text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        {messages.length > 0 && (
          <div className="flex justify-end mb-2">
            <button
              onClick={handleClear}
              className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
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
            className="flex-1 bg-muted/50 border border-input rounded-lg px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary resize-none"
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="px-4 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground rounded-lg transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
