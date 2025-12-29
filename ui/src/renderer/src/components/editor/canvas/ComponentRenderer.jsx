import React from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Badge } from "../../ui/badge";
import { Separator } from "../../ui/separator";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../../ui/card";
import { Switch } from "../../ui/switch";
import { Skeleton } from "../../ui/skeleton";

// Component registry mapping type names to React components
const componentRegistry = {
  // UI Components
  button: ({ props, style }) => (
    <Button variant={props.variant || "default"} size={props.size || "default"} style={style}>
      {props.children || props.label || "Button"}
    </Button>
  ),

  input: ({ props, style }) => (
    <div className="w-full max-w-sm" style={style}>
      <Input
        type={props.type || "text"}
        placeholder={props.placeholder || "Enter text..."}
        defaultValue={props.value}
      />
    </div>
  ),

  badge: ({ props, style }) => (
    <Badge variant={props.variant || "default"} style={style}>
      {props.children || props.label || "Badge"}
    </Badge>
  ),

  separator: ({ props, style }) => (
    <Separator orientation={props.orientation || "horizontal"} style={style} />
  ),

  switch: ({ props, style }) => (
    <div className="flex items-center gap-2" style={style}>
      <Switch id={props.id} defaultChecked={props.checked} />
      {props.label && <Label htmlFor={props.id}>{props.label}</Label>}
    </div>
  ),

  skeleton: ({ props, style }) => (
    <Skeleton
      className={`h-${props.height || 4} w-${props.width || "full"}`}
      style={style}
    />
  ),

  label: ({ props, style }) => (
    <Label style={style}>{props.children || props.text || "Label"}</Label>
  ),

  // Layout Components
  card: ({ props, style, children }) => (
    <Card className={props.className} style={style}>
      {props.title && (
        <CardHeader>
          <CardTitle>{props.title}</CardTitle>
          {props.description && <CardDescription>{props.description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>{props.content || props.children || children}</CardContent>
      {props.footer && <CardFooter>{props.footer}</CardFooter>}
    </Card>
  ),

  // Block Components
  hero: ({ props, style }) => (
    <section
      className={`w-full px-6 py-24 ${props.className || ""}`}
      style={style}
    >
      <div className={`mx-auto max-w-4xl text-${props.align || "center"}`}>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          {props.heading || "Hero Heading"}
        </h1>
        <p className="mt-6 text-lg text-muted-foreground">
          {props.description || "Hero description goes here."}
        </p>
        <div className={`mt-10 flex items-center justify-${props.align || "center"} gap-4`}>
          <Button asChild>
            <a href={props.primaryHref || "#"}>
              {props.primaryLabel || "Get Started"}
            </a>
          </Button>
          {props.secondaryLabel && (
            <Button variant="outline" asChild>
              <a href={props.secondaryHref || "#"}>{props.secondaryLabel}</a>
            </Button>
          )}
        </div>
      </div>
    </section>
  ),

  features: ({ props, style }) => (
    <section className={`w-full px-6 py-16 ${props.className || ""}`} style={style}>
      <div className="mx-auto max-w-6xl">
        <h2 className="text-3xl font-semibold tracking-tight">{props.heading || "Features"}</h2>
        <p className="mt-2 text-muted-foreground max-w-2xl">
          {props.description || "Feature description"}
        </p>
        <div className={`mt-8 grid gap-4 md:grid-cols-${props.columns || 3}`}>
          {(props.features || []).map((feature, idx) => (
            <Card key={idx}>
              <CardHeader>
                <CardTitle className="text-base">{feature.title || "Feature"}</CardTitle>
                <CardDescription>{feature.description || ""}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  ),

  cta: ({ props, style }) => (
    <section className={`w-full px-6 py-16 ${props.className || ""}`} style={style}>
      <Card className="mx-auto max-w-4xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{props.heading || "Call to Action"}</CardTitle>
          <CardDescription>{props.description || ""}</CardDescription>
        </CardHeader>
        <CardFooter className="justify-center gap-3">
          <Button asChild>
            <a href={props.primaryHref || "#"}>{props.primaryLabel || "Primary"}</a>
          </Button>
          {props.secondaryLabel && (
            <Button variant="outline" asChild>
              <a href={props.secondaryHref || "#"}>{props.secondaryLabel}</a>
            </Button>
          )}
        </CardFooter>
      </Card>
    </section>
  ),

  pricing: ({ props, style }) => (
    <section className={`w-full px-6 py-16 ${props.className || ""}`} style={style}>
      <div className="mx-auto max-w-6xl">
        <h2 className="text-3xl font-semibold">{props.heading || "Pricing"}</h2>
        <p className="mt-2 text-muted-foreground">{props.description || ""}</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {(props.plans || []).map((plan, idx) => (
            <Card key={idx} className={plan.featured ? "border-primary" : ""}>
              <CardHeader>
                <CardTitle>{plan.name || "Plan"}</CardTitle>
                <div className="text-3xl font-bold">
                  {plan.price || "$0"}
                  <span className="text-sm text-muted-foreground">{plan.period || ""}</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {(plan.features || []).map((f, i) => (
                    <li key={i}>✓ {f}</li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant={plan.featured ? "default" : "outline"}>
                  {plan.ctaLabel || "Select"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  ),

  testimonial: ({ props, style }) => (
    <Card className={`mx-auto max-w-2xl ${props.className || ""}`} style={style}>
      <CardContent className="pt-6">
        <blockquote className="text-xl font-medium">
          "{props.quote || "Great product!"}"
        </blockquote>
        <div className="mt-4 text-sm text-muted-foreground">
          {props.author || "Author"} · {props.role || "Role"} at {props.company || "Company"}
        </div>
      </CardContent>
    </Card>
  ),

  faq: ({ props, style }) => (
    <section className={`w-full px-6 py-16 ${props.className || ""}`} style={style}>
      <div className="mx-auto max-w-4xl">
        <h2 className="text-3xl font-semibold">{props.heading || "FAQ"}</h2>
        <div className="mt-8 space-y-4">
          {(props.items || []).map((item, idx) => (
            <div key={idx} className="space-y-2">
              <h3 className="font-medium">{item.question || "Question"}</h3>
              <p className="text-muted-foreground">{item.answer || ""}</p>
              <Separator />
            </div>
          ))}
        </div>
      </div>
    </section>
  ),

  stats: ({ props, style }) => (
    <div className={`grid gap-4 md:grid-cols-3 ${props.className || ""}`} style={style}>
      {(props.stats || []).map((stat, idx) => (
        <Card key={idx}>
          <CardHeader>
            <CardTitle className="text-3xl">{stat.value || "0"}</CardTitle>
            <CardDescription>{stat.label || "Stat"}</CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  ),

  heading: ({ props, style }) => {
    const Tag = `h${props.level || 2}`;
    const styles = {
      1: "text-4xl font-extrabold tracking-tight",
      2: "text-3xl font-semibold tracking-tight",
      3: "text-2xl font-semibold tracking-tight",
      4: "text-xl font-semibold tracking-tight",
    };
    return (
      <Tag className={styles[props.level] || styles[2]} style={style}>
        {props.text || "Heading"}
      </Tag>
    );
  },

  paragraph: ({ props, style }) => (
    <p className="leading-7" style={style}>
      {props.text || "Paragraph text goes here."}
    </p>
  ),

  spacer: ({ props, style }) => (
    <div style={{ height: props.height || 48, ...style }} />
  ),

  form: ({ props, style }) => (
    <Card className={`mx-auto max-w-lg ${props.className || ""}`} style={style}>
      <CardHeader>
        <CardTitle>{props.title || "Contact Form"}</CardTitle>
        <CardDescription>{props.description || ""}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(props.fields || []).map((field, idx) => (
          <div key={idx} className="space-y-2">
            <Label>{field.label || "Field"}</Label>
            <Input type={field.type || "text"} placeholder={field.placeholder || ""} />
          </div>
        ))}
      </CardContent>
      <CardFooter>
        <Button className="w-full">{props.submitLabel || "Submit"}</Button>
      </CardFooter>
    </Card>
  ),
};

// Default fallback component
const FallbackComponent = ({ element }) => (
  <div className="p-4 border border-dashed border-muted-foreground/30 rounded-md bg-muted/20">
    <div className="text-sm text-muted-foreground">
      Unknown component: <code>{element.type}</code>
    </div>
  </div>
);

export function ComponentRenderer({ element }) {
  const { type, props = {}, style = {}, children = [] } = element;

  // Normalize type: handle hyphenated names like "button-destructive" -> "button" with variant
  let normalizedType = type?.toLowerCase() || "";
  let inferredProps = { ...props };

  // Handle component variants like "button-destructive", "button-outline"
  if (normalizedType.includes("-")) {
    const parts = normalizedType.split("-");
    const baseType = parts[0];
    const variant = parts.slice(1).join("-");
    
    // Check if base type exists in registry
    if (componentRegistry[baseType]) {
      normalizedType = baseType;
      // Infer variant prop if not already set
      if (!inferredProps.variant && variant) {
        inferredProps.variant = variant;
      }
    }
  }

  // Get component from registry
  const Component = componentRegistry[normalizedType];

  if (!Component) {
    return <FallbackComponent element={element} />;
  }

  // Render children recursively
  const renderedChildren =
    children.length > 0
      ? children.map((child) => <ComponentRenderer key={child.id} element={child} />)
      : null;

  return <Component props={inferredProps} style={style} children={renderedChildren} />;
}
