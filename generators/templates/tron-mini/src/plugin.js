// Tron Plugin Entry (Hello Tron Mini)

const plugin = {
  manifest: {
    name: '{{pluginName}}',
    version: '{{version}}',
    description: 'Hello Tron Mini starter plugin',
    type: 'ui',
    permissions: ['storage'],
  },

  async initialize(api) {
    console.log('[{{pluginName}}] initialized');
    this.api = api;
  },

  async destroy() {
    console.log('[{{pluginName}}] destroyed');
  },
};

const hooks = {
  onPluginLoad: () => {
    console.log('[{{pluginName}}] onPluginLoad hook');
  },
  onPluginUnload: () => {
    console.log('[{{pluginName}}] onPluginUnload hook');
  },
};

// Basic API surface (extend as needed)
const api = {
  ping: async () => {
    return { ok: true, time: Date.now() };
  },
};

module.exports = { plugin, hooks, api, default: plugin };