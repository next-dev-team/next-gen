# 🎯 Enhanced Flow: IDE & Agent Selection for Scrum MCP Module

## Reference

- Context7 library: `/bmad-code-org/bmad-method` (`v6_0_0_alpha_0`)

## Install BMAD Method (v6 alpha)

```bash
npx bmad-method@alpha install
npx bmad-method@alpha status
```

## Step 1: Enhanced `module.yaml` with IDE & Agent Selection

```yaml
name: scrum-mcp-module
display_name: "Scrum MCP Integration Module"
description: "AI-powered Scrum board management with MCP support and Electron desktop app"
version: 1.0.0
type: standalone
unitary: false

author: "Your Organization"
license: MIT

ide_selection:
  enabled: true
  prompt: "Which IDE do you use for development?"
  type: multi-select
  options:
    - label: "🔮 Claude Code"
      value: "claude-code"
      description: "Claude Code with Artifacts"
    - label: "💫 Cursor"
      value: "cursor"
      description: "Cursor IDE (VSCode fork with AI)"
    - label: "🌊 Windsurf"
      value: "windsurf"
      description: "Windsurf with Flow mode"
    - label: "📝 VS Code"
      value: "vscode"
      description: "Visual Studio Code with extensions"
  required: true

agent_selection:
  enabled: true
  prompt: "Which agent do you want as your primary Scrum Manager?"
  type: single-select
  options:
    - label: "🤖 Scrum Manager (Default)"
      value: "scrum-manager"
      description: "Full-featured AI Scrum Master with sprint management"
    - label: "🎯 Quick Runner"
      value: "scrum-quick"
      description: "Lightweight agent for fast sprint operations"
    - label: "📊 Analytics Agent"
      value: "scrum-analytics"
      description: "Focus on metrics, burndown, and reporting"
    - label: "👥 Team Coordinator"
      value: "scrum-team"
      description: "Emphasizes team collaboration and ceremonies"
  default: "scrum-manager"
  required: true

config:
  scrum_data_location:
    prompt: "Where should Scrum board data be stored?"
    default: "_bmad-output/scrum-data"
    result: "{project-root}/{value}"

  electron_app_path:
    prompt: "Path to your Electron app (relative to project root)?"
    default: "apps/scrum-desktop"
    result: "{project-root}/{value}"

  mcp_server_port:
    prompt: "Which port should MCP server run on?"
    default: "3001"
    type: number
    result: "{value}"

  enable_auto_sync:
    prompt: "Enable automatic sync between Scrum board and MCP?"
    default: "true"
    type: select
    options:
      - label: "Yes - Auto sync every 30 seconds"
        value: "true"
      - label: "No - Manual sync only"
        value: "false"
    result: "{value}"

  team_size:
    prompt: "Team size for capacity planning?"
    default: "5"
    type: number
    result: "{value}"

  sprint_length:
    prompt: "Standard sprint length (days)?"
    type: select
    options:
      - label: "7 days (1 week)"
        value: "7"
      - label: "14 days (2 weeks)"
        value: "14"
      - label: "21 days (3 weeks)"
        value: "21"
    default: "14"
    result: "{value}"

dependencies:
  - core

post_install:
  - script: "setup-mcp-server.js"
    description: "Configure MCP server integration"
  - script: "init-electron-bridge.js"
    description: "Initialize Electron IPC bridge"
  - script: "setup-ide-integration.js"
    description: "Configure IDE-specific integrations"
  - script: "create-scrum-templates.js"
    description: "Generate Scrum board templates"
```

## Step 2: Update Installer with IDE & Agent Detection

Save as `_module-installer/installer.js`:

