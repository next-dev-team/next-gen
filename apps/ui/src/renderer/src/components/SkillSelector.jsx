import React, { useState, useMemo } from "react";
import {
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code,
  ExternalLink,
  FileCode,
  FileText,
  Filter,
  LayoutGrid,
  Package,
  Search,
  Shield,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import {
  SKILLS_REGISTRY,
  GITHUB_SKILLS_URL,
} from "../data/skills-registry";

const categoryIcons = {
  essentials: "🎯",
  "web-development": "🌐",
  "ai-agents": "🤖",
  security: "🔒",
  "cloud-devops": "☁️",
  automation: "⚡",
  database: "🗄️",
  content: "✍️",
  "game-dev": "🎮",
};

export function SkillSelector({ selectedSkills = [], onSkillsChange }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState(
    new Set(["essentials"])
  );
  const [activeTab, setActiveTab] = useState("browse"); // browse | bundles
  
  // State for skill content viewing
  const [viewingSkill, setViewingSkill] = useState(null);
  const [skillContent, setSkillContent] = useState(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [fullScreenTab, setFullScreenTab] = useState("code"); // code | markdown

  // Flatten all skills for search
  const allSkills = useMemo(() => {
    return SKILLS_REGISTRY.categories.flatMap((cat) =>
      cat.skills.map((skill) => ({
        ...skill,
        categoryId: cat.id,
        categoryName: cat.name,
      }))
    );
  }, []);

  // Filter skills based on search
  const filteredSkills = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase();
    return allSkills.filter(
      (skill) =>
        skill.name.toLowerCase().includes(query) ||
        skill.description.toLowerCase().includes(query) ||
        skill.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  }, [searchQuery, allSkills]);

  const toggleCategory = (categoryId) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const toggleSkill = (skillId) => {
    const isSelected = selectedSkills.includes(skillId);
    if (isSelected) {
      onSkillsChange(selectedSkills.filter((id) => id !== skillId));
    } else {
      onSkillsChange([...selectedSkills, skillId]);
    }
  };

  const selectBundle = (bundle) => {
    const newSkills = new Set([...selectedSkills, ...bundle.skills]);
    onSkillsChange(Array.from(newSkills));
  };

  const clearAll = () => {
    onSkillsChange([]);
  };

  const fetchSkillContent = async (skill) => {
    if (viewingSkill === skill.id) {
      setViewingSkill(null);
      setSkillContent(null);
      setIsFullScreen(false);
      return;
    }

    setViewingSkill(skill.id);
    setLoadingContent(true);
    setSkillContent(null);
    setIsFullScreen(false);

    try {
      // Construct raw GitHub URL
      // Use GITHUB_SKILLS_RAW if defined, otherwise fallback
      const baseUrl = "https://raw.githubusercontent.com/sickn33/antigravity-awesome-skills/main";
      const url = `${baseUrl}/${skill.path}/SKILL.md`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch skill content");
      
      const text = await response.text();
      setSkillContent(text);
    } catch (error) {
      console.error("Error fetching skill content:", error);
      setSkillContent("# Error\nFailed to load skill content. Please check your internet connection.");
    } finally {
      setLoadingContent(false);
    }
  };

  const SkillCard = ({ skill, compact = false }) => {
    const isSelected = selectedSkills.includes(skill.id);
    const isViewing = viewingSkill === skill.id;

    return (
      <div
        className={`group relative rounded-lg border transition-all duration-200 ${
          isSelected
            ? "border-indigo-500 bg-indigo-500/10 shadow-md shadow-indigo-500/10"
            : "border-[var(--color-border)] bg-[var(--color-bg-elevated)] hover:border-indigo-400/50 hover:bg-[var(--color-bg-container)]"
        }`}
      >
        <div className="flex items-start gap-3 p-3">
          <div
            onClick={() => toggleSkill(skill.id)}
            className={`flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors ${
              isSelected
                ? "bg-indigo-500 text-white"
                : "bg-[var(--color-bg-container)] text-[var(--color-text-secondary)] group-hover:bg-indigo-500/20 group-hover:text-indigo-400"
            }`}
          >
            {isSelected ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Code className="h-4 w-4" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span 
                onClick={() => toggleSkill(skill.id)}
                className="font-medium text-[var(--color-text-primary)] truncate cursor-pointer hover:text-indigo-400 transition-colors"
              >
                {skill.name}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  fetchSkillContent(skill);
                }}
                className="h-6 w-6 p-0 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                {isViewing ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
            {!compact && (
              <p 
                onClick={() => toggleSkill(skill.id)}
                className="mt-1 text-xs text-[var(--color-text-secondary)] line-clamp-2 cursor-pointer"
              >
                {skill.description}
              </p>
            )}
            {!compact && skill.tags && (
              <div 
                onClick={() => toggleSkill(skill.id)}
                className="mt-2 flex flex-wrap gap-1 cursor-pointer"
              >
                {skill.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full bg-[var(--color-bg-container)] px-2 py-0.5 text-[10px] text-[var(--color-text-secondary)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Expanded Content View (Inline) */}
        {isViewing && (
          <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-base)] p-3 animate-in slide-in-from-top-2 duration-200">
            {loadingContent ? (
              <div className="flex items-center justify-center py-4 text-[var(--color-text-secondary)]">
                <Sparkles className="h-4 w-4 animate-spin mr-2" />
                Loading skill content...
              </div>
            ) : (
              <div className="overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                    SKILL.md Preview
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                         e.stopPropagation();
                         setIsFullScreen(true);
                      }}
                       className="h-6 px-2 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                    >
                      <LayoutGrid className="h-3 w-3 mr-1" />
                      Full Screen
                    </Button>
                    <a 
                      href={`https://github.com/sickn33/antigravity-awesome-skills/blob/main/${skill.path}/SKILL.md`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      GitHub <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
                <div className="text-xs text-[var(--color-text-secondary)] font-mono whitespace-pre-wrap bg-[var(--color-bg-container)] p-3 rounded border border-[var(--color-border)] max-h-60 overflow-y-auto">
                  {skillContent}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Full Screen View
  const fullScreenSkillData = useMemo(() => {
    if (!viewingSkill) return null;
    return allSkills.find(s => s.id === viewingSkill);
  }, [viewingSkill, allSkills]);

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
              Select Skills
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Choose skills from the{" "}
              <a
                href={GITHUB_SKILLS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:underline inline-flex items-center gap-1"
              >
                antigravity-awesome-skills
                <ExternalLink className="h-3 w-3" />
              </a>{" "}
              repository
            </p>
          </div>
          {selectedSkills.length > 0 && (
            <Badge
              variant="outline"
              className="border-indigo-500 bg-indigo-500/10 text-indigo-400"
            >
              {selectedSkills.length} selected
            </Badge>
          )}
        </div>

        {/* Search & Tabs */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-secondary)]" />
            <Input
              placeholder="Search skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[var(--color-bg-elevated)] border-[var(--color-border)]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant={activeTab === "browse" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("browse")}
              className={
                activeTab === "browse"
                  ? "bg-indigo-600 text-white"
                  : "border-[var(--color-border)] text-[var(--color-text-secondary)]"
              }
            >
              <Filter className="mr-2 h-4 w-4" />
              Browse
            </Button>
            <Button
              variant={activeTab === "bundles" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("bundles")}
              className={
                activeTab === "bundles"
                  ? "bg-indigo-600 text-white"
                  : "border-[var(--color-border)] text-[var(--color-text-secondary)]"
              }
            >
              <Package className="mr-2 h-4 w-4" />
              Bundles
            </Button>
          </div>
        </div>

        {/* Content */}
        <div
          className="overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-base)] p-4"
          style={{ maxHeight: "300px" }}
        >
          {/* Search Results */}
          {filteredSkills && (
            <div className="space-y-2">
              <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                Found {filteredSkills.length} skills matching "{searchQuery}"
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {filteredSkills.map((skill) => (
                  <SkillCard key={skill.id} skill={skill} />
                ))}
              </div>
              {filteredSkills.length === 0 && (
                <div className="py-8 text-center text-[var(--color-text-secondary)]">
                  <Search className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No skills found matching your search</p>
                </div>
              )}
            </div>
          )}

          {/* Browse Categories */}
          {!filteredSkills && activeTab === "browse" && (
            <div className="space-y-3">
              {SKILLS_REGISTRY.categories.map((category) => (
                <div
                  key={category.id}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] overflow-hidden"
                >
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="flex w-full items-center justify-between p-3 hover:bg-[var(--color-bg-container)] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">
                        {categoryIcons[category.id] || "📁"}
                      </span>
                      <div className="text-left">
                        <span className="font-medium text-[var(--color-text-primary)]">
                          {category.name.replace(/^[^\s]+\s/, "")}
                        </span>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          {category.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-[var(--color-border)] text-[var(--color-text-tertiary)]"
                      >
                        {category.skills.length}
                      </Badge>
                      {expandedCategories.has(category.id) ? (
                        <ChevronDown className="h-4 w-4 text-[var(--color-text-secondary)]" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-[var(--color-text-secondary)]" />
                      )}
                    </div>
                  </button>
                  {expandedCategories.has(category.id) && (
                    <div className="border-t border-[var(--color-border)] p-3">
                      <div className="grid gap-2 sm:grid-cols-2">
                        {category.skills.map((skill) => (
                          <SkillCard key={skill.id} skill={skill} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Bundles */}
          {!filteredSkills && activeTab === "bundles" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {SKILLS_REGISTRY.bundles.map((bundle) => {
                const bundleSkillsSelected = bundle.skills.filter((s) =>
                  selectedSkills.includes(s)
                ).length;
                const isFullySelected =
                  bundleSkillsSelected === bundle.skills.length;

                return (
                  <Card
                    key={bundle.id}
                    className={`p-4 cursor-pointer transition-all duration-200 ${
                      isFullySelected
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-[var(--color-border)] bg-[var(--color-bg-elevated)] hover:border-indigo-400/50"
                    }`}
                    onClick={() => selectBundle(bundle)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-[var(--color-text-primary)]">
                          {bundle.name}
                        </h4>
                        <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                          {bundle.description}
                        </p>
                      </div>
                      {isFullySelected && (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className="border-[var(--color-border)] text-[var(--color-text-tertiary)]"
                      >
                        {bundle.skills.length} skills
                      </Badge>
                      {bundleSkillsSelected > 0 && !isFullySelected && (
                        <span className="text-xs text-indigo-400">
                          {bundleSkillsSelected}/{bundle.skills.length} selected
                        </span>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Skills Summary */}
        {selectedSkills.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-3">
            <span className="text-sm text-[var(--color-text-secondary)]">
              Selected:
            </span>
            {selectedSkills.slice(0, 5).map((skillId) => {
              const skill = allSkills.find((s) => s.id === skillId);
              return skill ? (
                <Badge
                  key={skillId}
                  variant="outline"
                  className="border-indigo-500 bg-indigo-500/10 text-indigo-400 cursor-pointer hover:bg-indigo-500/20"
                  onClick={() => toggleSkill(skillId)}
                >
                  {skill.name}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              ) : null;
            })}
            {selectedSkills.length > 5 && (
              <span className="text-xs text-[var(--color-text-secondary)]">
                +{selectedSkills.length - 5} more
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="ml-auto text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Full Screen Modal */}
      {isFullScreen && fullScreenSkillData && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[var(--color-bg-base)] animate-in fade-in duration-200" style={{ paddingTop: 32 }}>
          {/* Modal Header */}
          <div className="grid grid-cols-3 items-center border-b border-[var(--color-border)] p-4 bg-[var(--color-bg-elevated)]">
             {/* Left: Skill Info */}
             <div className="flex items-center gap-3">
                <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                   <Code className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                    {fullScreenSkillData.name}
                  </h2>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    SKILL.md Documentation
                  </p>
                </div>
             </div>
             
             {/* Center: Tab Switcher */}
             <div className="flex justify-center">
               <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden">
                 <button
                   onClick={() => setFullScreenTab("code")}
                   className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                     fullScreenTab === "code"
                       ? "bg-indigo-600 text-white"
                       : "bg-[var(--color-bg-container)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                   }`}
                 >
                   <FileCode className="h-4 w-4" />
                   Code
                 </button>
                 <button
                   onClick={() => setFullScreenTab("markdown")}
                   className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                     fullScreenTab === "markdown"
                       ? "bg-indigo-600 text-white"
                       : "bg-[var(--color-bg-container)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                   }`}
                 >
                   <FileText className="h-4 w-4" />
                   Markdown
                 </button>
               </div>
             </div>
             
             {/* Right: Actions */}
             <div className="flex items-center gap-2 justify-end">
                <a 
                   href={`https://github.com/sickn33/antigravity-awesome-skills/blob/main/${fullScreenSkillData.path}/SKILL.md`}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="flex items-center gap-2 px-3 py-2 rounded-md bg-[var(--color-bg-container)] border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] transition-colors"
                 >
                   <ExternalLink className="h-4 w-4" />
                   GitHub
                </a>
                <Button 
                   onClick={() => setIsFullScreen(false)}
                   variant="default"
                   className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                   Close
                </Button>
             </div>
          </div>
          
          {/* Modal Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-[var(--color-bg-base)]">
             <div className="max-w-4xl mx-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-container)] shadow-lg overflow-hidden">
                {loadingContent ? (
                  <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-secondary)]">
                    <Sparkles className="h-8 w-8 animate-spin mb-4 text-indigo-400" />
                    <p>Loading full documentation...</p>
                  </div>
                ) : fullScreenTab === "code" ? (
                  <div className="text-sm text-[var(--color-text-primary)] font-mono whitespace-pre-wrap p-6 bg-[var(--color-bg-base)]">
                    {skillContent}
                  </div>
                ) : (
                  <div className="prose prose-invert max-w-none p-6">
                    {skillContent?.split('\n').map((line, i) => {
                      // Simple markdown-like rendering
                      if (line.startsWith('# ')) {
                        return <h1 key={i} className="text-2xl font-bold text-[var(--color-text-primary)] mb-4 mt-6 first:mt-0">{line.slice(2)}</h1>;
                      }
                      if (line.startsWith('## ')) {
                        return <h2 key={i} className="text-xl font-bold text-[var(--color-text-primary)] mb-3 mt-5">{line.slice(3)}</h2>;
                      }
                      if (line.startsWith('### ')) {
                        return <h3 key={i} className="text-lg font-semibold text-[var(--color-text-primary)] mb-2 mt-4">{line.slice(4)}</h3>;
                      }
                      if (line.startsWith('- ') || line.startsWith('* ')) {
                        return <li key={i} className="text-[var(--color-text-secondary)] ml-4 mb-1">• {line.slice(2)}</li>;
                      }
                      if (line.startsWith('```')) {
                        return <div key={i} className="font-mono text-xs bg-[var(--color-bg-base)] rounded px-2 py-1 my-2 text-indigo-400">{line}</div>;
                      }
                      if (line.trim() === '') {
                        return <div key={i} className="h-3" />;
                      }
                      // Bold text handling
                      const boldParsed = line.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-[var(--color-text-primary)]">$1</strong>');
                      // Inline code handling
                      const codeParsed = boldParsed.replace(/`([^`]+)`/g, '<code class="bg-[var(--color-bg-base)] px-1 rounded text-indigo-400 text-xs font-mono">$1</code>');
                      return <p key={i} className="text-[var(--color-text-secondary)] mb-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: codeParsed }} />;
                    })}
                  </div>
                )}
             </div>
          </div>
        </div>
      )}
    </>
  );
}

export default SkillSelector;
