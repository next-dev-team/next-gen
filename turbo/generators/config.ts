import type { PlopTypes } from '@turbo/gen';
import path from 'node:path';

export default function generator(plop: PlopTypes.NodePlopAPI): void {
  (plop.setGenerator('tron-mini', {
    description: 'Scaffold a minimal Tron UI plugin (Hello Tron Mini)',
    prompts: [
      {
        type: 'input',
        name: 'pluginSlug',
        message: 'Workspace folder name (apps/<name>)',
        default: 'tron-mini',
      },
      {
        type: 'input',
        name: 'pluginName',
        message: 'Plugin display name',
        default: 'Hello Tron Mini',
      },
      {
        type: 'input',
        name: 'version',
        message: 'Plugin version',
        default: '0.1.0',
      },
      {
        type: 'input',
        name: 'port',
        message: 'Dev server port',
        default: '3002',
      },
      {
        type: 'input',
        name: 'previewPort',
        message: 'Preview server port',
        default: '3001',
      },
    ],
    actions: [
      function setPaths(answers: any) {
        const plopfileDir = plop.getPlopfilePath();
        const rootDir = path.dirname(path.dirname(plopfileDir));
        const base = path.resolve(plopfileDir, 'templates', 'tron-mini');
        const destBase = path.join(rootDir, 'apps');
        // expose to handlebars via answers
        (answers as any).templateBase = base;
        (answers as any).destBase = destBase;
        return `Templates: ${base} | Destination base: ${destBase}`;
      },
      {
        type: 'addMany',
        destination: '{{destBase}}/{{kebabCase pluginSlug}}',
        base: '{{templateBase}}',
        templateFiles: '{{templateBase}}/**/*',
      },
    ],
  }),
    // Generator 2: Agent Rules
    plop.setGenerator('agent-rules', {
      description: 'Generate AI agent rule files',
      prompts: [
        {
          type: 'checkbox',
          name: 'agents',
          message: 'Which agent rules do you want to generate?',
          choices: [
            { name: 'Agents (Base Rules)', value: 'AGENTS', checked: false },
            { name: 'Claude', value: 'CLAUDE', checked: false },
            { name: 'Gemini', value: 'GEMINI', checked: false },
            { name: 'Qwen', value: 'QWEN', checked: false },
            { name: 'Cline', value: 'CLINE', checked: false },
            { name: 'Cursor', value: 'CURSOR', checked: false },
            { name: 'Windsurf', value: 'WINDSURF', checked: false },
            { name: 'Trae', value: 'TRAE', checked: false },
            { name: 'Copilot', value: 'COPILOT', checked: false },
          ],
        },
      ],
      actions: (data: any) => {
        const actions = [];
        const agents = data.agents || [];

        if (agents.includes('AGENTS')) {
          actions.push({
            type: 'add',
            path: 'AGENTS.md',
            templateFile: 'templates/AGENTS.md.hbs',
            force: true,
            data: {
              examples: 'prototype/system/examples',
              PINOKIO_DOCUMENTATION: 'prototype/PINOKIO.md',
            },
          });
        }
        if (agents.includes('CLAUDE')) {
          actions.push({
            type: 'add',
            path: 'CLAUDE.md',
            templateFile: 'templates/AGENTS.md.hbs',
            force: true,
            data: {
              examples: 'prototype/system/examples',
              PINOKIO_DOCUMENTATION: 'prototype/PINOKIO.md',
            },
          });
        }
        if (agents.includes('GEMINI')) {
          actions.push({
            type: 'add',
            path: 'GEMINI.md',
            templateFile: 'templates/AGENTS.md.hbs',
            force: true,
            data: {
              examples: 'prototype/system/examples',
              PINOKIO_DOCUMENTATION: 'prototype/PINOKIO.md',
            },
          });
          actions.push({
            type: 'add',
            path: '.geminiignore',
            template: 'ENVIRONMENT\n!/logs\n!/GEMINI.md\n!/SPEC.md\n!/app\n!{{homedir}}',
            force: true,
            data: {
              homedir: '~',
            },
          });
        }
        if (agents.includes('QWEN')) {
          actions.push({
            type: 'add',
            path: 'QWEN.md',
            templateFile: 'templates/AGENTS.md.hbs',
            force: true,
            data: {
              examples: 'prototype/system/examples',
              PINOKIO_DOCUMENTATION: 'prototype/PINOKIO.md',
            },
          });
        }
        if (agents.includes('CLINE')) {
          actions.push({
            type: 'add',
            path: '.clinerules',
            templateFile: 'templates/AGENTS.md.hbs',
            force: true,
            data: {
              examples: 'prototype/system/examples',
              PINOKIO_DOCUMENTATION: 'prototype/PINOKIO.md',
            },
          });
        }
        if (agents.includes('CURSOR')) {
          actions.push({
            type: 'add',
            path: '.cursorrules',
            templateFile: 'templates/AGENTS.md.hbs',
            force: true,
            data: {
              examples: 'prototype/system/examples',
              PINOKIO_DOCUMENTATION: 'prototype/PINOKIO.md',
            },
          });
        }
        if (agents.includes('WINDSURF')) {
          actions.push({
            type: 'add',
            path: '.windsurfrules',
            templateFile: 'templates/AGENTS.md.hbs',
            force: true,
            data: {
              examples: 'prototype/system/examples',
              PINOKIO_DOCUMENTATION: 'prototype/PINOKIO.md',
            },
          });
        }
        if (agents.includes('TRAE')) {
          actions.push({
            type: 'add',
            path: '.trae/.traeignore',
            template: 'ENVIRONMENT\n!/logs\n!/AGENTS.md\n!/SPEC.md\n!/app\n!{{homedir}}',
            force: true,
            data: {
              homedir: '~',
            },
          });
          actions.push({
            type: 'add',
            path: '.trae/rule/main.md',
            templateFile: 'templates/AGENTS.md.hbs',
            force: true,
            data: {
              examples: 'prototype/system/examples',
              PINOKIO_DOCUMENTATION: 'prototype/PINOKIO.md',
            },
          });
        }
        if (agents.includes('COPILOT')) {
          actions.push({
            type: 'add',
            path: '.github/copilot-instructions.md',
            templateFile: 'templates/AGENTS.md.hbs',
            force: true,
            data: {
              examples: 'prototype/system/examples',
              PINOKIO_DOCUMENTATION: 'prototype/PINOKIO.md',
            },
          });
        }

        return actions;
      },
    }));
}