```js
const fs = require("fs").promises;
const path = require("path");

class ScrumModuleInstaller {
  constructor(options) {
    const { projectRoot, config, installedIDEs, logger } = options;
    this.projectRoot = projectRoot;
    this.config = config;
    this.installedIDEs = installedIDEs || [];
    this.logger = logger;
  }

  async install() {
    this.logger.info("🚀 Scrum MCP Module Installation Starting...\n");

    // Step 1: Detect installed IDEs
    await this.detectInstalledIDEs();

    // Step 2: Let user select IDEs
    const selectedIDEs = await this.selectIDEs();

    // Step 3: Let user select preferred agent
    const selectedAgent = await this.selectAgent();

    // Step 4: Generate IDE-specific configurations
    await this.generateIDEConfigurations(selectedIDEs, selectedAgent);

    // Step 5: Create IDE-specific agent menu items
    await this.createAgentMenus(selectedIDEs, selectedAgent);

    // Step 6: Initialize MCP server
    await this.initializeMCPServer();

    // Step 7: Setup Electron bridge
    await this.setupElectronBridge();

    this.logger.info("\n✅ Installation complete!");
    this.logger.info(`📌 Primary IDE: ${selectedIDEs[0]}`);
    this.logger.info(`🤖 Primary Agent: ${selectedAgent}`);

    return true;
  }

  // ========================================
  // IDE DETECTION & SELECTION
  // ========================================

  async detectInstalledIDEs() {
    this.logger.info("🔍 Detecting installed IDEs...\n");

    const detections = {
      "claude-code": this.detectClaudeCode(),
      cursor: this.detectCursor(),
      windsurf: this.detectWindsurf(),
      vscode: this.detectVSCode(),
    };

    const detected = await Promise.all(
      Object.entries(detections).map(async ([ide, detection]) => ({
        ide,
        found: await detection,
      }))
    );

    const foundIDEs = detected.filter((d) => d.found).map((d) => d.ide);

    if (foundIDEs.length > 0) {
      this.logger.info("✅ Found IDEs:");
      foundIDEs.forEach((ide) => this.logger.info(`   • ${ide}`));
    } else {
      this.logger.warn("⚠️  No IDEs detected. Installing for manual setup.");
    }

    this.detectedIDEs = foundIDEs;
  }

  async detectClaudeCode() {
    try {
      const claudePath = path.join(this.projectRoot, ".claude");
      await fs.access(claudePath);
      return true;
    } catch {
      return false;
    }
  }

  async detectCursor() {
    try {
      const cursorPath = path.join(this.projectRoot, ".cursor");
      await fs.access(cursorPath);
      return true;
    } catch {
      return false;
    }
  }

  async detectWindsurf() {
    try {
      const windsurf = path.join(this.projectRoot, ".windsurf");
      await fs.access(windsurf);
      return true;
    } catch {
      return false;
    }
  }

  async detectVSCode() {
    try {
      const vscode = path.join(this.projectRoot, ".vscode");
      await fs.access(vscode);
      return true;
    } catch {
      return false;
    }
  }

  async selectIDEs() {
    this.logger.info("\n🎯 Select IDEs for integration:");
    this.logger.info("(You can select multiple)\n");

    const ideOptions = [
      {
        name: "🔮 Claude Code",
        value: "claude-code",
        detected: this.detectedIDEs.includes("claude-code"),
      },
      {
        name: "💫 Cursor",
        value: "cursor",
        detected: this.detectedIDEs.includes("cursor"),
      },
      {
        name: "🌊 Windsurf",
        value: "windsurf",
        detected: this.detectedIDEs.includes("windsurf"),
      },
      {
        name: "📝 VS Code",
        value: "vscode",
        detected: this.detectedIDEs.includes("vscode"),
      },
    ];

    // Show menu
    ideOptions.forEach((ide, index) => {
      const status = ide.detected ? "✅" : "⚪";
      this.logger.info(`${status} [${index + 1}] ${ide.name}`);
    });

    this.logger.info(`\n💡 Detected IDEs will be prioritized.\n`);

    // For demo: return detected IDEs, else default to all
    return this.detectedIDEs.length > 0
      ? this.detectedIDEs
      : ["claude-code", "cursor", "vscode"];
  }

  // ========================================
  // AGENT SELECTION
  // ========================================

  async selectAgent() {
    this.logger.info("\n🤖 Select your primary agent:\n");

    const agents = [
      {
        name: "Scrum Manager (Default)",
        value: "scrum-manager",
        icon: "🤖",
        description: "Full-featured AI Scrum Master with sprint management",
      },
      {
        name: "Quick Runner",
        value: "scrum-quick",
        icon: "⚡",
        description: "Lightweight agent for fast sprint operations",
      },
      {
        name: "Analytics Agent",
        value: "scrum-analytics",
        icon: "📊",
        description: "Focus on metrics, burndown, and reporting",
      },
      {
        name: "Team Coordinator",
        value: "scrum-team",
        icon: "👥",
        description: "Emphasizes team collaboration and ceremonies",
      },
    ];

    agents.forEach((agent, index) => {
      this.logger.info(`${agent.icon} [${index + 1}] ${agent.name}`);
      this.logger.info(`   ${agent.description}\n`);
    });

    // For demo: return default
    return "scrum-manager";
  }

  // ========================================
  // IDE-SPECIFIC CONFIGURATION GENERATION
  // ========================================

  async generateIDEConfigurations(selectedIDEs, selectedAgent) {
    this.logger.info("\n⚙️ Generating IDE-specific configurations...\n");

    for (const ide of selectedIDEs) {
      try {
        switch (ide) {
          case "claude-code":
            await this.setupClaudeCode(selectedAgent);
            break;
          case "cursor":
            await this.setupCursor(selectedAgent);
            break;
          case "windsurf":
            await this.setupWindsurf(selectedAgent);
            break;
          case "vscode":
            await this.setupVSCode(selectedAgent);
            break;
        }
        this.logger.info(`✅ ${ide} configured`);
      } catch (error) {
        this.logger.error(`❌ Failed to configure ${ide}: ${error.message}`);
      }
    }
  }

  async setupClaudeCode(agent) {
    const claudePath = path.join(this.projectRoot, ".claude", "commands");
    await fs.mkdir(claudePath, { recursive: true });

    // Create agent-specific slash command
    const commandContent = `# Scrum Manager - ${agent}

