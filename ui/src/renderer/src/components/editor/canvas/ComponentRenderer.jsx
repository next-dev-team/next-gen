import React from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Badge } from "../../ui/badge";
import { Separator } from "../../ui/separator";
import { Switch } from "../../ui/switch";
import { Skeleton } from "../../ui/skeleton";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../../ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../ui/tabs";
import { ScrollArea } from "../../ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { InlineEditable, EditableHeading, EditableParagraph } from "./InlineEditable";
import { useEditorStore } from "../../../stores/editorStore";
import {
  Zap,
  Shield,
  Code,
  Puzzle,
  Globe,
  Headphones,
  Check,
  Star,
  Users,
  Award,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

// Icon map for feature sections
const iconMap = {
  Zap, Shield, Code, Puzzle, Globe, Headphones, Check, Star, Users, Award, Mail, Phone, MapPin,
};

// Component registry with inline editing support
const createComponentRegistry = (updateElement, isSelected) => ({
  // ============ BASIC COMPONENTS ============
  button: ({ element, props, style }) => (
    <Button
      variant={props.variant || "default"}
      size={props.size || "default"}
      className={props.className}
      style={style}
    >
      {isSelected ? (
        <InlineEditable
          value={props.children || "Button"}
          onChange={(v) => updateElement(element.id, { props: { children: v } })}
          className="inline"
        />
      ) : (
        props.children || props.label || "Button"
      )}
    </Button>
  ),

  input: ({ props, style }) => (
    <div className={`w-full max-w-sm ${props.className || ""}`} style={style}>
      <Input
        type={props.type || "text"}
        placeholder={props.placeholder || "Enter text..."}
        disabled={props.disabled}
      />
    </div>
  ),

  textarea: ({ props, style }) => (
    <div className={`w-full max-w-sm ${props.className || ""}`} style={style}>
      <textarea
        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        placeholder={props.placeholder}
        rows={props.rows || 4}
        disabled={props.disabled}
      />
    </div>
  ),

  badge: ({ element, props, style }) => (
    <Badge variant={props.variant || "default"} className={props.className} style={style}>
      {isSelected ? (
        <InlineEditable
          value={props.children || "Badge"}
          onChange={(v) => updateElement(element.id, { props: { children: v } })}
          className="inline"
        />
      ) : (
        props.children || props.label || "Badge"
      )}
    </Badge>
  ),

  separator: ({ props, style }) => (
    <Separator orientation={props.orientation || "horizontal"} className={props.className} style={style} />
  ),

  switch: ({ element, props, style }) => (
    <div className={`flex items-center gap-2 ${props.className || ""}`} style={style}>
      <Switch id={element.id} defaultChecked={props.checked} disabled={props.disabled} />
      {props.label && (
        <Label htmlFor={element.id}>
          {isSelected ? (
            <InlineEditable
              value={props.label}
              onChange={(v) => updateElement(element.id, { props: { label: v } })}
            />
          ) : (
            props.label
          )}
        </Label>
      )}
    </div>
  ),

  checkbox: ({ element, props, style }) => (
    <div className={`flex items-center gap-2 ${props.className || ""}`} style={style}>
      <input
        type="checkbox"
        id={element.id}
        defaultChecked={props.checked}
        disabled={props.disabled}
        className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
      />
      <Label htmlFor={element.id}>
        {isSelected ? (
          <InlineEditable
            value={props.label || "Checkbox"}
            onChange={(v) => updateElement(element.id, { props: { label: v } })}
          />
        ) : (
          props.label || "Checkbox"
        )}
      </Label>
    </div>
  ),

  skeleton: ({ props, style }) => (
    <Skeleton
      className={props.className}
      style={{ width: props.width || "100%", height: props.height || 20, ...style }}
    />
  ),

  label: ({ element, props, style }) => (
    <Label className={props.className} style={style}>
      {isSelected ? (
        <InlineEditable
          value={props.text || "Label"}
          onChange={(v) => updateElement(element.id, { props: { text: v } })}
        />
      ) : (
        props.text || props.children || "Label"
      )}
    </Label>
  ),

  select: ({ props, style }) => (
    <div className={props.className} style={style}>
      <Select>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={props.placeholder || "Select..."} />
        </SelectTrigger>
        <SelectContent>
          {(props.options || []).map((opt, i) => (
            <SelectItem key={i} value={opt.value || opt}>
              {opt.label || opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  ),

  progress: ({ props, style }) => (
    <div className={`w-full ${props.className || ""}`} style={style}>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${props.value || 0}%` }}
        />
      </div>
    </div>
  ),

  // ============ LAYOUT COMPONENTS ============
  card: ({ element, props, style, children }) => (
    <Card className={props.className} style={style}>
      {(props.title || isSelected) && (
        <CardHeader>
          <CardTitle>
            {isSelected ? (
              <InlineEditable
                value={props.title || "Card Title"}
                onChange={(v) => updateElement(element.id, { props: { title: v } })}
              />
            ) : (
              props.title
            )}
          </CardTitle>
          {(props.description || isSelected) && (
            <CardDescription>
              {isSelected ? (
                <InlineEditable
                  value={props.description || ""}
                  onChange={(v) => updateElement(element.id, { props: { description: v } })}
                  placeholder="Add description..."
                />
              ) : (
                props.description
              )}
            </CardDescription>
          )}
        </CardHeader>
      )}
      {(props.content || children) && (
        <CardContent>
          {isSelected && props.content ? (
            <InlineEditable
              value={props.content}
              onChange={(v) => updateElement(element.id, { props: { content: v } })}
              multiline
            />
          ) : (
            props.content || children
          )}
        </CardContent>
      )}
      {props.footer && <CardFooter>{props.footer}</CardFooter>}
    </Card>
  ),

  tabs: ({ props, style }) => (
    <div className={props.className} style={style}>
      <Tabs defaultValue={props.defaultValue || props.tabs?.[0]?.value}>
        <TabsList>
          {(props.tabs || []).map((tab, i) => (
            <TabsTrigger key={i} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {(props.tabs || []).map((tab, i) => (
          <TabsContent key={i} value={tab.value}>
            <Card>
              <CardContent className="pt-4">{tab.content}</CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  ),

  avatar: ({ props, style }) => (
    <div
      className={`relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted items-center justify-center ${props.className || ""}`}
      style={style}
    >
      {props.src ? (
        <img src={props.src} alt="" className="aspect-square h-full w-full" />
      ) : (
        <span className="text-sm font-medium">{props.fallback || "?"}</span>
      )}
    </div>
  ),

  // ============ TYPOGRAPHY ============
  heading: ({ element, props, style }) => {
    const level = parseInt(props.level) || 2;
    const styles = {
      1: "text-4xl font-extrabold tracking-tight",
      2: "text-3xl font-semibold tracking-tight",
      3: "text-2xl font-semibold tracking-tight",
      4: "text-xl font-semibold tracking-tight",
    };

    if (isSelected) {
      return (
        <EditableHeading
          value={props.text || "Heading"}
          onChange={(v) => updateElement(element.id, { props: { text: v } })}
          level={level}
          className={props.className}
          style={style}
        />
      );
    }

    const Tag = `h${level}`;
    return (
      <Tag className={`${styles[level]} ${props.className || ""}`} style={style}>
        {props.text || "Heading"}
      </Tag>
    );
  },

  paragraph: ({ element, props, style }) => {
    if (isSelected) {
      return (
        <EditableParagraph
          value={props.text || ""}
          onChange={(v) => updateElement(element.id, { props: { text: v } })}
          className={props.className}
          style={style}
          placeholder="Enter paragraph text..."
        />
      );
    }

    return (
      <p className={`leading-7 ${props.className || ""}`} style={style}>
        {props.text || "Paragraph text goes here."}
      </p>
    );
  },

  spacer: ({ props, style }) => (
    <div style={{ height: props.height || 48, ...style }} />
  ),

  divider: ({ props, style }) => {
    const spacing = { sm: "py-4", md: "py-8", lg: "py-12" };
    return (
      <div className={spacing[props.spacing] || spacing.md} style={style}>
        <Separator />
      </div>
    );
  },

  // ============ HERO BLOCKS ============
  "hero-centered": ({ element, props, style }) => (
    <section
      className={`w-full px-6 py-24 ${props.showGradient ? "bg-gradient-to-b from-background to-muted/30" : ""} ${props.className || ""}`}
      style={style}
    >
      <div className="mx-auto max-w-4xl text-center">
        {props.subheading && (
          <p className="text-sm font-semibold text-primary mb-4">
            {isSelected ? (
              <InlineEditable
                value={props.subheading}
                onChange={(v) => updateElement(element.id, { props: { subheading: v } })}
              />
            ) : (
              props.subheading
            )}
          </p>
        )}
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          {isSelected ? (
            <InlineEditable
              value={props.heading || "Hero Heading"}
              onChange={(v) => updateElement(element.id, { props: { heading: v } })}
            />
          ) : (
            props.heading || "Hero Heading"
          )}
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          {isSelected ? (
            <InlineEditable
              value={props.description || ""}
              onChange={(v) => updateElement(element.id, { props: { description: v } })}
              multiline
            />
          ) : (
            props.description || "Hero description goes here."
          )}
        </p>
        <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
          <Button size="lg" asChild>
            <a href={props.primaryHref || "#"}>
              {isSelected ? (
                <InlineEditable
                  value={props.primaryButton || "Get Started"}
                  onChange={(v) => updateElement(element.id, { props: { primaryButton: v } })}
                />
              ) : (
                props.primaryButton || "Get Started"
              )}
            </a>
          </Button>
          {props.secondaryButton && (
            <Button size="lg" variant="outline" asChild>
              <a href={props.secondaryHref || "#"}>
                {isSelected ? (
                  <InlineEditable
                    value={props.secondaryButton}
                    onChange={(v) => updateElement(element.id, { props: { secondaryButton: v } })}
                  />
                ) : (
                  props.secondaryButton
                )}
              </a>
            </Button>
          )}
        </div>
      </div>
    </section>
  ),

  hero: ({ element, props, style }) => (
    <section className={`w-full px-6 py-24 ${props.className || ""}`} style={style}>
      <div className={`mx-auto max-w-4xl text-${props.align || "center"}`}>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          {isSelected ? (
            <InlineEditable
              value={props.heading || "Hero Heading"}
              onChange={(v) => updateElement(element.id, { props: { heading: v } })}
            />
          ) : (
            props.heading || "Hero Heading"
          )}
        </h1>
        <p className="mt-6 text-lg text-muted-foreground">
          {isSelected ? (
            <InlineEditable
              value={props.description || ""}
              onChange={(v) => updateElement(element.id, { props: { description: v } })}
              multiline
            />
          ) : (
            props.description || "Hero description goes here."
          )}
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

  // ============ FEATURES ============
  "features-grid": ({ element, props, style }) => (
    <section className={`w-full px-6 py-16 ${props.className || ""}`} style={style}>
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-semibold tracking-tight">
            {isSelected ? (
              <InlineEditable
                value={props.heading || "Features"}
                onChange={(v) => updateElement(element.id, { props: { heading: v } })}
              />
            ) : (
              props.heading || "Features"
            )}
          </h2>
          <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
            {isSelected ? (
              <InlineEditable
                value={props.description || ""}
                onChange={(v) => updateElement(element.id, { props: { description: v } })}
              />
            ) : (
              props.description
            )}
          </p>
        </div>
        <div className={`grid gap-6 md:grid-cols-${props.columns || 3}`}>
          {(props.features || []).map((feature, idx) => {
            const Icon = iconMap[feature.icon] || Zap;
            return (
              <Card key={idx} className="text-center p-6">
                <div className="mx-auto w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg mb-2">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  ),

  features: ({ element, props, style }) => (
    <section className={`w-full px-6 py-16 ${props.className || ""}`} style={style}>
      <div className="mx-auto max-w-6xl">
        <h2 className="text-3xl font-semibold tracking-tight">
          {props.heading || "Features"}
        </h2>
        <p className="mt-2 text-muted-foreground max-w-2xl">{props.description}</p>
        <div className={`mt-8 grid gap-4 md:grid-cols-${props.columns || 3}`}>
          {(props.features || []).map((feature, idx) => (
            <Card key={idx}>
              <CardHeader>
                <CardTitle className="text-base">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  ),

  // ============ PRICING ============
  "pricing-simple": ({ element, props, style }) => (
    <section className={`w-full px-6 py-16 ${props.className || ""}`} style={style}>
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-semibold">
            {isSelected ? (
              <InlineEditable
                value={props.heading || "Pricing"}
                onChange={(v) => updateElement(element.id, { props: { heading: v } })}
              />
            ) : (
              props.heading || "Pricing"
            )}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {isSelected ? (
              <InlineEditable
                value={props.description || ""}
                onChange={(v) => updateElement(element.id, { props: { description: v } })}
              />
            ) : (
              props.description
            )}
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {(props.plans || []).map((plan, idx) => (
            <Card key={idx} className={`relative ${plan.popular ? "border-primary shadow-lg" : ""}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge>Most Popular</Badge>
                </div>
              )}
              <CardHeader className="text-center">
                <CardTitle>{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <CardDescription className="mt-2">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {(plan.features || []).map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant={plan.buttonVariant || "default"}>
                  {plan.buttonText || "Get Started"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  ),

  pricing: ({ props, style }) => (
    <section className={`w-full px-6 py-16 ${props.className || ""}`} style={style}>
      <div className="mx-auto max-w-6xl">
        <h2 className="text-3xl font-semibold">{props.heading || "Pricing"}</h2>
        <p className="mt-2 text-muted-foreground">{props.description}</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {(props.plans || []).map((plan, idx) => (
            <Card key={idx} className={plan.featured ? "border-primary" : ""}>
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <div className="text-3xl font-bold">
                  {plan.price}
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
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

  // ============ TESTIMONIALS ============
  "testimonials-grid": ({ element, props, style }) => (
    <section className={`w-full px-6 py-16 ${props.className || ""}`} style={style}>
      <div className="mx-auto max-w-6xl">
        <h2 className="text-3xl font-semibold text-center mb-12">
          {isSelected ? (
            <InlineEditable
              value={props.heading || "Testimonials"}
              onChange={(v) => updateElement(element.id, { props: { heading: v } })}
            />
          ) : (
            props.heading || "Testimonials"
          )}
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {(props.testimonials || []).map((t, idx) => (
            <Card key={idx}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <blockquote className="text-sm mb-4">"{t.quote}"</blockquote>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-sm font-medium">
                      {t.author?.charAt(0) || "?"}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-sm">{t.author}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.role} at {t.company}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  ),

  "testimonial-single": ({ element, props, style }) => (
    <section className={`w-full px-6 py-16 ${props.className || ""}`} style={style}>
      <Card className="mx-auto max-w-3xl">
        <CardContent className="p-8 text-center">
          <blockquote className="text-2xl font-medium leading-relaxed mb-6">
            {isSelected ? (
              <InlineEditable
                value={props.quote || ""}
                onChange={(v) => updateElement(element.id, { props: { quote: v } })}
                multiline
              />
            ) : (
              `"${props.quote}"`
            )}
          </blockquote>
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <span className="text-lg font-medium">{props.author?.charAt(0) || "?"}</span>
            </div>
            <div className="text-left">
              <div className="font-medium">
                {isSelected ? (
                  <InlineEditable
                    value={props.author || "Author"}
                    onChange={(v) => updateElement(element.id, { props: { author: v } })}
                  />
                ) : (
                  props.author
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {props.role} at {props.company}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  ),

  testimonial: ({ element, props, style }) => (
    <Card className={`mx-auto max-w-2xl ${props.className || ""}`} style={style}>
      <CardContent className="pt-6">
        <blockquote className="text-xl font-medium">
          "{props.quote || "Great product!"}"
        </blockquote>
        <div className="mt-4 text-sm text-muted-foreground">
          {props.author} · {props.role} at {props.company}
        </div>
      </CardContent>
    </Card>
  ),

  // ============ CTA ============
  "cta-simple": ({ element, props, style }) => (
    <section className={`w-full px-6 py-16 ${props.className || ""}`} style={style}>
      <Card className="mx-auto max-w-4xl">
        <CardContent className="p-8 text-center">
          <h2 className="text-2xl font-semibold mb-2">
            {isSelected ? (
              <InlineEditable
                value={props.heading || "Ready to get started?"}
                onChange={(v) => updateElement(element.id, { props: { heading: v } })}
              />
            ) : (
              props.heading || "Ready to get started?"
            )}
          </h2>
          <p className="text-muted-foreground mb-6">
            {isSelected ? (
              <InlineEditable
                value={props.description || ""}
                onChange={(v) => updateElement(element.id, { props: { description: v } })}
              />
            ) : (
              props.description
            )}
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Button asChild>
              <a href={props.primaryHref || "#"}>{props.primaryButton || "Get Started"}</a>
            </Button>
            {props.secondaryButton && (
              <Button variant="outline" asChild>
                <a href={props.secondaryHref || "#"}>{props.secondaryButton}</a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  ),

  cta: ({ props, style }) => (
    <section className={`w-full px-6 py-16 ${props.className || ""}`} style={style}>
      <Card className="mx-auto max-w-4xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{props.heading || "Call to Action"}</CardTitle>
          <CardDescription>{props.description}</CardDescription>
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

  // ============ FORMS ============
  "form-contact": ({ element, props, style }) => (
    <section className={`w-full px-6 py-16 ${props.className || ""}`} style={style}>
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>
            {isSelected ? (
              <InlineEditable
                value={props.heading || "Contact Us"}
                onChange={(v) => updateElement(element.id, { props: { heading: v } })}
              />
            ) : (
              props.heading || "Contact Us"
            )}
          </CardTitle>
          <CardDescription>
            {isSelected ? (
              <InlineEditable
                value={props.description || ""}
                onChange={(v) => updateElement(element.id, { props: { description: v } })}
              />
            ) : (
              props.description
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(props.fields || []).map((field, idx) => (
            <div key={idx} className="space-y-2">
              <Label>{field.label}</Label>
              {field.type === "textarea" ? (
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder={field.placeholder}
                />
              ) : (
                <Input type={field.type} placeholder={field.placeholder} />
              )}
            </div>
          ))}
        </CardContent>
        <CardFooter>
          <Button className="w-full">{props.submitButton || "Submit"}</Button>
        </CardFooter>
      </Card>
    </section>
  ),

  form: ({ props, style }) => (
    <Card className={`mx-auto max-w-lg ${props.className || ""}`} style={style}>
      <CardHeader>
        <CardTitle>{props.title || "Contact Form"}</CardTitle>
        <CardDescription>{props.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(props.fields || []).map((field, idx) => (
          <div key={idx} className="space-y-2">
            <Label>{field.label || "Field"}</Label>
            <Input type={field.type || "text"} placeholder={field.placeholder} />
          </div>
        ))}
      </CardContent>
      <CardFooter>
        <Button className="w-full">{props.submitLabel || "Submit"}</Button>
      </CardFooter>
    </Card>
  ),

  // ============ STATS ============
  "stats-simple": ({ element, props, style }) => (
    <section className={`w-full px-6 py-16 ${props.className || ""}`} style={style}>
      <div className="mx-auto max-w-6xl">
        {props.heading && (
          <h2 className="text-3xl font-semibold text-center mb-12">
            {isSelected ? (
              <InlineEditable
                value={props.heading}
                onChange={(v) => updateElement(element.id, { props: { heading: v } })}
              />
            ) : (
              props.heading
            )}
          </h2>
        )}
        <div className="grid gap-6 md:grid-cols-4">
          {(props.stats || []).map((stat, idx) => (
            <div key={idx} className="text-center">
              <div className="text-4xl font-bold text-primary">{stat.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
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

  // ============ FAQ ============
  "faq-accordion": ({ element, props, style }) => (
    <section className={`w-full px-6 py-16 ${props.className || ""}`} style={style}>
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-semibold">
            {isSelected ? (
              <InlineEditable
                value={props.heading || "FAQ"}
                onChange={(v) => updateElement(element.id, { props: { heading: v } })}
              />
            ) : (
              props.heading || "FAQ"
            )}
          </h2>
          <p className="mt-2 text-muted-foreground">{props.description}</p>
        </div>
        <div className="space-y-4">
          {(props.items || []).map((item, idx) => (
            <Card key={idx}>
              <CardHeader className="cursor-pointer">
                <CardTitle className="text-base">{item.question}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{item.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  ),

  faq: ({ props, style }) => (
    <section className={`w-full px-6 py-16 ${props.className || ""}`} style={style}>
      <div className="mx-auto max-w-4xl">
        <h2 className="text-3xl font-semibold">{props.heading || "FAQ"}</h2>
        <div className="mt-8 space-y-4">
          {(props.items || []).map((item, idx) => (
            <div key={idx} className="space-y-2">
              <h3 className="font-medium">{item.question}</h3>
              <p className="text-muted-foreground">{item.answer}</p>
              <Separator />
            </div>
          ))}
        </div>
      </div>
    </section>
  ),

  // ============ LOGO CLOUD ============
  "logo-cloud": ({ element, props, style }) => (
    <section className={`w-full px-6 py-12 ${props.className || ""}`} style={style}>
      <div className="mx-auto max-w-6xl">
        <p className="text-center text-sm text-muted-foreground mb-8">
          {isSelected ? (
            <InlineEditable
              value={props.heading || "Trusted by industry leaders"}
              onChange={(v) => updateElement(element.id, { props: { heading: v } })}
            />
          ) : (
            props.heading || "Trusted by industry leaders"
          )}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8">
          {(props.logos || []).map((logo, idx) => (
            <div key={idx} className="text-2xl font-bold text-muted-foreground/50">
              {logo}
            </div>
          ))}
        </div>
      </div>
    </section>
  ),

  // ============ ALERT ============
  alert: ({ element, props, style }) => (
    <div
      className={`rounded-lg border p-4 ${
        props.variant === "destructive"
          ? "border-destructive/50 text-destructive bg-destructive/10"
          : "border-border"
      } ${props.className || ""}`}
      style={style}
    >
      <h5 className="font-medium mb-1">
        {isSelected ? (
          <InlineEditable
            value={props.title || "Alert"}
            onChange={(v) => updateElement(element.id, { props: { title: v } })}
          />
        ) : (
          props.title || "Alert"
        )}
      </h5>
      <p className="text-sm text-muted-foreground">
        {isSelected ? (
          <InlineEditable
            value={props.description || ""}
            onChange={(v) => updateElement(element.id, { props: { description: v } })}
          />
        ) : (
          props.description
        )}
      </p>
    </div>
  ),

  // ============ TABLE ============
  table: ({ props, style }) => (
    <div className={`rounded-md border ${props.className || ""}`} style={style}>
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            {(props.headers || []).map((h, i) => (
              <th key={i} className="px-4 py-3 text-left text-sm font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(props.rows || []).map((row, i) => (
            <tr key={i} className="border-b">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-sm">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),
});

// Default fallback component
const FallbackComponent = ({ element }) => (
  <div className="p-4 border border-dashed border-muted-foreground/30 rounded-md bg-muted/20">
    <div className="text-sm text-muted-foreground">
      Unknown component: <code className="bg-muted px-1 rounded">{element.type}</code>
    </div>
  </div>
);

export function ComponentRenderer({ element, isSelected = false }) {
  const { type, props = {}, style = {}, children = [] } = element;
  const updateElement = useEditorStore((s) => s.updateElement);

  // Create registry with current update function and selection state
  const componentRegistry = createComponentRegistry(updateElement, isSelected);

  // Normalize type: handle hyphenated names
  let normalizedType = type?.toLowerCase() || "";
  let inferredProps = { ...props };

  // Handle component variants like "button-destructive"
  if (normalizedType.includes("-") && !componentRegistry[normalizedType]) {
    const parts = normalizedType.split("-");
    const baseType = parts[0];
    const variant = parts.slice(1).join("-");

    if (componentRegistry[baseType]) {
      normalizedType = baseType;
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
      ? children.map((child) => (
          <ComponentRenderer key={child.id} element={child} isSelected={false} />
        ))
      : null;

  return (
    <Component
      element={element}
      props={inferredProps}
      style={style}
      children={renderedChildren}
    />
  );
}
