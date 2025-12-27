import React, { useMemo } from "react";
import { Puck } from "@measured/puck";
import "@measured/puck/puck.css";
import { usePuckStore } from "../stores/puckStore";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

const textAreaClassName =
  "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const fieldOverrides = {
  fieldTypes: {
    text: ({ onChange, value }) => (
      <Input
        value={value ?? ""}
        onChange={(e) => onChange(e.currentTarget.value)}
      />
    ),
    richtext: ({ onChange, value }) => (
      <textarea
        className={textAreaClassName}
        value={value ?? ""}
        onChange={(e) => onChange(e.currentTarget.value)}
      />
    ),
    textarea: ({ onChange, value }) => (
      <textarea
        className={textAreaClassName}
        value={value ?? ""}
        onChange={(e) => onChange(e.currentTarget.value)}
      />
    ),
    number: ({ onChange, value }) => (
      <Input
        type="number"
        value={value ?? ""}
        onChange={(e) => {
          const v = e.currentTarget.value;
          onChange(v === "" ? undefined : Number(v));
        }}
      />
    ),
    select: ({ field, onChange, value }) => (
      <Select value={value ?? ""} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={field?.placeholder || "Select"} />
        </SelectTrigger>
        <SelectContent>
          {(field?.options || []).map((opt) => (
            <SelectItem key={String(opt.value)} value={String(opt.value)}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ),
    radio: ({ field, onChange, value }) => (
      <div className="flex flex-wrap gap-2">
        {(field?.options || []).map((opt) => (
          <Button
            key={String(opt.value)}
            type="button"
            variant={
              String(value) === String(opt.value) ? "default" : "outline"
            }
            size="sm"
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>
    ),
  },
};

const presetFactories = {
  Button: () => ({
    fields: {
      label: { type: "text" },
      variant: {
        type: "select",
        options: [
          { label: "Default", value: "default" },
          { label: "Secondary", value: "secondary" },
          { label: "Outline", value: "outline" },
          { label: "Destructive", value: "destructive" },
          { label: "Ghost", value: "ghost" },
          { label: "Link", value: "link" },
        ],
      },
    },
    defaultProps: { label: "Button", variant: "default" },
    render: ({ label, variant }) => <Button variant={variant}>{label}</Button>,
  }),
  Badge: () => ({
    fields: {
      label: { type: "text" },
      variant: {
        type: "select",
        options: [
          { label: "Default", value: "default" },
          { label: "Secondary", value: "secondary" },
          { label: "Destructive", value: "destructive" },
          { label: "Outline", value: "outline" },
        ],
      },
    },
    defaultProps: { label: "Badge", variant: "default" },
    render: ({ label, variant }) => <Badge variant={variant}>{label}</Badge>,
  }),
  Input: () => ({
    fields: {
      placeholder: { type: "text" },
      type: {
        type: "select",
        options: [
          { label: "Text", value: "text" },
          { label: "Email", value: "email" },
          { label: "Password", value: "password" },
          { label: "Number", value: "number" },
        ],
      },
    },
    defaultProps: { placeholder: "Type here...", type: "text" },
    render: ({ placeholder, type }) => (
      <Input type={type} placeholder={placeholder} />
    ),
  }),
  Card: () => ({
    fields: {
      title: { type: "text" },
      description: { type: "text" },
      content: { type: "textarea" },
      footer: { type: "text" },
    },
    defaultProps: {
      title: "Card Title",
      description: "Card Description",
      content: "Card Content",
      footer: "Footer",
    },
    render: ({ title, description, content, footer }) => (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{content}</p>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">{footer}</p>
        </CardFooter>
      </Card>
    ),
  }),
  Hero: () => ({
    fields: {
      heading: { type: "text" },
      description: { type: "richtext", contentEditable: true },
      align: {
        type: "radio",
        options: [
          { label: "Left", value: "left" },
          { label: "Center", value: "center" },
          { label: "Right", value: "right" },
        ],
      },
      actions: {
        type: "array",
        min: 0,
        arrayFields: {
          label: { type: "text" },
          href: { type: "text" },
          variant: {
            type: "select",
            options: [
              { label: "Default", value: "default" },
              { label: "Secondary", value: "secondary" },
              { label: "Outline", value: "outline" },
              { label: "Link", value: "link" },
            ],
          },
        },
        getItemSummary: (item) => item?.label || "Action",
      },
    },
    defaultProps: {
      heading: "Generative UI for your existing components",
      description:
        "Scale your product UI instantly with business-aware, consistent, scalable outputs — powered by your React components.",
      align: "left",
      actions: [
        { label: "Get started", href: "#", variant: "default" },
        { label: "Learn more", href: "#", variant: "outline" },
      ],
    },
    render: ({ heading, description, align, actions }) => {
      const alignClass =
        align === "center"
          ? "text-center items-center"
          : align === "right"
          ? "text-right items-end"
          : "text-left items-start";
      return (
        <section className="w-full px-6 py-16">
          <div
            className={`mx-auto max-w-4xl flex flex-col gap-6 ${alignClass}`}
          >
            <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
              {heading}
            </h1>
            <div className="text-base text-muted-foreground max-w-2xl">
              {typeof description === "string" ? (
                <p>{description}</p>
              ) : (
                description
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {(actions || []).map((a, idx) => (
                <Button key={idx} variant={a.variant || "default"} asChild>
                  <a href={a.href || "#"}>{a.label || "Action"}</a>
                </Button>
              ))}
            </div>
          </div>
        </section>
      );
    },
  }),
};

const safePreset = (preset) => (presetFactories[preset] ? preset : "Card");

export function PuckEditor() {
  const puckData = usePuckStore((s) => s.puckData);
  const setPuckData = usePuckStore((s) => s.setPuckData);
  const fontFamily = usePuckStore((s) => s.designSystem.fontFamily);
  const baseFontSize = usePuckStore((s) => s.designSystem.baseFontSize);
  const blockRegistry = usePuckStore((s) => s.blockRegistry);

  const config = useMemo(() => {
    const builtins = {
      HeadingBlock: {
        label: "Heading",
        fields: {
          title: { type: "text" },
          level: {
            type: "select",
            options: [
              { label: "H1", value: "1" },
              { label: "H2", value: "2" },
              { label: "H3", value: "3" },
              { label: "H4", value: "4" },
            ],
          },
        },
        defaultProps: { title: "Heading", level: "2" },
        render: ({ title, level }) => {
          const Tag = `h${level}`;
          const styles = {
            1: "text-4xl font-extrabold tracking-tight lg:text-5xl",
            2: "text-3xl font-semibold tracking-tight",
            3: "text-2xl font-semibold tracking-tight",
            4: "text-xl font-semibold tracking-tight",
          };
          return (
            <Tag className={styles[level] || styles[2]} style={{ fontFamily }}>
              {title}
            </Tag>
          );
        },
      },
      ParagraphBlock: {
        label: "Paragraph",
        fields: {
          content: { type: "richtext", contentEditable: true },
        },
        defaultProps: { content: "Write something…" },
        render: ({ content }) => (
          <div
            className="leading-7"
            style={{ fontFamily, fontSize: baseFontSize }}
          >
            {typeof content === "string" ? <p>{content}</p> : content}
          </div>
        ),
      },
      SpacerBlock: {
        label: "Spacer",
        fields: {
          height: { type: "number" },
        },
        defaultProps: { height: 24 },
        render: ({ height }) => <div style={{ height: Number(height) || 0 }} />,
      },
      HeroBlock: { label: "Hero", ...presetFactories.Hero() },
      CardBlock: { label: "Card", ...presetFactories.Card() },
      ButtonBlock: { label: "Button", ...presetFactories.Button() },
      BadgeBlock: { label: "Badge", ...presetFactories.Badge() },
      InputBlock: { label: "Input", ...presetFactories.Input() },
    };

    const dynamic = Object.entries(blockRegistry || {}).reduce(
      (acc, [key, entry]) => {
        const preset = safePreset(entry?.preset);
        acc[key] = {
          label: entry?.name || key,
          ...presetFactories[preset](),
        };
        return acc;
      },
      {}
    );

    return {
      root: {
        fields: {
          title: { type: "text" },
        },
        defaultProps: {
          title: "My Page",
        },
        render: ({ children }) => <div className="min-h-full">{children}</div>,
      },
      categories: {
        layout: {
          title: "Layout",
          defaultExpanded: true,
          components: ["HeroBlock", "CardBlock", "SpacerBlock"],
        },
        typography: {
          title: "Typography",
          defaultExpanded: true,
          components: ["HeadingBlock", "ParagraphBlock"],
        },
        ui: {
          title: "UI",
          defaultExpanded: true,
          components: ["ButtonBlock", "BadgeBlock", "InputBlock"],
        },
        custom: {
          title: "Custom",
          defaultExpanded: false,
          components: Object.keys(dynamic),
        },
      },
      components: {
        ...builtins,
        ...dynamic,
      },
    };
  }, [baseFontSize, blockRegistry, fontFamily]);

  return (
    <div className="h-full w-full">
      <Puck
        config={config}
        data={puckData}
        onPublish={setPuckData}
        onChange={setPuckData}
        overrides={fieldOverrides}
      />
    </div>
  );
}
