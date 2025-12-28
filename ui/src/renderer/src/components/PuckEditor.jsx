import React, { useEffect, useMemo } from "react";
import { Puck, Render, createUsePuck } from "@measured/puck";
import "@measured/puck/puck.css";
import { usePuckStore } from "../stores/puckStore";
import { components as componentLibrary } from "../data/components";
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
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Separator } from "./ui/separator";
import { Skeleton } from "./ui/skeleton";
import { Switch } from "./ui/switch";

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

const usePuck = createUsePuck();

const safeJsonObject = (value) => {
  if (typeof value !== "string") return {};
  const trimmed = value.trim();
  if (!trimmed) return {};
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
      return parsed;
  } catch {
    return {};
  }
  return {};
};

const mergeClassName = (a, b) => {
  const left = typeof a === "string" ? a.trim() : "";
  const right = typeof b === "string" ? b.trim() : "";
  if (!left) return right;
  if (!right) return left;
  return `${left} ${right}`;
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
      onClickAction: {
        type: "select",
        options: [
          { label: "None", value: "none" },
          { label: "Alert", value: "alert" },
          { label: "Open URL", value: "openUrl" },
        ],
      },
      alertText: { type: "text" },
      href: { type: "text" },
      className: { type: "text" },
      styleJson: { type: "textarea" },
    },
    defaultProps: {
      label: "Button",
      variant: "default",
      onClickAction: "none",
      alertText: "Hello",
      href: "",
      className: "",
      styleJson: "",
    },
    render: ({
      label,
      variant,
      onClickAction,
      alertText,
      href,
      className,
      styleJson,
      puck,
    }) => {
      const style = safeJsonObject(styleJson);
      const clickable =
        !puck?.isEditing && onClickAction && onClickAction !== "none";

      const onClick =
        clickable && onClickAction === "alert"
          ? () => window.alert(String(alertText || ""))
          : clickable && onClickAction === "openUrl"
          ? () => {
              if (href)
                window.open(String(href), "_blank", "noopener,noreferrer");
            }
          : undefined;

      return (
        <Button
          variant={variant}
          onClick={onClick}
          className={className}
          style={style}
        >
          {label}
        </Button>
      );
    },
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
  Switch: () => ({
    fields: {
      label: { type: "text" },
      checked: {
        type: "radio",
        options: [
          { label: "On", value: true },
          { label: "Off", value: false },
        ],
      },
    },
    defaultProps: { label: "Airplane Mode", checked: false },
    render: ({ label, checked }) => (
      <div className="flex items-center space-x-2">
        <Switch checked={checked} />
        <Label>{label}</Label>
      </div>
    ),
  }),
  Separator: () => ({
    fields: {},
    render: () => <Separator className="my-4" />,
  }),
  Skeleton: () => ({
    fields: {
      height: { type: "number" },
      width: { type: "text" },
    },
    defaultProps: { height: 20, width: "100%" },
    render: ({ height, width }) => (
      <Skeleton className="rounded-full" style={{ height, width }} />
    ),
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
  FeatureSection: () => ({
    fields: {
      heading: { type: "text" },
      description: { type: "textarea" },
      columns: {
        type: "select",
        options: [
          { label: "2", value: "2" },
          { label: "3", value: "3" },
        ],
      },
      features: {
        type: "array",
        min: 0,
        arrayFields: {
          title: { type: "text" },
          description: { type: "textarea" },
        },
        getItemSummary: (item) => item?.title || "Feature",
      },
      className: { type: "text" },
      styleJson: { type: "textarea" },
    },
    defaultProps: {
      heading: "Features",
      description: "Everything you need for enterprise teams.",
      columns: "3",
      features: [
        {
          title: "Governance",
          description:
            "Manage components, tokens, and approvals with confidence.",
        },
        {
          title: "Accessibility",
          description: "WCAG-aware styling and consistency across variants.",
        },
        {
          title: "Speed",
          description:
            "Build pages quickly with pre-built blocks and live editing.",
        },
      ],
      className: "",
      styleJson: "",
    },
    render: ({
      heading,
      description,
      columns,
      features,
      className,
      styleJson,
    }) => {
      const style = safeJsonObject(styleJson);
      const cols = String(columns) === "2" ? 2 : 3;
      return (
        <section
          className={mergeClassName("w-full px-6 py-16", className)}
          style={style}
        >
          <div className="mx-auto max-w-6xl space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight">
                {heading}
              </h2>
              <p className="text-muted-foreground max-w-2xl">{description}</p>
            </div>
            <div
              className={`grid gap-4 ${
                cols === 2 ? "md:grid-cols-2" : "md:grid-cols-3"
              }`}
            >
              {(features || []).map((f, idx) => (
                <Card key={idx} className="h-full">
                  <CardHeader>
                    <CardTitle className="text-base">
                      {f?.title || "Feature"}
                    </CardTitle>
                    <CardDescription>{f?.description || ""}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>
      );
    },
  }),
  CTASection: () => ({
    fields: {
      heading: { type: "text" },
      description: { type: "textarea" },
      primaryLabel: { type: "text" },
      primaryHref: { type: "text" },
      secondaryLabel: { type: "text" },
      secondaryHref: { type: "text" },
      className: { type: "text" },
      styleJson: { type: "textarea" },
    },
    defaultProps: {
      heading: "Ready to ship faster?",
      description:
        "Create pages with reusable blocks, consistent tokens, and audit-ready governance.",
      primaryLabel: "Get started",
      primaryHref: "#",
      secondaryLabel: "Contact sales",
      secondaryHref: "#",
      className: "",
      styleJson: "",
    },
    render: ({
      heading,
      description,
      primaryLabel,
      primaryHref,
      secondaryLabel,
      secondaryHref,
      className,
      styleJson,
    }) => {
      const style = safeJsonObject(styleJson);
      return (
        <section
          className={mergeClassName("w-full px-6 py-16", className)}
          style={style}
        >
          <div className="mx-auto max-w-4xl">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">{heading}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardFooter className="flex flex-wrap gap-3">
                <Button asChild>
                  <a href={primaryHref || "#"}>{primaryLabel || "Primary"}</a>
                </Button>
                <Button variant="outline" asChild>
                  <a href={secondaryHref || "#"}>
                    {secondaryLabel || "Secondary"}
                  </a>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </section>
      );
    },
  }),
  Form: () => ({
    fields: {
      title: { type: "text" },
      description: { type: "textarea" },
      fields: {
        type: "array",
        min: 0,
        arrayFields: {
          label: { type: "text" },
          placeholder: { type: "text" },
          type: {
            type: "select",
            options: [
              { label: "Text", value: "text" },
              { label: "Email", value: "email" },
              { label: "Password", value: "password" },
            ],
          },
        },
        getItemSummary: (item) => item?.label || "Field",
      },
      submitLabel: { type: "text" },
      onSubmitAction: {
        type: "select",
        options: [
          { label: "None", value: "none" },
          { label: "Alert", value: "alert" },
        ],
      },
      alertText: { type: "text" },
      className: { type: "text" },
      styleJson: { type: "textarea" },
    },
    defaultProps: {
      title: "Contact us",
      description: "We will get back to you within one business day.",
      fields: [
        { label: "Name", placeholder: "Jane Doe", type: "text" },
        { label: "Email", placeholder: "jane@company.com", type: "email" },
      ],
      submitLabel: "Submit",
      onSubmitAction: "alert",
      alertText: "Submitted",
      className: "",
      styleJson: "",
    },
    render: ({
      title,
      description,
      fields,
      submitLabel,
      onSubmitAction,
      alertText,
      className,
      styleJson,
      puck,
    }) => {
      const style = safeJsonObject(styleJson);
      return (
        <section
          className={mergeClassName("w-full px-6 py-16", className)}
          style={style}
        >
          <div className="mx-auto max-w-xl">
            <Card>
              <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(fields || []).map((f, idx) => (
                  <div key={idx} className="space-y-1">
                    <Label>{f?.label || "Field"}</Label>
                    <Input
                      type={f?.type || "text"}
                      placeholder={f?.placeholder || ""}
                    />
                  </div>
                ))}
              </CardContent>
              <CardFooter>
                <Button
                  type="button"
                  onClick={
                    !puck?.isEditing && onSubmitAction === "alert"
                      ? () => window.alert(String(alertText || ""))
                      : undefined
                  }
                >
                  {submitLabel || "Submit"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </section>
      );
    },
  }),
  Pricing: () => ({
    fields: {
      heading: { type: "text" },
      description: { type: "textarea" },
      plans: {
        type: "array",
        min: 0,
        arrayFields: {
          name: { type: "text" },
          price: { type: "text" },
          period: { type: "text" },
          features: { type: "textarea" },
          ctaLabel: { type: "text" },
        },
        getItemSummary: (item) => item?.name || "Plan",
      },
      className: { type: "text" },
      styleJson: { type: "textarea" },
    },
    defaultProps: {
      heading: "Pricing",
      description: "Plans that scale from teams to enterprise.",
      plans: [
        {
          name: "Starter",
          price: "$0",
          period: "mo",
          features: "Blocks and templates\nBasic governance",
          ctaLabel: "Start",
        },
        {
          name: "Pro",
          price: "$29",
          period: "mo",
          features: "Advanced blocks\nExport & import\nAudit log",
          ctaLabel: "Upgrade",
        },
        {
          name: "Enterprise",
          price: "Custom",
          period: "yr",
          features: "RBAC\nSLA\nDesign system governance",
          ctaLabel: "Contact sales",
        },
      ],
      className: "",
      styleJson: "",
    },
    render: ({ heading, description, plans, className, styleJson }) => {
      const style = safeJsonObject(styleJson);
      return (
        <section
          className={mergeClassName("w-full px-6 py-16", className)}
          style={style}
        >
          <div className="mx-auto max-w-6xl space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight">
                {heading}
              </h2>
              <p className="text-muted-foreground max-w-2xl">{description}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {(plans || []).map((p, idx) => (
                <Card key={idx} className="h-full">
                  <CardHeader>
                    <CardTitle className="text-base">
                      {p?.name || "Plan"}
                    </CardTitle>
                    <CardDescription>
                      <span className="text-2xl font-semibold text-foreground">
                        {p?.price || ""}
                      </span>
                      {p?.period ? (
                        <span className="ml-1">/{p.period}</span>
                      ) : null}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(
                      String(p?.features || "")
                        .split("\n")
                        .map((s) => s.trim())
                        .filter(Boolean) || []
                    ).map((f, fIdx) => (
                      <div key={fIdx} className="text-sm text-muted-foreground">
                        {f}
                      </div>
                    ))}
                  </CardContent>
                  <CardFooter>
                    <Button
                      variant={idx === 1 ? "default" : "outline"}
                      className="w-full"
                    >
                      {p?.ctaLabel || "Select"}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>
      );
    },
  }),
  FAQ: () => ({
    fields: {
      heading: { type: "text" },
      items: {
        type: "array",
        min: 0,
        arrayFields: {
          question: { type: "text" },
          answer: { type: "textarea" },
        },
        getItemSummary: (item) => item?.question || "Question",
      },
      className: { type: "text" },
      styleJson: { type: "textarea" },
    },
    defaultProps: {
      heading: "Frequently asked questions",
      items: [
        {
          question: "How do templates work?",
          answer:
            "Save the current page state and load it later to reuse layouts and blocks.",
        },
        {
          question: "Is there an audit log?",
          answer:
            "Yes. Common actions like editing, registering blocks, and importing/exporting are tracked.",
        },
      ],
      className: "",
      styleJson: "",
    },
    render: ({ heading, items, className, styleJson }) => {
      const style = safeJsonObject(styleJson);
      return (
        <section
          className={mergeClassName("w-full px-6 py-16", className)}
          style={style}
        >
          <div className="mx-auto max-w-4xl space-y-8">
            <h2 className="text-3xl font-semibold tracking-tight">{heading}</h2>
            <div className="space-y-4">
              {(items || []).map((it, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="font-medium">
                    {it?.question || "Question"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {it?.answer || ""}
                  </div>
                  <Separator />
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    },
  }),
  Stats: () => ({
    fields: {
      heading: { type: "text" },
      stats: {
        type: "array",
        min: 0,
        arrayFields: {
          label: { type: "text" },
          value: { type: "text" },
        },
        getItemSummary: (item) => item?.label || "Stat",
      },
      className: { type: "text" },
      styleJson: { type: "textarea" },
    },
    defaultProps: {
      heading: "Trusted by teams",
      stats: [
        { label: "Pages built", value: "10k+" },
        { label: "Teams", value: "500+" },
        { label: "Uptime", value: "99.9%" },
      ],
      className: "",
      styleJson: "",
    },
    render: ({ heading, stats, className, styleJson }) => {
      const style = safeJsonObject(styleJson);
      return (
        <section
          className={mergeClassName("w-full px-6 py-16", className)}
          style={style}
        >
          <div className="mx-auto max-w-6xl space-y-8">
            <h2 className="text-3xl font-semibold tracking-tight">{heading}</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {(stats || []).map((s, idx) => (
                <Card key={idx}>
                  <CardHeader>
                    <CardTitle className="text-3xl">
                      {s?.value || "0"}
                    </CardTitle>
                    <CardDescription>{s?.label || ""}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>
      );
    },
  }),
  LogoCloud: () => ({
    fields: {
      heading: { type: "text" },
      logos: { type: "textarea" },
      className: { type: "text" },
      styleJson: { type: "textarea" },
    },
    defaultProps: {
      heading: "Used by",
      logos:
        "Acme\nGlobex\nInitech\nUmbrella\nWayne Enterprises\nStark Industries",
      className: "",
      styleJson: "",
    },
    render: ({ heading, logos, className, styleJson }) => {
      const style = safeJsonObject(styleJson);
      const items = String(logos || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      return (
        <section
          className={mergeClassName("w-full px-6 py-16", className)}
          style={style}
        >
          <div className="mx-auto max-w-6xl space-y-6">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {heading}
            </h2>
            <div className="flex flex-wrap gap-2">
              {items.map((name, idx) => (
                <Badge key={idx} variant="secondary">
                  {name}
                </Badge>
              ))}
            </div>
          </div>
        </section>
      );
    },
  }),
  Testimonial: () => ({
    fields: {
      quote: { type: "textarea" },
      name: { type: "text" },
      title: { type: "text" },
      company: { type: "text" },
      className: { type: "text" },
      styleJson: { type: "textarea" },
    },
    defaultProps: {
      quote:
        "This editor made our design system adoption measurable and repeatable across teams.",
      name: "Alex Rivera",
      title: "Design Systems Lead",
      company: "Acme",
      className: "",
      styleJson: "",
    },
    render: ({ quote, name, title, company, className, styleJson }) => {
      const style = safeJsonObject(styleJson);
      return (
        <section
          className={mergeClassName("w-full px-6 py-16", className)}
          style={style}
        >
          <div className="mx-auto max-w-4xl">
            <Card>
              <CardContent className="p-8 space-y-4">
                <div className="text-xl font-medium leading-relaxed">
                  “{quote}”
                </div>
                <div className="text-sm text-muted-foreground">
                  {name}
                  {title ? ` · ${title}` : ""}
                  {company ? ` · ${company}` : ""}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      );
    },
  }),
};

function isEditableTarget(target) {
  const el = target && target.nodeType === 1 ? target : null;
  if (!el) return false;
  const tag = String(el.tagName || "").toUpperCase();
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  return Boolean(el.closest?.("[contenteditable='true']"));
}

function UndoRedoHeaderActions({ children }) {
  const canUndo = usePuck((s) => Boolean(s.history?.hasPast));
  const canRedo = usePuck((s) => Boolean(s.history?.hasFuture));
  const undo = usePuck((s) => s.history?.back);
  const redo = usePuck((s) => s.history?.forward);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (isEditableTarget(e.target)) return;
      const key = String(e.key || "").toLowerCase();

      if (key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo) redo?.();
        } else {
          if (canUndo) undo?.();
        }
        return;
      }

      if (key === "y") {
        e.preventDefault();
        if (canRedo) redo?.();
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [canRedo, canUndo, redo, undo]);

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={!canUndo}
        onClick={() => undo?.()}
      >
        Undo
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={!canRedo}
        onClick={() => redo?.()}
      >
        Redo
      </Button>
      {children}
    </div>
  );
}

const safePreset = (preset) => (presetFactories[preset] ? preset : "Card");

const getLibraryKey = (component) => `Library__${component.id}`;

function usePuckConfig(fontFamily, baseFontSize, blockRegistry) {
  return useMemo(() => {
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
        defaultProps: { content: "Write something..." },
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

    const library = (componentLibrary || []).reduce((acc, component) => {
      const key = getLibraryKey(component);
      acc[key] = {
        label: component.name,
        fields: {
          childrenText: { type: "text" },
          jsonProps: { type: "textarea" },
        },
        defaultProps: {
          childrenText: "",
          jsonProps: "",
        },
        render: ({ childrenText, jsonProps }) => {
          const extraProps = safeJsonObject(jsonProps);
          const element = component.preview;
          if (!React.isValidElement(element)) return element;

          const nextProps = {
            ...extraProps,
            className: mergeClassName(
              element.props?.className,
              extraProps.className
            ),
          };

          const nextChildren =
            typeof childrenText === "string" && childrenText.length > 0
              ? childrenText
              : element.props?.children;

          return React.cloneElement(element, nextProps, nextChildren);
        },
      };
      return acc;
    }, {});

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
        library: {
          title: "Components",
          defaultExpanded: true,
          components: (componentLibrary || []).map(getLibraryKey),
        },
        layout: {
          title: "Layout",
          defaultExpanded: true,
          components: [
            "HeroBlock",
            "FeatureSectionBlock",
            "CTASectionBlock",
            "CardBlock",
            "SpacerBlock",
            "SeparatorBlock",
          ],
        },
        typography: {
          title: "Typography",
          defaultExpanded: true,
          components: ["HeadingBlock", "ParagraphBlock"],
        },
        ui: {
          title: "UI",
          defaultExpanded: true,
          components: [
            "ButtonBlock",
            "BadgeBlock",
            "InputBlock",
            "SwitchBlock",
            "SkeletonBlock",
          ],
        },
        custom: {
          title: "Custom",
          defaultExpanded: false,
          components: Object.keys(dynamic),
        },
      },
      components: {
        ...builtins,
        ...library,
        ...dynamic,
      },
    };
  }, [baseFontSize, blockRegistry, fontFamily]);
}

export function PuckPreview() {
  const puckData = usePuckStore((s) => s.puckData);
  const fontFamily = usePuckStore((s) => s.designSystem.fontFamily);
  const baseFontSize = usePuckStore((s) => s.designSystem.baseFontSize);
  const blockRegistry = usePuckStore((s) => s.blockRegistry);
  const config = usePuckConfig(fontFamily, baseFontSize, blockRegistry);

  return <Render config={config} data={puckData} />;
}

export function PuckEditor() {
  const puckData = usePuckStore((s) => s.puckData);
  const setPuckData = usePuckStore((s) => s.setPuckData);
  const fontFamily = usePuckStore((s) => s.designSystem.fontFamily);
  const baseFontSize = usePuckStore((s) => s.designSystem.baseFontSize);
  const blockRegistry = usePuckStore((s) => s.blockRegistry);
  const config = usePuckConfig(fontFamily, baseFontSize, blockRegistry);

  const overrides = useMemo(
    () => ({
      ...fieldOverrides,
      headerActions: ({ children }) => (
        <UndoRedoHeaderActions>{children}</UndoRedoHeaderActions>
      ),
    }),
    []
  );

  return (
    <div className="h-full w-full">
      <Puck
        config={config}
        data={puckData}
        onPublish={setPuckData}
        onChange={setPuckData}
        overrides={overrides}
      />
    </div>
  );
}
