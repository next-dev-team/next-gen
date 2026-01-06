import React, { useMemo, useState } from "react";
import {
  Check,
  Copy,
  Download,
  FileCode,
  Terminal,
  ArrowRight,
  Sparkles,
  Code2,
  Box,
  Folder,
  ExternalLink,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../ui/tabs";
import { ScrollArea } from "../../ui/scroll-area";
import { Badge } from "../../ui/badge";
import { Separator } from "../../ui/separator";
import { Switch } from "../../ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { useEditorStore } from "../../../stores/editorStore";
import {
  generatePageCode,
  generateElementCode,
  copyToClipboard,
} from "../../../utils/codeGenerator";
import { getComponentById as getShadcnComponent } from "../../../data/shadcnComponents";
import { getBlockById } from "../../../data/blocks";

// Framework configurations
const frameworks = [
  {
    id: "react",
    name: "React",
    icon: "⚛️",
    description: "Standard React with Vite or CRA",
    importPath: "@/components/ui",
    fileExtension: ".jsx",
  },
  {
    id: "nextjs",
    name: "Next.js",
    icon: "▲",
    description: "Next.js App Router or Pages",
    importPath: "@/components/ui",
    fileExtension: ".tsx",
  },
  {
    id: "remix",
    name: "Remix",
    icon: "💿",
    description: "Remix with React",
    importPath: "~/components/ui",
    fileExtension: ".tsx",
  },
  {
    id: "astro",
    name: "Astro",
    icon: "🚀",
    description: "Astro with React islands",
    importPath: "@/components/ui",
    fileExtension: ".astro",
  },
];

// Collect all unique components used
function collectUsedComponents(elements) {
  const used = new Set();

  const traverse = (els) => {
    els.forEach((el) => {
      const comp = getShadcnComponent(el.type);
      if (comp) {
        used.add(el.type);
      }
      const block = getBlockById(el.type);
      if (block) {
        used.add(el.type);
      }
      if (el.children) traverse(el.children);
    });
  };

  traverse(elements);
  return Array.from(used);
}

// Generate CLI command for all components
function generateCliCommand(componentTypes) {
  const shadcnComponents = [];

  componentTypes.forEach((type) => {
    const comp = getShadcnComponent(type);
    if (comp?.cli) {
      // Extract component names from CLI command
      const parts = comp.cli.replace("npx shadcn@latest add ", "").split(" ");
      parts.forEach((p) => shadcnComponents.push(p));
    }
    const block = getBlockById(type);
    if (block?.cli) {
      const parts = block.cli.replace("npx shadcn@latest add ", "").split(" ");
      parts.forEach((p) => shadcnComponents.push(p));
    }
  });

  // Dedupe
  const unique = [...new Set(shadcnComponents)];

  if (unique.length === 0) return "";
  return `npx shadcn@latest add ${unique.join(" ")}`;
}

// Code preview with line numbers
function CodePreview({ code, language = "jsx" }) {
  const lines = code.split("\n");

  return (
    <ScrollArea className="h-full">
      <pre className="p-4 text-[11px] font-mono leading-relaxed text-[#c9d1d9]">
        <table className="w-full">
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="hover:bg-[#161b22]">
                <td className="pr-4 text-[#6e7681] select-none text-right w-10 align-top">
                  {i + 1}
                </td>
                <td className="whitespace-pre">{line}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </pre>
    </ScrollArea>
  );
}

// CLI Section
function CliSection({ command }) {
  const [copied, setCopied] = useState(false);

  if (!command) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No shadcn/ui components to install</p>
      </div>
    );
  }

  const handleCopy = async () => {
    const success = await copyToClipboard(command);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Terminal className="h-4 w-4" />
        <span className="font-medium">Install Components</span>
      </div>

      <div className="rounded-md border bg-[#0d1117] overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#30363d] bg-[#161b22]">
          <span className="text-xs text-muted-foreground">Terminal</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs gap-1"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy
              </>
            )}
          </Button>
        </div>
        <pre className="p-4 text-sm font-mono text-green-400 overflow-x-auto">
          $ {command}
        </pre>
      </div>

      <div className="bg-muted/30 rounded-md p-3 text-xs text-muted-foreground">
        <strong className="text-foreground">Note:</strong> Make sure you have
        shadcn/ui initialized in your project. Run{" "}
        <code className="bg-muted px-1 rounded">npx shadcn@latest init</code>{" "}
        first if needed.
      </div>
    </div>
  );
}

