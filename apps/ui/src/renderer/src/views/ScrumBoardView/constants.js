/**
 * ScrumBoardView Constants
 *
 * Contains all configuration objects, BMAD agents, phases, workflows,
 * MCP tools, and other constants used throughout the Scrum Board view.
 */

import {
  Circle,
  PlayCircle,
  Clock,
  Users,
  CheckCircle,
  GitBranch,
  Layout,
} from "lucide-react";

// ============ Board Templates ============
// Note: These are simplified templates - the full templates use STORY_STATUSES from kanbanStore
export const BOARD_TEMPLATES = [
  {
    id: "bmad-method",
    name: "BMAD-Method Sprint",
    description: "Full agile workflow with story lifecycle",
    type: "bmad",
    lists: ["Backlog", "Ready for Dev", "In Progress", "Review", "Done"],
    icon: Layout,
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

// ============ Status Icons ============
export const STATUS_ICONS = {
  backlog: Circle,
  "ready-for-dev": PlayCircle,
  "in-progress": Clock,
  review: Users,
  done: CheckCircle,
};

// ============ Priority Config ============
export const PRIORITY_CONFIG = {
  low: { color: "bg-slate-500", textColor: "text-slate-500", icon: "○" },
  medium: { color: "bg-blue-500", textColor: "text-blue-500", icon: "◐" },
  high: { color: "bg-amber-500", textColor: "text-amber-500", icon: "◑" },
  critical: { color: "bg-red-500", textColor: "text-red-500", icon: "●" },
};

// ============ Storage Keys ============
export const BMAD_AGENT_SETUP_STORAGE_KEY = "bmad-scrum-agent-setup-v1";
export const SCRUM_OVERVIEW_TAB_STORAGE_KEY = "scrum-overview-tab-v1";
export const SCRUM_RECENT_PROJECTS_STORAGE_KEY = "scrum-recent-projects-v1";
export const SCRUM_MAX_RECENT_PROJECTS = 8;

// ============ BMAD v6 Agents ============
export const BMAD_V6_AGENTS = [
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

// ============ BMAD v6 Phases ============
export const BMAD_V6_PHASES = [
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

// ============ BMAD v6 Workflows ============
export const BMAD_V6_WORKFLOWS = [
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

// ============ BMAD Installation Status ============
export const BMAD_INSTALL_STATUS = {
  NOT_CHECKED: "not-checked",
  CHECKING: "checking",
  NOT_INSTALLED: "not-installed",
  INSTALLED: "installed",
  PARTIAL: "partial",
  ERROR: "error",
};

// Legacy agent options for backward compatibility
export const BMAD_AGENT_OPTIONS = BMAD_V6_AGENTS;

// ============ IDE Options ============
export const BMAD_IDE_OPTIONS = [
  { id: "claude-code", label: "Claude Code" },
  { id: "cursor", label: "Cursor" },
  { id: "windsurf", label: "Windsurf" },
  { id: "vscode", label: "VS Code" },
  { id: "trae", label: "Trae" },
  { id: "cline", label: "Cline" },
  { id: "copilot", label: "GitHub Copilot" },
];

// ============ BMAD Context Categories ============
export const BMAD_CONTEXT_CATEGORIES = [
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
export const ALL_BMAD_CONTEXT_ITEMS = BMAD_CONTEXT_CATEGORIES.flatMap((cat) =>
  cat.items.map((item) => ({
    ...item,
    category: cat.id,
    categoryLabel: cat.label,
  })),
);

// ============ MCP Kanban Tool Options ============
export const MCP_KANBAN_TOOL_OPTIONS = [
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

// ============ Sprint Statuses ============
export const SPRINT_STATUSES = [
  { id: "planned", name: "Planned" },
  { id: "active", name: "Active" },
  { id: "completed", name: "Completed" },
];
