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
    ([key, value]) =>
      !excludeKeys.includes(key) && value !== undefined && value !== ""
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
/**
 * Generate JSX for a single element
 */
const elementToJsx = (element, level = 0) => {
  const { type, props = {}, style, children } = element;

  let tagName = toPascalCase(type);
  let attributes = { ...props };
  let className = props.className || "";

  // Transform internal types to valid JSX/HTML
  if (type === "section-container") {
    tagName = "section";
    const padding = props.padding ? `py-${props.padding}` : "py-16";
    const bg =
      props.background === "muted"
        ? "bg-muted/30"
        : props.background === "gradient"
        ? "bg-gradient-to-b from-background to-muted/30"
        : props.background === "primary"
        ? "bg-primary/5"
        : "";

    // We need to wrap content in a container div for max-width
    const maxWidth = props.maxWidth || "6xl";
    const layout = props.layout || "vertical";
    const align = props.align || "center";

    const layoutClasses = {
      vertical: "flex flex-col",
      horizontal: "flex flex-row flex-wrap",
      "grid-2": "grid grid-cols-1 md:grid-cols-2",
      "grid-3": "grid grid-cols-1 md:grid-cols-3",
    };

    const alignClasses = {
      left: "items-start text-left",
      center: "items-center text-center",
      right: "items-end text-right",
    };

    // Construct the outer section class
    className = `w-full px-6 ${padding} ${bg} ${className}`.trim();

    // For section container, we generate the wrapper manually
    const wrapperClass = `mx-auto max-w-${maxWidth} ${layoutClasses[layout]} ${alignClasses[align]} gap-4`;

    // Filter out internal props
    const {
      padding: _,
      background: __,
      maxWidth: ___,
      layout: ____,
      align: _____,
      ...restProps
    } = attributes;
    const finalPropsStr = propsToJsx(restProps, ["className", "children"]);

    const childrenJsx =
      children && children.length > 0
        ? children.map((child) => elementToJsx(child, level + 2)).join("\n")
        : "";

    return indent(
      `<section className="${className}"${
        finalPropsStr ? " " + finalPropsStr : ""
      }>
${indent(`<div className="${wrapperClass}">`, level + 1)}
${childrenJsx}
${indent(`</div>`, level + 1)}
</section>`,
      level
    );
  }

  if (type === "flex-row") {
    tagName = "div";
    const gap = props.gap || 4;
    const align = props.align || "center";
    const justify = props.justify || "start";
    const wrap = props.wrap ? "flex-wrap" : "";

    className =
      `flex flex-row gap-${gap} items-${align} justify-${justify} ${wrap} ${className}`.trim();

    // Filter internal props
    const {
      gap: _,
      align: __,
      justify: ___,
      wrap: ____,
      ...restProps
    } = attributes;
    attributes = restProps;
  }

  if (type === "flex-column") {
    tagName = "div";
    const gap = props.gap || 4;
    const align = props.align || "stretch";

    className = `flex flex-col gap-${gap} items-${align} ${className}`.trim();

    // Filter internal props
    const { gap: _, align: __, ...restProps } = attributes;
    attributes = restProps;
  }

  if (type === "card-root") {
    tagName = "Card";
    // Clean up internal props
    delete attributes.width;
  }

  if (type === "card-header") {
    tagName = "CardHeader";
  }

  if (type === "card-content") {
    tagName = "CardContent";
    const layout = props.layout || "stack";
    if (layout === "grid") {
      className = `grid gap-4 ${className}`.trim();
    } else {
      className = `flex flex-col space-y-2 ${className}`.trim();
    }
    delete attributes.layout;
  }

  if (type === "card-footer") {
    tagName = "CardFooter";
    const justify = props.justify || "between";
    className = `flex justify-${justify} ${className}`.trim();
    delete attributes.justify;
  }

  if (type === "card-title") {
    tagName = "CardTitle";
    // Clean up text prop as it is rendered as child
    delete attributes.text;
  }

  if (type === "card-description") {
    tagName = "CardDescription";
    delete attributes.text;
  }

  // Legacy/Fallback for any old card-container on canvas
  if (type === "card-container") {
    tagName = "Card";
    const showHeader = props.showHeader !== false;
    const showFooter = props.showFooter === true;

    const childrenJsx =
      children && children.length > 0
        ? children.map((c) => elementToJsx(c, level + 2)).join("\n")
        : "";

    let cardInner = "";

    if (showHeader && (props.title || props.description)) {
      cardInner +=
        indent(
          `<CardHeader>
  ${props.title ? `<CardTitle>${props.title}</CardTitle>` : ""}
  ${
    props.description
      ? `<CardDescription>${props.description}</CardDescription>`
      : ""
  }
</CardHeader>`,
          level + 1
        ) + "\n";
    }

    cardInner += indent(
      `<CardContent>
${childrenJsx}
</CardContent>`,
      level + 1
    );

    if (showFooter) {
      cardInner +=
        "\n" +
        indent(`<CardFooter>\n  <p>Card Footer</p>\n</CardFooter>`, level + 1);
    }

    // Fix: allAttrs is not defined yet, so we calculate attributes locally
    const {
      showHeader: _sh,
      showFooter: _sf,
      title: _t,
      description: _d,
      ...restProps
    } = attributes;

    const cardPropsStr = propsToJsx(restProps, ["children"]);
    const cardStyleStr = styleToJsx(style);
    const cardAttrs = [cardPropsStr, cardStyleStr].filter(Boolean).join(" ");

    return indent(
      `<Card${cardAttrs ? " " + cardAttrs : ""}>\n${cardInner}\n</Card>`,
      level
    );
  }

  // Handle heading levels
  if (["heading", "h1", "h2", "h3", "h4", "h5", "h6"].includes(type)) {
    const level = props.level || 1;
    tagName = `h${level}`;
    const sizeMap = {
      1: "text-4xl font-extrabold tracking-tight lg:text-5xl",
      2: "text-3xl font-semibold tracking-tight",
      3: "text-2xl font-semibold tracking-tight",
      4: "text-xl font-semibold tracking-tight",
    };
    if (!className) className = sizeMap[level] || "";
    delete attributes.level;
    delete attributes.text; // Text is usually children
  }

  if (type === "paragraph") {
    tagName = "p";
    if (!className) className = "leading-7 [&:not(:first-child)]:mt-6";
    delete attributes.text;
  }

  if (type === "button") {
    tagName = "Button";
    // Keep variant, size etc.
    delete attributes.text; // Text is child
  }

  // Clean up attributes
  if (className) attributes.className = className;

  const propsStr = propsToJsx(attributes, ["children", "className"]);
  const styleStr = styleToJsx(style);
  const allAttrs = [propsStr, styleStr].filter(Boolean).join(" ");

  // Handle content/children
  let content = "";

  // specialized content handling
  if (type === "card-container") {
    const showHeader = props.showHeader !== false;
    const showFooter = props.showFooter === true;

    const childrenJsx =
      children && children.length > 0
        ? children.map((c) => elementToJsx(c, level + 2)).join("\n")
        : "";

    let cardInner = "";

    if (showHeader && (props.title || props.description)) {
      cardInner +=
        indent(
          `<CardHeader>
  ${props.title ? `<CardTitle>${props.title}</CardTitle>` : ""}
  ${
    props.description
      ? `<CardDescription>${props.description}</CardDescription>`
      : ""
  }
</CardHeader>`,
          level + 1
        ) + "\n";
    }

    cardInner += indent(
      `<CardContent>
${childrenJsx}
</CardContent>`,
      level + 1
    );

    if (showFooter) {
      cardInner +=
        "\n" +
        indent(`<CardFooter>\n  <p>Card Footer</p>\n</CardFooter>`, level + 1);
    }

    return indent(
      `<Card${allAttrs ? " " + allAttrs : ""}>\n${cardInner}\n</Card>`,
      level
    );
  }

  // Generic children handling
  if (children && children.length > 0) {
    const childrenJsx = children
      .map((child) => elementToJsx(child, level + 1))
      .join("\n");
    return indent(
      `<${tagName}${
        allAttrs ? " " + allAttrs : ""
      }>\n${childrenJsx}\n</${tagName}>`,
      level
    );
  }

  // Text content from props (legacy/simple components)
  if (props.text || props.children) {
    const textContent = props.text || props.children;
    return indent(
      `<${tagName}${
        allAttrs ? " " + allAttrs : ""
      }>${textContent}</${tagName}>`,
      level
    );
  }

  // Self closing
  return indent(`<${tagName}${allAttrs ? " " + allAttrs : ""} />`, level);
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
    [
      "Card",
      "CardHeader",
      "CardTitle",
      "CardDescription",
      "CardContent",
      "CardFooter",
    ].includes(c)
  );
  const labelGroup = usedShadcn.filter((c) => c === "Label");
  const badgeGroup = usedShadcn.filter((c) => c === "Badge");
  const separatorGroup = usedShadcn.filter((c) => c === "Separator");
  const switchGroup = usedShadcn.filter((c) => c === "Switch");
  const tabsGroup = usedShadcn.filter((c) =>
    ["Tabs", "TabsList", "TabsTrigger", "TabsContent"].includes(c)
  );

  if (buttonGroup.length)
    imports.push(`import { Button } from "@/components/ui/button";`);
  if (inputGroup.length)
    imports.push(`import { Input } from "@/components/ui/input";`);
  if (cardGroup.length)
    imports.push(
      `import { ${cardGroup.join(", ")} } from "@/components/ui/card";`
    );
  if (labelGroup.length)
    imports.push(`import { Label } from "@/components/ui/label";`);
  if (badgeGroup.length)
    imports.push(`import { Badge } from "@/components/ui/badge";`);
  if (separatorGroup.length)
    imports.push(`import { Separator } from "@/components/ui/separator";`);
  if (switchGroup.length)
    imports.push(`import { Switch } from "@/components/ui/switch";`);
  if (tabsGroup.length)
    imports.push(
      `import { ${tabsGroup.join(", ")} } from "@/components/ui/tabs";`
    );

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

  return `${
    imports ? imports + "\n\n" : ""
  }export default function ${componentName}() {
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
  Object.entries({ ...block.defaultProps, ...props }).forEach(
    ([key, value]) => {
      const placeholder = new RegExp(`\\{${key}\\}`, "g");
      code = code.replace(
        placeholder,
        typeof value === "object" ? JSON.stringify(value) : String(value)
      );
    }
  );

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
