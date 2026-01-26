# Universal Agent Setup PRD

> Single Source of Truth where you only edit files in one place (.agent/), and a script automatically wires them to Cursor, Trae, Gemini CLI, Claude Code, Copilot, and more.

## Overview

This document outlines the Universal Agent Setup system that creates cross-compatible configurations for multiple AI coding agents using the **SKILL.md** and **AGENTS.md** standards.

### Key Standards

| Standard | Purpose | Source |
|----------|---------|--------|
| **AGENTS.md** | Universal context and rules for AI agents | [agents.md](https://agents.md/) |
| **SKILL.md** | Reusable skill definitions with metadata | [agentskills.io](https://agentskills.io/) |

## Supported Agents

| Agent | Native Support | Path | Notes |
|-------|----------------|------|-------|
| Antigravity / Claude Code | ✅ Native | `.agent/skills` | Auto-detected |
| Gemini CLI | ✅ Native | `.gemini/skills` | Standard format |
| Cursor | ⚙️ Pointer | `.cursor/rules` | Requires MDC rule file |
| Trae | 🔗 Symlink | `.trae/rules` | Uses symlinks to central |
| Windsurf | ⚙️ Config | `.windsurf/rules` | Requires rules config |
| GitHub Copilot | 📄 File | `.github/copilot-instructions.md` | Single instruction file |
| Aider | ✅ Native | `CONVENTIONS.md` | Uses AGENTS.md format |
| OpenCode | ✅ Native | `.opencode/rules` | Compatible format |

## Directory Structure

```
project/
├── AGENTS.md                    # Universal brain - Single source of truth
├── .agent/
│   └── skills/                  # Central skills repository
│       ├── brainstorming/
│       │   └── SKILL.md
│       ├── clean-code/
│       │   └── SKILL.md
│       └── ...
├── .cursor/
│   └── rules/
│       └── universal.mdc        # Pointer to AGENTS.md
├── .trae/
│   ├── rules/
│   │   └── AGENTS.md            # Symlink → ../AGENTS.md
│   └── skills/
│       └── universal            # Symlink → ../../.agent/skills
├── .github/
│   └── copilot-instructions.md  # Copilot-specific instructions
└── setup-agents.sh              # Auto-generated setup script
```

## SKILL.md Format

```yaml
---
name: skill-name
description: A description of what this skill does and when to use it.
license: Apache-2.0
metadata:
  author: example-org
  version: "1.0"
---

# Skill Instructions

Detailed instructions for the skill...
```

## AGENTS.md Format

```markdown
# AGENTS.md (Universal Team Rules)
> **Single Source of Truth for Cursor, Trae, Gemini CLI, & More**

## 1. Project Context
- **App**: Your Project Name
- **Stack**: Your tech stack description

## 2. Installed Skills
- **Brainstorming**: Generate ideas and plan projects
- **Clean Code**: Write maintainable, readable code
- ...

## 3. Coding Standards
- Follow project conventions
- Use TypeScript where possible
- Write clean, maintainable code

## 4. Skill Usage
To use a skill, reference it by name:
\`\`\`
Use @skill-name to help me with...
\`\`\`
```

## Skills Repository

Skills are sourced from the [antigravity-awesome-skills](https://github.com/sickn33/antigravity-awesome-skills) repository which contains 253+ curated skills:

### Categories

| Category | Description | Example Skills |
|----------|-------------|----------------|
| 🎯 Essentials | Core skills every developer needs | brainstorming, clean-code, code-review-checklist |
| 🌐 Web Development | Frontend and full-stack | frontend-design, javascript-mastery, api-patterns |
| 🤖 AI & Agents | Build and manage AI agents | ai-agents-architect, autonomous-agents |
| 🔒 Security | Security testing and ethical hacking | api-security, ethical-hacking-methodology |
| ☁️ Cloud & DevOps | Cloud infrastructure | docker-expert, aws-serverless, deployment-procedures |
| ⚡ Automation | Workflow automation | browser-automation, workflow-automation |
| 🗄️ Database | Database design | database-design, firebase |
| ✍️ Content | Marketing and content | copywriting, content-creator |
| 🎮 Game Development | Game development | 2d-games, 3d-games, 3d-web-experience |

### Curated Bundles

| Bundle | Description | Skills |
|--------|-------------|--------|
| 🧙 Web Wizard | Complete web development toolkit | 7 skills |
| 🔐 Security Engineer | Security testing and pentesting | 5 skills |
| 🤖 AI Developer | Build and manage AI agents | 6 skills |
| 🚀 Full Stack | Complete full-stack development | 7 skills |
| 📦 Essentials | Core skills for getting started | 5 skills |

## Setup Script (Bash)

```bash
#!/bin/bash
# Universal Agent Setup Script

set -e

echo "🤖 Setting up Universal AI Agent Configuration..."

# Create central .agent directory
mkdir -p .agent/skills

# Clone skills repository
if [ ! -d ".agent/skills/.git" ]; then
  echo "📦 Cloning skills repository..."
  git clone https://github.com/sickn33/antigravity-awesome-skills.git .agent/skills
fi

# Cursor Setup
echo "🎯 Configuring Cursor..."
mkdir -p .cursor/rules
cat > .cursor/rules/universal.mdc << 'EOF'
---
description: Universal Context
globs: *
---
# IMPORTANT
You must strictly follow the rules in @AGENTS.md located in the project root.
EOF

# Trae Setup (with symlinks)
echo "🔷 Configuring Trae..."
mkdir -p .trae/rules
mkdir -p .trae/skills
ln -sf "$(pwd)/AGENTS.md" ".trae/rules/AGENTS.md" 2>/dev/null || cp AGENTS.md .trae/rules/
ln -sf "$(pwd)/.agent/skills" ".trae/skills/universal" 2>/dev/null || cp -r .agent/skills .trae/skills/universal

# GitHub Copilot Setup
echo "🤖 Configuring GitHub Copilot..."
mkdir -p .github
cat > .github/copilot-instructions.md << 'EOF'
# Copilot Instructions
Please follow the rules defined in AGENTS.md in the project root.
EOF

echo "✨ Setup complete!"
```

## Setup Script (Node.js)

```javascript
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const AGENTS_MD = `# AGENTS.md (Universal Team Rules)
> **Single Source of Truth for All AI Agents**

## 1. Project Context
- **Project**: ${projectName}
- **Generated**: ${new Date().toISOString().split('T')[0]}

## 2. Coding Standards
- Follow project conventions
- Use TypeScript where possible
- Write clean, maintainable code
`;

// Create directories and files
function setup(agents = ['antigravity', 'cursor', 'trae', 'copilot']) {
  // Create AGENTS.md
  fs.writeFileSync('AGENTS.md', AGENTS_MD);
  
  // Create .agent/skills
  fs.mkdirSync('.agent/skills', { recursive: true });
  
  // Clone skills
  execSync('git clone https://github.com/sickn33/antigravity-awesome-skills.git .agent/skills');
  
  // Configure each agent...
}
```

## Verification

After setup, verify the configuration:

### Cursor Users
1. Open project in Cursor
2. Ask: "What rules should you follow?"
3. Cursor should reference AGENTS.md

### Trae Users
1. Open project in Trae
2. Trae reads `.trae/rules/AGENTS.md` symlink
3. Follows same rules as other agents

### Claude Code / Antigravity Users
1. Native support via `.agent/skills`
2. Skills auto-detected

## Maintenance

- **Change rules**: Edit `AGENTS.md` in root
- **Add skills**: Add folder in `.agent/skills/`
- **Update skills**: `cd .agent/skills && git pull`

## References

- [AGENTS.md Standard](https://agents.md/)
- [Agent Skills Specification](https://agentskills.io/specification)
- [Antigravity Awesome Skills](https://github.com/sickn33/antigravity-awesome-skills)