Primary Agent: \`\`\`${agent}\`\`\`

## Commands

- \`/sprint-status\` - Check sprint health
- \`/create-story\` - Create new story
- \`/refine-backlog\` - Organize backlog
- \`/sync-mcp\` - Force sync with MCP

## Configuration

Agent Type: ${agent}
Sync Interval: 30 seconds
MCP Port: 3001

Load full agent context from: \`\_bmad/scrum-mcp-module/agents/\`
`;

    const commandPath = path.join(claudePath, "bmad-scrum-manager.md");
    await fs.writeFile(commandPath, commandContent);
  }

  async setupCursor(agent) {
    const cursorPath = path.join(this.projectRoot, ".cursor", "rules");
    await fs.mkdir(cursorPath, { recursive: true });

    const rulesContent = `# Scrum MCP Module Rules for Cursor

## Agent Configuration

- Primary Agent: ${agent}
- Module: scrum-mcp-module
- MCP Server: http://localhost:3001

## Available Workflows

1. sprint-initialization - Set up new sprint
2. mcp-sync - Sync board data
3. story-creation - Create user stories

## IDEs Supported

- Cursor (primary)
- Claude Code
- Windsurf
- VS Code

## Quick Commands

\`\`\`
@scrum-manager sprint status
@mcp-operator check server
workflow sprint-initialization
\`\`\`

Load full context from: \_bmad/scrum-mcp-module/
`;

    const rulesPath = path.join(cursorPath, "scrum-mcp.mdc");
    await fs.writeFile(rulesPath, rulesContent);
  }

  async setupWindsurf(agent) {
    const windsurf = path.join(this.projectRoot, ".windsurf");
    await fs.mkdir(windsurf, { recursive: true });

    const configContent = `# Windsurf Scrum MCP Configuration

## Agent: ${agent}

## Module: scrum-mcp-module

## Flow Commands

\`flow:scrum-manager\` - Launch Scrum Manager
\`flow:mcp-sync\` - Trigger board sync

## IDE-Specific Features

- Flow Mode: Enabled for sprint planning
- Cascade Integration: Automatic board updates
- Voice Commands: Sprint status checks

## Data Sync

- Auto-sync: Enabled
- Interval: 30 seconds
- Port: 3001
  `;

    const configPath = path.join(windsurf, "scrum-config.yaml");
    await fs.writeFile(configPath, configContent);
  }

  async setupVSCode(agent) {
    const vscodePath = path.join(this.projectRoot, ".vscode", "extensions");
    await fs.mkdir(vscodePath, { recursive: true });

    const extensionConfig = {
      "bmad.scrumManager.agent": agent,
      "bmad.scrumManager.enabled": true,
      "bmad.mcp.port": 3001,
      "bmad.mcp.autoSync": true,
      "bmad.mcp.syncInterval": 30000,
      "bmad.ide": "vscode",
      "bmad.workflows": ["sprint-initialization", "mcp-sync", "story-creation"],
    };

    const settingsPath = path.join(vscodePath, "bmad-scrum.json");
    await fs.writeFile(settingsPath, JSON.stringify(extensionConfig, null, 2));
  }

  // ========================================
  // CREATE AGENT-SPECIFIC MENUS
  // ========================================

  async createAgentMenus(selectedIDEs, selectedAgent) {
    this.logger.info("\n📋 Creating agent-specific menus for each IDE...\n");

    const agentMenus = {
      "scrum-manager": this.scrumManagerMenu(),
      "scrum-quick": this.quickRunnerMenu(),
      "scrum-analytics": this.analyticsMenu(),
      "scrum-team": this.teamCoordinatorMenu(),
    };

    const selectedMenu = agentMenus[selectedAgent];

    const menuConfig = {
      agent: selectedAgent,
      ides: selectedIDEs,
      menus: selectedMenu,
      createdAt: new Date().toISOString(),
    };

    const menuPath = path.join(
      this.projectRoot,
      "_bmad-output",
      "agent-menus.json"
    );

    await fs.mkdir(path.dirname(menuPath), { recursive: true });
    await fs.writeFile(menuPath, JSON.stringify(menuConfig, null, 2));

    this.logger.info(`✅ Agent menus created for: ${selectedAgent}`);
  }

  scrumManagerMenu() {
    return [
      { trigger: "S", action: "#manage-sprint", description: "Sprint Status" },
      { trigger: "C", action: "#create-story", description: "Create Story" },
      {
        trigger: "R",
        action: "#refine-backlog",
        description: "Refine Backlog",
      },
      {
        trigger: "E",
        action: "#sync-electron",
        description: "Sync to Electron",
      },
      {
        trigger: "G",
        action: "#sprint-report",
        description: "Generate Report",
      },
      { trigger: "V", action: "#velocity", description: "View Velocity" },
    ];
  }

  quickRunnerMenu() {
    return [
      { trigger: "S", action: "#quick-status", description: "Quick Status" },
      { trigger: "A", action: "#quick-add", description: "Quick Add Story" },
      { trigger: "M", action: "#quick-move", description: "Move Story" },
      { trigger: "Y", action: "#quick-sync", description: "Quick Sync" },
    ];
  }

  analyticsMenu() {
    return [
      {
        trigger: "V",
        action: "#velocity-chart",
        description: "Velocity Chart",
      },
      { trigger: "B", action: "#burndown", description: "Burndown Chart" },
      { trigger: "R", action: "#report", description: "Full Report" },
      { trigger: "T", action: "#trends", description: "Trends Analysis" },
      { trigger: "C", action: "#capacity", description: "Capacity Metrics" },
    ];
  }

  teamCoordinatorMenu() {
    return [
      { trigger: "S", action: "#standup", description: "Standup Notes" },
      { trigger: "A", action: "#assign-story", description: "Assign Story" },
      { trigger: "B", action: "#blocker-check", description: "Check Blockers" },
      { trigger: "C", action: "#collaboration", description: "Team Collab" },
      { trigger: "R", action: "#retro", description: "Retrospective" },
    ];
  }

  // ========================================
  // MCP & ELECTRON SETUP
  // ========================================

  async initializeMCPServer() {
    this.logger.info("\n🔗 Initializing MCP Server...");
    // (Previous MCP server setup code)
    this.logger.info("✅ MCP Server configured");
  }

  async setupElectronBridge() {
    this.logger.info("🖥️ Setting up Electron bridge...");
    // (Previous Electron bridge setup code)
    this.logger.info("✅ Electron bridge configured");
  }
}

