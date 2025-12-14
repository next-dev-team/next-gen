import type { PlopTypes } from "@turbo/gen";

export default function agentRulesGenerator(plop: PlopTypes.NodePlopAPI): void {
  plop.setGenerator("agent-rules", {
    description: "Generate AI agent rule files",
    prompts: [
      {
        type: "checkbox",
        name: "agents",
        message: "Which agent rules do you want to generate?",
        choices: [
          { name: "Agents (Base Rules)", value: "AGENTS", checked: false },
          { name: "Trae", value: "TRAE", checked: false },
          { name: "Claude", value: "CLAUDE", checked: false },
          { name: "Gemini", value: "GEMINI", checked: false },
          { name: "Qwen", value: "QWEN", checked: false },
          { name: "Cline", value: "CLINE", checked: false },
          { name: "Cursor", value: "CURSOR", checked: false },
          { name: "Windsurf", value: "WINDSURF", checked: false },
          { name: "Copilot", value: "COPILOT", checked: false },
        ],
      },
    ],
    actions: (data: any) => {
      const actions = [];
      const agents = data.agents || [];

      if (agents.includes("AGENTS")) {
        actions.push({
          type: "add",
          path: "AGENTS.md",
          templateFile: "templates/AGENTS.md.hbs",
          force: true,
          data: {
            examples: "prototype/system/examples",
            PINOKIO_DOCUMENTATION: "prototype/PINOKIO.md",
          },
        });
      }
      if (agents.includes("CLAUDE")) {
        actions.push({
          type: "add",
          path: "CLAUDE.md",
          templateFile: "templates/AGENTS.md.hbs",
          force: true,
          data: {
            examples: "prototype/system/examples",
            PINOKIO_DOCUMENTATION: "prototype/PINOKIO.md",
          },
        });
      }
      if (agents.includes("GEMINI")) {
        actions.push({
          type: "add",
          path: "GEMINI.md",
          templateFile: "templates/AGENTS.md.hbs",
          force: true,
          data: {
            examples: "prototype/system/examples",
            PINOKIO_DOCUMENTATION: "prototype/PINOKIO.md",
          },
        });
        actions.push({
          type: "add",
          path: ".geminiignore",
          template:
            "ENVIRONMENT\n!/logs\n!/GEMINI.md\n!/SPEC.md\n!/app\n!{{homedir}}",
          force: true,
          data: {
            homedir: "~",
          },
        });
      }
      if (agents.includes("QWEN")) {
        actions.push({
          type: "add",
          path: "QWEN.md",
          templateFile: "templates/AGENTS.md.hbs",
          force: true,
          data: {
            examples: "prototype/system/examples",
            PINOKIO_DOCUMENTATION: "prototype/PINOKIO.md",
          },
        });
      }
      if (agents.includes("CLINE")) {
        actions.push({
          type: "add",
          path: ".clinerules",
          templateFile: "templates/AGENTS.md.hbs",
          force: true,
          data: {
            examples: "prototype/system/examples",
            PINOKIO_DOCUMENTATION: "prototype/PINOKIO.md",
          },
        });
      }
      if (agents.includes("CURSOR")) {
        actions.push({
          type: "add",
          path: ".cursorrules",
          templateFile: "templates/AGENTS.md.hbs",
          force: true,
          data: {
            examples: "prototype/system/examples",
            PINOKIO_DOCUMENTATION: "prototype/PINOKIO.md",
          },
        });
      }
      if (agents.includes("WINDSURF")) {
        actions.push({
          type: "add",
          path: ".windsurfrules",
          templateFile: "templates/AGENTS.md.hbs",
          force: true,
          data: {
            examples: "prototype/system/examples",
            PINOKIO_DOCUMENTATION: "prototype/PINOKIO.md",
          },
        });
      }
      if (agents.includes("TRAE")) {
        actions.push({
          type: "add",
          path: ".trae/.traeignore",
          template:
            "ENVIRONMENT\n!/logs\n!/AGENTS.md\n!/SPEC.md\n!/app\n!{{homedir}}",
          force: true,
          data: {
            homedir: "~",
          },
        });
        actions.push({
          type: "add",
          path: ".trae/rule/main.md",
          templateFile: "templates/AGENTS.md.hbs",
          force: true,
          data: {
            examples: "prototype/system/examples",
            PINOKIO_DOCUMENTATION: "prototype/PINOKIO.md",
          },
        });
      }
      if (agents.includes("COPILOT")) {
        actions.push({
          type: "add",
          path: ".github/copilot-instructions.md",
          templateFile: "templates/AGENTS.md.hbs",
          force: true,
          data: {
            examples: "prototype/system/examples",
            PINOKIO_DOCUMENTATION: "prototype/PINOKIO.md",
          },
        });
      }

      return actions;
    },
  });
}
