import {
  AlertCircle,
  ArrowRight,
  Book,
  Calendar,
  CheckCircle,
  CheckCircle2,
  Check,
  ChevronDown,
  Circle,
  Clock,
  Copy,
  Filter,
  GitBranch,
  GripVertical,
  Layout,
  LayoutGrid,
  Lock,
  PauseCircle,
  Pencil,
  PlayCircle,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Tag,
  Target,
  Trash2,
  TrendingUp,
  Unlock,
  User,
  Users,
  Wifi,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { ScrollArea } from "../components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Separator } from "../components/ui/separator";
import { Switch } from "../components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";
import { cn } from "../lib/utils";

import useKanbanStore, {
  EPIC_STATUSES,
  PRIORITY_LEVELS,
  STORY_STATUSES,
} from "../stores/kanbanStore";

// Board templates based on BMAD-Method
const BOARD_TEMPLATES = [
  {
    id: "bmad-method",
    name: "BMAD-Method Sprint",
    description: "Full agile workflow with story lifecycle",
    type: "bmad",
    lists: STORY_STATUSES.map((s) => s.name),
    icon: Sparkles,
  },
  {
    id: "kanban-simple",
    name: "Simple Kanban",
    description: "Basic workflow for quick projects",
    type: "custom",
    lists: ["Backlog", "In Progress", "Done"],
    icon: Layout,
  },
  {
    id: "dev-workflow",
    name: "Development Flow",
    description: "Extended workflow with code review",
    type: "custom",
    lists: ["Backlog", "To Do", "In Progress", "Review", "Testing", "Done"],
    icon: GitBranch,
  },
];

// Status icons mapping
const STATUS_ICONS = {
  backlog: Circle,
  "ready-for-dev": PlayCircle,
  "in-progress": Clock,
  review: Users,
  done: CheckCircle,
};

// Priority colors and icons
const PRIORITY_CONFIG = {
  low: { color: "bg-slate-500", textColor: "text-slate-500", icon: "○" },
  medium: { color: "bg-blue-500", textColor: "text-blue-500", icon: "◐" },
  high: { color: "bg-amber-500", textColor: "text-amber-500", icon: "◑" },
  critical: { color: "bg-red-500", textColor: "text-red-500", icon: "●" },
};

const BMAD_AGENT_SETUP_STORAGE_KEY = "bmad-scrum-agent-setup-v1";
const SCRUM_OVERVIEW_TAB_STORAGE_KEY = "scrum-overview-tab-v1";
const SCRUM_RECENT_PROJECTS_STORAGE_KEY = "scrum-recent-projects-v1";
const SCRUM_MAX_RECENT_PROJECTS = 8;

// BMAD v6 Agents - matching the actual bmm module agents
const BMAD_V6_AGENTS = [
  {
    id: "analyst",
    label: "🔍 Analyst",
    description: "Brainstorming, research, and product brief creation",
    phase: "analysis",
  },
  {
    id: "pm",
    label: "📋 Product Manager",
    description: "PRD creation, project planning, and requirement definition",
    phase: "planning",
  },
  {
    id: "ux-designer",
    label: "🎨 UX Designer",
    description: "User experience design, wireframes, and user flows",
    phase: "planning",
  },
  {
    id: "architect",
    label: "🏗️ Architect",
    description: "Solution architecture, tech specs, and system design",
    phase: "solutioning",
  },
  {
    id: "sm",
    label: "📊 Scrum Master",
    description: "Sprint planning, story management, and team coordination",
    phase: "implementation",
  },
  {
    id: "dev",
    label: "💻 Developer",
    description: "Story implementation, code review, and development",
    phase: "implementation",
  },
  {
    id: "tech-writer",
    label: "📝 Tech Writer",
    description: "Documentation, project context, and technical writing",
    phase: "implementation",
  },
  {
    id: "tea",
    label: "🧪 Test Engineer",
    description: "Test planning, QA, and acceptance criteria validation",
    phase: "implementation",
  },
  {
    id: "quick-flow-solo-dev",
    label: "⚡ Quick Flow (Solo)",
    description: "Streamlined solo developer workflow for small projects",
    phase: "all",
  },
  {
    id: "bmad-master",
    label: "🎯 BMAD Master",
    description: "Master orchestrator for multi-agent coordination",
    phase: "all",
  },
];

// BMAD v6 Phases - proper 4-phase structure
const BMAD_V6_PHASES = [
  {
    id: "phase-1",
    name: "Analysis",
    icon: "🔍",
    description: "Research and product brief creation",
    required: false,
    agent: "analyst",
    workflows: ["brainstorm-project", "research", "product-brief"],
    outputs: ["brainstorm-analysis.md", "product-brief.md"],
  },
  {
    id: "phase-2",
    name: "Planning",
    icon: "📋",
    description: "PRD and UX design (PRD required)",
    required: true,
    agent: "pm",
    workflows: ["prd", "create-ux-design"],
    outputs: ["PRD.md", "ux-design.md"],
  },
  {
    id: "phase-3",
    name: "Solutioning",
    icon: "🏗️",
    description: "Architecture and story creation",
    required: false,
    agent: "architect",
    workflows: [
      "create-architecture",
      "create-epics-and-stories",
      "check-implementation-readiness",
    ],
    outputs: ["solution-architecture.md", "epics-and-stories.md"],
  },
  {
    id: "phase-4",
    name: "Implementation",
    icon: "💻",
    description: "Sprint execution and delivery",
    required: false,
    agent: "sm",
    workflows: ["sprint-planning", "dev-story", "code-review", "retrospective"],
    outputs: [],
  },
];

// BMAD v6 Workflows organized by phase
const BMAD_V6_WORKFLOWS = [
  // Phase 1: Analysis
  {
    id: "brainstorm-project",
    name: "Brainstorm Project",
    phase: "phase-1",
    agent: "analyst",
    description: "Guided brainstorming to define the project",
  },
  {
    id: "research",
    name: "Research",
    phase: "phase-1",
    agent: "analyst",
    description: "Market and technical research",
  },
  {
    id: "product-brief",
    name: "Product Brief",
    phase: "phase-1",
    agent: "analyst",
    description: "Create product concept brief",
  },
  // Phase 2: Planning
  {
    id: "prd",
    name: "PRD",
    phase: "phase-2",
    agent: "pm",
    description: "Product Requirements Document (required)",
    required: true,
  },
  {
    id: "create-ux-design",
    name: "UX Design",
    phase: "phase-2",
    agent: "ux-designer",
    description: "User experience design",
  },
  // Phase 3: Solutioning
  {
    id: "create-architecture",
    name: "Architecture",
    phase: "phase-3",
    agent: "architect",
    description: "Solution architecture design",
  },
  {
    id: "create-epics-and-stories",
    name: "Epics & Stories",
    phase: "phase-3",
    agent: "architect",
    description: "Create epics and user stories",
  },
  {
    id: "check-implementation-readiness",
    name: "Implementation Readiness",
    phase: "phase-3",
    agent: "architect",
    description: "Verify ready for implementation",
  },
  // Phase 4: Implementation
  {
    id: "sprint-planning",
    name: "Sprint Planning",
    phase: "phase-4",
    agent: "sm",
    description: "Plan sprint backlog",
  },
  {
    id: "dev-story",
    name: "Develop Story",
    phase: "phase-4",
    agent: "dev",
    description: "Implement a user story",
  },
  {
    id: "code-review",
    name: "Code Review",
    phase: "phase-4",
    agent: "dev",
    description: "Review and approve code changes",
  },
  {
    id: "retrospective",
    name: "Retrospective",
    phase: "phase-4",
    agent: "sm",
    description: "Sprint retrospective",
  },
  // Quick Flow
  {
    id: "bmad-quick-flow",
    name: "Quick Flow",
    phase: "all",
    agent: "quick-flow-solo-dev",
    description: "Streamlined solo dev workflow",
  },
  // Utilities
  {
    id: "document-project",
    name: "Document Project",
    phase: "all",
    agent: "tech-writer",
    description: "Generate project documentation",
  },
  {
    id: "generate-project-context",
    name: "Generate Context",
    phase: "all",
    agent: "bmad-master",
    description: "Generate project context file",
  },
];

// BMAD Installation Status types
const BMAD_INSTALL_STATUS = {
  NOT_CHECKED: "not-checked",
  CHECKING: "checking",
  NOT_INSTALLED: "not-installed",
  INSTALLED: "installed",
  PARTIAL: "partial",
  ERROR: "error",
};

// Legacy agent options for backward compatibility
const BMAD_AGENT_OPTIONS = BMAD_V6_AGENTS;

const BMAD_IDE_OPTIONS = [
  { id: "claude-code", label: "Claude Code" },
  { id: "cursor", label: "Cursor" },
  { id: "windsurf", label: "Windsurf" },
  { id: "vscode", label: "VS Code" },
  { id: "trae", label: "Trae" },
  { id: "cline", label: "Cline" },
  { id: "copilot", label: "GitHub Copilot" },
];

// BMAD Context Types - based on agent-rules.ts generator configuration
// These are the standard context files used in BMAD workflow
const BMAD_CONTEXT_CATEGORIES = [
  {
    id: "bmad-docs",
    label: "BMAD Documents",
    icon: "📋",
    description: "Core BMAD workflow documents",
    items: [
      { id: "prd", label: "PRD", path: "_bmad-output/prd.md", required: true },
      {
        id: "product-brief",
        label: "Product Brief",
        path: "_bmad-output/product-brief.md",
      },
      { id: "research", label: "Research", path: "_bmad-output/research.md" },
      {
        id: "brainstorm",
        label: "Brainstorm",
        path: "_bmad-output/brainstorm.md",
      },
      {
        id: "tech-spec",
        label: "Tech Spec",
        path: "_bmad-output/tech-spec.md",
      },
      {
        id: "architecture",
        label: "Architecture",
        path: "_bmad-output/architecture.md",
      },
      {
        id: "ux-design",
        label: "UX Design",
        path: "_bmad-output/ux-design.md",
      },
      { id: "stories", label: "Stories", path: "_bmad-output/stories.md" },
    ],
  },
  {
    id: "agent-rules",
    label: "Agent Rules",
    icon: "🤖",
    description: "IDE/Agent instruction files (from agent-rules.ts)",
    items: [
      { id: "agents-md", label: "AGENTS.md (Base)", path: "AGENTS.md" },
      {
        id: "claude-md",
        label: "CLAUDE.md",
        path: "CLAUDE.md",
        ide: "claude-code",
      },
      { id: "gemini-md", label: "GEMINI.md", path: "GEMINI.md", ide: "gemini" },
      { id: "qwen-md", label: "QWEN.md", path: "QWEN.md", ide: "qwen" },
      {
        id: "cursor-rules",
        label: ".cursorrules",
        path: ".cursorrules",
        ide: "cursor",
      },
      {
        id: "windsurf-rules",
        label: ".windsurfrules",
        path: ".windsurfrules",
        ide: "windsurf",
      },
      {
        id: "cline-rules",
        label: ".clinerules",
        path: ".clinerules",
        ide: "cline",
      },
      {
        id: "trae-rules",
        label: "Trae Rules",
        path: ".trae/rule/main.md",
        ide: "trae",
      },
      {
        id: "copilot-instructions",
        label: "Copilot Instructions",
        path: ".github/copilot-instructions.md",
        ide: "copilot",
      },
    ],
  },
  {
    id: "project-config",
    label: "Project Config",
    icon: "⚙️",
    description: "Project configuration files",
    items: [
      { id: "spec-md", label: "SPEC.md", path: "SPEC.md" },
      { id: "readme", label: "README.md", path: "README.md" },
      { id: "changelog", label: "CHANGELOG.md", path: "CHANGELOG.md" },
      { id: "contributing", label: "CONTRIBUTING.md", path: "CONTRIBUTING.md" },
    ],
  },
  {
    id: "bmad-config",
    label: "BMAD Config",
    icon: "🔧",
    description: "BMAD method configuration",
    items: [
      { id: "bmad-config", label: "BMAD Config", path: "_bmad/config.yaml" },
      { id: "bmad-agents", label: "BMAD Agents", path: "_bmad/agents/" },
      {
        id: "bmad-workflows",
        label: "BMAD Workflows",
        path: "_bmad/workflows/",
      },
    ],
  },
];

// Flatten all context items for easy lookup
const ALL_BMAD_CONTEXT_ITEMS = BMAD_CONTEXT_CATEGORIES.flatMap((cat) =>
  cat.items.map((item) => ({
    ...item,
    category: cat.id,
    categoryLabel: cat.label,
  }))
);

const MCP_KANBAN_TOOL_OPTIONS = [
  {
    id: "scrum_get_state",
    label: "scrum_get_state",
    description: "Read the full Scrum/Kanban state.",
  },
  {
    id: "scrum_set_state",
    label: "scrum_set_state",
    description: "Replace the full state (use carefully).",
  },
  {
    id: "scrum_create_board",
    label: "scrum_create_board",
    description: "Create a new board.",
  },
  {
    id: "scrum_delete_board",
    label: "scrum_delete_board",
    description: "Delete a board by id.",
  },
  {
    id: "scrum_add_list",
    label: "scrum_add_list",
    description: "Add a list/status column to a board.",
  },
  {
    id: "scrum_rename_list",
    label: "scrum_rename_list",
    description: "Rename a list/status column.",
  },
  {
    id: "scrum_delete_list",
    label: "scrum_delete_list",
    description: "Delete a list/status column.",
  },
  {
    id: "scrum_add_card",
    label: "scrum_add_card",
    description: "Create a story in a list.",
  },
  {
    id: "scrum_update_card",
    label: "scrum_update_card",
    description: "Update a story fields/metadata.",
  },
  {
    id: "scrum_delete_card",
    label: "scrum_delete_card",
    description: "Delete a story.",
  },
  {
    id: "scrum_move_card",
    label: "scrum_move_card",
    description: "Move/reorder a story between lists.",
  },
  {
    id: "scrum_acquire_lock",
    label: "scrum_acquire_lock",
    description: "Lock a story to prevent edits.",
  },
  {
    id: "scrum_release_lock",
    label: "scrum_release_lock",
    description: "Release a story lock.",
  },
  {
    id: "scrum_create_epic",
    label: "scrum_create_epic",
    description: "Create an epic.",
  },
  {
    id: "scrum_update_epic",
    label: "scrum_update_epic",
    description: "Update an epic.",
  },
  {
    id: "scrum_get_stories_by_status",
    label: "scrum_get_stories_by_status",
    description: "List stories in a status.",
  },
  {
    id: "scrum_get_next_story",
    label: "scrum_get_next_story",
    description: "Get next story from ready-for-dev.",
  },
  {
    id: "scrum_get_story_by_id",
    label: "scrum_get_story_by_id",
    description: "Get a story by key (board:name:number) or UUID.",
  },
  {
    id: "scrum_complete_story",
    label: "scrum_complete_story",
    description: "Move a story to done and release lock.",
  },
  {
    id: "bmad_install",
    label: "bmad_install",
    description: "Install BMAD in a project directory.",
  },
  {
    id: "bmad_status",
    label: "bmad_status",
    description: "Check BMAD installation status.",
  },
  {
    id: "generate_prd",
    label: "generate_prd",
    description: "Generate PRD markdown into a file.",
  },
  {
    id: "update_prd",
    label: "update_prd",
    description: "Overwrite an existing PRD markdown file.",
  },
  {
    id: "add_prd_features",
    label: "add_prd_features",
    description: "Add feature bullets into a PRD section.",
  },
  {
    id: "context_list_files",
    label: "context_list_files",
    description: "List BMAD context files and check which exist.",
  },
  {
    id: "context_read",
    label: "context_read",
    description: "Read a BMAD context file (PRD, agent rules, etc.).",
  },
  {
    id: "context_write",
    label: "context_write",
    description: "Write content to a BMAD context file.",
  },
];

const getMcpToolUsageText = ({ toolId, activeBoard, projectRoot }) => {
  const boardId = activeBoard?.id || "<boardId>";
  const boardName = activeBoard?.name || "<boardName>";
  const listId = activeBoard?.lists?.[0]?.id || "<listId>";
  const cardId = activeBoard?.lists?.[0]?.cards?.[0]?.id || "<cardId>";
  const cwd = String(projectRoot || "").trim() || "/absolute/path";

  switch (toolId) {
    case "scrum_get_state":
      return "scrum-kanban/scrum_get_state";
    case "scrum_set_state":
      return 'scrum-kanban/scrum_set_state {"state":{...}}';
    case "scrum_create_board":
      return 'scrum-kanban/scrum_create_board {"name":"","type":"bmad"}';
    case "scrum_delete_board":
      return `scrum-kanban/scrum_delete_board {"boardId":"${boardId}"}`;
    case "scrum_add_list":
      return `scrum-kanban/scrum_add_list {"boardId":"${boardId}","name":"Backlog"}`;
    case "scrum_rename_list":
      return `scrum-kanban/scrum_rename_list {"boardId":"${boardId}","listId":"${listId}","name":"New name"}`;
    case "scrum_delete_list":
      return `scrum-kanban/scrum_delete_list {"boardId":"${boardId}","listId":"${listId}"}`;
    case "scrum_add_card":
      return `scrum-kanban/scrum_add_card {"boardId":"${boardId}","listId":"${listId}","title":"My story"}`;
    case "scrum_update_card":
      return `scrum-kanban/scrum_update_card {"boardId":"${boardId}","listId":"${listId}","cardId":"${cardId}","patch":{...}}`;
    case "scrum_delete_card":
      return `scrum-kanban/scrum_delete_card {"boardId":"${boardId}","listId":"${listId}","cardId":"${cardId}"}`;
    case "scrum_move_card":
      return `scrum-kanban/scrum_move_card {"boardId":"${boardId}","cardId":"${cardId}","fromListId":"${listId}","toListId":"<toListId>","toIndex":0}`;
    case "scrum_acquire_lock":
      return `scrum-kanban/scrum_acquire_lock {"cardId":"${cardId}"}`;
    case "scrum_release_lock":
      return `scrum-kanban/scrum_release_lock {"cardId":"${cardId}"}`;
    case "scrum_create_epic":
      return 'scrum-kanban/scrum_create_epic {"name":"Epic name"}';
    case "scrum_update_epic":
      return 'scrum-kanban/scrum_update_epic {"epicId":"<epicId>","patch":{...}}';
    case "scrum_get_stories_by_status":
      return `scrum-kanban/scrum_get_stories_by_status {"boardId":"${boardId}","status":"backlog"}`;
    case "scrum_get_next_story":
      return `scrum-kanban/scrum_get_next_story {"boardId":"${boardId}"}`;
    case "scrum_get_story_by_id":
      return `scrum-kanban/scrum_get_story_by_id here is id: ${boardName}:1`;
    case "scrum_complete_story":
      return `scrum-kanban/scrum_complete_story {"boardId":"${boardId}","cardId":"${cardId}"}`;
    case "bmad_install":
      return `scrum-kanban/bmad_install {"cwd":"${cwd}","mode":"npx"}`;
    case "bmad_status":
      return `scrum-kanban/bmad_status {"cwd":"${cwd}","mode":"npx"}`;
    case "generate_prd":
      return `scrum-kanban/generate_prd {"cwd":"${cwd}","content":"..."}`;
    case "update_prd":
      return `scrum-kanban/update_prd {"cwd":"${cwd}","relativePath":"_bmad-output/prd.md","content":"..."}`;
    case "add_prd_features":
      return `scrum-kanban/add_prd_features {"cwd":"${cwd}","relativePath":"_bmad-output/prd.md","headingPath":["Core Features (MVP)"],"features":["..."],"createIfMissing":true}`;
    default:
      return `scrum-kanban/${String(toolId || "<tool>")}`;
  }
};

const safeJsonParse = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const normalizeMcpPath = (p) => String(p || "").replace(/\\/g, "/");

const recommendAgent = ({ teamSize, sprintLength, autoSync }) => {
  const size = Number(teamSize);
  const sprint = Number(sprintLength);
  const sync = Boolean(autoSync);

  if (Number.isFinite(size) && size >= 8) return "bmad-master";
  if (Number.isFinite(sprint) && sprint >= 21) return "sm";
  if (!sync) return "quick-flow-solo-dev";
  return "sm";
};

const renderMarkdownInline = (text) => {
  const raw = String(text || "");
  const parts = raw.split(/(`[^`]*`)/g).filter((p) => p !== "");
  return parts.map((part, idx) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          key={`${idx}:${part}`}
          className="rounded bg-white/10 px-1 py-0.5 font-mono text-[12px]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={`${idx}:${part}`}>{part}</React.Fragment>;
  });
};

const MarkdownPreview = ({ value }) => {
  const input = String(value || "").replace(/\r\n/g, "\n");
  const lines = input.split("\n");
  const blocks = [];

  let i = 0;
  let inCode = false;
  let codeLines = [];

  const flushCode = () => {
    if (!codeLines.length) return;
    blocks.push({ type: "code", text: codeLines.join("\n") });
    codeLines = [];
  };

  while (i < lines.length) {
    const line = String(lines[i] || "");
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        inCode = true;
      }
      i++;
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      i++;
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: String(headingMatch[2] || "").trim(),
      });
      i++;
      continue;
    }

    const bulletMatch = line.match(/^\s*[-*+]\s+(.*)$/);
    if (bulletMatch) {
      const items = [];
      while (i < lines.length) {
        const l = String(lines[i] || "");
        const m = l.match(/^\s*[-*+]\s+(.*)$/);
        if (!m) break;
        items.push(String(m[1] || "").trim());
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    if (!trimmed) {
      blocks.push({ type: "spacer" });
      i++;
      continue;
    }

    const para = [trimmed];
    i++;
    while (i < lines.length) {
      const next = String(lines[i] || "");
      const nextTrimmed = next.trim();
      if (!nextTrimmed) break;
      if (/^(#{1,6})\s+/.test(next) || /^\s*[-*+]\s+/.test(nextTrimmed)) break;
      if (nextTrimmed.startsWith("```")) break;
      para.push(nextTrimmed);
      i++;
    }
    blocks.push({ type: "p", text: para.join(" ") });
  }

  if (inCode) flushCode();

  const headingClass = (level) => {
    if (level <= 1) return "text-xl font-semibold";
    if (level === 2) return "text-lg font-semibold";
    if (level === 3) return "text-base font-semibold";
    return "text-sm font-semibold";
  };

  return (
    <div className="text-sm text-gray-100 whitespace-normal">
      {blocks.map((b, idx) => {
        const blockKey = `${idx}:${b.type}:${String(b.text || "")}`;
        if (b.type === "spacer") return <div key={blockKey} className="h-2" />;
        if (b.type === "heading")
          return (
            <div key={blockKey} className={cn("mt-3", headingClass(b.level))}>
              {renderMarkdownInline(b.text)}
            </div>
          );
        if (b.type === "code")
          return (
            <pre
              key={blockKey}
              className="mt-3 rounded-md border border-border/50 bg-black/60 p-3 overflow-x-auto text-xs"
            >
              <code className="font-mono">{b.text}</code>
            </pre>
          );
        if (b.type === "ul")
          return (
            <ul key={blockKey} className="mt-2 list-disc pl-5 space-y-1">
              {b.items.map((it, j) => (
                <li key={`${j}:${it}`}>{renderMarkdownInline(it)}</li>
              ))}
            </ul>
          );
        if (b.type === "p")
          return (
            <p key={blockKey} className="mt-2 leading-6">
              {renderMarkdownInline(b.text)}
            </p>
          );
        return null;
      })}
    </div>
  );
};