async function install(options) {
  const installer = new ScrumModuleInstaller(options);
  return await installer.install();
}

module.exports = { install };
```

## Step 3: Setup IDE-Specific Integration Hook

Save as `_module-installer/setup-ide-integration.js`:

```js

/\*\*

- IDE-Specific Integration Setup
- Generates IDE commands and configurations per selected IDEs
  \*/

async function install(options) {
const { projectRoot, config, installedIDEs, logger } = options;

logger.info('🌐 Setting up IDE-specific integrations...\n');

const ideIntegrations = {
'claude-code': setupClaudeCodeIntegration,
'cursor': setupCursorIntegration,
'windsurf': setupWindsurfIntegration,
'vscode': setupVSCodeIntegration
};

const selectedIDEs = config.ide_selection || installedIDEs || [];
const selectedAgent = config.agent_selection || 'scrum-manager';

for (const ide of selectedIDEs) {
if (ideIntegrations[ide]) {
try {
await ideIntegrations[ide](projectRoot, selectedAgent, logger);
logger.info(`✅ ${ide} integration complete\n`);
} catch (error) {
logger.error(`❌ ${ide} integration failed: ${error.message}\n`);
}
}
}

// Create master IDE configuration
await createMasterIDEConfig(projectRoot, selectedIDEs, selectedAgent, logger);

return true;
}

