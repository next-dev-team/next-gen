import { defineConfig } from "@kubb/core";
import { pluginClient } from "@kubb/plugin-client";
import { pluginOas } from "@kubb/plugin-oas";
import { pluginReactQuery } from "@kubb/plugin-react-query";
import { pluginTs } from "@kubb/plugin-ts";

export default defineConfig(() => {
  return {
    root: ".",
    input: {
      path: "https://triton.squid.wtf/openapi.json",
    },
    output: {
      path: "./src/gen",
      clean: true,
    },
    plugins: [
      pluginOas({}),
      pluginTs({ output: { path: "types" } }),
      pluginClient({
        output: { path: "client" },
        client: "axios",
        baseURL: "https://triton.squid.wtf",
      }),
      pluginReactQuery({ output: { path: "hooks" } }),
    ],
  };
});
