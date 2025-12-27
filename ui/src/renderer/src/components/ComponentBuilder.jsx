import React, { useState } from "react"
import { Search, Copy, Terminal, Maximize2, Check, Moon, Sun } from "lucide-react"
import { ScrollArea } from "./ui/scroll-area"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs"
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog"
import { components } from "../data/components"
import { cn } from "../lib/utils"

export default function ComponentBuilder() {
  const [selectedId, setSelectedId] = useState(components[0].id)
  const [searchQuery, setSearchQuery] = useState("")
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedCli, setCopiedCli] = useState(false)

  const selectedComponent = components.find((c) => c.id === selectedId) || components[0]

  const filteredComponents = components.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const copyToClipboard = (text, setCopied) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex h-full w-full overflow-hidden rounded-lg border bg-background shadow-sm">
      {/* Sidebar */}
      <div className="w-64 border-r bg-muted/10 flex flex-col">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search components..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {["Inputs", "Surfaces", "Feedback", "Data Display", "Navigation"].map((category) => {
              const categoryComponents = filteredComponents.filter(
                (c) => c.category === category
              )
              if (categoryComponents.length === 0) return null
              return (
                <div key={category}>
                  <h4 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {category}
                  </h4>
                  <div className="space-y-1">
                    {categoryComponents.map((component) => (
                      <Button
                        key={component.id}
                        variant={selectedId === component.id ? "secondary" : "ghost"}
                        className="w-full justify-start text-sm"
                        onClick={() => setSelectedId(component.id)}
                      >
                        {component.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )
            })}
             {filteredComponents.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No components found
                </div>
             )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-6 border-b flex justify-between items-start bg-card">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{selectedComponent.name}</h2>
            <p className="text-muted-foreground mt-1">{selectedComponent.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-1.5 text-xs font-mono text-muted-foreground border">
               <Terminal className="h-3.5 w-3.5" />
               {selectedComponent.cli}
               <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 ml-2 hover:bg-background"
                  onClick={() => copyToClipboard(selectedComponent.cli, setCopiedCli)}
               >
                  {copiedCli ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
               </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="preview" className="flex-1 flex flex-col">
          <div className="px-6 border-b flex items-center justify-between bg-muted/5">
            <TabsList className="my-2 bg-muted/50">
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="code">Code</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
                <Dialog>
                    <DialogTrigger asChild>
                         <Button variant="ghost" size="sm" className="h-8 gap-1">
                            <Maximize2 className="h-3.5 w-3.5" />
                            Expand
                         </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[90vw] h-[90vh] flex flex-col p-0 gap-0">
                        <div className="p-4 border-b flex items-center justify-between">
                            <h3 className="font-semibold">{selectedComponent.name}</h3>
                        </div>
                        <div className="flex-1 flex items-center justify-center bg-muted/20 p-8 overflow-auto">
                            {selectedComponent.preview}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
          </div>

          <TabsContent value="preview" className="flex-1 m-0 p-0 relative">
             <div className="absolute inset-0 flex items-center justify-center bg-muted/20 p-8 overflow-auto">
                 <div className="scale-100 transition-transform">
                    {selectedComponent.preview}
                 </div>
             </div>
          </TabsContent>

          <TabsContent value="code" className="flex-1 m-0 p-0 relative">
             <div className="absolute inset-0">
                <ScrollArea className="h-full w-full">
                    <div className="relative">
                        <Button
                            variant="secondary"
                            size="sm"
                            className="absolute right-4 top-4 h-8 gap-1 z-10"
                            onClick={() => copyToClipboard(selectedComponent.code, setCopiedCode)}
                        >
                             {copiedCode ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                             Copy
                        </Button>
                        <pre className="p-6 text-sm font-mono leading-relaxed">
                            {selectedComponent.code}
                        </pre>
                    </div>
                </ScrollArea>
             </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