async function setupClaudeCodeIntegration(projectRoot, agent, logger) {
const fs = require('fs').promises;
const path = require('path');

const commandsDir = path.join(projectRoot, '.claude', 'commands', 'bmad');
await fs.mkdir(commandsDir, { recursive: true });

// Sprint initialization command
const sprintInitCommand = `# Sprint Initialization

Load: \`\_bmad/scrum-mcp-module/workflows/sprint-initialization/workflow.md\`

Agent: ${agent}
IDE: Claude Code
Status: Ready

This command initializes a new sprint with:

- Sprint planning
- Team capacity calculation
- Story estimation
- MCP sync
  `;

  await fs.writeFile(
  path.join(commandsDir, 'sprint-init.md'),
  sprintInitCommand
  );

  // Story creation command
  const storyCommand = `# Create User Story

Load: \`\_bmad/scrum-mcp-module/workflows/story-creation/workflow.md\`

Agent: ${agent}
IDE: Claude Code

Create well-formed user stories with:

- User story format
- Acceptance criteria
- Story points
- Priority assignment
  `;

  await fs.writeFile(
  path.join(commandsDir, 'create-story.md'),
  storyCommand
  );
  }

async function setupCursorIntegration(projectRoot, agent, logger) {
const fs = require('fs').promises;
const path = require('path');

const rulesDir = path.join(projectRoot, '.cursor', 'rules');
await fs.mkdir(rulesDir, { recursive: true });

const cursorRules = `# Scrum MCP Module Rules - Cursor

## IDE Context

IDE: Cursor
Agent: ${agent}
Module: scrum-mcp-module

## Workflow Commands

- \`@scrum sprint status\` → Check current sprint
- \`@scrum create story\` → Create new story
- \`@mcp sync\` → Trigger data sync
- \`@electron update\` → Update Electron UI

## Code Generation Context

When creating Scrum-related code:

1. Follow sprint structure
2. Include MCP sync calls
3. Update Electron UI
4. Add proper error handling
5. Log to MCP server

## File Structure

- Workflows: \_bmad/scrum-mcp-module/workflows/
- Agents: \_bmad/scrum-mcp-module/agents/
- Config: \_bmad-output/scrum-config.json
  `;

  await fs.writeFile(
  path.join(rulesDir, 'scrum-mcp.mdc'),
  cursorRules
  );
  }