// Usage instructions
function UsageSection({ componentName, framework }) {
  const frameworkConfig =
    frameworks.find((f) => f.id === framework) || frameworks[0];

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {/* Step 1 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
              1
            </div>
            <h4 className="font-semibold text-sm">Save the component</h4>
          </div>
          <p className="text-sm text-muted-foreground pl-8">
            Save the generated code as{" "}
            <code className="bg-muted px-1 rounded">
              {componentName}
              {frameworkConfig.fileExtension}
            </code>{" "}
            in your components directory.
          </p>
        </div>

        {/* Step 2 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
              2
            </div>
            <h4 className="font-semibold text-sm">Install dependencies</h4>
          </div>
          <div className="pl-8">
            <p className="text-sm text-muted-foreground mb-2">
              Run the CLI command from the "CLI" tab to install required
              shadcn/ui components.
            </p>
            <pre className="bg-muted p-3 rounded-md text-xs font-mono">
              npx shadcn@latest init
            </pre>
          </div>
        </div>

        {/* Step 3 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
              3
            </div>
            <h4 className="font-semibold text-sm">Import and use</h4>
          </div>
          <div className="pl-8">
            <pre className="bg-muted p-3 rounded-md text-xs font-mono">
              {`import ${componentName} from './${componentName}';

function App() {
  return <${componentName} />;
}`}
            </pre>
          </div>
        </div>

        {/* Framework-specific tips */}
        <Separator />

        <div className="space-y-2">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-yellow-500" />
            {frameworkConfig.name} Tips
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1 pl-6 list-disc">
            {framework === "nextjs" && (
              <>
                <li>
                  Add{" "}
                  <code className="bg-muted px-1 rounded">"use client"</code> at
                  the top if using client-side features
                </li>
                <li>Components work with both App Router and Pages Router</li>
              </>
            )}
            {framework === "react" && (
              <>
                <li>Works with Vite, Create React App, or any React setup</li>
                <li>Make sure you have Tailwind CSS configured</li>
              </>
            )}
            {framework === "remix" && (
              <>
                <li>
                  Use{" "}
                  <code className="bg-muted px-1 rounded">~/components/ui</code>{" "}
                  for imports
                </li>
                <li>Components are SSR-compatible</li>
              </>
            )}
            {framework === "astro" && (
              <>
                <li>
                  Add <code className="bg-muted px-1 rounded">client:load</code>{" "}
                  for interactive components
                </li>
                <li>React components work as islands</li>
              </>
            )}
          </ul>
        </div>

        {/* Documentation link */}
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => window.open("https://ui.shadcn.com/docs", "_blank")}
        >
          <ExternalLink className="h-4 w-4" />
          View shadcn/ui Documentation
        </Button>
      </div>
    </ScrollArea>
  );
}

