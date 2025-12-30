import React, { useMemo, useState } from "react";
import {
  Code,
  Copy,
  Check,
  Terminal,
  ChevronDown,
  ChevronRight,
  FileCode2,
  Clipboard,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { ScrollArea } from "../../ui/scroll-area";
import { Separator } from "../../ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../ui/collapsible";
import { useEditorStore } from "../../../stores/editorStore";
import {
  generateElementCode,
  copyToClipboard,
} from "../../../utils/codeGenerator";
import { getComponentById as getShadcnComponent } from "../../../data/shadcnComponents";
import { getBlockById } from "../../../data/blocks";

// Syntax highlighting styles
const syntaxStyles = {
  keyword: "text-purple-400",
  component: "text-blue-400",
  string: "text-green-400",
  prop: "text-orange-400",
  punctuation: "text-gray-400",
  number: "text-yellow-400",
};

// Simple syntax highlighter for JSX
function highlightJsx(code) {
  if (!code) return null;

  // Very basic highlighting - replace with actual highlighter in production
  return code
    .replace(
      /import|from|export|default|function|const|let|return/g,
      (m) => `<span class="${syntaxStyles.keyword}">${m}</span>`
    )
    .replace(
      /<(\w+)/g,
      (m, p1) => `&lt;<span class="${syntaxStyles.component}">${p1}</span>`
    )
    .replace(
      /"([^"]+)"/g,
      (m, p1) => `<span class="${syntaxStyles.string}">"${p1}"</span>`
    )
    .replace(
      /(\w+)=/g,
      (m, p1) => `<span class="${syntaxStyles.prop}">${p1}</span>=`
    );
}

// Code block with copy button
function CodeBlock({ code, language = "jsx", title, showLineNumbers = false }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(code);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const lines = code.split("\n");

  return (
    <div className="rounded-md border bg-[#0d1117] overflow-hidden">
      {title && (
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#30363d] bg-[#161b22]">
          <div className="flex items-center gap-2">
            <FileCode2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{title}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs gap-1"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-green-500" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy
              </>
            )}
          </Button>
        </div>
      )}
      <ScrollArea className="max-h-[200px]">
        <pre className="p-3 text-[11px] font-mono leading-relaxed text-[#c9d1d9] overflow-x-auto">
          {showLineNumbers ? (
            <table className="w-full">
              <tbody>
                {lines.map((line, i) => (
                  <tr key={i} className="hover:bg-[#161b22]">
                    <td className="pr-4 text-[#6e7681] select-none text-right w-8">
                      {i + 1}
                    </td>
                    <td className="whitespace-pre">{line}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <code className="whitespace-pre-wrap">{code}</code>
          )}
        </pre>
      </ScrollArea>
    </div>
  );
}

// CLI command block
function CliBlock({ command }) {
  const [copied, setCopied] = useState(false);

  if (!command) return null;

  const handleCopy = async () => {
    const success = await copyToClipboard(command);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="rounded-md border bg-[#0d1117] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#30363d] bg-[#161b22]">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">CLI Command</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs gap-1"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-green-500" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </Button>
      </div>
      <pre className="p-3 text-[11px] font-mono text-green-400 overflow-x-auto">
        <code>$ {command}</code>
      </pre>
    </div>
  );
}

// Quick install section
function QuickInstall({ componentId, componentDef }) {
  const [showAll, setShowAll] = useState(false);
  const cliCommand = componentDef?.cli || "";

  if (!cliCommand) return null;

  // Parse the CLI command to extract component names
  const components = cliCommand
    .replace("npx shadcn@latest add ", "")
    .split(" ")
    .filter(Boolean);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-yellow-500" />
          Quick Install
        </span>
        <Badge variant="secondary" className="text-[10px]">
          {components.length} component{components.length > 1 ? "s" : ""}
        </Badge>
      </div>
      <CliBlock command={cliCommand} />
      {components.length > 1 && (
        <div className="flex flex-wrap gap-1">
          {components.map((comp) => (
            <Badge key={comp} variant="outline" className="text-[10px]">
              {comp}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// Main Inspector Panel component
export function InspectorPanel() {
  const [codeExpanded, setCodeExpanded] = useState(true);
  const [cliExpanded, setCliExpanded] = useState(true);

  // Store state
  const selectedIds = useEditorStore((s) => s.canvas.selectedIds);
  const getElementById = useEditorStore((s) => s.getElementById);

  // Get selected element
  const selectedElement = useMemo(() => {
    if (selectedIds.length !== 1) return null;
    return getElementById(selectedIds[0]);
  }, [selectedIds, getElementById]);

  // Get component/block definition
  const componentDef = useMemo(() => {
    if (!selectedElement) return null;
    return (
      getShadcnComponent(selectedElement.type) ||
      getBlockById(selectedElement.type) ||
      null
    );
  }, [selectedElement]);

  // Generate code
  const elementCode = useMemo(() => {
    if (!selectedElement) return "";
    return generateElementCode(selectedElement);
  }, [selectedElement]);

  // No selection state
  if (!selectedElement) {
    return (
      <div className="p-4 text-center">
        <Code className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
        <p className="text-xs text-muted-foreground">
          Select an element to inspect
        </p>
        <p className="text-[10px] text-muted-foreground/70 mt-1">
          View code and CLI commands
        </p>
      </div>
    );
  }

  // Format component name
  const displayName = selectedElement.type
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");

  return (
    <div className="space-y-4">
      {/* Component header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
            <Code className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="font-medium text-sm">{displayName}</div>
            <div className="text-[10px] text-muted-foreground font-mono">
              {selectedElement.type}
            </div>
          </div>
        </div>
        {componentDef?.cli && (
          <Badge variant="secondary" className="text-[10px]">
            shadcn/ui
          </Badge>
        )}
      </div>

      <Separator />

      {/* Quick Install */}
      {componentDef && (
        <QuickInstall
          componentId={selectedElement.type}
          componentDef={componentDef}
        />
      )}

      {/* Generated Code */}
      <Collapsible open={codeExpanded} onOpenChange={setCodeExpanded}>
        <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-medium hover:text-primary transition-colors">
          <span className="flex items-center gap-1.5">
            <FileCode2 className="h-3 w-3" />
            Component Code
          </span>
          {codeExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <CodeBlock
            code={elementCode}
            title={`${displayName}.jsx`}
            showLineNumbers
          />
        </CollapsibleContent>
      </Collapsible>

      {/* Dependencies info */}
      {componentDef?.propSchema &&
        Object.keys(componentDef.propSchema).length > 0 && (
          <>
            <Separator />
            <div className="text-xs text-muted-foreground">
              <strong className="text-foreground">Props:</strong>{" "}
              {Object.keys(componentDef.propSchema).join(", ")}
            </div>
          </>
        )}

      {/* Documentation link */}
      {componentDef && (
        <>
          <Separator />
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs gap-2"
            onClick={() => {
              const url = `https://ui.shadcn.com/docs/components/${selectedElement.type}`;
              window.open(url, "_blank");
            }}
          >
            <ExternalLink className="h-3 w-3" />
            View Documentation
          </Button>
        </>
      )}
    </div>
  );
}
