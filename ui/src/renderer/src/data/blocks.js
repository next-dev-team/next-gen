// Block definitions for the low-code editor
// Each block has: id, name, category, icon, defaultProps, and code template

export const blockCategories = [
  { id: "layout", name: "Layout", icon: "Layout" },
  { id: "content", name: "Content", icon: "Type" },
  { id: "forms", name: "Forms", icon: "FormInput" },
  { id: "marketing", name: "Marketing", icon: "Megaphone" },
  { id: "data", name: "Data Display", icon: "BarChart" },
];

export const blocks = [
  // ============ LAYOUT BLOCKS ============
  {
    id: "hero",
    name: "Hero Section",
    category: "layout",
    icon: "Layout",
    description: "Full-width hero with heading, description, and CTA buttons",
    defaultProps: {
      heading: "Build something amazing",
      description: "Create beautiful, production-ready pages with our low-code editor.",
      align: "center",
      primaryLabel: "Get Started",
      primaryHref: "#",
      secondaryLabel: "Learn More",
      secondaryHref: "#",
    },
    codeTemplate: `<section className="w-full px-6 py-24">
  <div className="mx-auto max-w-4xl text-{align}">
    <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
      {heading}
    </h1>
    <p className="mt-6 text-lg text-muted-foreground">
      {description}
    </p>
    <div className="mt-10 flex items-center justify-{align} gap-4">
      <Button asChild>
        <a href="{primaryHref}">{primaryLabel}</a>
      </Button>
      <Button variant="outline" asChild>
        <a href="{secondaryHref}">{secondaryLabel}</a>
      </Button>
    </div>
  </div>
</section>`,
  },
  {
    id: "features",
    name: "Features Grid",
    category: "layout",
    icon: "Grid3X3",
    description: "Grid of feature cards with icons and descriptions",
    defaultProps: {
      heading: "Features",
      description: "Everything you need to build modern applications.",
      columns: "3",
      features: [
        { title: "Fast", description: "Lightning-fast performance out of the box." },
        { title: "Flexible", description: "Customize everything to match your brand." },
        { title: "Scalable", description: "Built to grow with your needs." },
      ],
    },
    codeTemplate: `<section className="w-full px-6 py-16">
  <div className="mx-auto max-w-6xl">
    <h2 className="text-3xl font-semibold tracking-tight">{heading}</h2>
    <p className="mt-2 text-muted-foreground">{description}</p>
    <div className="mt-8 grid gap-4 md:grid-cols-{columns}">
      {features.map((feature, i) => (
        <Card key={i}>
          <CardHeader>
            <CardTitle>{feature.title}</CardTitle>
            <CardDescription>{feature.description}</CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  </div>
</section>`,
  },
  {
    id: "cta",
    name: "Call to Action",
    category: "layout",
    icon: "MousePointerClick",
    description: "Prominent CTA section with heading and buttons",
    defaultProps: {
      heading: "Ready to get started?",
      description: "Join thousands of users building with our platform.",
      primaryLabel: "Start Free",
      primaryHref: "#",
      secondaryLabel: "Contact Sales",
      secondaryHref: "#",
    },
    codeTemplate: `<section className="w-full px-6 py-16">
  <Card className="mx-auto max-w-4xl">
    <CardHeader className="text-center">
      <CardTitle className="text-2xl">{heading}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardFooter className="justify-center gap-3">
      <Button asChild>
        <a href="{primaryHref}">{primaryLabel}</a>
      </Button>
      <Button variant="outline" asChild>
        <a href="{secondaryHref}">{secondaryLabel}</a>
      </Button>
    </CardFooter>
  </Card>
</section>`,
  },
  {
    id: "spacer",
    name: "Spacer",
    category: "layout",
    icon: "SeparatorHorizontal",
    description: "Vertical spacing between sections",
    defaultProps: {
      height: 48,
    },
    codeTemplate: `<div style={{ height: {height} }} />`,
  },

  // ============ CONTENT BLOCKS ============
  {
    id: "heading",
    name: "Heading",
    category: "content",
    icon: "Heading",
    description: "Section heading with customizable level",
    defaultProps: {
      text: "Section Heading",
      level: "2",
    },
    codeTemplate: `<h{level} className="text-3xl font-semibold tracking-tight">
  {text}
</h{level}>`,
  },
  {
    id: "paragraph",
    name: "Paragraph",
    category: "content",
    icon: "AlignLeft",
    description: "Text paragraph block",
    defaultProps: {
      text: "Write your content here. This is a paragraph block that supports rich text formatting.",
    },
    codeTemplate: `<p className="leading-7">{text}</p>`,
  },
  {
    id: "card",
    name: "Card",
    category: "content",
    icon: "Square",
    description: "Content card with header and body",
    defaultProps: {
      title: "Card Title",
      description: "Card description goes here",
      content: "Main content of the card.",
      showFooter: true,
      footerText: "Card Footer",
    },
    codeTemplate: `<Card>
  <CardHeader>
    <CardTitle>{title}</CardTitle>
    <CardDescription>{description}</CardDescription>
  </CardHeader>
  <CardContent>{content}</CardContent>
  {showFooter && <CardFooter>{footerText}</CardFooter>}
</Card>`,
  },

  // ============ FORM BLOCKS ============
  {
    id: "form",
    name: "Contact Form",
    category: "forms",
    icon: "FormInput",
    description: "Complete contact form with fields",
    defaultProps: {
      title: "Contact Us",
      description: "We'll get back to you within 24 hours.",
      fields: [
        { label: "Name", type: "text", placeholder: "Your name" },
        { label: "Email", type: "email", placeholder: "your@email.com" },
        { label: "Message", type: "textarea", placeholder: "Your message" },
      ],
      submitLabel: "Send Message",
    },
    codeTemplate: `<Card className="mx-auto max-w-lg">
  <CardHeader>
    <CardTitle>{title}</CardTitle>
    <CardDescription>{description}</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {fields.map((field, i) => (
      <div key={i} className="space-y-2">
        <Label>{field.label}</Label>
        {field.type === "textarea" ? (
          <Textarea placeholder={field.placeholder} />
        ) : (
          <Input type={field.type} placeholder={field.placeholder} />
        )}
      </div>
    ))}
  </CardContent>
  <CardFooter>
    <Button className="w-full">{submitLabel}</Button>
  </CardFooter>
</Card>`,
  },

  // ============ MARKETING BLOCKS ============
  {
    id: "pricing",
    name: "Pricing Table",
    category: "marketing",
    icon: "CreditCard",
    description: "Pricing plans comparison",
    defaultProps: {
      heading: "Pricing",
      description: "Choose the plan that's right for you.",
      plans: [
        {
          name: "Starter",
          price: "$0",
          period: "/mo",
          features: ["5 projects", "Basic support", "1GB storage"],
          ctaLabel: "Get Started",
          featured: false,
        },
        {
          name: "Pro",
          price: "$29",
          period: "/mo",
          features: ["Unlimited projects", "Priority support", "100GB storage", "Advanced analytics"],
          ctaLabel: "Start Free Trial",
          featured: true,
        },
        {
          name: "Enterprise",
          price: "Custom",
          period: "",
          features: ["Everything in Pro", "Dedicated support", "SLA", "Custom integrations"],
          ctaLabel: "Contact Sales",
          featured: false,
        },
      ],
    },
    codeTemplate: `<section className="w-full px-6 py-16">
  <div className="mx-auto max-w-6xl">
    <h2 className="text-3xl font-semibold">{heading}</h2>
    <p className="mt-2 text-muted-foreground">{description}</p>
    <div className="mt-8 grid gap-4 md:grid-cols-3">
      {plans.map((plan, i) => (
        <Card key={i} className={plan.featured ? "border-primary" : ""}>
          <CardHeader>
            <CardTitle>{plan.name}</CardTitle>
            <div className="text-3xl font-bold">{plan.price}<span className="text-sm text-muted-foreground">{plan.period}</span></div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {plan.features.map((f, j) => <li key={j}>{f}</li>)}
            </ul>
          </CardContent>
          <CardFooter>
            <Button className="w-full" variant={plan.featured ? "default" : "outline"}>{plan.ctaLabel}</Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  </div>
</section>`,
  },
  {
    id: "testimonial",
    name: "Testimonial",
    category: "marketing",
    icon: "Quote",
    description: "Customer quote with attribution",
    defaultProps: {
      quote: "This product completely transformed how we work. Highly recommended!",
      author: "Sarah Johnson",
      role: "CEO",
      company: "TechCorp",
    },
    codeTemplate: `<Card className="mx-auto max-w-2xl">
  <CardContent className="pt-6">
    <blockquote className="text-xl font-medium">"{quote}"</blockquote>
    <div className="mt-4 text-sm text-muted-foreground">
      {author} · {role} at {company}
    </div>
  </CardContent>
</Card>`,
  },
  {
    id: "faq",
    name: "FAQ Section",
    category: "marketing",
    icon: "HelpCircle",
    description: "Frequently asked questions",
    defaultProps: {
      heading: "FAQ",
      items: [
        { question: "How do I get started?", answer: "Simply sign up and follow our quick start guide." },
        { question: "What payment methods do you accept?", answer: "We accept all major credit cards and PayPal." },
        { question: "Can I cancel anytime?", answer: "Yes, you can cancel your subscription at any time." },
      ],
    },
    codeTemplate: `<section className="w-full px-6 py-16">
  <div className="mx-auto max-w-4xl">
    <h2 className="text-3xl font-semibold">{heading}</h2>
    <div className="mt-8 space-y-4">
      {items.map((item, i) => (
        <div key={i} className="space-y-2">
          <h3 className="font-medium">{item.question}</h3>
          <p className="text-muted-foreground">{item.answer}</p>
          <Separator />
        </div>
      ))}
    </div>
  </div>
</section>`,
  },

  // ============ DATA BLOCKS ============
  {
    id: "stats",
    name: "Stats Row",
    category: "data",
    icon: "BarChart",
    description: "Key metrics display",
    defaultProps: {
      stats: [
        { label: "Users", value: "10,000+" },
        { label: "Revenue", value: "$1M+" },
        { label: "Uptime", value: "99.9%" },
      ],
    },
    codeTemplate: `<div className="grid gap-4 md:grid-cols-3">
  {stats.map((stat, i) => (
    <Card key={i}>
      <CardHeader>
        <CardTitle className="text-3xl">{stat.value}</CardTitle>
        <CardDescription>{stat.label}</CardDescription>
      </CardHeader>
    </Card>
  ))}
</div>`,
  },
];

// Get blocks by category
export const getBlocksByCategory = (categoryId) => 
  blocks.filter((block) => block.category === categoryId);

// Get block by ID
export const getBlockById = (id) => 
  blocks.find((block) => block.id === id);