// Main Export Dialog Component
export function EnhancedCodeExportDialog({ open, onOpenChange }) {
  const [copied, setCopied] = useState(false);
  const [componentName, setComponentName] = useState("MyPage");
  const [framework, setFramework] = useState("react");
  const [activeTab, setActiveTab] = useState("code");
  const [includeComments, setIncludeComments] = useState(true);
  const [useTypeScript, setUseTypeScript] = useState(false);

  const elements = useEditorStore((s) => s.canvas.elements);

  // Collect used components
  const usedComponents = useMemo(
    () => collectUsedComponents(elements),
    [elements]
  );

  // Generate CLI command
  const cliCommand = useMemo(
    () => generateCliCommand(usedComponents),
    [usedComponents]
  );

  // Generate code
  const generatedCode = useMemo(() => {
    return generatePageCode(elements, {
      componentName,
      includeImports: true,
      framework,
      includeComments,
      useTypeScript,
    });
  }, [elements, componentName, framework, includeComments, useTypeScript]);

  // Handle copy
  const handleCopy = async () => {
    const success = await copyToClipboard(generatedCode);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Handle download
  const handleDownload = () => {
    const frameworkConfig =
      frameworks.find((f) => f.id === framework) || frameworks[0];
    const extension =
      useTypeScript && framework !== "astro"
        ? ".tsx"
        : frameworkConfig.fileExtension;

    const blob = new Blob([generatedCode], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${componentName}${extension}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const frameworkConfig =
    frameworks.find((f) => f.id === framework) || frameworks[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-4 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5" />
            Export Code
          </DialogTitle>
          <DialogDescription>
            Export your design as production-ready code for any shadcn/ui
            project.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 px-6">
          {/* Options Row */}
          <div className="flex items-end gap-4 pb-4 shrink-0 flex-wrap">
            {/* Component Name */}
            <div className="flex-1 min-w-[200px] space-y-1.5">
              <Label htmlFor="component-name" className="text-xs">
                Component Name
              </Label>
              <Input
                id="component-name"
                value={componentName}
                onChange={(e) => setComponentName(e.target.value || "Page")}
                placeholder="MyPage"
                className="h-9"
              />
            </div>

            {/* Framework Select */}
            <div className="min-w-[180px] space-y-1.5">
              <Label className="text-xs">Framework</Label>
              <Select value={framework} onValueChange={setFramework}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {frameworks.map((fw) => (
                    <SelectItem key={fw.id} value={fw.id}>
                      <span className="flex items-center gap-2">
                        <span>{fw.icon}</span>
                        <span>{fw.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* TypeScript Toggle */}
            <div className="flex items-center gap-2 h-9">
              <Switch
                id="typescript"
                checked={useTypeScript}
                onCheckedChange={setUseTypeScript}
              />
              <Label htmlFor="typescript" className="text-xs">
                TypeScript
              </Label>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="gap-2"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
              <Button
                variant="default"
                size="sm"
                className="gap-2"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </div>

          {/* Component Summary */}
          {usedComponents.length > 0 && (
            <div className="flex items-center gap-2 pb-4 flex-wrap">
              <span className="text-xs text-muted-foreground">
                Components used:
              </span>
              {usedComponents.slice(0, 8).map((comp) => (
                <Badge key={comp} variant="secondary" className="text-[10px]">
                  {comp}
                </Badge>
              ))}
              {usedComponents.length > 8 && (
                <Badge variant="outline" className="text-[10px]">
                  +{usedComponents.length - 8} more
                </Badge>
              )}
            </div>
          )}

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col min-h-0"
          >
            <TabsList className="shrink-0">
              <TabsTrigger value="code" className="gap-1.5">
                <Code2 className="h-3.5 w-3.5" />
                Code Preview
              </TabsTrigger>
              <TabsTrigger value="cli" className="gap-1.5">
                <Terminal className="h-3.5 w-3.5" />
                CLI
              </TabsTrigger>
              <TabsTrigger value="usage" className="gap-1.5">
                <Folder className="h-3.5 w-3.5" />
                Usage
              </TabsTrigger>
            </TabsList>

            {/* Code Preview Tab */}
            <TabsContent
              value="code"
              className="flex-1 m-0 mt-4 min-h-0 rounded-md border bg-[#0d1117] overflow-hidden"
            >
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#30363d] bg-[#161b22]">
                <div className="flex items-center gap-2">
                  <FileCode className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {componentName}
                    {useTypeScript ? ".tsx" : frameworkConfig.fileExtension}
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {generatedCode.split("\n").length} lines
                </Badge>
              </div>
              <CodePreview
                code={generatedCode}
                language={useTypeScript ? "tsx" : "jsx"}
              />
            </TabsContent>

            {/* CLI Tab */}
            <TabsContent
              value="cli"
              className="flex-1 m-0 mt-4 min-h-0 rounded-md border overflow-hidden"
            >
              <CliSection command={cliCommand} />
            </TabsContent>

            {/* Usage Tab */}
            <TabsContent
              value="usage"
              className="flex-1 m-0 mt-4 min-h-0 rounded-md border overflow-hidden"
            >
              <UsageSection
                componentName={componentName}
                framework={framework}
              />
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="p-6 pt-4 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Keep original export for backward compatibility
export { EnhancedCodeExportDialog as CodeExportDialog };
