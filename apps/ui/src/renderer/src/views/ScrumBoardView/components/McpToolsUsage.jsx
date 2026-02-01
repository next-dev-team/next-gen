/**
 * McpToolsUsage Component
 *
 * Shows MCP tool documentation and usage examples.
 * Allows users to select a tool and copy usage instructions.
 */

import * as React from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { MCP_KANBAN_TOOL_OPTIONS } from "../constants";
import { getMcpToolUsageText } from "../utils";

export default function McpToolsUsage({ activeBoard, projectRoot }) {
  const [toolId, setToolId] = React.useState("scrum_get_state");
  const [copied, setCopied] = React.useState(false);

  const toolMeta = React.useMemo(
    () => MCP_KANBAN_TOOL_OPTIONS.find((t) => t.id === toolId) || null,
    [toolId],
  );

  const usageText = React.useMemo(
    () => getMcpToolUsageText({ toolId, activeBoard, projectRoot }),
    [toolId, activeBoard, projectRoot],
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
    [usageText],
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
        </div>
      </div>

      <button
        type="button"
        className="mt-3 font-mono text-xs whitespace-pre-wrap break-words text-muted-foreground hover:text-primary cursor-pointer transition-colors text-left bg-transparent border-none p-0 w-full select-all"
        onClick={() => handleCopyUsage()}
        title="Click to copy usage"
      >
        {usageText}
      </button>
    </div>
  );
}