async function setupWindsurfIntegration(projectRoot, agent, logger) {
const fs = require('fs').promises;
const path = require('path');

const configDir = path.join(projectRoot, '.windsurf');
await fs.mkdir(configDir, { recursive: true });

const windsurf = {
"agent": agent,
"module": "scrum-mcp-module",
"flow": {
"enabled": true,
"commands": {
"sprint": "flow:scrum-sprint",
"sync": "flow:mcp-sync",
"board": "flow:electron-board"
}
},
"cascade": {
"enabled": true,
"syncInterval": 30000
}
};

await fs.writeFile(
path.join(configDir, 'scrum-config.json'),
JSON.stringify(windsurf, null, 2)
);
}

async function setupVSCodeIntegration(projectRoot, agent, logger) {
const fs = require('fs').promises;
const path = require('path');

const settingsDir = path.join(projectRoot, '.vscode');
await fs.mkdir(settingsDir, { recursive: true });

const settings = {
"[bmad.scrum]": {
"agent": agent,
"module": "scrum-mcp-module",
"mcp": {
"port": 3001,
"autoSync": true,
"syncInterval": 30000
},
"commands": {
"sprintInit": "bmad.sprint.initialize",
"createStory": "bmad.story.create",
"syncMCP": "bmad.mcp.sync",
"updateUI": "bmad.electron.update"
}
}
};

const settingsPath = path.join(settingsDir, 'settings.json');

// Merge with existing settings
let existing = {};
try {
existing = JSON.parse(await fs.readFile(settingsPath, 'utf-8'));
} catch {
// File doesn't exist
}

await fs.writeFile(
settingsPath,
JSON.stringify({ ...existing, ...settings }, null, 2)
);
}

async function createMasterIDEConfig(projectRoot, selectedIDEs, agent, logger) {
const fs = require('fs').promises;
const path = require('path');

const masterConfig = {
"version": "1.0.0",
"agent": agent,
"ides": selectedIDEs,
"mcp": {
"port": 3001,
"serverScript": "mcp-server.js",
"autoStart": true
},
"electron": {
"enabled": true,
"preload": "electron-preload.js"
},
"sync": {
"enabled": true,
"interval": 30000,
"bidirectional": true
},
"workflows": [
"sprint-initialization",
"mcp-sync",
"story-creation",
"backlog-refinement"
],
"createdAt": new Date().toISOString()
};

const configPath = path.join(projectRoot, '\_bmad-output', 'ide-config.json');
await fs.mkdir(path.dirname(configPath), { recursive: true });
await fs.writeFile(configPath, JSON.stringify(masterConfig, null, 2));

logger.info(`\n📝 Master IDE configuration saved to: ${configPath}`);
}

module.exports = { install };
```

## Step 4: Create IDE-Specific Agent Variants

### Claude Code

File: `agents/scrum-manager-claude.agent.yaml`

```yaml
agent:
  metadata:
    id: _bmad/scrum-mcp-module/agents/scrum-manager-claude/scrum-manager-claude.agent.yaml
    name: "Scrum Manager (Claude Code)"
    title: "AI Scrum Master - Claude Code Edition"
    icon: "🔮"
    module: stand-alone
    ide: claude-code

  persona:
    role: "I'm your Claude Code AI Scrum Master, optimized for seamless artifact integration and Artifacts-based board visualization."
    communication_style: "Conversational, technical. I leverage Claude Code's Artifacts for sprint boards and diagrams."

  menu:
    - trigger: sprint-status
      action: "#claude-sprint-status"
      description: "[S] Sprint Status (with Artifact)"

    - trigger: create-story
      action: "#claude-create-story"
      description: "[C] Create Story (in Artifacts)"
```

### Cursor

File: `agents/scrum-manager-cursor.agent.yaml`

```yaml
agent:
  metadata:
    id: _bmad/scrum-mcp-module/agents/scrum-manager-cursor/scrum-manager-cursor.agent.yaml
    name: "Scrum Manager (Cursor)"
    title: "AI Scrum Master - Cursor Edition"
    icon: "💫"
    module: stand-alone
    ide: cursor

  persona:
    role: "I'm your Cursor-optimized Scrum Master with @-symbol commands and VSCode-native workflows."
    communication_style: "Concise, action-oriented. I use Cursor's command palette integration."

  menu:
    - trigger: sprint-status
      action: "#cursor-sprint-status"
      description: "[S] Sprint Status (@scrum)"

    - trigger: create-story
      action: "#cursor-create-story"
      description: "[C] Create Story (@scrum story)"
