/**
 * ScrumBoardView Utilities
 *
 * Contains utility functions for MCP tools, markdown parsing,
 * context normalization, and other helper functions.
 */

import * as React from "react";
import { cn } from "../../lib/utils";
import { BMAD_CONTEXT_CATEGORIES } from "./constants";

// ============ MCP Tool Usage Text ============
export const getMcpToolUsageText = ({ toolId, activeBoard, projectRoot }) => {
  const boardId = activeBoard?.id || "<boardId>";
  const boardName = activeBoard?.name || "<boardName>";
  const listId = activeBoard?.lists?.[0]?.id || "<listId>";
  const cardId = activeBoard?.lists?.[0]?.cards?.[0]?.id || "<cardId>";
  const cwd = String(projectRoot || "").trim() || "/absolute/path";

  switch (toolId) {
    case "scrum_get_state":
      return "scrum-kanban/scrum_get_state";
    case "scrum_set_state":
      return 'scrum-kanban/scrum_set_state {"state":{...}}';
    case "scrum_create_board":
      return 'scrum-kanban/scrum_create_board {"name":"","type":"bmad"}';
    case "scrum_delete_board":
      return `scrum-kanban/scrum_delete_board {"boardId":"${boardId}"}`;
    case "scrum_add_list":
      return `scrum-kanban/scrum_add_list {"boardId":"${boardId}","name":"Backlog"}`;
    case "scrum_rename_list":
      return `scrum-kanban/scrum_rename_list {"boardId":"${boardId}","listId":"${listId}","name":"New name"}`;
    case "scrum_delete_list":
      return `scrum-kanban/scrum_delete_list {"boardId":"${boardId}","listId":"${listId}"}`;
    case "scrum_add_card":
      return `scrum-kanban/scrum_add_card {"boardId":"${boardId}","listId":"${listId}","title":"My story"}`;
    case "scrum_update_card":
      return `scrum-kanban/scrum_update_card {"boardId":"${boardId}","listId":"${listId}","cardId":"${cardId}","patch":{...}}`;
    case "scrum_delete_card":
      return `scrum-kanban/scrum_delete_card {"boardId":"${boardId}","listId":"${listId}","cardId":"${cardId}"}`;
    case "scrum_move_card":
      return `scrum-kanban/scrum_move_card {"boardId":"${boardId}","cardId":"${cardId}","fromListId":"${listId}","toListId":"<toListId>","toIndex":0}`;
    case "scrum_acquire_lock":
      return `scrum-kanban/scrum_acquire_lock {"cardId":"${cardId}"}`;
    case "scrum_release_lock":
      return `scrum-kanban/scrum_release_lock {"cardId":"${cardId}"}`;
    case "scrum_create_epic":
      return 'scrum-kanban/scrum_create_epic {"name":"Epic name"}';
    case "scrum_update_epic":
      return 'scrum-kanban/scrum_update_epic {"epicId":"<epicId>","patch":{...}}';
    case "scrum_get_stories_by_status":
      return `scrum-kanban/scrum_get_stories_by_status {"boardId":"${boardId}","status":"backlog"}`;
    case "scrum_get_next_story":
      return `scrum-kanban/scrum_get_next_story {"boardId":"${boardId}"}`;
    case "scrum_get_story_by_id":
      return `scrum-kanban/scrum_get_story_by_id here is id: ${boardName}:1`;
    case "scrum_complete_story":
      return `scrum-kanban/scrum_complete_story {"boardId":"${boardId}","cardId":"${cardId}"}`;
    case "bmad_install":
      return `scrum-kanban/bmad_install {"cwd":"${cwd}","mode":"npx"}`;
    case "bmad_status":
      return `scrum-kanban/bmad_status {"cwd":"${cwd}","mode":"npx"}`;
    case "generate_prd":
      return `scrum-kanban/generate_prd {"cwd":"${cwd}","content":"..."}`;
    case "update_prd":
      return `scrum-kanban/update_prd {"cwd":"${cwd}","relativePath":"_bmad-output/prd.md","content":"..."}`;
    case "add_prd_features":
      return `scrum-kanban/add_prd_features {"cwd":"${cwd}","relativePath":"_bmad-output/prd.md","headingPath":["Core Features (MVP)"],"features":["..."],"createIfMissing":true}`;
    default:
      return `scrum-kanban/${String(toolId || "<tool>")}`;
  }
};

// ============ JSON Parsing ============
export const safeJsonParse = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

// ============ Path Normalization ============
export const normalizeMcpPath = (p) => String(p || "").replace(/\\/g, "/");

// ============ Agent Recommendation ============
export const recommendAgent = ({ teamSize, sprintLength, autoSync }) => {
  const size = Number(teamSize);
  const sprint = Number(sprintLength);
  const sync = Boolean(autoSync);

  if (Number.isFinite(size) && size >= 8) return "bmad-master";
  if (Number.isFinite(sprint) && sprint >= 21) return "sm";
  if (!sync) return "quick-flow-solo-dev";
  return "sm";
};