const normalizeContextDocs = ({ docs, prdPath, selectedIdes }) => {
  // PRD is always first and required
  const prd = {
    id: "prd",
    label: "PRD",
    path:
      String(prdPath || "_bmad-output/prd.md").trim() || "_bmad-output/prd.md",
    category: "bmad-docs",
    required: true,
  };

  // Get custom docs from user
  const raw = Array.isArray(docs) ? docs : [];
  const customDocs = raw
    .map((d) => ({
      id: String(d?.id || "").trim(),
      label: String(d?.label || "").trim() || "Context",
      path: String(d?.path || "").trim(),
      category: String(d?.category || "custom").trim(),
    }))
    .filter((d) => d.id && d.id !== "prd");

  return [prd, ...customDocs];
};

// Get all predefined context items, optionally filtered by selected IDEs
const getPredefinedContextItems = ({ selectedIdes, includeAll = false }) => {
  const ideSet = new Set(Array.isArray(selectedIdes) ? selectedIdes : []);
  const items = [];

  for (const cat of BMAD_CONTEXT_CATEGORIES) {
    for (const item of cat.items) {
      // If item is IDE-specific, only include if that IDE is selected (or includeAll)
      if (item.ide && !includeAll && ideSet.size > 0 && !ideSet.has(item.ide)) {
        continue;
      }
      items.push({
        ...item,
        category: cat.id,
        categoryLabel: cat.label,
        categoryIcon: cat.icon,
      });
    }
  }

  return items;
};

// Group context items by category for display
const groupContextItemsByCategory = (items) => {
  const groups = {};
  for (const item of items) {
    const catId = item.category || "custom";
    if (!groups[catId]) {
      const catDef = BMAD_CONTEXT_CATEGORIES.find((c) => c.id === catId);
      groups[catId] = {
        id: catId,
        label: catDef?.label || "Custom",
        icon: catDef?.icon || "📄",
        items: [],
      };
    }
    groups[catId].items.push(item);
  }
  return Object.values(groups);
};

