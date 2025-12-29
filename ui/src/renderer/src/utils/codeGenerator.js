// Code generation utilities for exporting canvas to JSX

import { blocks } from "../data/blocks";
import { components } from "../data/components";

/**
 * Convert snake_case or kebab-case to PascalCase
 */
const toPascalCase = (str) =>
  str
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");

/**
 * Indent a string by n levels (2 spaces per level)
 */
const indent = (str, level) => {
  const spaces = "  ".repeat(level);
  return str
    .split("\n")
    .map((line) => (line.trim() ? spaces + line : ""))
    .join("\n");
};

/**
 * Convert props object to JSX attribute string
 */
const propsToJsx = (props, excludeKeys = ["children"]) => {
  const entries = Object.entries(props).filter(
    ([key, value]) => !excludeKeys.includes(key) && value !== undefined && value !== ""
  );

  if (entries.length === 0) return "";

  return entries
    .map(([key, value]) => {
      if (typeof value === "boolean") {
        return value ? key : `${key}={false}`;
      }
      if (typeof value === "number") {
        return `${key}={${value}}`;
      }
      if (typeof value === "object") {
        return `${key}={${JSON.stringify(value)}}`;
      }
      // String value
      if (value.includes('"') || value.includes("\n")) {
        return `${key}={\`${value}\`}`;
      }
      return `${key}="${value}"`;
    })
    .join(" ");
};

/**
 * Convert style object to inline style string
 */
const styleToJsx = (style) => {
  if (!style || Object.keys(style).length === 0) return "";
  return `style={${JSON.stringify(style)}}`;
};

/**
 * Generate JSX for a single element
 */
const elementToJsx = (element, level = 0) => {
  const { type, props, style, children } = element;

  // Get component name (PascalCase)
  const componentName = toPascalCase(type);

  // Build props string
  const propsStr = propsToJsx(props);
  const styleStr = styleToJsx(style);
  const allAttrs = [propsStr, styleStr].filter(Boolean).join(" ");

  // Self-closing if no children
  if (!children || children.length === 0) {
    if (props.children) {
      // Has text children
      const textContent = String(props.children);
      if (textContent.includes("\n")) {
        return indent(
          `<${componentName}${allAttrs ? " " + allAttrs : ""}>\n${indent(textContent, 1)}\n</${componentName}>`,
          level
        );
      }
      return indent(`<${componentName}${allAttrs ? " " + allAttrs : ""}>${textContent}</${componentName}>`, level);
    }
    return indent(`<${componentName}${allAttrs ? " " + allAttrs : ""} />`, level);
  }

  // Has children elements
  const childrenJsx = children.map((child) => elementToJsx(child, 1)).join("\n");

  return indent(
    `<${componentName}${allAttrs ? " " + allAttrs : ""}>
${childrenJsx}
</${componentName}>`,
    level
  );
};

/**
 * Collect all unique component types from elements tree
 */
const collectComponentTypes = (elements) => {
  const types = new Set();

  const traverse = (els) => {
    els.forEach((el) => {
      types.add(el.type);
      if (el.children) traverse(el.children);
    });
  };

  traverse(elements);
  return Array.from(types);
};

/**
 * Generate import statements based on component types
 */
const generateImports = (componentTypes) => {
  const imports = [];

  // shadcn UI components
  const shadcnComponents = [
    "Button",
    "Input",
    "Card",
    "CardHeader",
    "CardTitle",
    "CardDescription",
    "CardContent",
    "CardFooter",
    "Label",
    "Badge",
    "Separator",
    "Switch",
    "Tabs",
    "TabsList",
    "TabsTrigger",
    "TabsContent",
  ];

  const usedShadcn = componentTypes
    .map(toPascalCase)
    .filter((type) => shadcnComponents.includes(type));

  // Group by source
  const buttonGroup = usedShadcn.filter((c) => c === "Button");
  const inputGroup = usedShadcn.filter((c) => c === "Input");
  const cardGroup = usedShadcn.filter((c) =>
    ["Card", "CardHeader", "CardTitle", "CardDescription", "CardContent", "CardFooter"].includes(c)
  );
  const labelGroup = usedShadcn.filter((c) => c === "Label");
  const badgeGroup = usedShadcn.filter((c) => c === "Badge");
  const separatorGroup = usedShadcn.filter((c) => c === "Separator");
  const switchGroup = usedShadcn.filter((c) => c === "Switch");
  const tabsGroup = usedShadcn.filter((c) =>
    ["Tabs", "TabsList", "TabsTrigger", "TabsContent"].includes(c)
  );

  if (buttonGroup.length) imports.push(`import { Button } from "@/components/ui/button";`);
  if (inputGroup.length) imports.push(`import { Input } from "@/components/ui/input";`);
  if (cardGroup.length)
    imports.push(`import { ${cardGroup.join(", ")} } from "@/components/ui/card";`);
  if (labelGroup.length) imports.push(`import { Label } from "@/components/ui/label";`);
  if (badgeGroup.length) imports.push(`import { Badge } from "@/components/ui/badge";`);
  if (separatorGroup.length) imports.push(`import { Separator } from "@/components/ui/separator";`);
  if (switchGroup.length) imports.push(`import { Switch } from "@/components/ui/switch";`);
  if (tabsGroup.length)
    imports.push(`import { ${tabsGroup.join(", ")} } from "@/components/ui/tabs";`);

  return imports.join("\n");
};

/**
 * Generate complete page code from canvas elements
 */
export const generatePageCode = (elements, options = {}) => {
  const { componentName = "Page", includeImports = true } = options;

  if (!elements || elements.length === 0) {
    return `export default function ${componentName}() {
  return (
    <div className="min-h-screen">
      {/* Add components here */}
    </div>
  );
}`;
  }

  const componentTypes = collectComponentTypes(elements);
  const imports = includeImports ? generateImports(componentTypes) : "";
  const elementsJsx = elements.map((el) => elementToJsx(el, 2)).join("\n");

  return `${imports ? imports + "\n\n" : ""}export default function ${componentName}() {
  return (
    <div className="min-h-screen">
${elementsJsx}
    </div>
  );
}`;
};

/**
 * Generate code for a single element
 */
export const generateElementCode = (element) => {
  if (!element) return "";
  return elementToJsx(element, 0);
};

/**
 * Generate code from block template
 */
export const generateBlockCode = (blockId, props) => {
  const block = blocks.find((b) => b.id === blockId);
  if (!block || !block.codeTemplate) return "";

  let code = block.codeTemplate;

  // Replace placeholders with actual prop values
  Object.entries({ ...block.defaultProps, ...props }).forEach(([key, value]) => {
    const placeholder = new RegExp(`\\{${key}\\}`, "g");
    code = code.replace(placeholder, typeof value === "object" ? JSON.stringify(value) : String(value));
  });

  return code;
};

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("Failed to copy:", err);
    return false;
  }
};