// ============ Markdown Rendering ============
export const renderMarkdownInline = (text) => {
  const raw = String(text || "");
  const parts = raw.split(/(`[^`]*`)/g).filter((p) => p !== "");
  return parts.map((part, idx) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          key={`${idx}:${part}`}
          className="rounded bg-white/10 px-1 py-0.5 font-mono text-[12px]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={`${idx}:${part}`}>{part}</React.Fragment>;
  });
};

// ============ Markdown Preview Component ============
export const MarkdownPreview = ({ value }) => {
  const input = String(value || "").replace(/\r\n/g, "\n");
  const lines = input.split("\n");
  const blocks = [];

  let i = 0;
  let inCode = false;
  let codeLines = [];

  const flushCode = () => {
    if (!codeLines.length) return;
    blocks.push({ type: "code", text: codeLines.join("\n") });
    codeLines = [];
  };

  while (i < lines.length) {
    const line = String(lines[i] || "");
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        inCode = true;
      }
      i++;
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      i++;
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: String(headingMatch[2] || "").trim(),
      });
      i++;
      continue;
    }

    const bulletMatch = line.match(/^\s*[-*+]\s+(.*)$/);
    if (bulletMatch) {
      const items = [];
      while (i < lines.length) {
        const l = String(lines[i] || "");
        const m = l.match(/^\s*[-*+]\s+(.*)$/);
        if (!m) break;
        items.push(String(m[1] || "").trim());
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    if (!trimmed) {
      blocks.push({ type: "spacer" });
      i++;
      continue;
    }

    const para = [trimmed];
    i++;
    while (i < lines.length) {
      const next = String(lines[i] || "");
      const nextTrimmed = next.trim();
      if (!nextTrimmed) break;
      if (/^(#{1,6})\s+/.test(next) || /^\s*[-*+]\s+/.test(nextTrimmed)) break;
      if (nextTrimmed.startsWith("```")) break;
      para.push(nextTrimmed);
      i++;
    }
    blocks.push({ type: "p", text: para.join(" ") });
  }

  if (inCode) flushCode();

  const headingClass = (level) => {
    if (level <= 1) return "text-xl font-semibold";
    if (level === 2) return "text-lg font-semibold";
    if (level === 3) return "text-base font-semibold";
    return "text-sm font-semibold";
  };

  return (
    <div className="text-sm text-gray-100 whitespace-normal">
      {blocks.map((b, idx) => {
        const blockKey = `${idx}:${b.type}:${String(b.text || "")}`;
        if (b.type === "spacer") return <div key={blockKey} className="h-2" />;
        if (b.type === "heading")
          return (
            <div key={blockKey} className={cn("mt-3", headingClass(b.level))}>
              {renderMarkdownInline(b.text)}
            </div>
          );
        if (b.type === "code")
          return (
            <pre
              key={blockKey}
              className="mt-3 rounded-md border border-border/50 bg-black/60 p-3 overflow-x-auto text-xs"
            >
              <code className="font-mono">{b.text}</code>
            </pre>
          );
        if (b.type === "ul")
          return (
            <ul key={blockKey} className="mt-2 list-disc pl-5 space-y-1">
              {b.items.map((it, j) => (
                <li key={`${j}:${it}`}>{renderMarkdownInline(it)}</li>
              ))}
            </ul>
          );
        if (b.type === "p")
          return (
            <p key={blockKey} className="mt-2 leading-6">
              {renderMarkdownInline(b.text)}
            </p>
          );
        return null;
      })}
    </div>
  );
};

// ============ Context Document Normalization ============
export const normalizeContextDocs = ({ docs, prdPath, selectedIdes }) => {
  // PRD is always first and required
  const prd = {
    id: "prd",
    label: "PRD",
    path:
      String(prdPath || "_bmad-output/prd.md").trim() || "_bmad-output/prd.md",
    category: "bmad-docs",
    required: true,
  };

  // Get custom docs from user
  const raw = Array.isArray(docs) ? docs : [];
  const customDocs = raw
    .map((d) => ({
      id: String(d?.id || "").trim(),
      label: String(d?.label || "").trim() || "Context",
      path: String(d?.path || "").trim(),
      category: String(d?.category || "custom").trim(),
    }))
    .filter((d) => d.id && d.id !== "prd");

  return [prd, ...customDocs];
};

// ============ Predefined Context Items ============
export const getPredefinedContextItems = ({
  selectedIdes,
  includeAll = false,
}) => {
  const ideSet = new Set(Array.isArray(selectedIdes) ? selectedIdes : []);
  const items = [];

  for (const cat of BMAD_CONTEXT_CATEGORIES) {
    for (const item of cat.items) {
      // If item is IDE-specific, only include if that IDE is selected (or includeAll)
      if (item.ide && !includeAll && ideSet.size > 0 && !ideSet.has(item.ide)) {
        continue;
      }
      items.push({
        ...item,
        category: cat.id,
        categoryLabel: cat.label,
        categoryIcon: cat.icon,
      });
    }
  }

  return items;
};

// ============ Group Context Items by Category ============
export const groupContextItemsByCategory = (items) => {
  const groups = {};
  for (const item of items) {
    const catId = item.category || "custom";
    if (!groups[catId]) {
      const catDef = BMAD_CONTEXT_CATEGORIES.find((c) => c.id === catId);
      groups[catId] = {
        id: catId,
        label: catDef?.label || "Custom",
        icon: catDef?.icon || "📄",
        items: [],
      };
    }
    groups[catId].items.push(item);
  }
  return Object.values(groups);
};