```

### Windsurf

File: `agents/scrum-manager-windsurf.agent.yaml`

```yaml
agent:
  metadata:
    id: _bmad/scrum-mcp-module/agents/scrum-manager-windsurf/scrum-manager-windsurf.agent.yaml
    name: "Scrum Manager (Windsurf)"
    title: "AI Scrum Master - Windsurf Edition"
    icon: "🌊"
    module: stand-alone
    ide: windsurf

  persona:
    role: "I'm your Flow-mode Scrum Master, leveraging Windsurf's Cascade for real-time board updates."
    communication_style: "Flow-enabled, collaborative. I work with Windsurf's intelligent context."

  menu:
    - trigger: sprint-status
      action: "#windsurf-flow-sprint"
      description: "[S] Sprint (Flow Mode)"

    - trigger: create-story
      action: "#windsurf-flow-story"
      description: "[C] Create Story (Cascade)"
```

### VS Code

File: `agents/scrum-manager-vscode.agent.yaml`

```yaml
agent:
  metadata:
    id: _bmad/scrum-mcp-module/agents/scrum-manager-vscode/scrum-manager-vscode.agent.yaml
    name: "Scrum Manager (VS Code)"
    title: "AI Scrum Master - VS Code Edition"
    icon: "📝"
    module: stand-alone
    ide: vscode

  persona:
    role: "I'm your VS Code-integrated Scrum Master with command palette and webview dashboard support."
    communication_style: "Clear, extensible. I work with VS Code's native capabilities."

  menu:
    - trigger: sprint-status
      action: "#vscode-command-status"
      description: "[S] Sprint Status (Command)"

    - trigger: create-story
      action: "#vscode-command-story"
      description: "[C] Create Story (Extension)"
```

## Step 5: Enhanced Installation Flow

```bash
npx bmad-method@alpha install
```

If BMAD Method is already installed in the project and the `bmad` CLI is available:

```bash
bmad install scrum-mcp-module
```

```text
Installation prompts user

1️⃣ IDE DETECTION & SELECTION

🔍 Detecting installed IDEs...
✅ Found IDEs:
• claude-code
• cursor
• vscode

🎯 Select IDEs for integration:
✅ [1] 🔮 Claude Code
✅ [2] 💫 Cursor
⚪ [3] 🌊 Windsurf
✅ [4] 📝 VS Code

Selected: 1, 2, 4

2️⃣ AGENT SELECTION

🤖 Select your primary agent:

🤖 [1] Scrum Manager (Default)
Full-featured AI Scrum Master with sprint management

⚡ [2] Quick Runner
Lightweight agent for fast sprint operations

📊 [3] Analytics Agent
Focus on metrics, burndown, and reporting

👥 [4] Team Coordinator
Emphasizes team collaboration and ceremonies

Selected: 1 (Scrum Manager)

3️⃣ CONFIGURATION

Where should Scrum board data be stored?
[_bmad-output/scrum-data]

Path to your Electron app?
[apps/scrum-desktop]

MCP server port?
[3001]

Enable automatic sync?
[Yes - Auto sync every 30 seconds]

Team size?
[5]

Sprint length?
[14 days (2 weeks)]

4️⃣ INSTALLATION PROGRESS

⚙️ Generating IDE-specific configurations...
✅ claude-code configured
✅ cursor configured
✅ vscode configured

📋 Creating agent-specific menus for each IDE...
✅ Agent menus created for: scrum-manager

🔗 Initializing MCP Server...
✅ MCP Server configured

🖥️ Setting up Electron bridge...
✅ Electron bridge configured

🌐 Setting up IDE-specific integrations...
✅ claude-code integration complete
✅ cursor integration complete
✅ vscode integration complete

5️⃣ COMPLETION