// ============ Card Editor Dialog ============
const CardEditorDialog = ({
  open,
  onOpenChange,
  initial,
  onSave,
  onDelete,
  epics = [],
  isLocked = false,
  lockInfo = null,
}) => {
  const [title, setTitle] = React.useState(initial?.title || "");
  const [description, setDescription] = React.useState(
    initial?.description || ""
  );
  const [assignee, setAssignee] = React.useState(initial?.assignee || "");
  const [points, setPoints] = React.useState(
    typeof initial?.points === "number" ? String(initial.points) : ""
  );
  const [labels, setLabels] = React.useState(
    Array.isArray(initial?.labels) ? initial.labels.join(", ") : ""
  );
  const [priority, setPriority] = React.useState(initial?.priority || "medium");
  const [epicId, setEpicId] = React.useState(initial?.epicId || "");

  React.useEffect(() => {
    setTitle(initial?.title || "");
    setDescription(initial?.description || "");
    setAssignee(initial?.assignee || "");
    setPoints(
      typeof initial?.points === "number" ? String(initial.points) : ""
    );
    setLabels(Array.isArray(initial?.labels) ? initial.labels.join(", ") : "");
    setPriority(initial?.priority || "medium");
    setEpicId(initial?.epicId || "");
  }, [initial]);

  const canSave = title.trim().length > 0 && !isLocked;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-background/95 backdrop-blur-lg border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {initial?.id ? (
              <>
                <Pencil className="h-5 w-5 text-primary" />
                Edit Story
              </>
            ) : (
              <>
                <Plus className="h-5 w-5 text-primary" />
                Create New Story
              </>
            )}
          </DialogTitle>
          {isLocked && lockInfo && (
            <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm">
              <Lock className="h-4 w-4 text-amber-500" />
              <span className="text-amber-600 dark:text-amber-400">
                This card is being edited by {lockInfo.userId}
              </span>
            </div>
          )}
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              Title
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter story title..."
              className="bg-background/50"
              disabled={isLocked}
            />
          </div>

          <div className="grid gap-2">
            <Label className="flex items-center gap-2">
              <Book className="h-4 w-4 text-muted-foreground" />
              Description
            </Label>
            <textarea
              className="flex min-h-[100px] w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the story requirements..."
              disabled={isLocked}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Assignee
              </Label>
              <Input
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="Who's working on this?"
                className="bg-background/50"
                disabled={isLocked}
              />
            </div>

            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                Story Points
              </Label>
              <Input
                inputMode="numeric"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                placeholder="e.g. 3"
                className="bg-background/50"
                disabled={isLocked}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                Priority
              </Label>
              <Select
                value={priority}
                onValueChange={setPriority}
                disabled={isLocked}
              >
                <SelectTrigger className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_LEVELS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full",
                            `bg-[${p.color}]`
                          )}
                          style={{ backgroundColor: p.color }}
                        />
                        {p.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {epics.length > 0 && (
              <div className="grid gap-2">
                <Label className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-muted-foreground" />
                  Epic
                </Label>
                <Select
                  value={epicId}
                  onValueChange={setEpicId}
                  disabled={isLocked}
                >
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Select epic..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Epic</SelectItem>
                    {epics.map((epic) => (
                      <SelectItem key={epic.id} value={epic.id}>
                        {epic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              Labels
            </Label>
            <Input
              value={labels}
              onChange={(e) => setLabels(e.target.value)}
              placeholder="feature, bugfix, enhancement (comma separated)"
              className="bg-background/50"
              disabled={isLocked}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          {initial?.id && !isLocked && (
            <Button
              type="button"
              variant="destructive"
              className="mr-auto"
              onClick={() => onDelete?.()}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canSave}
            onClick={() => {
              const parsedPoints = points.trim() === "" ? null : Number(points);
              const nextPoints = Number.isFinite(parsedPoints)
                ? parsedPoints
                : null;
              const nextLabels = labels
                .split(",")
                .map((l) => l.trim())
                .filter(Boolean);

              onSave({
                title: title.trim(),
                description: description.trim(),
                assignee: assignee.trim(),
                points: nextPoints,
                labels: nextLabels,
                priority,
                epicId: epicId || null,
              });
            }}
            className="bg-primary hover:bg-primary/90"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {initial?.id ? "Update Story" : "Create Story"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============ Stats Card ============
const StatsCard = ({ stats }) => {
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
};

const McpToolsUsage = ({ activeBoard, projectRoot }) => {
  const [toolId, setToolId] = React.useState("scrum_get_state");
  const [copied, setCopied] = React.useState(false);

  const toolMeta = React.useMemo(
    () => MCP_KANBAN_TOOL_OPTIONS.find((t) => t.id === toolId) || null,
    [toolId]
  );

  const usageText = React.useMemo(
    () => getMcpToolUsageText({ toolId, activeBoard, projectRoot }),
    [toolId, activeBoard, projectRoot]
  );

  const handleCopyUsage = React.useCallback(
    async (textOverride) => {
      const textToCopy =
        typeof textOverride === "string" ? textOverride : usageText;
      if (!textToCopy) return;
      try {
        await navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        toast.success("Usage instructions copied to clipboard", {
          description: "You can now paste them into your AI agent's chat.",
        });
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        toast.error("Failed to copy to clipboard");
      }
    },
    [usageText]
  );

  const onToolChange = (val) => {
    setToolId(val);
    const newText = getMcpToolUsageText({
      toolId: val,
      activeBoard,
      projectRoot,
    });
    handleCopyUsage(newText);
  };

  return (
    <div className="rounded-xl border border-border/50 bg-background/40 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-sm font-medium">MCP tool</div>
          <div className="text-xs text-muted-foreground">
            {toolMeta?.description}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={toolId} onValueChange={onToolChange}>
            <SelectTrigger
              className="w-[260px] bg-background/50"
              onClick={() => handleCopyUsage()}
            >
              <SelectValue placeholder="Select tool" />
            </SelectTrigger>
            <SelectContent>
              {MCP_KANBAN_TOOL_OPTIONS.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  <div className="grid">
                    <div className="text-sm leading-tight">{t.label}</div>
                    {t.description ? (
                      <div className="text-xs text-muted-foreground leading-tight">
                        {t.description}
                      </div>
                    ) : null}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => handleCopyUsage()}
            disabled={!usageText}
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button> */}
        </div>
      </div>

      <div
        className="mt-3 rounded-lg border border-border/50 bg-background/60 px-3 py-2 font-mono text-xs whitespace-pre-wrap break-words cursor-pointer hover:bg-background/80 transition-colors"
        onClick={() => handleCopyUsage()}
      >
        {usageText}
      </div>
    </div>
  );
};

// ============ Scrum Card ============
const ScrumCard = ({
  card,
  onClick,
  onDragStart,
  onDragEnd,
  isLocked,
  lockInfo,
  listColor,
  storyKey,
  isDragging,
}) => {
  const [copied, setCopied] = React.useState(false);
  const priorityConfig =
    PRIORITY_CONFIG[card.priority] || PRIORITY_CONFIG.medium;

  const handleCopyStoryId = React.useCallback(
    async (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (!storyKey) return;
      const text = `scrum-kanban/scrum_get_story_by_id here is id: ${storyKey}`;
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    },
    [storyKey]
  );

  return (
    <Card
      draggable={!isLocked}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "cursor-grab active:cursor-grabbing transition-all duration-300 ease-in-out group",
        "hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30",
        "bg-card/50 backdrop-blur-sm border-border/50",
        isLocked && "opacity-60 cursor-not-allowed ring-2 ring-amber-500/50",
        isDragging &&
          "opacity-20 scale-95 border-primary/40 grayscale shadow-none"
      )}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <button
            type="button"
            className="flex-1 text-left"
            onClick={(e) => {
              handleCopyStoryId(e);
              onClick(e);
            }}
            disabled={isLocked}
          >
            <div className="flex items-center gap-2">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: listColor || "#6b7280" }}
              />
              {storyKey && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 tabular-nums shrink-0"
                >
                  #{storyKey.split(":").pop()}
                </Badge>
              )}
              <span className="font-medium text-sm text-foreground leading-snug line-clamp-2">
                {card.title}
              </span>
            </div>
            {card.description && (
              <div className="text-xs text-muted-foreground line-clamp-2 mt-1.5 pl-3.5">
                {card.description}
              </div>
            )}
          </button>

          <div className="flex items-center gap-1 shrink-0">
            {storyKey && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:opacity-100"
                onClick={handleCopyStoryId}
                disabled={!storyKey}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            )}

            {isLocked ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-1.5 rounded-full bg-amber-500/10">
                      <Lock className="h-3.5 w-3.5 text-amber-500" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    Being edited by {lockInfo?.userId || "another user"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:opacity-100"
                onClick={onClick}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {(card.assignee ||
          card.points !== null ||
          (card.labels && card.labels.length) ||
          card.priority) && (
          <div className="mt-2.5 pt-2.5 border-t border-border/30 flex flex-wrap items-center gap-1.5">
            {card.priority && card.priority !== "medium" && (
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] px-1.5 py-0",
                  priorityConfig.textColor
                )}
              >
                {card.priority}
              </Badge>
            )}
            {typeof card.points === "number" && (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary"
              >
                {card.points} pt
              </Badge>
            )}
            {card.assignee && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                <User className="h-2.5 w-2.5 mr-1" />
                {card.assignee}
              </Badge>
            )}
            {Array.isArray(card.labels) &&
              card.labels.slice(0, 2).map((label) => (
                <Badge
                  key={label}
                  className="text-[10px] px-1.5 py-0 bg-secondary text-secondary-foreground"
                >
                  {label}
                </Badge>
              ))}
            {card.labels && card.labels.length > 2 && (
              <span className="text-[10px] text-muted-foreground">
                +{card.labels.length - 2}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ============ Drop Zone ============
const DropZone = ({ isActive, onDrop }) => {
  const [over, setOver] = React.useState(false);

  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={cn(
        "h-4 rounded transition-all duration-300 ease-in-out relative",
        isActive ? "hover:bg-primary/10 hover:h-12" : "opacity-0 h-1",
        over &&
          "bg-primary/20 h-16 border-2 border-dashed border-primary/40 shadow-inner"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        if (!isActive) return;
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        setOver(false);
        onDrop(e);
      }}
    >
      {over && (
        <div className="absolute inset-0 flex items-center justify-center text-primary/40 text-[10px] font-medium uppercase tracking-wider">
          Drop here
        </div>
      )}
    </div>
  );
};

// ============ List Column ============
const ListColumn = ({
  list,
  listDrop,
  onDragOverList,
  onDropList,
  onDragStartList,
  onDragEndList,
  dragState,
  onAddCard,
  onEditCard,
  onRename,
  onDelete,
  onDragStartCard,
  onDragEndCard,
  onDropToIndex,
  onDropToEnd,
  isCardLocked,
  getCardLock,
  storyKeyByCardId,
}) => {
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [nameDraft, setNameDraft] = React.useState(list.name);
  const isCardDrag = dragState?.type === "card";
  const isDragFromHere = isCardDrag && dragState?.listId === list.id;
  const isListDropTarget =
    dragState?.type === "list" && listDrop?.overListId === list.id;

  const StatusIcon = STATUS_ICONS[list.statusId] || Circle;

  React.useEffect(() => {
    setNameDraft(list.name);
  }, [list.name]);

  return (
    <div
      role="presentation"
      className={cn(
        "relative w-[320px] rounded-xl border bg-background/50 backdrop-blur-sm flex flex-col h-full min-h-0",
        "border-border/50 hover:border-border transition-all duration-300",
        isListDropTarget && "ring-2 ring-primary/30"
      )}
      onDragOver={onDragOverList}
      onDrop={onDropList}
    >
      {isListDropTarget && (
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-y-2 w-1 rounded bg-primary/50",
            listDrop?.position === "after" ? "right-0" : "left-0"
          )}
        />
      )}
      {/* List Header */}
      <div
        className="px-3 py-3 border-b border-border/30 flex items-center gap-2"
        style={{
          borderTopColor: list.color || "#6b7280",
          borderTopWidth: 3,
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
        }}
      >
        <div
          draggable={!isEditingName}
          className={cn(
            "shrink-0 rounded p-1 -ml-1 text-muted-foreground",
            isEditingName
              ? "cursor-not-allowed opacity-40"
              : "cursor-grab active:cursor-grabbing hover:text-foreground"
          )}
          onDragStart={onDragStartList}
          onDragEnd={onDragEndList}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </div>

        <StatusIcon
          className="h-4 w-4 shrink-0"
          style={{ color: list.color || "#6b7280" }}
        />

        {isEditingName ? (
          <div className="flex-1 flex items-center gap-2">
            <Input
              className="h-7 text-sm bg-background/50"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onRename(nameDraft);
                  setIsEditingName(false);
                }
                if (e.key === "Escape") {
                  setNameDraft(list.name);
                  setIsEditingName(false);
                }
              }}
              autoFocus
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => {
                onRename(nameDraft);
                setIsEditingName(false);
              }}
            >
              <CheckCircle2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => {
                setNameDraft(list.name);
                setIsEditingName(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            className="flex-1 text-left font-medium text-foreground truncate text-sm hover:text-primary transition-colors"
            onClick={() => setIsEditingName(true)}
          >
            {list.name}
          </button>
        )}

        <Badge
          variant="secondary"
          className="text-xs tabular-nums"
          style={{
            backgroundColor: `${list.color}20`,
            color: list.color,
            borderColor: list.color,
          }}
        >
          {list.cards.length}
        </Badge>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={onAddCard}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add new story</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete list</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Cards */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 flex flex-col gap-2">
          {list.cards.map((card, index) => {
            const locked = isCardLocked(card.id);
            const lockInfo = getCardLock(card.id);
            const isDragging = isCardDrag && dragState?.cardId === card.id;

            return (
              <React.Fragment key={card.id}>
                <DropZone
                  isActive={
                    isCardDrag &&
                    (!isDragFromHere ||
                      (index !== dragState?.index &&
                        index !== dragState?.index + 1))
                  }
                  onDrop={(e) => onDropToIndex(e, index)}
                />
                <div className="group">
                  <ScrumCard
                    card={card}
                    onClick={() => onEditCard(card)}
                    onDragStart={(e) => onDragStartCard(e, card.id, index)}
                    onDragEnd={onDragEndCard}
                    isLocked={locked}
                    lockInfo={lockInfo}
                    listColor={list.color}
                    storyKey={storyKeyByCardId?.[card.id]}
                    isDragging={isDragging}
                  />
                </div>
              </React.Fragment>
            );
          })}
          <DropZone
            isActive={
              isCardDrag &&
              (!isDragFromHere || dragState?.index !== list.cards.length - 1)
            }
            onDrop={(e) => onDropToIndex(e, list.cards.length)}
          />

          {list.cards.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Circle className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No stories yet</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={onAddCard}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add a story
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

// ============ Add List Column ============
const AddListColumn = ({ onAdd }) => {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  return (
    <div className="w-[320px] shrink-0">
      {open ? (
        <div className="rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm p-4 shadow-lg animate-in fade-in zoom-in-95 duration-200">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">
            New Column
          </Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Column name..."
            className="mt-2 bg-background/50"
            onKeyDown={async (e) => {
              if (e.key === "Enter" && name.trim() && !submitting) {
                setSubmitting(true);
                try {
                  const ok = await onAdd(name.trim());
                  if (ok) {
                    setName("");
                    setOpen(false);
                  }
                } finally {
                  setSubmitting(false);
                }
              }
              if (e.key === "Escape") {
                setName("");
                setOpen(false);
              }
            }}
            autoFocus
          />
          <div className="flex gap-2 mt-3">
            <Button
              type="button"
              className="flex-1"
              disabled={!name.trim() || submitting}
              onClick={async () => {
                if (submitting) return;
                setSubmitting(true);
                try {
                  const ok = await onAdd(name.trim());
                  if (ok) {
                    setName("");
                    setOpen(false);
                  }
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {submitting ? "Adding..." : "Add"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={submitting}
              onClick={() => {
                setName("");
                setOpen(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full justify-center h-14 border-dashed border-2 border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all"
          onClick={() => setOpen(true)}
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Column
        </Button>
      )}
    </div>
  );
};

// ============ Create Board Dialog ============
const CreateBoardDialog = ({ open, onOpenChange, onCreateBoard }) => {
  const [name, setName] = React.useState("");
  const [selectedTemplate, setSelectedTemplate] = React.useState("bmad-method");

  const handleCreate = () => {
    if (!name.trim()) return;
    const template = BOARD_TEMPLATES.find((t) => t.id === selectedTemplate);
    onCreateBoard(name.trim(), template?.type || "custom");
    setName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-background/95 backdrop-blur-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Create New Board
          </DialogTitle>
          <DialogDescription>
            Choose a workflow template based on your project needs
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Board Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter board name..."
              className="bg-background/50"
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) handleCreate();
              }}
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label>Workflow Template</Label>
            <div className="grid gap-2">
              {BOARD_TEMPLATES.map((template) => {
                const Icon = template.icon;
                return (
                  <button
                    key={template.id}
                    type="button"
                    className={cn(
                      "p-4 rounded-xl border text-left transition-all",
                      "hover:bg-accent/50",
                      selectedTemplate === template.id
                        ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                        : "border-border/50 bg-background/30"
                    )}
                    onClick={() => {
                      setSelectedTemplate(template.id);
                      navigator.clipboard
                        .writeText(template.id)
                        .catch(() => {});
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "p-2 rounded-lg",
                          selectedTemplate === template.id
                            ? "bg-primary/20 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{template.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {template.description}
                        </div>
                      </div>
                      {selectedTemplate === template.id && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-1 flex-wrap">
                      {template.lists.map((list, i) => (
                        <React.Fragment key={list}>
                          <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                            {list}
                          </span>
                          {i < template.lists.length - 1 && (
                            <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim()}>
            <Plus className="h-4 w-4 mr-2" />
            Create Board
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============ Settings Dialog ============
const SettingsDialog = ({ open, onOpenChange }) => {
  const {
    connected,
    autoConnect,
    setAutoConnect,
    serverRunning,
    toggleServer,
    checkServerStatus,
  } = useKanbanStore();

  const [logs, setLogs] = React.useState([]);
  const logsEndRef = React.useRef(null);

  React.useEffect(() => {
    if (open) {
      checkServerStatus();
    }
  }, [open, checkServerStatus]);

  // Subscribe to logs
  React.useEffect(() => {
    if (!window.electronAPI) return;

    // Load initial logs
    if (window.electronAPI.getMcpLogs) {
      window.electronAPI.getMcpLogs().then(setLogs);
    }

    if (window.electronAPI.onMcpLog) {
      const unsub = window.electronAPI.onMcpLog((log) => {
        setLogs((prev) => [...prev, log]);
      });
      return () => unsub();
    }
  }, []);

  React.useEffect(() => {
    const lastLog = logs[logs.length - 1];
    if (!lastLog) return;
    if (logsEndRef.current && open) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] h-[500px] flex flex-col bg-background/95 backdrop-blur-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Kanban Settings
          </DialogTitle>
          <DialogDescription>
            Configure connection or view server logs
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="logs">Server Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6 py-4">
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="auto-connect" className="flex flex-col gap-1">
                <span>Auto-Connect</span>
                <span className="font-normal text-xs text-muted-foreground">
                  Automatically start and connect to local MCP server
                </span>
              </Label>
              <Switch
                id="auto-connect"
                checked={autoConnect}
                onCheckedChange={setAutoConnect}
              />
            </div>

            <div className="space-y-4 border-t border-border/50 pt-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium leading-none">
                  Local Server Control
                </h4>
                <p className="text-xs text-muted-foreground">
                  Manually control the background MCP process
                </p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-secondary/20">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-2.5 h-2.5 rounded-full shrink-0 transition-colors",
                      connected
                        ? "bg-green-500 animate-pulse"
                        : "bg-destructive"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {connected
                        ? serverRunning
                          ? "Online (Internal)"
                          : "Online (External)"
                        : "Server Offline"}
                    </span>
                    {!connected && (
                      <span className="text-[10px] text-muted-foreground">
                        {serverRunning
                          ? "Process running, no connection"
                          : "Process stopped"}
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  variant={serverRunning ? "destructive" : "default"}
                  size="sm"
                  onClick={toggleServer}
                >
                  {serverRunning ? (
                    <>
                      <WifiOff className="h-4 w-4 mr-2" />
                      Stop Internal
                    </>
                  ) : (
                    <>
                      <Wifi className="h-4 w-4 mr-2" />
                      Start Internal
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="logs" className="flex-1 min-h-0 py-4 relative">
            <div className="absolute inset-0 top-4 bottom-0">
              <ScrollArea className="h-full rounded-md border border-border bg-black/90 p-4 font-mono text-xs text-green-400">
                <div className="space-y-1">
                  {logs.length === 0 && (
                    <div className="text-muted-foreground italic">
                      No logs captured yet...
                    </div>
                  )}
                  {logs.map((log, i) => (
                    <div
                      key={`${log.timestamp}-${log.type}-${log.message}`}
                      className="flex gap-2 text-wrap break-all"
                    >
                      <span className="text-muted-foreground shrink-0">
                        [{new Date(log.timestamp).toLocaleTimeString()}]
                      </span>
                      <span
                        className={cn(
                          log.type === "error"
                            ? "text-red-400"
                            : log.type === "success"
                            ? "text-green-400"
                            : "text-gray-300"
                        )}
                      >
                        {log.message}
                      </span>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const AgentAssistDialog = ({
  open,
  onOpenChange,
  setup,
  onChangeSetup,
  activeBoard,
  stats,
  onCreateStory,
  onOpenStory,
  onStartStory,
}) => {
  const {
    connected,
    serverRunning,
    toggleServer,
    checkServerStatus,
    syncNow,
    useRemoteServer,
    serverBaseUrl,
    setUseRemoteServer,
    setServerBaseUrl,
  } = useKanbanStore();

  const [activeTab, setActiveTab] = React.useState("bmad");
  const [showComparison, setShowComparison] = React.useState(false);
  const [copiedKey, setCopiedKey] = React.useState(null);
  const copiedTimerRef = React.useRef(null);

  const [bmadLogs, setBmadLogs] = React.useState([]);
  const [bmadBusy, setBmadBusy] = React.useState(false);
  const [bmadInput, setBmadInput] = React.useState("");
  const [prdBusy, setPrdBusy] = React.useState(false);
  const [prdResult, setPrdResult] = React.useState(null);
  const [workflowName, setWorkflowName] = React.useState("status");
  const [includeWorkflowData, setIncludeWorkflowData] = React.useState(true);
  const [workflowsTab, setWorkflowsTab] = React.useState("wizard");
  const [wizardPhase, setWizardPhase] = React.useState("phase-1");
  const [wizardWorkflow, setWizardWorkflow] =
    React.useState("brainstorm-project");
  const [wizardResearchType, setWizardResearchType] = React.useState("market");
  const [wizardResearchInputs, setWizardResearchInputs] = React.useState([
    "",
    "",
    "",
  ]);
  const [wizardProductBriefInput, setWizardProductBriefInput] =
    React.useState("");
  const [wizardContextPath, setWizardContextPath] = React.useState("");
  const [workflowPreviewBusy, setWorkflowPreviewBusy] = React.useState(false);
  const [workflowPreviewError, setWorkflowPreviewError] = React.useState(null);
  const [workflowPreviewContent, setWorkflowPreviewContent] =
    React.useState(null);
  const [workflowRunBusy, setWorkflowRunBusy] = React.useState(false);
  const [workflowRunLogs, setWorkflowRunLogs] = React.useState([]);
  const workflowRunActiveRef = React.useRef(false);

  const [activeContextId, setActiveContextId] = React.useState("prd");
  const [contextDrafts, setContextDrafts] = React.useState({});
  const [contextBusy, setContextBusy] = React.useState(false);
  const [contextStatus, setContextStatus] = React.useState(null);
  const loadedContextRef = React.useRef(new Set());

  // New: Context category management
  const [contextCategoryTab, setContextCategoryTab] =
    React.useState("bmad-docs");
  const [detectedContextFiles, setDetectedContextFiles] = React.useState({});
  const [detectingFiles, setDetectingFiles] = React.useState(false);

  const [newContextLabel, setNewContextLabel] = React.useState("");
  const [newContextPath, setNewContextPath] = React.useState("");
  const [newContextCategory, setNewContextCategory] = React.useState("custom");

  // BMAD v6 Installation and Phase Management
  const [bmadInstallStatus, setBmadInstallStatus] = React.useState(
    BMAD_INSTALL_STATUS.NOT_CHECKED
  );
  const [detectedBmadModules, setDetectedBmadModules] = React.useState({
    core: false,
    bmm: false,
    _config: false,
  });
  const [currentPhase, setCurrentPhase] = React.useState("phase-1");
  const [phaseCompletion, setPhaseCompletion] = React.useState({
    "phase-1": { completed: false, outputs: [] },
    "phase-2": { completed: false, outputs: [] },
    "phase-3": { completed: false, outputs: [] },
    "phase-4": { completed: false, outputs: [] },
  });
  const [selectedWorkflow, setSelectedWorkflow] = React.useState("prd");
  const [installBusy, setInstallBusy] = React.useState(false);

  const [mcpRootPath, setMcpRootPath] = React.useState("");

  const recommendedAgent = React.useMemo(() => {
    return recommendAgent({
      teamSize: setup.teamSize,
      sprintLength: setup.sprintLength,
      autoSync: setup.autoSync,
    });
  }, [setup.teamSize, setup.sprintLength, setup.autoSync]);

  const selectedAgent = setup.agent || recommendedAgent;

  React.useEffect(() => {
    if (!open) return;
    if (!window.electronAPI?.getProjectRoot) return;

    let cancelled = false;
    (async () => {
      try {
        const root = await window.electronAPI.getProjectRoot();
        if (cancelled) return;
        setMcpRootPath(String(root || "").trim());
      } catch {
        if (cancelled) return;
        setMcpRootPath("");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const scriptPath = React.useMemo(() => {
    const root = String(mcpRootPath || "")
      .trim()
      .replace(/[\\/]+$/, "");
    if (!root) return "";
    return normalizeMcpPath(`${root}/scripts/scrum-mcp-server.js`);
  }, [mcpRootPath]);

  const mcpConfigSnippet = React.useMemo(() => {
    if (useRemoteServer) {
      const base = String(serverBaseUrl || "")
        .trim()
        .replace(/[\\/]+$/, "");
      const url = base ? `${base}/mcp` : "<server-base-url>/mcp";
      return JSON.stringify(
        {
          "scrum-kanban": {
            url,
          },
        },
        null,
        2
      );
    }

    const args = scriptPath
      ? [scriptPath]
      : ["<mcp-root>/scripts/scrum-mcp-server.js"];
    return JSON.stringify(
      {
        "scrum-kanban": {
          command: "node",
          args,
          env: { SCRUM_MCP_PORT: "3847" },
        },
      },
      null,
      2
    );
  }, [scriptPath, serverBaseUrl, useRemoteServer]);

  const slashCommandSnippet = React.useMemo(() => {
    const byAgent = {
      "scrum-manager": "/bmad-scrum-manager",
      "scrum-quick": "/bmad-scrum-quick",
      "scrum-analytics": "/bmad-scrum-analytics",
      "scrum-team": "/bmad-scrum-team",
    };
    return byAgent[selectedAgent] || "/bmad-scrum-manager";
  }, [selectedAgent]);

  const copyText = React.useCallback(async (key, text) => {
    try {
      await navigator.clipboard.writeText(String(text || ""));
      setCopiedKey(key);
      if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = window.setTimeout(
        () => setCopiedKey(null),
        1200
      );
      return true;
    } catch {
      return false;
    }
  }, []);

  const projectRoot = String(setup.projectRoot || "").trim();
  const hasProjectRoot = Boolean(projectRoot);

  const handlePickProjectRoot = React.useCallback(async () => {
    if (!window.electronAPI?.selectFolder) return;
    const selected = await window.electronAPI.selectFolder({
      title: "Select project root",
      defaultPath: projectRoot || undefined,
    });
    if (selected) {
      onChangeSetup({ ...setup, projectRoot: selected });
    }
  }, [onChangeSetup, projectRoot, setup]);

  const runBmadAction = React.useCallback(
    async (action) => {
      if (!window.electronAPI?.runBmadCli) return;
      if (!hasProjectRoot) return;
      setPrdResult(null);
      setBmadBusy(true);
      try {
        await window.electronAPI.runBmadCli({
          cwd: projectRoot,
          mode: setup.bmadMode || "npx",
          action,
          verbose: Boolean(setup.bmadVerbose),
        });
      } finally {
        setBmadBusy(false);
      }
    },
    [hasProjectRoot, projectRoot, setup.bmadMode, setup.bmadVerbose]
  );

  const stopBmad = React.useCallback(async () => {
    if (!window.electronAPI?.stopBmadCli) return;
    await window.electronAPI.stopBmadCli();
  }, []);

  const sendBmadInput = React.useCallback(async () => {
    const next = String(bmadInput || "");
    if (!next.trim()) return;
    if (!window.electronAPI?.sendBmadCliInput) return;
    await window.electronAPI.sendBmadCliInput({
      input: next,
      appendNewline: true,
    });
    setBmadInput("");
  }, [bmadInput]);

  const prdPath = String(setup.prdPath || "_bmad-output/prd.md").trim();

  const contextDocs = React.useMemo(() => {
    return normalizeContextDocs({ docs: setup.contextDocs, prdPath });
  }, [prdPath, setup.contextDocs]);

  React.useEffect(() => {
    String(projectRoot || "");
    loadedContextRef.current.clear();
    setContextDrafts({});
    setContextStatus(null);
  }, [projectRoot]);

  const setContextDraft = React.useCallback((docId, value) => {
    const id = String(docId || "").trim();
    if (!id) return;
    setContextDrafts((prev) => ({ ...prev, [id]: String(value ?? "") }));
  }, []);

  const loadContextDoc = React.useCallback(
    async ({ docId, relativePath, force }) => {
      if (!window.electronAPI?.readProjectFile) return;
      const root = String(projectRoot || "").trim();
      const rel = String(relativePath || "").trim();
      const id = String(docId || "").trim();
      if (!root || !rel || !id) return;
      if (!force && loadedContextRef.current.has(id)) return;
      setContextBusy(true);
      try {
        const result = await window.electronAPI.readProjectFile({
          projectRoot: root,
          relativePath: rel,
        });
        if (!result?.success) {
          throw new Error(result?.message || "Failed to load");
        }
        setContextDraft(id, String(result?.content || ""));
        loadedContextRef.current.add(id);
        setContextStatus({ ok: true, docId: id, message: "Loaded" });
      } catch (err) {
        setContextStatus({
          ok: false,
          docId: id,
          message: err?.message || "Failed to load",
        });
      } finally {
        setContextBusy(false);
      }
    },
    [projectRoot, setContextDraft]
  );

  const saveContextDoc = React.useCallback(
    async ({ docId, relativePath }) => {
      if (!window.electronAPI?.writeProjectFile) return;
      const root = String(projectRoot || "").trim();
      const rel = String(relativePath || "").trim();
      const id = String(docId || "").trim();
      if (!root || !rel || !id) return;

      const content =
        Object.hasOwn(contextDrafts, id) &&
        typeof contextDrafts[id] === "string"
          ? contextDrafts[id]
          : "";

      setContextBusy(true);
      try {
        const result = await window.electronAPI.writeProjectFile({
          projectRoot: root,
          relativePath: rel,
          content,
          overwrite: true,
        });
        loadedContextRef.current.add(id);
        setContextStatus({
          ok: true,
          docId: id,
          message: `Saved: ${String(result?.path || rel)}`,
        });
      } catch (err) {
        setContextStatus({
          ok: false,
          docId: id,
          message: err?.message || "Failed to save",
        });
      } finally {
        setContextBusy(false);
      }
    },
    [contextDrafts, projectRoot]
  );

  React.useEffect(() => {
    if (!open) return;
    if (!hasProjectRoot) return;
    if (activeTab !== "project") return;
    contextDocs.forEach((doc) => {
      if (!doc?.path) return;
      loadContextDoc({ docId: doc.id, relativePath: doc.path, force: false });
    });
  }, [activeTab, contextDocs, hasProjectRoot, loadContextDoc, open]);

  // Detect which predefined context files exist in the project
  const detectContextFiles = React.useCallback(async () => {
    if (!window.electronAPI?.checkPathExists) return;
    const root = String(projectRoot || "").trim();
    if (!root) return;

    setDetectingFiles(true);
    const selectedIdes = Array.isArray(setup.ides) ? setup.ides : [];
    const predefined = getPredefinedContextItems({
      selectedIdes,
      includeAll: true,
    });
    const results = {};

    try {
      for (const item of predefined) {
        try {
          // Combine projectRoot with relative path
          const fullPath = `${root}/${item.path}`;
          const exists = await window.electronAPI.checkPathExists(fullPath);
          results[item.id] = { exists: Boolean(exists), path: item.path };
        } catch {
          results[item.id] = { exists: false, path: item.path };
        }
      }
      setDetectedContextFiles(results);
    } finally {
      setDetectingFiles(false);
    }
  }, [projectRoot, setup.ides]);

  // Auto-detect files when project tab is opened
  React.useEffect(() => {
    if (!open) return;
    if (!hasProjectRoot) return;
    if (activeTab !== "project") return;
    detectContextFiles();
  }, [activeTab, detectContextFiles, hasProjectRoot, open]);

  // Check BMAD v6 installation status
  const checkBmadInstallation = React.useCallback(async () => {
    if (!window.electronAPI?.checkPathExists) return;
    const root = String(projectRoot || "").trim();
    if (!root) {
      setBmadInstallStatus(BMAD_INSTALL_STATUS.NOT_CHECKED);
      return;
    }

    setBmadInstallStatus(BMAD_INSTALL_STATUS.CHECKING);
    try {
      // Check for BMAD v6 folder structure
      const checks = {
        _bmad: await window.electronAPI.checkPathExists(`${root}/_bmad`),
        core: await window.electronAPI.checkPathExists(`${root}/_bmad/core`),
        bmm: await window.electronAPI.checkPathExists(`${root}/_bmad/bmm`),
        _config: await window.electronAPI.checkPathExists(
          `${root}/_bmad/_config`
        ),
        _bmadOutput: await window.electronAPI.checkPathExists(
          `${root}/_bmad-output`
        ),
      };

      setDetectedBmadModules({
        core: checks.core,
        bmm: checks.bmm,
        _config: checks._config,
      });

      if (checks._bmad && checks.core && checks.bmm) {
        setBmadInstallStatus(BMAD_INSTALL_STATUS.INSTALLED);
      } else if (checks._bmad || checks._bmadOutput) {
        setBmadInstallStatus(BMAD_INSTALL_STATUS.PARTIAL);
      } else {
        setBmadInstallStatus(BMAD_INSTALL_STATUS.NOT_INSTALLED);
      }
    } catch (err) {
      console.error("BMAD check failed:", err);
      setBmadInstallStatus(BMAD_INSTALL_STATUS.ERROR);
    }
  }, [projectRoot]);

  // Check phase completion based on output files
  const checkPhaseCompletion = React.useCallback(async () => {
    if (!window.electronAPI?.checkPathExists) return;
    const root = String(projectRoot || "").trim();
    if (!root) return;

    const newCompletion = { ...phaseCompletion };

    for (const phase of BMAD_V6_PHASES) {
      const existingOutputs = [];
      for (const output of phase.outputs) {
        const exists = await window.electronAPI.checkPathExists(
          `${root}/_bmad-output/${output}`
        );
        if (exists) existingOutputs.push(output);
      }
      newCompletion[phase.id] = {
        completed:
          phase.outputs.length > 0 &&
          existingOutputs.length === phase.outputs.length,
        outputs: existingOutputs,
      };
    }

    // Special case: PRD.md is the key requirement for phase-2
    const prdExists = await window.electronAPI.checkPathExists(
      `${root}/_bmad-output/PRD.md`
    );
    if (prdExists) {
      newCompletion["phase-2"] = {
        ...newCompletion["phase-2"],
        outputs: [...newCompletion["phase-2"].outputs, "PRD.md"],
        completed: true,
      };
    }

    setPhaseCompletion(newCompletion);

    // Auto-set current phase based on completion
    if (!prdExists) {
      setCurrentPhase("phase-1"); // Need to work on analysis/planning
    } else if (!newCompletion["phase-3"].completed) {
      setCurrentPhase("phase-3"); // Ready for solutioning
    } else {
      setCurrentPhase("phase-4"); // Ready for implementation
    }
  }, [phaseCompletion, projectRoot]);

  // Run BMAD installation
  const installBmad = React.useCallback(async () => {
    if (!window.electronAPI?.runBmadCli) return;
    if (!hasProjectRoot) return;

    setInstallBusy(true);
    try {
      await window.electronAPI.runBmadCli({
        cwd: projectRoot,
        mode: setup.bmadMode || "npx",
        action: "install",
        verbose: true,
        autoAcceptDefaults: true,
      });
      // Re-check installation after install
      await checkBmadInstallation();
      await checkPhaseCompletion();
    } catch (err) {
      console.error("BMAD install failed:", err);
    } finally {
      setInstallBusy(false);
    }
  }, [
    checkBmadInstallation,
    checkPhaseCompletion,
    hasProjectRoot,
    projectRoot,
    setup.bmadMode,
  ]);

  // Auto-check BMAD installation when dialog opens
  // React.useEffect(() => {
  //   if (!open) return;
  //   if (!hasProjectRoot) return;
  //   checkBmadInstallation();
  //   checkPhaseCompletion();
  // }, [checkBmadInstallation, checkPhaseCompletion, hasProjectRoot, open]);

  const addContextDoc = React.useCallback(() => {
    const label = String(newContextLabel || "").trim();
    const rel = String(newContextPath || "").trim();
    const category = String(newContextCategory || "custom").trim();
    if (!rel) return;
    const id = `ctx_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const nextDocs = Array.isArray(setup.contextDocs) ? setup.contextDocs : [];
    onChangeSetup({
      ...setup,
      contextDocs: [
        ...nextDocs,
        { id, label: label || "Context", path: rel, category },
      ],
    });
    setNewContextLabel("");
    setNewContextPath("");
    setNewContextCategory("custom");
    setActiveContextId(id);
  }, [
    newContextLabel,
    newContextPath,
    newContextCategory,
    onChangeSetup,
    setup,
  ]);

  // Quick add a predefined context item
  const addPredefinedContext = React.useCallback(
    (item) => {
      if (!item?.id || !item?.path) return;
      const nextDocs = Array.isArray(setup.contextDocs)
        ? setup.contextDocs
        : [];
      // Check if already added
      if (nextDocs.some((d) => d.path === item.path)) return;
      const id = `ctx_${item.id}_${Date.now().toString(36)}`;
      onChangeSetup({
        ...setup,
        contextDocs: [
          ...nextDocs,
          {
            id,
            label: item.label,
            path: item.path,
            category: item.category || "custom",
          },
        ],
      });
      setActiveContextId(id);
    },
    [onChangeSetup, setup]
  );

  const removeContextDoc = React.useCallback(
    (docId) => {
      const id = String(docId || "").trim();
      if (!id) return;
      const nextDocs = (
        Array.isArray(setup.contextDocs) ? setup.contextDocs : []
      ).filter((d) => String(d?.id || "").trim() !== id);
      onChangeSetup({ ...setup, contextDocs: nextDocs });
      loadedContextRef.current.delete(id);
      setContextDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      if (activeContextId === id) setActiveContextId("prd");
    },
    [activeContextId, onChangeSetup, setup]
  );

  const workflowDataPath = React.useMemo(() => {
    const root = String(projectRoot || "").replace(/[\\/]+$/, "");
    const rel = String(prdPath || "").replace(/^[\\/]+/, "");
    if (!root) return rel;
    if (!rel) return root;
    return `${root}/${rel}`;
  }, [projectRoot, prdPath]);

  const workflowCommand = React.useMemo(() => {
    const name = String(workflowName || "status").trim() || "status";
    const withData = includeWorkflowData && Boolean(workflowDataPath);
    return withData
      ? `workflow ${name} --data ${workflowDataPath}`
      : `workflow ${name}`;
  }, [includeWorkflowData, workflowDataPath, workflowName]);

  const workflowExamples = React.useMemo(() => {
    const dataPath = workflowDataPath || "/path/to/context.md";
    return [
      {
        key: "workflow-example-status",
        label: "workflow status",
        command: "workflow status",
      },
      {
        key: "workflow-example-prd",
        label: "workflow prd",
        command: "workflow prd",
      },
      {
        key: "workflow-example-brainstorming",
        label: "workflow brainstorming",
        command: "workflow brainstorming",
      },
      {
        key: "workflow-example-brainstorming-data",
        label: "workflow brainstorming --data",
        command: `workflow brainstorming --data ${dataPath}`,
      },
    ];
  }, [workflowDataPath]);

  const wizardWorkflowOptions = React.useMemo(() => {
    const flows = BMAD_V6_WORKFLOWS.filter(
      (w) => w.phase === wizardPhase || w.phase === "all"
    );
    return flows.map((f) => ({ value: f.id, label: f.name }));
  }, [wizardPhase]);

  const resolvedWizardWorkflow = React.useMemo(() => {
    const allowed = new Set(wizardWorkflowOptions.map((o) => o.value));
    if (allowed.has(wizardWorkflow)) return wizardWorkflow;
    const fallback = wizardWorkflowOptions[0]?.value || "brainstorm-project";
    return fallback;
  }, [wizardWorkflow, wizardWorkflowOptions]);

  React.useEffect(() => {
    const allowed = new Set(wizardWorkflowOptions.map((o) => o.value));
    if (allowed.has(wizardWorkflow)) return;
    const fallback = wizardWorkflowOptions[0]?.value || "brainstorm-project";
    setWizardWorkflow(fallback);
  }, [wizardWorkflow, wizardWorkflowOptions]);

  React.useEffect(() => {
    if (wizardContextPath) return;
    if (prdPath) setWizardContextPath(prdPath);
  }, [prdPath, wizardContextPath]);

  const wizardContextAbsPath = React.useMemo(() => {
    const root = String(projectRoot || "").replace(/[\\/]+$/, "");
    const raw = String(wizardContextPath || "").trim();
    if (!raw) return "";
    if (/^(?:[a-zA-Z]:\\|\/)/.test(raw)) return raw;
    const rel = raw.replace(/^[\\/]+/, "");
    if (!root) return rel;
    return `${root}/${rel}`;
  }, [projectRoot, wizardContextPath]);

  const wizardCliArgs = React.useMemo(() => {
    const wf = String(resolvedWizardWorkflow || "").trim();
    if (!wf) return [];

    if (wf === "research") {
      const args = ["research"];
      if (wizardResearchType) args.push("--type", String(wizardResearchType));
      const inputs = (wizardResearchInputs || [])
        .map((v) => String(v || "").trim())
        .filter(Boolean);
      for (const input of inputs) args.push("--input", input);
      return args;
    }

    if (wf === "product-brief") {
      const args = ["product-brief"];
      const input = String(wizardProductBriefInput || "").trim();
      if (input) args.push("--input", input);
      return args;
    }

    if (wf === "brainstorming") {
      const args = ["brainstorming"];
      if (wizardContextAbsPath) args.push("--data", wizardContextAbsPath);
      return args;
    }

    return [wf];
  }, [
    resolvedWizardWorkflow,
    wizardContextAbsPath,
    wizardProductBriefInput,
    wizardResearchInputs,
    wizardResearchType,
  ]);

  const wizardCommand = React.useMemo(() => {
    const wf = String(resolvedWizardWorkflow || "").trim();
    if (!wf) return "";

    const args = [];

    if (wf === "research") {
      if (wizardResearchType) args.push(`--type ${wizardResearchType}`);
      const inputs = (wizardResearchInputs || [])
        .map((v) => String(v || "").trim())
        .filter(Boolean);
      for (const input of inputs) args.push(`--input ${input}`);
    }

    if (wf === "product-brief") {
      const input = String(wizardProductBriefInput || "").trim();
      if (input) args.push(`--input ${input}`);
    }

    if (wf === "brainstorming") {
      if (wizardContextAbsPath) args.push(`--data ${wizardContextAbsPath}`);
    }

    return args.length ? `workflow ${wf} ${args.join(" ")}` : `workflow ${wf}`;
  }, [
    resolvedWizardWorkflow,
    wizardContextAbsPath,
    wizardProductBriefInput,
    wizardResearchInputs,
    wizardResearchType,
  ]);

  const activeWorkflowCopyText = React.useMemo(() => {
    return workflowsTab === "wizard" ? wizardCommand : workflowCommand;
  }, [workflowCommand, workflowsTab, wizardCommand]);

  const refreshWorkflowPreview = React.useCallback(async () => {
    const root = String(projectRoot || "").trim();
    const rel = String(wizardContextPath || "").trim();
    if (!window.electronAPI?.readProjectFile) return;
    if (!root) return;
    if (!rel) return;
    if (/^(?:[a-zA-Z]:\\|\/)/.test(rel)) {
      setWorkflowPreviewError(
        "Preview supports files inside the selected project root"
      );
      setWorkflowPreviewContent(null);
      return;
    }
    setWorkflowPreviewBusy(true);
    setWorkflowPreviewError(null);
    try {
      const result = await window.electronAPI.readProjectFile({
        projectRoot: root,
        relativePath: rel,
      });
      if (!result?.success) {
        throw new Error(result?.message || "Failed to read file");
      }
      setWorkflowPreviewContent(String(result?.content || ""));
    } catch (err) {
      setWorkflowPreviewContent(null);
      setWorkflowPreviewError(err?.message || "Failed to read file");
    } finally {
      setWorkflowPreviewBusy(false);
    }
  }, [projectRoot, wizardContextPath]);

  const runWizardWorkflow = React.useCallback(async () => {
    if (!window.electronAPI?.runBmadCli) return;
    if (!hasProjectRoot) return;
    if (!wizardCliArgs.length) return;
    if (workflowRunBusy) return;

    setWorkflowRunLogs([]);
    workflowRunActiveRef.current = true;
    setWorkflowRunBusy(true);
    try {
      await window.electronAPI.runBmadCli({
        cwd: projectRoot,
        mode: setup.bmadMode || "npx",
        action: "workflow",
        verbose: Boolean(setup.bmadVerbose),
        interactive: true,
        extraArgs: wizardCliArgs,
      });
    } finally {
      workflowRunActiveRef.current = false;
      setWorkflowRunBusy(false);
      setWorkflowsTab("preview");
    }
  }, [
    hasProjectRoot,
    projectRoot,
    setup.bmadMode,
    setup.bmadVerbose,
    wizardCliArgs,
    workflowRunBusy,
  ]);

  React.useEffect(() => {
    if (!open) return;
    if (workflowsTab !== "preview") return;
    refreshWorkflowPreview();
  }, [open, refreshWorkflowPreview, workflowsTab]);

  const buildPrdMarkdown = React.useCallback(() => {
    const title = String(setup.projectName || "Project").trim() || "Project";
    const summary = String(setup.projectSummary || "").trim();
    const goals = String(setup.projectGoals || "").trim();
    const nonGoals = String(setup.projectNonGoals || "").trim();
    const users = String(setup.projectUsers || "").trim();
    const success = String(setup.projectSuccessMetrics || "").trim();
    const constraints = String(setup.projectConstraints || "").trim();
    const owner = String(setup.ownerName || "").trim();
    const teamName = String(setup.teamName || "").trim();
    const teamMembers = String(setup.teamMembers || "").trim();
    const language = String(setup.language || "English").trim() || "English";

    return [
      `# PRD: ${title}`,
      "",
      "## Overview",
      summary || "TBD",
      "",
      "## Goals",
      goals || "TBD",
      "",
      "## Non-Goals",
      nonGoals || "TBD",
      "",
      "## Target Users",
      users || "TBD",
      "",
      "## Success Metrics",
      success || "TBD",
      "",
      "## Constraints",
      constraints || "TBD",
      "",
      "## Team",
      `- Owner: ${owner || "TBD"}`,
      `- Team: ${teamName || "TBD"}`,
      `- Members: ${teamMembers || "TBD"}`,
      `- Language: ${language}`,
      "",
      "## Notes",
      "TBD",
      "",
    ].join("\n");
  }, [
    setup.language,
    setup.ownerName,
    setup.projectConstraints,
    setup.projectGoals,
    setup.projectName,
    setup.projectNonGoals,
    setup.projectSummary,
    setup.projectSuccessMetrics,
    setup.projectUsers,
    setup.teamMembers,
    setup.teamName,
  ]);

  const generatePrd = React.useCallback(async () => {
    if (!window.electronAPI?.writeProjectFile) return;
    if (!hasProjectRoot) return;
    const rel = prdPath || "_bmad-output/prd.md";
    setPrdBusy(true);
    setPrdResult(null);
    try {
      const result = await window.electronAPI.writeProjectFile({
        projectRoot,
        relativePath: rel,
        content: buildPrdMarkdown(),
        overwrite: true,
      });
      setPrdResult({ ok: true, path: result?.path || rel });
    } catch (err) {
      setPrdResult({ ok: false, message: err?.message || "Failed" });
    } finally {
      setPrdBusy(false);
    }
  }, [buildPrdMarkdown, hasProjectRoot, prdPath, projectRoot]);

  React.useEffect(() => {
    if (!open) return;
    checkServerStatus();
    return () => {
      if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
    };
  }, [open, checkServerStatus]);

  React.useEffect(() => {
    if (!open) return;
    let unsubscribe;
    (async () => {
      if (window.electronAPI?.getBmadLogs) {
        try {
          const existing = await window.electronAPI.getBmadLogs();
          if (Array.isArray(existing)) setBmadLogs(existing);
        } catch {}
      }
      if (window.electronAPI?.onBmadLog) {
        unsubscribe = window.electronAPI.onBmadLog((log) => {
          setBmadLogs((prev) => {
            const next = [...prev, log].slice(-400);
            return next;
          });

          if (workflowRunActiveRef.current) {
            setWorkflowRunLogs((prev) => {
              const next = [...prev, log].slice(-400);
              return next;
            });
          }
        });
      }
    })();
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [open]);

  const handleToggleIde = (ide) => {
    const next = new Set(Array.isArray(setup.ides) ? setup.ides : []);
    if (next.has(ide)) next.delete(ide);
    else next.add(ide);
    onChangeSetup({ ...setup, ides: Array.from(next) });
  };

  const boardId = activeBoard?.id || null;
  const ready = React.useMemo(() => {
    if (!activeBoard) return null;
    const list = activeBoard.lists.find((l) => l.statusId === "ready-for-dev");
    if (!list) return null;
    const card = list.cards?.[0] || null;
    return card ? { listId: list.id, card } : null;
  }, [activeBoard]);

  const inProgressListId = React.useMemo(() => {
    if (!activeBoard) return null;
    return (
      activeBoard.lists.find((l) => l.statusId === "in-progress")?.id || null
    );
  }, [activeBoard]);

  const setupAgentList = React.useMemo(() => {
    return BMAD_AGENT_OPTIONS.map((a) => ({
      ...a,
      isRecommended: a.id === recommendedAgent,
      isSelected: a.id === selectedAgent,
    }));
  }, [recommendedAgent, selectedAgent]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[960px] h-[75vh] max-h-[860px] min-h-[640px] flex flex-col bg-background/95 backdrop-blur-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            BMAD Agent Assist
          </DialogTitle>
          <DialogDescription>
            Guided setup inspired by ENHANCE_SCRUM.md, without terminal steps
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col min-h-0"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="bmad">BMAD</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="project">Project</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="bmad" className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              <div className="grid gap-4 py-4">
                <div className="rounded-xl border border-border/50 bg-background/40 p-4">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                      <div className="text-sm font-medium flex items-center gap-2">
                        🎯 BMAD v6 Method
                        {bmadInstallStatus ===
                          BMAD_INSTALL_STATUS.INSTALLED && (
                          <Badge
                            variant="secondary"
                            className="bg-green-500/20 text-green-400"
                          >
                            Installed
                          </Badge>
                        )}
                        {bmadInstallStatus === BMAD_INSTALL_STATUS.PARTIAL && (
                          <Badge
                            variant="secondary"
                            className="bg-yellow-500/20 text-yellow-400"
                          >
                            Partial
                          </Badge>
                        )}
                        {bmadInstallStatus ===
                          BMAD_INSTALL_STATUS.NOT_INSTALLED && (
                          <Badge
                            variant="secondary"
                            className="bg-red-500/20 text-red-400"
                          >
                            Not Installed
                          </Badge>
                        )}
                        {bmadInstallStatus === BMAD_INSTALL_STATUS.CHECKING && (
                          <Badge
                            variant="secondary"
                            className="bg-blue-500/20 text-blue-400"
                          >
                            Checking...
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {hasProjectRoot
                          ? projectRoot
                          : "Select a project root to begin"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {bmadInstallStatus !== BMAD_INSTALL_STATUS.INSTALLED && (
                        <Button
                          type="button"
                          size="sm"
                          disabled={!hasProjectRoot || installBusy || bmadBusy}
                          onClick={() => installBmad()}
                          className="gap-2"
                        >
                          {installBusy ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                          {installBusy ? "Installing..." : "Setup BMAD"}
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!hasProjectRoot || installBusy}
                        onClick={() => {
                          checkBmadInstallation();
                          checkPhaseCompletion();
                        }}
                        className="gap-2"
                      >
                        <RefreshCw
                          className={cn(
                            "h-4 w-4",
                            bmadInstallStatus ===
                              BMAD_INSTALL_STATUS.CHECKING && "animate-spin"
                          )}
                        />
                        Sync
                      </Button>
                    </div>
                  </div>

                  {/* Module Status */}
                  {hasProjectRoot &&
                    bmadInstallStatus !== BMAD_INSTALL_STATUS.NOT_CHECKED && (
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {[
                          { key: "core", label: "Core", icon: "🎯" },
                          { key: "bmm", label: "BMM Module", icon: "📋" },
                          { key: "_config", label: "Config", icon: "⚙️" },
                        ].map((mod) => (
                          <div
                            key={mod.key}
                            className={cn(
                              "rounded-lg border p-2 text-center transition-colors",
                              detectedBmadModules[mod.key]
                                ? "border-green-500/30 bg-green-500/5"
                                : "border-border/30 bg-background/30"
                            )}
                          >
                            <div className="text-lg">{mod.icon}</div>
                            <div className="text-[10px] font-medium">
                              {mod.label}
                            </div>
                            <div
                              className={cn(
                                "text-[9px]",
                                detectedBmadModules[mod.key]
                                  ? "text-green-400"
                                  : "text-muted-foreground"
                              )}
                            >
                              {detectedBmadModules[mod.key]
                                ? "✓ Found"
                                : "✗ Missing"}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                  {/* Phase Progress */}
                  <div className="mb-4">
                    <div className="text-xs font-medium mb-2">
                      BMAD v6 Workflow Phases
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {BMAD_V6_PHASES.map((phase, idx) => {
                        const completion = phaseCompletion[phase.id];
                        const isActive = currentPhase === phase.id;
                        return (
                          <div
                            key={phase.id}
                            className={cn(
                              "rounded-lg border p-2 cursor-pointer transition-all",
                              "hover:border-primary/50",
                              isActive && "border-primary bg-primary/10",
                              completion?.completed &&
                                "border-green-500/50 bg-green-500/5",
                              !isActive &&
                                !completion?.completed &&
                                "border-border/30 bg-background/30"
                            )}
                            onClick={() => setCurrentPhase(phase.id)}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm">{phase.icon}</span>
                              {completion?.completed && (
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                              )}
                            </div>
                            <div className="text-[10px] font-medium mt-1">
                              {phase.name}
                            </div>
                            <div className="text-[9px] text-muted-foreground">
                              {phase.required ? "Required" : "Optional"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Current Phase Details */}
                  {(() => {
                    const phase = BMAD_V6_PHASES.find(
                      (p) => p.id === currentPhase
                    );
                    if (!phase) return null;
                    const agent = BMAD_V6_AGENTS.find(
                      (a) => a.id === phase.agent
                    );
                    const workflows = BMAD_V6_WORKFLOWS.filter(
                      (w) => w.phase === currentPhase || w.phase === "all"
                    );
                    return (
                      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <div className="text-sm font-medium flex items-center gap-2">
                              {phase.icon} {phase.name}
                              {phase.required && (
                                <Badge
                                  variant="secondary"
                                  className="text-[9px]"
                                >
                                  Required
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {phase.description}
                            </div>
                          </div>
                          {agent && (
                            <Badge variant="outline" className="text-[10px]">
                              {agent.label}
                            </Badge>
                          )}
                        </div>
                        <div className="text-[10px] font-medium mt-3 mb-1">
                          Available Workflows:
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {workflows.map((wf) => (
                            <Button
                              key={wf.id}
                              type="button"
                              size="sm"
                              variant={
                                selectedWorkflow === wf.id
                                  ? "default"
                                  : "outline"
                              }
                              className="h-6 text-[10px] px-2"
                              onClick={() => {
                                setSelectedWorkflow(wf.id);
                                const command = `@${wf.agent} *${wf.id}`;
                                copyText(`wf-${wf.id}`, command);
                              }}
                            >
                              {wf.name}
                            </Button>
                          ))}
                        </div>
                        {selectedWorkflow &&
                          (() => {
                            const wf = BMAD_V6_WORKFLOWS.find(
                              (w) => w.id === selectedWorkflow
                            );
                            if (!wf) return null;
                            const wfAgent = BMAD_V6_AGENTS.find(
                              (a) => a.id === wf.agent
                            );
                            const command = `@${wf.agent} *${wf.id}`;
                            return (
                              <div className="mt-3 p-2 rounded border border-border/30 bg-black/50">
                                <div
                                  className="flex items-center justify-between gap-2 mb-1"
                                  onClick={() =>
                                    copyText(`wf-${wf.id}`, command)
                                  }
                                >
                                  <div className="text-[10px] text-muted-foreground">
                                    {wf.description}{" "}
                                    <Copy className="h-3 w-3" />
                                    {copiedKey === `wf-${wf.id}`
                                      ? "Copied!"
                                      : "Copy"}
                                  </div>
                                  {/* <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-[10px] gap-1"
                                    onClick={() =>
                                      copyText(`wf-${wf.id}`, command)
                                    }
                                  >
                                    <Copy className="h-3 w-3" />
                                    {copiedKey === `wf-${wf.id}`
                                      ? "Copied!"
                                      : "Copy"}
                                  </Button> */}
                                </div>
                                <code className="text-xs text-green-400 font-mono">
                                  {command}
                                </code>
                              </div>
                            );
                          })()}
                      </div>
                    );
                  })()}
                </div>

                {/* CLI Logs */}
                <div className="rounded-xl border border-border/50 bg-background/40 p-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="text-sm font-medium">BMAD CLI Output</div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={String(setup.bmadMode || "npx")}
                        onValueChange={(v) =>
                          onChangeSetup({ ...setup, bmadMode: v })
                        }
                      >
                        <SelectTrigger className="w-[100px] h-8 bg-background/50 text-xs">
                          <SelectValue placeholder="Mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="npx">npx</SelectItem>
                          <SelectItem value="bmad">bmad</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!hasProjectRoot || bmadBusy}
                        onClick={() => runBmadAction("status")}
                      >
                        Status
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={!bmadBusy}
                        onClick={() => stopBmad()}
                      >
                        Stop
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/50 bg-black/90 p-3">
                    <ScrollArea className="h-[100px]">
                      <pre className="text-xs text-gray-100 whitespace-pre-wrap break-words">
                        {bmadLogs.length
                          ? bmadLogs
                              .map((l) => String(l?.message || ""))
                              .join("\n")
                          : "No BMAD logs yet"}
                      </pre>
                    </ScrollArea>
                  </div>

                  {bmadBusy && (
                    <div className="mt-2 flex items-center gap-2">
                      <Input
                        value={bmadInput}
                        onChange={(e) => setBmadInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            sendBmadInput();
                          }
                        }}
                        placeholder="Type response and press Enter"
                        className="bg-background/50 text-xs"
                        disabled={!bmadBusy}
                      />
                      <Button
                        type="button"
                        size="sm"
                        disabled={!bmadBusy || !String(bmadInput || "").trim()}
                        onClick={() => sendBmadInput()}
                      >
                        Send
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <Tabs value={workflowsTab} onValueChange={setWorkflowsTab}>
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="wizard">Wizard</TabsTrigger>
                      <TabsTrigger value="advanced">Advanced</TabsTrigger>
                      <TabsTrigger value="preview">Preview</TabsTrigger>
                    </TabsList>

                    <TabsContent value="wizard" className="mt-4">
                      <div className="grid gap-3">
                        <div className="grid sm:grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">
                              Step 1: Phase
                            </Label>
                            <Select
                              value={String(wizardPhase)}
                              onValueChange={(v) => setWizardPhase(v)}
                            >
                              <SelectTrigger className="w-full bg-background/50">
                                <SelectValue placeholder="Phase" />
                              </SelectTrigger>
                              <SelectContent>
                                {BMAD_V6_PHASES.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="sm:col-span-2">
                            <Label className="text-xs text-muted-foreground">
                              Step 2: Workflow
                            </Label>
                            <Select
                              value={String(resolvedWizardWorkflow)}
                              onValueChange={(v) => setWizardWorkflow(v)}
                            >
                              <SelectTrigger className="w-full bg-background/50">
                                <SelectValue placeholder="Workflow" />
                              </SelectTrigger>
                              <SelectContent>
                                {wizardWorkflowOptions.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {resolvedWizardWorkflow === "research" && (
                          <div className="grid gap-3">
                            <div className="grid sm:grid-cols-3 gap-3">
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Research type
                                </Label>
                                <Select
                                  value={String(wizardResearchType)}
                                  onValueChange={(v) =>
                                    setWizardResearchType(v)
                                  }
                                >
                                  <SelectTrigger className="w-full bg-background/50">
                                    <SelectValue placeholder="Type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="market">
                                      market
                                    </SelectItem>
                                    <SelectItem value="technical">
                                      technical
                                    </SelectItem>
                                    <SelectItem value="deep_prompt">
                                      deep_prompt
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="grid sm:grid-cols-3 gap-3">
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Input 1
                                </Label>
                                <Input
                                  value={wizardResearchInputs[0] || ""}
                                  onChange={(e) => {
                                    const next = [...wizardResearchInputs];
                                    next[0] = e.target.value;
                                    setWizardResearchInputs(next);
                                  }}
                                  placeholder="product-brief.md"
                                  className="bg-background/50"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Input 2
                                </Label>
                                <Input
                                  value={wizardResearchInputs[1] || ""}
                                  onChange={(e) => {
                                    const next = [...wizardResearchInputs];
                                    next[1] = e.target.value;
                                    setWizardResearchInputs(next);
                                  }}
                                  placeholder="competitor-list.md"
                                  className="bg-background/50"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Input 3
                                </Label>
                                <Input
                                  value={wizardResearchInputs[2] || ""}
                                  onChange={(e) => {
                                    const next = [...wizardResearchInputs];
                                    next[2] = e.target.value;
                                    setWizardResearchInputs(next);
                                  }}
                                  placeholder="requirements.md"
                                  className="bg-background/50"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {resolvedWizardWorkflow === "product-brief" && (
                          <div className="grid sm:grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs text-muted-foreground">
                                Optional input document
                              </Label>
                              <Input
                                value={wizardProductBriefInput}
                                onChange={(e) =>
                                  setWizardProductBriefInput(e.target.value)
                                }
                                placeholder="market-research.md"
                                className="bg-background/50"
                              />
                            </div>
                          </div>
                        )}

                        <div className="grid sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2">
                            <Label className="text-xs text-muted-foreground">
                              Context file (for `--data` / preview)
                            </Label>
                            <Input
                              value={wizardContextPath}
                              onChange={(e) =>
                                setWizardContextPath(e.target.value)
                              }
                              placeholder="_bmad-output/prd.md"
                              className="bg-background/50"
                            />
                          </div>
                          <div className="flex items-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="gap-2"
                              disabled={!wizardCommand}
                              onClick={() =>
                                copyText("workflow-wizard", wizardCommand)
                              }
                            >
                              <Copy className="h-4 w-4" />
                              {copiedKey === "workflow-wizard"
                                ? "Copied"
                                : "Copy"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              disabled={
                                !hasProjectRoot ||
                                !wizardCliArgs.length ||
                                workflowRunBusy
                              }
                              onClick={() => runWizardWorkflow()}
                            >
                              {workflowRunBusy ? "Running" : "Run"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={!wizardContextPath}
                              onClick={() => setWorkflowsTab("preview")}
                            >
                              Preview
                            </Button>
                          </div>
                        </div>

                        <div className="rounded-lg border border-border/50 bg-black/90 p-3">
                          <pre className="text-xs text-gray-100 whitespace-pre-wrap break-words">
                            {wizardCommand || "Select a workflow"}
                          </pre>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="advanced" className="mt-4">
                      <div className="grid gap-3">
                        <div className="grid sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2">
                            <Label className="text-xs text-muted-foreground">
                              Workflow
                            </Label>
                            <Select
                              value={String(workflowName)}
                              onValueChange={(v) => setWorkflowName(v)}
                            >
                              <SelectTrigger className="w-full bg-background/50">
                                <SelectValue placeholder="Workflow" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="status">status</SelectItem>
                                <SelectItem value="prd">prd</SelectItem>
                                <SelectItem value="brainstorm-project">
                                  brainstorm-project
                                </SelectItem>
                                <SelectItem value="research">
                                  research
                                </SelectItem>
                                <SelectItem value="product-brief">
                                  product-brief
                                </SelectItem>
                                <SelectItem value="brainstorming">
                                  brainstorming
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-end justify-between gap-3">
                            <div className="grid gap-1">
                              <Label className="text-xs text-muted-foreground">
                                Include --data
                              </Label>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={includeWorkflowData}
                                  onCheckedChange={(v) =>
                                    setIncludeWorkflowData(v)
                                  }
                                  disabled={!workflowDataPath}
                                />
                                <div className="text-xs text-muted-foreground truncate max-w-[220px]">
                                  {workflowDataPath || "No PRD path"}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-lg border border-border/50 bg-black/90 p-3">
                          <pre className="text-xs text-gray-100 whitespace-pre-wrap break-words">
                            {workflowCommand}
                          </pre>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="preview" className="mt-4">
                      <div className="grid gap-3">
                        <Tabs defaultValue="data">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="data">Data File</TabsTrigger>
                            <TabsTrigger value="output">Run Output</TabsTrigger>
                          </TabsList>

                          <TabsContent value="data" className="mt-4">
                            <div className="grid gap-3">
                              <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                                <div className="flex-1">
                                  <Label className="text-xs text-muted-foreground">
                                    Preview file (relative to project root)
                                  </Label>
                                  <Input
                                    value={wizardContextPath}
                                    onChange={(e) =>
                                      setWizardContextPath(e.target.value)
                                    }
                                    placeholder="_bmad-output/prd.md"
                                    className="bg-background/50"
                                  />
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="gap-2"
                                  disabled={
                                    !hasProjectRoot ||
                                    !wizardContextPath ||
                                    workflowPreviewBusy
                                  }
                                  onClick={() => refreshWorkflowPreview()}
                                >
                                  <RefreshCw className="h-4 w-4" />
                                  {workflowPreviewBusy ? "Loading" : "Refresh"}
                                </Button>
                              </div>

                              {workflowPreviewError && (
                                <div className="text-xs text-red-400">
                                  {workflowPreviewError}
                                </div>
                              )}

                              <div className="rounded-lg border border-border/50 bg-black/90 p-3">
                                <ScrollArea className="h-[180px]">
                                  <pre className="text-xs text-gray-100 whitespace-pre-wrap break-words">
                                    {workflowPreviewContent
                                      ? workflowPreviewContent
                                      : hasProjectRoot
                                      ? "No preview loaded"
                                      : "Select a project root first"}
                                  </pre>
                                </ScrollArea>
                              </div>
                            </div>
                          </TabsContent>

                          <TabsContent value="output" className="mt-4">
                            <div className="grid gap-3">
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-xs text-muted-foreground">
                                  {workflowRunBusy
                                    ? "Workflow running"
                                    : workflowRunLogs.length
                                    ? "Last workflow run output"
                                    : "No workflow run yet"}
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={!workflowRunLogs.length}
                                  onClick={() => setWorkflowRunLogs([])}
                                >
                                  Clear
                                </Button>
                              </div>

                              <div className="rounded-lg border border-border/50 bg-black/90 p-3">
                                <ScrollArea className="h-[180px]">
                                  <pre className="text-xs text-gray-100 whitespace-pre-wrap break-words">
                                    {workflowRunLogs.length
                                      ? workflowRunLogs
                                          .map((l) => String(l?.message || ""))
                                          .join("\n")
                                      : ""}
                                  </pre>
                                </ScrollArea>
                              </div>
                            </div>
                          </TabsContent>
                        </Tabs>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="rounded-xl border border-border/50 bg-secondary/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "w-2.5 h-2.5 rounded-full",
                          connected
                            ? "bg-green-500 animate-pulse"
                            : serverRunning
                            ? "bg-amber-500"
                            : "bg-destructive"
                        )}
                      />
                      <div className="text-sm font-medium">
                        {connected
                          ? "Connected (Live)"
                          : serverRunning
                          ? "Server running, reconnect needed"
                          : "Server stopped"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => syncNow()}
                        className="gap-2"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Sync
                      </Button>
                      <Button
                        variant={serverRunning ? "destructive" : "default"}
                        size="sm"
                        onClick={toggleServer}
                        disabled={useRemoteServer}
                        className="gap-2"
                      >
                        {serverRunning ? (
                          <>
                            <WifiOff className="h-4 w-4" />
                            Stop
                          </>
                        ) : (
                          <>
                            <Wifi className="h-4 w-4" />
                            Start
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-border/50 bg-background/40 p-4">
                    <div className="text-sm font-medium mb-2">
                      Select your IDE
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {BMAD_IDE_OPTIONS.map((ide) => {
                        const isActive = Array.isArray(setup.ides)
                          ? setup.ides.includes(ide.id)
                          : false;
                        return (
                          <Button
                            key={ide.id}
                            type="button"
                            variant={isActive ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleToggleIde(ide.id)}
                          >
                            {ide.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/50 bg-background/40 p-4">
                    <div className="text-sm font-medium mb-2">Project root</div>
                    <Input
                      value={setup.projectRoot}
                      onChange={(e) =>
                        onChangeSetup({ ...setup, projectRoot: e.target.value })
                      }
                      placeholder="c:/path/to/next-gen/ui"
                      className="bg-background/50"
                    />
                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handlePickProjectRoot()}
                      >
                        Browse
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={
                          !hasProjectRoot || !window.electronAPI?.openFolder
                        }
                        onClick={() =>
                          window.electronAPI.openFolder(projectRoot)
                        }
                      >
                        Open
                      </Button>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-2">
                      Used for BMAD CLI runs and file generation
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/50 bg-background/40 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">Remote URL</div>
                        <div className="text-[11px] text-muted-foreground mt-1">
                          Generates URL-based config and skips internal
                          start/stop
                        </div>
                      </div>
                      <Switch
                        checked={Boolean(useRemoteServer)}
                        onCheckedChange={(v) => setUseRemoteServer(v)}
                      />
                    </div>
                    <div className="grid gap-1.5 mt-3">
                      <Label className="text-xs">Server base URL</Label>
                      <Input
                        value={String(serverBaseUrl || "")}
                        onChange={(e) => setServerBaseUrl(e.target.value)}
                        placeholder="http://localhost:3847"
                        className="bg-background/50"
                        disabled={!useRemoteServer}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border/50 bg-background/40 p-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="text-sm font-medium">MCP Server config</div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => copyText("mcp-config", mcpConfigSnippet)}
                    >
                      <Copy className="h-4 w-4" />
                      {copiedKey === "mcp-config" ? "Copied" : "Copy"}
                    </Button>
                  </div>
                  <div className="rounded-lg border border-border/50 bg-black/90 p-3">
                    <ScrollArea className="h-[160px]">
                      <pre className="text-xs text-gray-100 whitespace-pre-wrap break-words">
                        {mcpConfigSnippet}
                      </pre>
                    </ScrollArea>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="team" className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              <div className="grid gap-4 py-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-border/50 bg-background/40 p-4">
                    <div className="text-sm font-medium mb-2">User context</div>
                    <div className="grid gap-3">
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Your name</Label>
                        <Input
                          value={setup.ownerName || ""}
                          onChange={(e) =>
                            onChangeSetup({
                              ...setup,
                              ownerName: e.target.value,
                            })
                          }
                          className="bg-background/50"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Language</Label>
                        <Select
                          value={String(setup.language || "English")}
                          onValueChange={(v) =>
                            onChangeSetup({ ...setup, language: v })
                          }
                        >
                          <SelectTrigger className="bg-background/50">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="English">English</SelectItem>
                            <SelectItem value="Khmer">Khmer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Team name</Label>
                        <Input
                          value={setup.teamName || ""}
                          onChange={(e) =>
                            onChangeSetup({
                              ...setup,
                              teamName: e.target.value,
                            })
                          }
                          className="bg-background/50"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Team members</Label>
                        <Input
                          value={setup.teamMembers || ""}
                          onChange={(e) =>
                            onChangeSetup({
                              ...setup,
                              teamMembers: e.target.value,
                            })
                          }
                          placeholder="Alice, Bob, Carol"
                          className="bg-background/50"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-background/40 p-4">
                    <div className="text-sm font-medium mb-2">Team context</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Team size</Label>
                        <Input
                          inputMode="numeric"
                          value={setup.teamSize}
                          onChange={(e) =>
                            onChangeSetup({
                              ...setup,
                              teamSize: e.target.value,
                            })
                          }
                          className="bg-background/50"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Sprint length (days)</Label>
                        <Select
                          value={String(setup.sprintLength || "14")}
                          onValueChange={(v) =>
                            onChangeSetup({ ...setup, sprintLength: v })
                          }
                        >
                          <SelectTrigger className="bg-background/50">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="7">7</SelectItem>
                            <SelectItem value="14">14</SelectItem>
                            <SelectItem value="21">21</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-4">
                      <Label className="flex flex-col gap-1">
                        <span className="text-sm">Auto-sync</span>
                        <span className="font-normal text-xs text-muted-foreground">
                          Pull state every 30s (optional)
                        </span>
                      </Label>
                      <Switch
                        checked={Boolean(setup.autoSync)}
                        onCheckedChange={(v) =>
                          onChangeSetup({ ...setup, autoSync: v })
                        }
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/50 bg-background/40 p-4">
                    <div className="text-sm font-medium mb-2">
                      Recommendation
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary/15 text-primary">
                        Recommended
                      </Badge>
                      <div className="text-sm">{recommendedAgent}</div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      You can override this based on your workflow
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border/50 bg-background/40 p-4">
                  <div className="text-sm font-medium mb-3">
                    Select your agent
                  </div>
                  <div className="grid gap-2">
                    {setupAgentList.map((agent) => (
                      <button
                        key={agent.id}
                        type="button"
                        className={cn(
                          "p-3 rounded-xl border text-left transition-all",
                          "hover:bg-accent/50",
                          agent.isSelected
                            ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                            : "border-border/50 bg-background/30"
                        )}
                        onClick={() => {
                          onChangeSetup({ ...setup, agent: agent.id });
                          navigator.clipboard
                            .writeText(agent.id)
                            .catch(() => {});
                        }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              <span>{agent.label}</span>
                              {agent.isRecommended && (
                                <Badge className="bg-primary/15 text-primary">
                                  ✨
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {agent.description}
                            </div>
                          </div>
                          {agent.isSelected && (
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => setShowComparison((s) => !s)}
                    >
                      <Search className="h-4 w-4" />
                      See comparison
                    </Button>
                    <div className="flex-1" />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => copyText("slash", slashCommandSnippet)}
                    >
                      <Copy className="h-4 w-4" />
                      {copiedKey === "slash" ? "Copied" : "Copy command"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        onChangeSetup({ ...setup, agent: selectedAgent });
                        setActiveTab("project");
                      }}
                    >
                      <ArrowRight className="h-4 w-4" />
                      Continue
                    </Button>
                  </div>

                  {showComparison && (
                    <div className="mt-4 rounded-xl border border-border/50 bg-secondary/10 p-4">
                      <div className="text-sm font-medium mb-2">Comparison</div>
                      <div className="grid gap-2">
                        {BMAD_AGENT_OPTIONS.map((a) => (
                          <div
                            key={a.id}
                            className="rounded-lg border border-border/50 bg-background/40 p-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-sm font-medium">
                                {a.label}
                              </div>
                              <Badge
                                variant="secondary"
                                className="text-[10px]"
                              >
                                {a.id}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {a.description}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="project" className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              <div className="grid gap-4 py-4">
                <div className="rounded-xl border border-border/50 bg-background/40 p-4">
                  <div className="text-sm font-medium mb-2">PRD</div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Project name</Label>
                      <Input
                        value={setup.projectName || ""}
                        onChange={(e) =>
                          onChangeSetup({
                            ...setup,
                            projectName: e.target.value,
                          })
                        }
                        className="bg-background/50"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">PRD path (relative)</Label>
                      <Input
                        value={prdPath}
                        onChange={(e) =>
                          onChangeSetup({ ...setup, prdPath: e.target.value })
                        }
                        className="bg-background/50"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 mt-4">
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Overview</Label>
                      <textarea
                        value={setup.projectSummary || ""}
                        onChange={(e) =>
                          onChangeSetup({
                            ...setup,
                            projectSummary: e.target.value,
                          })
                        }
                        className="min-h-[72px] w-full rounded-md border border-border bg-background/50 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Goals</Label>
                      <textarea
                        value={setup.projectGoals || ""}
                        onChange={(e) =>
                          onChangeSetup({
                            ...setup,
                            projectGoals: e.target.value,
                          })
                        }
                        className="min-h-[72px] w-full rounded-md border border-border bg-background/50 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Non-goals</Label>
                      <textarea
                        value={setup.projectNonGoals || ""}
                        onChange={(e) =>
                          onChangeSetup({
                            ...setup,
                            projectNonGoals: e.target.value,
                          })
                        }
                        className="min-h-[72px] w-full rounded-md border border-border bg-background/50 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Target users</Label>
                      <textarea
                        value={setup.projectUsers || ""}
                        onChange={(e) =>
                          onChangeSetup({
                            ...setup,
                            projectUsers: e.target.value,
                          })
                        }
                        className="min-h-[72px] w-full rounded-md border border-border bg-background/50 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Success metrics</Label>
                      <textarea
                        value={setup.projectSuccessMetrics || ""}
                        onChange={(e) =>
                          onChangeSetup({
                            ...setup,
                            projectSuccessMetrics: e.target.value,
                          })
                        }
                        className="min-h-[72px] w-full rounded-md border border-border bg-background/50 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Constraints</Label>
                      <textarea
                        value={setup.projectConstraints || ""}
                        onChange={(e) =>
                          onChangeSetup({
                            ...setup,
                            projectConstraints: e.target.value,
                          })
                        }
                        className="min-h-[72px] w-full rounded-md border border-border bg-background/50 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-4">
                    <Button
                      type="button"
                      disabled={!hasProjectRoot || prdBusy}
                      onClick={() => generatePrd()}
                      className="gap-2"
                    >
                      Generate PRD
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!hasProjectRoot}
                      onClick={() => copyText("prd", buildPrdMarkdown())}
                      className="gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      {copiedKey === "prd" ? "Copied" : "Copy"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={
                        !hasProjectRoot || !window.electronAPI?.openFolder
                      }
                      onClick={() => window.electronAPI.openFolder(projectRoot)}
                    >
                      Open project
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!hasProjectRoot}
                      onClick={() => setActiveTab("actions")}
                    >
                      Continue
                    </Button>
                  </div>

                  {prdResult && (
                    <div
                      className={cn(
                        "mt-3 text-xs rounded-md border p-2",
                        prdResult.ok
                          ? "border-green-500/30 bg-green-500/10 text-green-200"
                          : "border-destructive/30 bg-destructive/10 text-destructive"
                      )}
                    >
                      {prdResult.ok
                        ? `PRD written: ${prdResult.path}`
                        : prdResult.message}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-border/50 bg-background/40 p-4">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <div className="text-sm font-medium flex items-center gap-2">
                        📋 Context Management
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        BMAD workflow documents, agent rules, and project
                        context files
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        disabled={!hasProjectRoot || detectingFiles}
                        onClick={() => detectContextFiles()}
                      >
                        <RefreshCw
                          className={cn(
                            "h-4 w-4",
                            detectingFiles && "animate-spin"
                          )}
                        />
                        Scan
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        disabled={!hasProjectRoot || contextBusy}
                        onClick={() => {
                          contextDocs.forEach((doc) => {
                            if (!doc?.path) return;
                            loadContextDoc({
                              docId: doc.id,
                              relativePath: doc.path,
                              force: true,
                            });
                          });
                        }}
                      >
                        <RefreshCw className="h-4 w-4" />
                        Reload All
                      </Button>
                    </div>
                  </div>

                  {/* Category Tabs */}
                  <Tabs
                    value={contextCategoryTab}
                    onValueChange={setContextCategoryTab}
                  >
                    <TabsList className="grid w-full grid-cols-4 mb-4">
                      {BMAD_CONTEXT_CATEGORIES.map((cat) => (
                        <TabsTrigger
                          key={cat.id}
                          value={cat.id}
                          className="text-xs gap-1"
                        >
                          <span>{cat.icon}</span>
                          <span className="hidden sm:inline">{cat.label}</span>
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {/* Category Content */}
                    {BMAD_CONTEXT_CATEGORIES.map((category) => (
                      <TabsContent
                        key={category.id}
                        value={category.id}
                        className="mt-0"
                      >
                        <div className="rounded-lg border border-border/30 bg-black/20 p-3">
                          <div className="text-xs text-muted-foreground mb-3">
                            {category.description}
                          </div>

                          {/* Predefined files for this category */}
                          <div className="grid gap-2">
                            {category.items.map((item) => {
                              const detected = detectedContextFiles[item.id];
                              const exists = detected?.exists;
                              const isAdded = contextDocs.some(
                                (d) => d.path === item.path
                              );
                              const isIdeSpecific = !!item.ide;
                              const selectedIdes = Array.isArray(setup.ides)
                                ? setup.ides
                                : [];
                              const isIdeSelected =
                                !isIdeSpecific ||
                                selectedIdes.includes(item.ide);

                              return (
                                <div
                                  key={item.id}
                                  className={cn(
                                    "flex items-center justify-between gap-3 rounded-md border p-2 transition-colors",
                                    exists
                                      ? "border-green-500/30 bg-green-500/5"
                                      : "border-border/30 bg-background/30",
                                    !isIdeSelected && "opacity-50"
                                  )}
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div
                                      className={cn(
                                        "w-2 h-2 rounded-full shrink-0",
                                        exists
                                          ? "bg-green-500"
                                          : "bg-muted-foreground/30"
                                      )}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-medium truncate flex items-center gap-2">
                                        {item.label}
                                        {item.required && (
                                          <Badge
                                            variant="secondary"
                                            className="text-[9px] px-1"
                                          >
                                            Required
                                          </Badge>
                                        )}
                                        {isIdeSpecific && (
                                          <Badge
                                            variant="outline"
                                            className="text-[9px] px-1"
                                          >
                                            {item.ide}
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="text-[10px] text-muted-foreground truncate">
                                        {item.path}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {exists && !isAdded && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-xs"
                                        disabled={!hasProjectRoot}
                                        onClick={() =>
                                          addPredefinedContext(item)
                                        }
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Add
                                      </Button>
                                    )}
                                    {isAdded && (
                                      <Badge
                                        variant="secondary"
                                        className="text-[9px]"
                                      >
                                        Added
                                      </Badge>
                                    )}
                                    {!exists && (
                                      <span className="text-[10px] text-muted-foreground">
                                        Not found
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>

                  {/* Custom Context Add */}
                  <div className="mt-4 pt-4 border-t border-border/30">
                    <div className="text-xs font-medium mb-2">
                      Add Custom Context
                    </div>
                    <div className="grid sm:grid-cols-4 gap-2">
                      <Input
                        value={newContextLabel}
                        onChange={(e) => setNewContextLabel(e.target.value)}
                        placeholder="Label"
                        className="bg-background/50 text-xs"
                        disabled={!hasProjectRoot}
                      />
                      <Input
                        value={newContextPath}
                        onChange={(e) => setNewContextPath(e.target.value)}
                        placeholder="Relative path (e.g. docs/spec.md)"
                        className="bg-background/50 text-xs sm:col-span-2"
                        disabled={!hasProjectRoot}
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="gap-1"
                        disabled={
                          !hasProjectRoot ||
                          !String(newContextPath || "").trim()
                        }
                        onClick={() => addContextDoc()}
                      >
                        <Plus className="h-3 w-3" />
                        Add
                      </Button>
                    </div>
                  </div>

                  {/* Active Context Docs */}
                  {contextDocs.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border/30">
                      <div className="text-xs font-medium mb-2">
                        Active Context Files ({contextDocs.length})
                      </div>
                      <Tabs
                        value={activeContextId}
                        onValueChange={setActiveContextId}
                      >
                        <TabsList className="w-full overflow-x-auto justify-start mb-3">
                          {contextDocs.map((doc) => {
                            const catDef = BMAD_CONTEXT_CATEGORIES.find(
                              (c) => c.id === doc.category
                            );
                            return (
                              <TabsTrigger
                                key={doc.id}
                                value={doc.id}
                                className="shrink-0 text-xs gap-1"
                              >
                                <span>{catDef?.icon || "📄"}</span>
                                {doc.label}
                              </TabsTrigger>
                            );
                          })}
                        </TabsList>
                        {contextDocs.map((doc) => {
                          const draft =
                            Object.hasOwn(contextDrafts, doc.id) &&
                            typeof contextDrafts[doc.id] === "string"
                              ? contextDrafts[doc.id]
                              : "";
                          const statusForDoc =
                            contextStatus && contextStatus.docId === doc.id
                              ? contextStatus
                              : null;
                          return (
                            <TabsContent
                              key={doc.id}
                              value={doc.id}
                              className="mt-0"
                            >
                              <Card className="border-border/50 bg-background/40">
                                <CardHeader className="pb-2 pt-3 px-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <CardTitle className="text-sm">
                                        {doc.label}
                                      </CardTitle>
                                      <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                                        {doc.path}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        disabled={
                                          !hasProjectRoot || contextBusy
                                        }
                                        onClick={() =>
                                          loadContextDoc({
                                            docId: doc.id,
                                            relativePath: doc.path,
                                            force: true,
                                          })
                                        }
                                      >
                                        <RefreshCw className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        disabled={
                                          !hasProjectRoot || contextBusy
                                        }
                                        onClick={() =>
                                          saveContextDoc({
                                            docId: doc.id,
                                            relativePath: doc.path,
                                          })
                                        }
                                      >
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        disabled={!hasProjectRoot}
                                        onClick={() =>
                                          copyText(`ctx-${doc.id}`, draft)
                                        }
                                      >
                                        <Copy className="h-3.5 w-3.5" />
                                      </Button>
                                      {doc.id !== "prd" && (
                                        <Button
                                          type="button"
                                          size="icon"
                                          variant="ghost"
                                          className="h-7 w-7 text-destructive"
                                          disabled={
                                            !hasProjectRoot || contextBusy
                                          }
                                          onClick={() =>
                                            removeContextDoc(doc.id)
                                          }
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                  {statusForDoc && (
                                    <div
                                      className={cn(
                                        "mt-2 text-[10px] rounded-md border px-2 py-1",
                                        statusForDoc.ok
                                          ? "border-green-500/30 bg-green-500/10 text-green-200"
                                          : "border-destructive/30 bg-destructive/10 text-destructive"
                                      )}
                                    >
                                      {statusForDoc.message}
                                    </div>
                                  )}
                                </CardHeader>
                                <CardContent className="px-3 pb-3">
                                  <Tabs defaultValue="preview">
                                    <TabsList className="grid w-full grid-cols-2 h-8">
                                      <TabsTrigger
                                        value="preview"
                                        className="text-xs"
                                      >
                                        Preview
                                      </TabsTrigger>
                                      <TabsTrigger
                                        value="edit"
                                        className="text-xs"
                                      >
                                        Edit
                                      </TabsTrigger>
                                    </TabsList>
                                    <TabsContent
                                      value="preview"
                                      className="mt-2"
                                    >
                                      <div className="rounded-md border border-border/50 bg-black/50 p-3 h-[240px] overflow-auto">
                                        <MarkdownPreview value={draft} />
                                      </div>
                                    </TabsContent>
                                    <TabsContent value="edit" className="mt-2">
                                      <textarea
                                        className="h-[240px] w-full rounded-md border border-border bg-background/50 px-3 py-2 text-xs font-mono"
                                        value={draft}
                                        onChange={(e) =>
                                          setContextDraft(
                                            doc.id,
                                            e.target.value
                                          )
                                        }
                                      />
                                    </TabsContent>
                                  </Tabs>
                                </CardContent>
                              </Card>
                            </TabsContent>
                          );
                        })}
                      </Tabs>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="actions" className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              <div className="grid gap-4 py-4">
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-border/50 bg-background/40 p-4">
                    <div className="text-xs text-muted-foreground">Board</div>
                    <div className="text-sm font-medium truncate">
                      {activeBoard?.name || "No board selected"}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-background/40 p-4">
                    <div className="text-xs text-muted-foreground">Stories</div>
                    <div className="text-sm font-medium">
                      {stats?.total || 0}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-background/40 p-4">
                    <div className="text-xs text-muted-foreground">Agent</div>
                    <div className="text-sm font-medium">{selectedAgent}</div>
                  </div>
                </div>

                <div className="rounded-xl border border-border/50 bg-background/40 p-4">
                  <div className="text-sm font-medium mb-3">Quick actions</div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      disabled={!boardId}
                      onClick={() => onCreateStory()}
                    >
                      <Plus className="h-4 w-4" />
                      Create story
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      disabled={!boardId || !ready}
                      onClick={() => onOpenStory(ready.listId, ready.card)}
                    >
                      <Book className="h-4 w-4" />
                      Open next ready
                    </Button>
                    <Button
                      type="button"
                      className="gap-2"
                      disabled={!boardId || !ready || !inProgressListId}
                      onClick={() => onStartStory(ready, inProgressListId)}
                    >
                      <PlayCircle className="h-4 w-4" />
                      Start next story
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      onClick={() => syncNow()}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Sync MCP
                    </Button>
                  </div>
                  {!ready && boardId && (
                    <div className="text-xs text-muted-foreground mt-3">
                      No stories in Ready for Dev
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-border/50 bg-background/40 p-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="text-sm font-medium">Test agent</div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => syncNow()}
                    >
                      <Zap className="h-4 w-4" />
                      Run
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Verifies MCP connectivity by syncing state and reflecting
                    updates in the board
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
            }}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============ Offline State ============
const OfflineState = ({ onReconnect, onOpenSettings, serverRunning }) => (
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

// ============ Main Component ============
export default function ScrumBoardView() {
  const {
    state,
    loading,
    error,
    connected,
    activeBoardId,
    lockedCards,
    connect,
    disconnect,
    loadLocalState,
    setActiveBoard,
    createBoard,
    deleteBoard,
    deleteList: deleteListApi,
    addList: addListApi,
    renameList: renameListApi,
    addCard,
    updateCard,
    deleteCard,
    moveCard,
    moveList,
    acquireLock,
    releaseLock,
    isCardLocked,
    getCardLock,
    getActiveBoard,
    getEpics,
    getStats,
    syncNow,
    // Settings
    checkServerStatus,
    serverRunning,
    clearError,
  } = useKanbanStore();

  const [cardDialogOpen, setCardDialogOpen] = React.useState(false);
  const [cardDialogContext, setCardDialogContext] = React.useState(null);
  const [createBoardOpen, setCreateBoardOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [agentAssistOpen, setAgentAssistOpen] = React.useState(false);
  const [dragState, setDragState] = React.useState(null);
  const [listDrop, setListDrop] = React.useState(null);
  const [projectPickerOpen, setProjectPickerOpen] = React.useState(false);
  const [projectPickerValue, setProjectPickerValue] = React.useState("");
  const projectPickerFileRef = React.useRef(null);

  const [overviewTab, setOverviewTab] = React.useState(() => {
    try {
      const v = localStorage.getItem(SCRUM_OVERVIEW_TAB_STORAGE_KEY);
      return v === "stats" ? "stats" : "mcp";
    } catch {
      return "mcp";
    }
  });

  const [agentSetup, setAgentSetup] = React.useState(() => {
    const defaults = {
      ides: ["cursor"],
      projectRoot: "",
      bmadMode: "npx",
      bmadVerbose: false,
      ownerName: "",
      language: "English",
      teamName: "",
      teamMembers: "",
      teamSize: "5",
      sprintLength: "14",
      autoSync: false,
      agent: "",
      projectName: "",
      prdPath: "_bmad-output/prd.md",
      projectSummary: "",
      projectGoals: "",
      projectNonGoals: "",
      projectUsers: "",
      projectSuccessMetrics: "",
      projectConstraints: "",
      contextDocs: [],
    };

    let raw = null;
    try {
      raw = safeJsonParse(
        localStorage.getItem(BMAD_AGENT_SETUP_STORAGE_KEY) || ""
      );
    } catch {
      raw = null;
    }
    if (!raw || typeof raw !== "object") return defaults;

    return {
      ...defaults,
      ...raw,
      ides: Array.isArray(raw.ides) ? raw.ides : defaults.ides,
    };
  });

  React.useEffect(() => {
    try {
      localStorage.setItem(
        BMAD_AGENT_SETUP_STORAGE_KEY,
        JSON.stringify(agentSetup)
      );
    } catch {}
  }, [agentSetup]);

  const [recentProjects, setRecentProjects] = React.useState(() => {
    let raw = null;
    try {
      raw = safeJsonParse(
        localStorage.getItem(SCRUM_RECENT_PROJECTS_STORAGE_KEY) || ""
      );
    } catch {
      raw = null;
    }
    if (!Array.isArray(raw)) return [];
    return raw
      .map((v) => String(v || "").trim())
      .filter(Boolean)
      .slice(0, SCRUM_MAX_RECENT_PROJECTS);
  });

  React.useEffect(() => {
    const root = String(agentSetup.projectRoot || "").trim();
    if (!root) return;
    setRecentProjects((prev) => {
      const next = [root, ...prev.filter((p) => p !== root)].slice(
        0,
        SCRUM_MAX_RECENT_PROJECTS
      );
      try {
        localStorage.setItem(
          SCRUM_RECENT_PROJECTS_STORAGE_KEY,
          JSON.stringify(next)
        );
      } catch {}
      return next;
    });
  }, [agentSetup.projectRoot]);

  const getProjectLabel = React.useCallback((p) => {
    const cleaned = String(p || "").replace(/[\\/]+$/, "");
    const parts = cleaned.split(/[\\/]+/).filter(Boolean);
    return parts[parts.length - 1] || cleaned;
  }, []);

  const handleBrowseProjectRoot = React.useCallback(async () => {
    if (window.electronAPI?.selectFolder) {
      const selected = await window.electronAPI.selectFolder({
        title: "Select project root",
        defaultPath: agentSetup.projectRoot || undefined,
      });
      if (selected) {
        setAgentSetup((s) => ({ ...s, projectRoot: selected }));
      }
      return;
    }

    setProjectPickerValue(String(agentSetup.projectRoot || ""));
    setProjectPickerOpen(true);
  }, [agentSetup.projectRoot]);

  const projectOptions = React.useMemo(() => {
    const root = String(agentSetup.projectRoot || "").trim();
    if (root && !recentProjects.includes(root))
      return [root, ...recentProjects];
    return recentProjects;
  }, [agentSetup.projectRoot, recentProjects]);

  React.useEffect(() => {
    try {
      localStorage.setItem(SCRUM_OVERVIEW_TAB_STORAGE_KEY, overviewTab);
    } catch {}
  }, [overviewTab]);

  React.useEffect(() => {
    if (!agentSetup.autoSync || !connected) return;
    const interval = window.setInterval(() => syncNow(), 30000);
    return () => window.clearInterval(interval);
  }, [agentSetup.autoSync, connected, syncNow]);

  const [confirmState, setConfirmState] = React.useState({
    open: false,
    title: "",
    description: "",
    confirmText: "Delete",
  });
  const [confirmBusy, setConfirmBusy] = React.useState(false);
  const confirmActionRef = React.useRef(null);

  const openConfirm = React.useCallback(
    ({ title, description, confirmText, onConfirm }) => {
      confirmActionRef.current = onConfirm;
      setConfirmBusy(false);
      setConfirmState({
        open: true,
        title,
        description,
        confirmText: confirmText || "Delete",
      });
    },
    []
  );

  // Initialize connection
  React.useEffect(() => {
    checkServerStatus(); // Check if already running
    connect();

    // Fallback to local state if connection fails after a timeout
    const timeout = setTimeout(() => {
      const { connected: isConnected, loading: isLoading } =
        useKanbanStore.getState();
      if (!isConnected && isLoading) {
        loadLocalState();
      }
    }, 3000);

    return () => {
      clearTimeout(timeout);
      disconnect();
    };
  }, [checkServerStatus, connect, disconnect, loadLocalState]);

  const activeBoard = getActiveBoard();
  const epics = getEpics();
  const stats = getStats();

  const storyKeyByCardId = React.useMemo(() => {
    if (!activeBoard?.lists?.length) return {};
    const toMs = (iso) => {
      const ms = Date.parse(String(iso || ""));
      return Number.isFinite(ms) ? ms : 0;
    };

    const allCards = [];
    for (const list of activeBoard.lists) {
      for (const card of list.cards || []) {
        allCards.push({
          cardId: card.id,
          createdAtMs: toMs(card.createdAt),
        });
      }
    }

    allCards.sort((a, b) =>
      a.createdAtMs !== b.createdAtMs
        ? a.createdAtMs - b.createdAtMs
        : String(a.cardId).localeCompare(String(b.cardId))
    );

    const map = {};
    for (let i = 0; i < allCards.length; i += 1) {
      const entry = allCards[i];
      map[entry.cardId] = `${activeBoard.name}:${i + 1}`;
    }
    return map;
  }, [activeBoard]);

  // Card operations
  const openNewCard = React.useCallback(
    async (listId) => {
      setCardDialogContext({ boardId: activeBoardId, listId, card: null });
      setCardDialogOpen(true);
    },
    [activeBoardId]
  );

  const openEditCard = React.useCallback(
    async (listId, card) => {
      await acquireLock(card.id);
      setCardDialogContext({ boardId: activeBoardId, listId, card });
      setCardDialogOpen(true);
    },
    [acquireLock, activeBoardId]
  );

  const handleCardDialogClose = async (open) => {
    if (!open && cardDialogContext?.card?.id) {
      await releaseLock(cardDialogContext.card.id);
    }
    setCardDialogOpen(open);
    if (!open) setCardDialogContext(null);
  };

  const handleSaveCard = async (patch) => {
    const { listId, card } = cardDialogContext;

    if (card?.id) {
      await updateCard(activeBoardId, listId, card.id, patch);
      await releaseLock(card.id);
    } else {
      await addCard(activeBoardId, listId, patch);
    }

    setCardDialogOpen(false);
    setCardDialogContext(null);
  };

  const handleDeleteCard = async () => {
    const { listId, card } = cardDialogContext;
    if (!card?.id) return;

    openConfirm({
      title: "Delete story?",
      description: "This action cannot be undone.",
      confirmText: "Delete",
      onConfirm: async () => {
        const ok = await deleteCard(activeBoardId, listId, card.id);
        if (ok) {
          setCardDialogOpen(false);
          setCardDialogContext(null);
        }
      },
    });
  };

  // List operations
  const addList = async (name) => {
    if (!activeBoardId) return false;
    return addListApi(activeBoardId, name);
  };

  const renameList = async (listId, name) => {
    if (!activeBoardId) return false;
    return renameListApi(activeBoardId, listId, name);
  };

  const deleteList = async (listId) => {
    const board = getActiveBoard();
    const list = board?.lists?.find((l) => l.id === listId);

    openConfirm({
      title: "Delete list?",
      description: list?.cards?.length
        ? `This will delete the list and ${list.cards.length} stories inside it.`
        : "This action cannot be undone.",
      confirmText: "Delete",
      onConfirm: async () => {
        await deleteListApi(activeBoardId, listId);
      },
    });
  };

  const openAgentCreateStory = React.useCallback(() => {
    if (!activeBoardId) return;
    const board = getActiveBoard();
    const backlogListId =
      board?.lists?.find((l) => l.statusId === "backlog")?.id ||
      board?.lists?.[0]?.id ||
      null;
    if (!backlogListId) return;
    openNewCard(backlogListId);
  }, [activeBoardId, getActiveBoard, openNewCard]);

  const openAgentStory = React.useCallback(
    (listId, card) => {
      if (!activeBoardId || !listId || !card) return;
      openEditCard(listId, card);
    },
    [activeBoardId, openEditCard]
  );

  const startAgentStory = React.useCallback(
    async (readyInfo, inProgressListId) => {
      if (!activeBoardId) return;
      const fromListId = readyInfo?.listId;
      const cardId = readyInfo?.card?.id;
      if (!fromListId || !cardId || !inProgressListId) return;
      await moveCard(activeBoardId, cardId, fromListId, inProgressListId, 0);
      openEditCard(inProgressListId, readyInfo.card);
    },
    [activeBoardId, moveCard, openEditCard]
  );

  // Drag and drop
  const safeParse = (value) => {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  const onDragStartCard = (e, listId, cardId, index) => {
    if (isCardLocked(cardId)) {
      e.preventDefault();
      return;
    }

    const payload = { type: "scrum-card", listId, cardId, index };
    e.dataTransfer.setData("application/json", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";
    setDragState({ type: "card", listId, cardId, index });
    setListDrop(null);
  };

  const onDragEndCard = () => {
    setDragState(null);
    setListDrop(null);
  };

  const onDragStartList = (e, listId) => {
    const payload = { type: "scrum-list", listId };
    e.dataTransfer.setData("application/json", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";
    setDragState({ type: "list", listId });
    setListDrop(null);
  };

  const onDragEndList = () => {
    setDragState(null);
    setListDrop(null);
  };

  const onDragOverListColumn = (e, overListId, overIndex) => {
    if (dragState?.type !== "list") return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    const rect = e.currentTarget.getBoundingClientRect();
    const isAfter = e.clientX > rect.left + rect.width / 2;
    const toIndex = overIndex + (isAfter ? 1 : 0);

    setListDrop({
      overListId,
      position: isAfter ? "after" : "before",
      toIndex,
    });
  };

  const onDropListToIndex = async (e, overListId, overIndex) => {
    if (dragState?.type !== "list") return;
    e.preventDefault();

    const payload = safeParse(e.dataTransfer.getData("application/json"));
    if (!payload || payload.type !== "scrum-list") return;

    const fromListId = payload.listId;
    if (!fromListId || !activeBoardId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const isAfter = e.clientX > rect.left + rect.width / 2;
    const toIndex = overIndex + (isAfter ? 1 : 0);

    await moveList(activeBoardId, fromListId, toIndex);
    setDragState(null);
    setListDrop(null);
  };

  const onDropCardToList = async (e, toListId, toIndex) => {
    e.preventDefault();
    const payload = safeParse(e.dataTransfer.getData("application/json"));
    if (!payload || payload.type !== "scrum-card") return;

    const fromListId = payload.listId;
    const cardId = payload.cardId;
    if (!fromListId || !cardId) return;

    await moveCard(activeBoardId, cardId, fromListId, toListId, toIndex);
    setDragState(null);
  };

  // Loading state
  if (loading && !state) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-8 h-full flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 mx-auto mb-3 text-primary animate-spin" />
          <p className="text-muted-foreground">
            Connecting to Kanban server...
          </p>
        </div>
      </div>
    );
  }

  // Offline/Blocking State
  if (!connected && !loading) {
    return (
      <>
        <OfflineState
          onReconnect={() => {
            checkServerStatus();
            connect();
          }}
          onOpenSettings={() => setSettingsOpen(true)}
          serverRunning={serverRunning}
        />
        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      </>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 h-full min-h-0 flex flex-col gap-4">
      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="flex-1 text-sm">{error}</span>
          <Button variant="ghost" size="sm" onClick={clearError}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10">
            <LayoutGrid className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Kanban Board
            </h3>
            <p className="text-xs text-muted-foreground">
              BMAD-Method Workflow
            </p>
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex flex-wrap gap-2 items-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="h-5 w-5 text-muted-foreground" />
          </Button>

          <Select
            value={String(agentSetup.projectRoot || "").trim() || ""}
            onValueChange={(next) => {
              if (next === "__browse__") {
                handleBrowseProjectRoot();
                return;
              }
              setAgentSetup((s) => ({ ...s, projectRoot: next }));
            }}
          >
            <SelectTrigger className="w-[220px] bg-background/50">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__browse__">
                {window.electronAPI?.selectFolder
                  ? "Browse..."
                  : "Add project..."}
              </SelectItem>
              {projectOptions.map((root) => (
                <SelectItem key={root} value={root}>
                  {`${getProjectLabel(root)} — ${root}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={activeBoardId || ""} onValueChange={setActiveBoard}>
            <SelectTrigger className="w-[200px] bg-background/50">
              <SelectValue placeholder="Select board" />
            </SelectTrigger>
            <SelectContent>
              {state?.boards?.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  <div className="flex items-center gap-2">
                    {b.type === "bmad" && (
                      <Sparkles className="h-3 w-3 text-primary" />
                    )}
                    {b.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => setCreateBoardOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Board
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setAgentAssistOpen(true)}
          >
            <Sparkles className="h-4 w-4" />
            Agent Assist
          </Button>

          {activeBoard && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                openConfirm({
                  title: "Delete board?",
                  description: "This action cannot be undone.",
                  confirmText: "Delete",
                  onConfirm: async () => {
                    await deleteBoard(activeBoard.id);
                  },
                });
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {activeBoard && (
        <Tabs
          value={overviewTab}
          onValueChange={setOverviewTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="mcp">MCP Tool</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
          </TabsList>

          <TabsContent value="mcp" className="mt-3">
            <McpToolsUsage
              activeBoard={activeBoard}
              projectRoot={agentSetup.projectRoot}
            />
          </TabsContent>

          <TabsContent value="stats" className="mt-3">
            <StatsCard stats={stats} />
          </TabsContent>
        </Tabs>
      )}

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden min-h-0">
        <div className="min-w-max flex gap-4 items-stretch pb-2 h-full">
          {activeBoard?.lists?.map((list, index) => (
            <ListColumn
              key={list.id}
              list={list}
              listDrop={listDrop}
              dragState={dragState}
              onDragStartList={(e) => onDragStartList(e, list.id)}
              onDragEndList={onDragEndList}
              onDragOverList={(e) => onDragOverListColumn(e, list.id, index)}
              onDropList={(e) => onDropListToIndex(e, list.id, index)}
              onAddCard={() => openNewCard(list.id)}
              onEditCard={(card) => openEditCard(list.id, card)}
              onRename={(name) => renameList(list.id, name)}
              onDelete={() => deleteList(list.id)}
              onDragStartCard={(e, cardId, index) =>
                onDragStartCard(e, list.id, cardId, index)
              }
              onDragEndCard={onDragEndCard}
              onDropToIndex={(e, index) => onDropCardToList(e, list.id, index)}
              onDropToEnd={(e) =>
                onDropCardToList(e, list.id, list.cards.length)
              }
              isCardLocked={isCardLocked}
              getCardLock={getCardLock}
              storyKeyByCardId={storyKeyByCardId}
            />
          ))}

          <AddListColumn onAdd={addList} />
        </div>
      </div>

      {/* Dialogs */}
      <CardEditorDialog
        open={cardDialogOpen}
        onOpenChange={handleCardDialogClose}
        initial={cardDialogContext?.card}
        onSave={handleSaveCard}
        onDelete={handleDeleteCard}
        epics={epics}
        isLocked={
          cardDialogContext?.card?.id
            ? isCardLocked(cardDialogContext.card.id)
            : false
        }
        lockInfo={
          cardDialogContext?.card?.id
            ? getCardLock(cardDialogContext.card.id)
            : null
        }
      />

      <CreateBoardDialog
        open={createBoardOpen}
        onOpenChange={setCreateBoardOpen}
        onCreateBoard={createBoard}
      />

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

      <AgentAssistDialog
        open={agentAssistOpen}
        onOpenChange={setAgentAssistOpen}
        setup={agentSetup}
        onChangeSetup={setAgentSetup}
        activeBoard={activeBoard}
        stats={stats}
        onCreateStory={openAgentCreateStory}
        onOpenStory={openAgentStory}
        onStartStory={startAgentStory}
      />

      <Dialog
        open={projectPickerOpen}
        onOpenChange={(open) => setProjectPickerOpen(open)}
      >
        <DialogContent className="sm:max-w-[520px] bg-background/95 backdrop-blur-lg">
          <DialogHeader>
            <DialogTitle>Project</DialogTitle>
            <DialogDescription>
              Enter a project identifier to persist in your browser.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label
                className={cn(
                  "text-xs",
                  window.electronAPI?.selectFolder ? "" : "cursor-pointer"
                )}
                onClick={() => {
                  if (window.electronAPI?.selectFolder) return;
                  if (projectPickerFileRef.current) {
                    projectPickerFileRef.current.click();
                  }
                }}
              >
                Project root
              </Label>
              {!window.electronAPI?.selectFolder && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (projectPickerFileRef.current) {
                      projectPickerFileRef.current.click();
                    }
                  }}
                >
                  Browse
                </Button>
              )}
            </div>

            {!window.electronAPI?.selectFolder && (
              <input
                ref={projectPickerFileRef}
                type="file"
                webkitdirectory=""
                directory=""
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  const first = files[0];
                  const rel = String(first?.webkitRelativePath || "");
                  const root = rel.split("/").filter(Boolean)[0] || "";
                  if (root) setProjectPickerValue(root);
                  e.target.value = "";
                }}
              />
            )}

            <Input
              value={projectPickerValue}
              onChange={(e) => setProjectPickerValue(e.target.value)}
              placeholder="/Users/you/path/to/project"
              className="bg-background/50"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setProjectPickerOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                const next = String(projectPickerValue || "").trim();
                setAgentSetup((s) => ({ ...s, projectRoot: next }));
                setProjectPickerOpen(false);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmState.open}
        onOpenChange={(open) => {
          if (confirmBusy) return;
          setConfirmState((s) => ({ ...s, open }));
        }}
      >
        <DialogContent className="sm:max-w-[420px] bg-background/95 backdrop-blur-lg">
          <DialogHeader>
            <DialogTitle>{confirmState.title}</DialogTitle>
            {confirmState.description ? (
              <DialogDescription>{confirmState.description}</DialogDescription>
            ) : null}
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={confirmBusy}
              onClick={() => setConfirmState((s) => ({ ...s, open: false }))}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={confirmBusy}
              onClick={async () => {
                if (!confirmActionRef.current) {
                  setConfirmState((s) => ({ ...s, open: false }));
                  return;
                }

                setConfirmBusy(true);
                try {
                  await confirmActionRef.current();
                  setConfirmState((s) => ({ ...s, open: false }));
                } finally {
                  setConfirmBusy(false);
                }
              }}
            >
              {confirmBusy ? "Deleting..." : confirmState.confirmText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
