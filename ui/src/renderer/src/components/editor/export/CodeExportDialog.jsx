import React, { useMemo, useState } from "react";
import { Check, Copy, Download, FileCode } from "lucide-react";
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
import { useEditorStore } from "../../../stores/editorStore";
import { generatePageCode, copyToClipboard } from "../../../utils/codeGenerator";

export function CodeExportDialog({ open, onOpenChange }) {
  const [copied, setCopied] = useState(false);
  const [componentName, setComponentName] = useState("Page");
  const [activeTab, setActiveTab] = useState("preview");

  const elements = useEditorStore((s) => s.canvas.elements);

  // Generate code
  const generatedCode = useMemo(() => {
    return generatePageCode(elements, { componentName, includeImports: true });
  }, [elements, componentName]);

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
    const blob = new Blob([generatedCode], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${componentName}.jsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-4 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5" />
            Export Code
          </DialogTitle>
          <DialogDescription>
            Copy or download the generated React/JSX code for your page.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 px-6">
          {/* Options */}
          <div className="flex items-end gap-4 pb-4 shrink-0">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="component-name" className="text-xs">
                Component Name
              </Label>
              <Input
                id="component-name"
                value={componentName}
                onChange={(e) => setComponentName(e.target.value || "Page")}
                placeholder="Page"
                className="h-9"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" className="gap-2" onClick={handleCopy}>
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
              <Button variant="secondary" size="sm" className="gap-2" onClick={handleDownload}>
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </div>

          {/* Code preview */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col min-h-0"
          >
            <TabsList className="shrink-0">
              <TabsTrigger value="preview">Code Preview</TabsTrigger>
              <TabsTrigger value="usage">Usage</TabsTrigger>
            </TabsList>

            <TabsContent
              value="preview"
              className="flex-1 m-0 mt-4 min-h-0 rounded-md border bg-[#0d1117] overflow-hidden"
            >
              <ScrollArea className="h-full">
                <pre className="p-4 text-sm font-mono leading-relaxed text-[#c9d1d9] whitespace-pre-wrap">
                  <code>{generatedCode}</code>
                </pre>
              </ScrollArea>
            </TabsContent>

            <TabsContent
              value="usage"
              className="flex-1 m-0 mt-4 min-h-0 rounded-md border overflow-hidden"
            >
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">1. Save the file</h4>
                    <p className="text-sm text-muted-foreground">
                      Save the generated code as <code className="bg-muted px-1 rounded">{componentName}.jsx</code> in your components directory.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">2. Install dependencies</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Make sure you have shadcn/ui installed in your project:
                    </p>
                    <pre className="bg-muted p-3 rounded-md text-sm font-mono">
                      npx shadcn@latest init
                    </pre>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">3. Add required components</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Install the shadcn/ui components used in your page:
                    </p>
                    <pre className="bg-muted p-3 rounded-md text-sm font-mono">
                      npx shadcn@latest add button card input label
                    </pre>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">4. Import and use</h4>
                    <pre className="bg-muted p-3 rounded-md text-sm font-mono">
{`import ${componentName} from './${componentName}';

function App() {
  return <${componentName} />;
}`}
                    </pre>
                  </div>
                </div>
              </ScrollArea>
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