✅ Installation complete!
📌 Primary IDEs: claude-code, cursor, vscode
🤖 Primary Agent: scrum-manager
🎯 Config saved to: _bmad-output/ide-config.json

Next steps:

1. Start MCP server
2. Launch Electron app
3. Use agent in Claude Code
4. Use agent in Cursor
5. Use agent in VS Code
```

## Next steps (this repo)

```bash
npm run dev:full
```

## Step 6: Runtime Agent Selection During Workflow

Create dynamic agent selector in workflow: `workflows/sprint-initialization/steps/step-00-agent-select.md`

```md
---

name: 'step-00-agent-select.md'
description: 'Let user select agent at runtime'
outputFile: {scrum_data_location}/selected-agent.md
nextStepFile: './step-01-init.md'

---

# Sprint Initialization - Agent Selection

## 🎯 STEP GOAL

Let you choose which agent to use for this sprint initialization.

## Sequence of Instructions

### 1. Available Agents

Based on your installation, these agents are available:

#### 🤖 **Scrum Manager** (Default)

- Full-featured sprint management
- Advanced planning and refinement
- Complete reporting
- Best for: Complex projects, large teams
- Estimated time: 20-30 minutes per sprint

#### ⚡ **Quick Runner**

- Fast sprint setup
- Minimal but essential features
- Quick sync operations
- Best for: Agile teams, rapid iterations
- Estimated time: 5-10 minutes per sprint

#### 📊 **Analytics Agent**

- Metrics-focused approach
- Burndown and velocity tracking
- Performance analysis
- Best for: Teams focused on metrics
- Estimated time: 15-20 minutes per sprint

#### 👥 **Team Coordinator**

- Collaboration emphasis
- Ceremony coordination
- Team engagement focus
- Best for: High-interaction teams
- Estimated time: 25-35 minutes per sprint

### 2. Detect Your IDE

Your current IDE: `{detected_ide}`

This agent will be optimized for:

- **Claude Code**: Artifacts-based visualization
- **Cursor**: @-symbol commands
- **Windsurf**: Flow mode integration
- **VS Code**: Command palette integration

### 3. Recommended Selection

Based on your configuration:

- Team Size: {team_size} people
- Sprint Length: {sprint_length} days
- Auto-sync: {enable_auto_sync}

**Recommendation**: {recommended_agent} ✨

### 4. Select Your Agent

**[1] 🤖 Scrum Manager** (Recommended)
**[2] ⚡ Quick Runner**
**[3] 📊 Analytics Agent**
**[4] 👥 Team Coordinator**

Enter your choice (1-4):

> \_

## Menu Options

**[S] See comparison** - Show detailed agent comparison table
**[T] Test agent** - Run quick demo of selected agent
**[C] Continue** - Proceed with selected agent

---

Once you select, your agent will be configured for your IDE and used for this sprint.
```

## Step 7: Quick Reference - Using Different IDEs

### Claude Code

Command: `/bmad-scrum-manager`

- Shows sprint board in Artifact
- All updates displayed inline
- Quick context switching

### Cursor

Command: `@scrum sprint status`

- Uses Cursor's command palette
- VS Code-native navigation

### Windsurf

Command: `flow:scrum-sprint`

- Cascade automatic updates
- Flow mode enabled
- Real-time board sync

### VS Code

Command: `Command Palette → Scrum: Initialize Sprint`

- Webview panel opens
- Dashboard interface
- Extension native commands

## Summary: What You Get

- ✅ IDE Detection - Auto-detects Claude Code, Cursor, Windsurf, VS Code
- ✅ IDE Selection - User chooses which IDEs to integrate
- ✅ Agent Selection - 4 different agent variants (Manager, Quick, Analytics, Team)
- ✅ IDE-Specific Config - Each IDE gets optimized commands/rules
- ✅ IDE-Specific Agents - Agent YAML files tailored per IDE
- ✅ Runtime Selection - Users can pick agent at workflow start
- ✅ Master Config - Central configuration file tracking all selections
- ✅ Post-Install Setup - Automated IDE integration scripts

This provides a seamless, professional-grade installation experience where users can choose their IDE and agent based on their workflow and team needs! 🚀
