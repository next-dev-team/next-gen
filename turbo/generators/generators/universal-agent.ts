import type { PlopTypes } from "@turbo/gen";
import * as fs from "fs";
import * as path from "path";

// Agent configuration mapping
const agentConfig = {
  antigravity: {
    path: ".agent/skills",
    native: true,
  },
  "claude-code": {
    path: ".claude/skills",
    native: true,
  },
  "gemini-cli": {
    path: ".gemini/skills",
    native: true,
  },
  cursor: {
    path: ".cursor/rules",
    native: false,
  },
  trae: {
    path: ".trae/rules",
    native: false,
    needsSymlink: true,
  },
  windsurf: {
    path: ".windsurf/rules",
    native: false,
  },
  copilot: {
    path: ".github",
    native: false,
  },
  aider: {
    path: "",
    native: true,
  },
  opencode: {
    path: ".opencode/rules",
    native: true,
  },
};

export default function universalAgentGenerator(
  plop: PlopTypes.NodePlopAPI
): void {
  plop.setGenerator("universal-agent", {
    description:
      "🤖 Universal Agent Skills - Configure AI agents with SKILL.md & AGENTS.md standards",
    prompts: [],
    actions: (data: any) => {
      const actions: PlopTypes.ActionType[] = [];
      const destination = data.destination || ".";
      const projectName = data.projectName || "my-project";
      const agents = data.agents || ["antigravity", "cursor"];
      const skills = data.skills || [];
      let options = data.options || ["clone-skills", "setup-script"];
      
      // Debug: Log incoming data
      console.log("🔍 [DEBUG] Received data.options:", JSON.stringify(data.options));
      console.log("🔍 [DEBUG] Options after default:", JSON.stringify(options));
      
      // If run-setup is selected, ensure setup-script is also enabled
      if (options.includes("run-setup") && !options.includes("setup-script")) {
        options = [...options, "setup-script"];
        console.log("ℹ️  Auto-enabling 'setup-script' since 'run-setup' is selected");
      }
      
      console.log("🔍 [DEBUG] Final options:", JSON.stringify(options));
      console.log("🔍 [DEBUG] Will create setup-script:", options.includes("setup-script"));

      // Generate skill list for AGENTS.md
      const skillsList = skills
        .map((s: string) => `- **${s}**: Installed from antigravity-awesome-skills`)
        .join("\n");

      // 1. Always create AGENTS.md
      actions.push({
        type: "add",
        path: `${destination}/AGENTS.md`,
        templateFile: "templates/universal-agent/AGENTS.md.hbs",
        force: true,
        data: {
          projectName,
          generatedDate: new Date().toISOString().split("T")[0],
          skillsCount: skills.length,
          skillsList: skillsList || "No skills installed yet",
          agentsList: agents.join(", "),
        },
      });

      // 2. Create .agent/skills directory
      actions.push({
        type: "add",
        path: `${destination}/.agent/skills/.gitkeep`,
        template: "",
        force: true,
      });

      // 3. Configure each selected agent
      if (agents.includes("cursor")) {
        actions.push({
          type: "add",
          path: `${destination}/.cursor/rules/universal.mdc`,
          templateFile: "templates/universal-agent/cursor-rules.mdc.hbs",
          force: true,
          data: { projectName, skillsList },
        });
      }

      if (agents.includes("trae")) {
        actions.push({
          type: "add",
          path: `${destination}/.trae/rules/.gitkeep`,
          template: "",
          force: true,
        });
        actions.push({
          type: "add",
          path: `${destination}/.trae/skills/.gitkeep`,
          template: "",
          force: true,
        });
      }

      if (agents.includes("copilot")) {
        actions.push({
          type: "add",
          path: `${destination}/.github/copilot-instructions.md`,
          templateFile: "templates/universal-agent/copilot-instructions.md.hbs",
          force: true,
          data: { projectName, skillsList },
        });
      }

      if (agents.includes("gemini-cli")) {
        actions.push({
          type: "add",
          path: `${destination}/.gemini/skills/.gitkeep`,
          template: "",
          force: true,
        });
      }

      if (agents.includes("windsurf")) {
        actions.push({
          type: "add",
          path: `${destination}/.windsurf/rules/universal.md`,
          templateFile: "templates/universal-agent/windsurf-rules.md.hbs",
          force: true,
          data: { projectName, skillsList },
        });
      }

      // 4. Generate setup script if requested
      if (options.includes("setup-script")) {
        actions.push({
          type: "add",
          path: `${destination}/setup-agents.sh`,
          templateFile: "templates/universal-agent/setup-agents.sh.hbs",
          force: true,
          data: {
            projectName,
            agents,
            skills,
            cloneSkills: options.includes("clone-skills"),
            createSymlinks: options.includes("symlinks"),
            initGit: options.includes("git-init"),
          },
        });

        // Windows batch script
        actions.push({
          type: "add",
          path: `${destination}/setup-agents.bat`,
          templateFile: "templates/universal-agent/setup-agents.bat.hbs",
          force: true,
          data: {
            projectName,
            agents,
            skills,
            cloneSkills: options.includes("clone-skills"),
          },
        });
      }

      // 5. Create README for the agent setup
      actions.push({
        type: "add",
        path: `${destination}/.agent/README.md`,
        templateFile: "templates/universal-agent/agent-readme.md.hbs",
        force: true,
        data: {
          projectName,
          agents,
          skills,
        },
      });

      // 6. Run setup if requested
      if (options.includes("run-setup")) {
        actions.push(async (answers: any) => {
          const { exec } = require("child_process");
          const dest = path.resolve(process.cwd(), answers.destination || ".");
          const isWin = process.platform === "win32";
          const scriptName = isWin ? "setup-agents.bat" : "setup-agents.sh";
          const scriptPath = path.join(dest, scriptName);
          const cmd = isWin ? `"${scriptName}"` : `bash "${scriptName}"`;

          console.log(`\n🔄 Running auto-setup in ${dest}...`);

          // Wait for file to be written with retry logic (up to 5 seconds)
          const maxRetries = 10;
          let retries = 0;
          while (!fs.existsSync(scriptPath) && retries < maxRetries) {
            console.log(`⏳ Waiting for setup script to be created... (${retries + 1}/${maxRetries})`);
            await new Promise((r) => setTimeout(r, 500));
            retries++;
          }

          // Ensure script exists
          if (!fs.existsSync(scriptPath)) {
            throw new Error(`Setup script not found after ${maxRetries} retries: ${scriptPath}`);
          }

          console.log(`✓ Found setup script at: ${scriptPath}`);

          // Make executable on non-Windows
          if (!isWin) {
            try {
              fs.chmodSync(scriptPath, "755");
            } catch (e) {
              console.warn("Failed to chmod script:", e);
            }
          }

          return new Promise((resolve, reject) => {
            exec(
              cmd,
              { cwd: dest, shell: true },
              (err: any, stdout: string, stderr: string) => {
                if (stdout) console.log(stdout);
                if (stderr) console.error(stderr);

                if (err) {
                  reject(`Setup failed: ${err.message}`);
                  return;
                }
                resolve("✅ Setup completed successfully");
              }
            );
          });
        });
      }

      return actions;
    },
  });
}
