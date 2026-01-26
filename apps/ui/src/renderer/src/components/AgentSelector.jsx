import React, { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FileCode,
  Folder,
  Info,
  Sparkles,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./ui/tooltip";
import { SKILLS_REGISTRY } from "../data/skills-registry";

const agentInfo = {
  antigravity: {
    name: "Antigravity / Claude Code",
    icon: "🚀",
    color: "indigo",
    native: true,
    path: ".agent/skills",
    description: "Native support - Skills are detected automatically",
    docs: "https://agentskills.io/",
  },
  "gemini-cli": {
    name: "Gemini CLI",
    icon: "💎",
    color: "blue",
    native: true,
    path: ".gemini/skills",
    description: "Native support with standard SKILL.md format",
    docs: "https://github.com/google-gemini/gemini-cli",
  },
  cursor: {
    name: "Cursor",
    icon: "🎯",
    color: "purple",
    native: false,
    path: ".cursor/rules",
    description: "Requires pointer file in .cursor/rules/",
    docs: "https://cursor.com",
  },
  trae: {
    name: "Trae",
    icon: "🔷",
    color: "cyan",
    native: false,
    path: ".trae/rules",
    description: "Uses symlinks to reference central AGENTS.md",
    docs: "https://trae.ai",
  },
  windsurf: {
    name: "Windsurf",
    icon: "🌊",
    color: "teal",
    native: false,
    path: ".windsurf/rules",
    description: "Requires rules configuration",
    docs: "https://windsurf.com",
  },
  copilot: {
    name: "GitHub Copilot",
    icon: "🤖",
    color: "green",
    native: false,
    path: ".github/copilot-instructions.md",
    description: "Single instruction file in .github/",
    docs: "https://gh.io/coding-agent-docs",
  },
  aider: {
    name: "Aider",
    icon: "🔧",
    color: "orange",
    native: true,
    path: "CONVENTIONS.md",
    description: "Uses CONVENTIONS.md or AGENTS.md",
    docs: "https://aider.chat",
  },
  opencode: {
    name: "OpenCode",
    icon: "📖",
    color: "slate",
    native: true,
    path: ".opencode/rules",
    description: "Compatible with AGENTS.md format",
    docs: "https://opencode.ai",
  },
};

const colorClasses = {
  indigo: {
    border: "border-indigo-500",
    bg: "bg-indigo-500/10",
    text: "text-indigo-400",
    hover: "hover:border-indigo-400",
  },
  blue: {
    border: "border-blue-500",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    hover: "hover:border-blue-400",
  },
  purple: {
    border: "border-purple-500",
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    hover: "hover:border-purple-400",
  },
  cyan: {
    border: "border-cyan-500",
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    hover: "hover:border-cyan-400",
  },
  teal: {
    border: "border-teal-500",
    bg: "bg-teal-500/10",
    text: "text-teal-400",
    hover: "hover:border-teal-400",
  },
  green: {
    border: "border-green-500",
    bg: "bg-green-500/10",
    text: "text-green-400",
    hover: "hover:border-green-400",
  },
  orange: {
    border: "border-orange-500",
    bg: "bg-orange-500/10",
    text: "text-orange-400",
    hover: "hover:border-orange-400",
  },
  slate: {
    border: "border-slate-500",
    bg: "bg-slate-500/10",
    text: "text-slate-400",
    hover: "hover:border-slate-400",
  },
};

export function AgentSelector({ selectedAgents = [], onAgentsChange }) {
  const toggleAgent = (agentId) => {
    const isSelected = selectedAgents.includes(agentId);
    if (isSelected) {
      onAgentsChange(selectedAgents.filter((id) => id !== agentId));
    } else {
      onAgentsChange([...selectedAgents, agentId]);
    }
  };

  const selectAll = () => {
    onAgentsChange(Object.keys(agentInfo));
  };

  const selectNative = () => {
    onAgentsChange(
      Object.entries(agentInfo)
        .filter(([_, info]) => info.native)
        .map(([id]) => id)
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Target Agents
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Select which AI agents to configure
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={selectNative}
            className="border-[var(--color-border)] text-[var(--color-text-secondary)]"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Native Only
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={selectAll}
            className="border-[var(--color-border)] text-[var(--color-text-secondary)]"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Select All
          </Button>
        </div>
      </div>

      {/* Agent Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(agentInfo).map(([agentId, info]) => {
          const isSelected = selectedAgents.includes(agentId);
          const colors = colorClasses[info.color];

          return (
            <Card
              key={agentId}
              className={`p-4 cursor-pointer transition-all duration-200 ${
                isSelected
                  ? `${colors.border} ${colors.bg}`
                  : `border-[var(--color-border)] bg-[var(--color-bg-elevated)] ${colors.hover}`
              }`}
              onClick={() => toggleAgent(agentId)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{info.icon}</span>
                  <div>
                    <h4
                      className={`font-medium ${
                        isSelected
                          ? colors.text
                          : "text-[var(--color-text-primary)]"
                      }`}
                    >
                      {info.name}
                    </h4>
                    {info.native && (
                      <Badge
                        variant="outline"
                        className="mt-1 border-emerald-500 bg-emerald-500/10 text-emerald-400 text-[10px]"
                      >
                        Native Support
                      </Badge>
                    )}
                  </div>
                </div>
                {isSelected && (
                  <CheckCircle2 className={`h-5 w-5 ${colors.text}`} />
                )}
              </div>
              <p className="mt-2 text-xs text-[var(--color-text-secondary)] line-clamp-2">
                {info.description}
              </p>
              <div className="mt-2 flex items-center gap-1 text-[10px] text-[var(--color-text-tertiary)]">
                <Folder className="h-3 w-3" />
                <code>{info.path}</code>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Selected Summary */}
      {selectedAgents.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-3">
          <Info className="h-4 w-4 text-[var(--color-text-secondary)]" />
          <span className="text-sm text-[var(--color-text-secondary)]">
            {selectedAgents.length} agent(s) selected. Configuration will be
            generated for each.
          </span>
        </div>
      )}
    </div>
  );
}

export function AgentPreview({
  selectedAgents = [],
  selectedSkills = [],
  projectName = "my-project",
}) {
  const [expandedFiles, setExpandedFiles] = useState(new Set(["AGENTS.md"]));
  const [copiedFile, setCopiedFile] = useState(null);

  // Get skill details
  const allSkills = SKILLS_REGISTRY.categories.flatMap((cat) => cat.skills);
  const selectedSkillDetails = selectedSkills
    .map((id) => allSkills.find((s) => s.id === id))
    .filter(Boolean);

  // Generate AGENTS.md content
  const generateAgentsMd = () => {
    return `# AGENTS.md (Universal Team Rules)
> **Single Source of Truth for ${selectedAgents.map((a) => agentInfo[a]?.name || a).join(", ")}**

## 1. Project Context
- **Project**: ${projectName}
- **Generated**: ${new Date().toISOString().split("T")[0]}
- **Skills**: ${selectedSkills.length} installed

## 2. Installed Skills
${selectedSkillDetails.map((s) => `- **${s.name}**: ${s.description}`).join("\n")}

## 3. Coding Standards
- Follow project conventions defined in individual skill files
- Use TypeScript where possible
- Write clean, maintainable code
- Add meaningful comments for complex logic

## 4. Skill Usage
To use a skill, reference it by name:
\`\`\`
Use @skill-name to help me with...
\`\`\`

Available skills: ${selectedSkills.join(", ")}
`;
  };

  // Generate cursor rules content
  const generateCursorRules = () => {
    return `---
description: Universal Context
globs: *
---
# IMPORTANT
You must strictly follow the rules in @AGENTS.md located in the project root.

## Installed Skills
${selectedSkillDetails.map((s) => `- ${s.name}: ${s.description}`).join("\n")}
`;
  };

  // Generate setup script
  const generateSetupScript = () => {
    const agents = selectedAgents.map((a) => agentInfo[a]);
    
    return `#!/bin/bash
# Universal Agent Setup Script
# Generated for: ${selectedAgents.join(", ")}

set -e

echo "🤖 Setting up Universal AI Agent Configuration..."

# Create central .agent directory
mkdir -p .agent/skills

# Clone skills repository
if [ ! -d ".agent/skills/.git" ]; then
  echo "📦 Cloning skills repository..."
  git clone https://github.com/sickn33/antigravity-awesome-skills.git .agent/skills
fi

${selectedAgents.includes("cursor") ? `
# Cursor Setup
echo "🎯 Configuring Cursor..."
mkdir -p .cursor/rules
cat > .cursor/rules/universal.mdc << 'EOF'
${generateCursorRules()}
EOF
` : ""}

${selectedAgents.includes("trae") ? `
# Trae Setup
echo "🔷 Configuring Trae..."
mkdir -p .trae/rules
mkdir -p .trae/skills
ln -sf "$(pwd)/AGENTS.md" ".trae/rules/AGENTS.md" 2>/dev/null || cp AGENTS.md .trae/rules/
ln -sf "$(pwd)/.agent/skills" ".trae/skills/universal" 2>/dev/null || cp -r .agent/skills .trae/skills/universal
` : ""}

${selectedAgents.includes("copilot") ? `
# GitHub Copilot Setup
echo "🤖 Configuring GitHub Copilot..."
mkdir -p .github
cat > .github/copilot-instructions.md << 'EOF'
# Copilot Instructions
Please follow the rules defined in AGENTS.md in the project root.

## Installed Skills
${selectedSkillDetails.map((s) => `- ${s.name}`).join("\n")}
EOF
` : ""}

echo "✨ Setup complete! Your project is now configured for:"
${selectedAgents.map((a) => `echo "  - ${agentInfo[a]?.name || a}"`).join("\n")}
`;
  };

  const files = [
    {
      name: "AGENTS.md",
      path: "AGENTS.md",
      content: generateAgentsMd(),
      language: "markdown",
    },
    ...(selectedAgents.includes("cursor")
      ? [
          {
            name: "Cursor Rules",
            path: ".cursor/rules/universal.mdc",
            content: generateCursorRules(),
            language: "markdown",
          },
        ]
      : []),
    {
      name: "Setup Script",
      path: "setup-agents.sh",
      content: generateSetupScript(),
      language: "bash",
    },
  ];

  const toggleFile = (fileName) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(fileName)) {
        next.delete(fileName);
      } else {
        next.add(fileName);
      }
      return next;
    });
  };

  const copyContent = async (fileName, content) => {
    await navigator.clipboard.writeText(content);
    setCopiedFile(fileName);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
          Preview Generated Files
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Review the configuration files that will be created
        </p>
      </div>

      {/* File Structure */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-base)] overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-2">
          <Folder className="h-4 w-4 text-yellow-500" />
          <span className="font-medium text-[var(--color-text-primary)]">
            {projectName}/
          </span>
        </div>

        <div className="divide-y divide-[var(--color-border)]">
          {files.map((file) => (
            <div key={file.name}>
              <button
                onClick={() => toggleFile(file.name)}
                className="flex w-full items-center justify-between px-4 py-3 hover:bg-[var(--color-bg-elevated)] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-[var(--color-text-secondary)]" />
                  <span className="text-sm text-[var(--color-text-primary)]">
                    {file.path}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {expandedFiles.has(file.name) ? (
                    <EyeOff className="h-4 w-4 text-[var(--color-text-secondary)]" />
                  ) : (
                    <Eye className="h-4 w-4 text-[var(--color-text-secondary)]" />
                  )}
                </div>
              </button>

              {expandedFiles.has(file.name) && (
                <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-base)]">
                  <div className="flex items-center justify-between px-4 py-2 bg-[var(--color-bg-elevated)]">
                    <span className="text-xs text-[var(--color-text-tertiary)]">
                      {file.language}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyContent(file.name, file.content)}
                      className="h-6 text-xs text-[var(--color-text-secondary)]"
                    >
                      {copiedFile === file.name ? (
                        <>
                          <CheckCircle2 className="mr-1 h-3 w-3 text-emerald-400" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1 h-3 w-3" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <pre className="overflow-x-auto p-4 text-xs text-[var(--color-text-secondary)] font-mono">
                    {file.content}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Skills Summary */}
      {selectedSkills.length > 0 && (
        <Card className="p-4 border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
          <h4 className="font-medium text-[var(--color-text-primary)] mb-2">
            Skills to Install ({selectedSkills.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedSkillDetails.slice(0, 10).map((skill) => (
              <Badge
                key={skill.id}
                variant="outline"
                className="border-[var(--color-border)] text-[var(--color-text-secondary)]"
              >
                {skill.name}
              </Badge>
            ))}
            {selectedSkills.length > 10 && (
              <Badge
                variant="outline"
                className="border-indigo-500 bg-indigo-500/10 text-indigo-400"
              >
                +{selectedSkills.length - 10} more
              </Badge>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

export { agentInfo };
export default AgentSelector;
