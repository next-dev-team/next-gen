// Comprehensive Block Library for the low-code editor
// Each block is a complete, customizable section

export const blockCategories = [
  { id: "containers", name: "Containers", icon: "Layout" },
  { id: "hero", name: "Hero Sections", icon: "Image" },
  { id: "features", name: "Features", icon: "Grid3X3" },
  { id: "content", name: "Content", icon: "FileText" },
  { id: "pricing", name: "Pricing", icon: "CreditCard" },
  { id: "testimonials", name: "Testimonials", icon: "Quote" },
  { id: "cta", name: "Call to Action", icon: "MousePointerClick" },
  { id: "forms", name: "Forms", icon: "FormInput" },
  { id: "navigation", name: "Navigation", icon: "Menu" },
  { id: "footer", name: "Footer", icon: "PanelBottom" },
  { id: "team", name: "Team", icon: "Users" },
  { id: "stats", name: "Stats & Metrics", icon: "BarChart" },
  { id: "gallery", name: "Gallery", icon: "Image" },
  { id: "blog", name: "Blog", icon: "Newspaper" },
];

export const blocks = [
  // ============ CONTAINERS (Figma-like nestable containers) ============
  {
    id: "section-container",
    name: "Section Container",
    category: "containers",
    description: "Empty section - drag any elements inside",
    cli: "",
    canAcceptChildren: true,
    defaultProps: {
      layout: "vertical",
      maxWidth: "6xl",
      padding: "16",
      background: "transparent",
      align: "center",
    },
    propSchema: {
      layout: {
        type: "select",
        label: "Layout",
        group: "style",
        options: [
          { value: "vertical", label: "Vertical (Stack)" },
          { value: "horizontal", label: "Horizontal (Row)" },
          { value: "grid-2", label: "Grid 2 Columns" },
          { value: "grid-3", label: "Grid 3 Columns" },
        ],
      },
      maxWidth: {
        type: "select",
        label: "Max Width",
        group: "style",
        options: [
          { value: "sm", label: "Small" },
          { value: "md", label: "Medium" },
          { value: "lg", label: "Large" },
          { value: "4xl", label: "Extra Large" },
          { value: "6xl", label: "Wide" },
          { value: "full", label: "Full Width" },
        ],
      },
      padding: {
        type: "select",
        label: "Padding",
        group: "style",
        options: [
          { value: "0", label: "None" },
          { value: "8", label: "Small" },
          { value: "16", label: "Medium" },
          { value: "24", label: "Large" },
        ],
      },
      background: {
        type: "select",
        label: "Background",
        group: "style",
        options: [
          { value: "transparent", label: "None" },
          { value: "muted", label: "Muted" },
          { value: "gradient", label: "Gradient" },
          { value: "primary", label: "Primary" },
        ],
      },
      align: {
        type: "select",
        label: "Content Align",
        group: "style",
        options: [
          { value: "left", label: "Left" },
          { value: "center", label: "Center" },
          { value: "right", label: "Right" },
        ],
      },
    },
  },
  {
    id: "flex-row",
    name: "Flex Row",
    category: "containers",
    description: "Horizontal flex container - buttons, badges, icons",
    cli: "",
    canAcceptChildren: true,
    defaultProps: {
      gap: "4",
      align: "center",
      justify: "start",
      wrap: true,
    },
    propSchema: {
      gap: {
        type: "select",
        label: "Gap",
        group: "style",
        options: [
          { value: "2", label: "Small" },
          { value: "4", label: "Medium" },
          { value: "6", label: "Large" },
          { value: "8", label: "Extra Large" },
        ],
      },
      justify: {
        type: "select",
        label: "Justify",
        group: "style",
        options: [
          { value: "start", label: "Start" },
          { value: "center", label: "Center" },
          { value: "end", label: "End" },
          { value: "between", label: "Space Between" },
        ],
      },
      align: {
        type: "select",
        label: "Align Items",
        group: "style",
        options: [
          { value: "start", label: "Top" },
          { value: "center", label: "Center" },
          { value: "end", label: "Bottom" },
        ],
      },
      wrap: { type: "boolean", label: "Wrap Items", group: "style" },
    },
  },
  {
    id: "flex-column",
    name: "Flex Column",
    category: "containers",
    description: "Vertical flex container - stack elements",
    cli: "",
    canAcceptChildren: true,
    defaultProps: {
      gap: "4",
      align: "stretch",
    },
    propSchema: {
      gap: {
        type: "select",
        label: "Gap",
        group: "style",
        options: [
          { value: "2", label: "Small" },
          { value: "4", label: "Medium" },
          { value: "6", label: "Large" },
          { value: "8", label: "Extra Large" },
        ],
      },
      align: {
        type: "select",
        label: "Align Items",
        group: "style",
        options: [
          { value: "start", label: "Left" },
          { value: "center", label: "Center" },
          { value: "end", label: "Right" },
          { value: "stretch", label: "Stretch" },
        ],
      },
    },
  },
  {
    id: "card-root",
    name: "Card (Root)",
    category: "containers",
    description: "Empty Card wrapper - drag Header, Content, Footer inside",
    cli: "npx shadcn@latest add card",
    canAcceptChildren: true,
    defaultProps: {
      className: "w-[350px]",
    },
    propSchema: {
      width: {
        type: "select",
        label: "Width",
        options: [
          { value: "w-full", label: "Full" },
          { value: "w-[350px]", label: "Fixed (350px)" },
          { value: "max-w-sm", label: "Max Small" },
          { value: "max-w-md", label: "Max Medium" },
        ],
        group: "style",
      },
    },
  },
  {
    id: "card-header",
    name: "Card Header",
    category: "containers",
    description: "Header section for Card",
    canAcceptChildren: true,
    defaultProps: {},
    propSchema: {},
  },
  {
    id: "card-content",
    name: "Card Content",
    category: "containers",
    description: "Main content area for Card",
    canAcceptChildren: true,
    defaultProps: {
      className: "grid gap-4",
    },
    propSchema: {
      layout: {
        type: "select",
        label: "Layout",
        options: [
          { value: "stack", label: "Stack" },
          { value: "grid", label: "Grid" },
        ],
        group: "style",
      },
    },
  },
  {
    id: "card-footer",
    name: "Card Footer",
    category: "containers",
    description: "Footer area - great for buttons",
    canAcceptChildren: true,
    defaultProps: {
      className: "flex justify-between",
    },
    propSchema: {
      justify: {
        type: "select",
        label: "Justify",
        options: [
          { value: "start", label: "Start" },
          { value: "end", label: "End" },
          { value: "between", label: "Between" },
          { value: "center", label: "Center" },
        ],
        group: "style",
      },
    },
  },
  {
    id: "card-title",
    name: "Card Title",
    category: "content",
    description: "Title for Card Header",
    defaultProps: {
      text: "Card Title",
      level: 3,
    },
    propSchema: {
      text: { type: "text", label: "Text", group: "content" },
    },
  },
  {
    id: "card-description",
    name: "Card Description",
    category: "content",
    description: "Description text for Card Header",
    defaultProps: {
      text: "Card description goes here",
    },
    propSchema: {
      text: { type: "text", label: "Text", group: "content" },
    },
  },

  // ============ HERO SECTIONS ============
  {
    id: "hero-centered",
    name: "Hero Centered",
    category: "hero",
    description: "Centered hero with gradient background",
    cli: "npx shadcn@latest add button",
    defaultProps: {
      // Content
      heading: "Build something amazing",
      subheading: "The modern platform for developers",
      description:
        "Create beautiful, production-ready pages with our low-code editor. No coding required.",
      primaryButton: "Get Started Free",
      primaryHref: "#",
      secondaryButton: "View Demo",
      secondaryHref: "#",
      // Visibility toggles (Figma-like show/hide)
      showHeading: true,
      showSubheading: true,
      showDescription: true,
      showPrimaryButton: true,
      showSecondaryButton: true,
      showGradient: true,
      // Styling
      headingSize: "5xl",
      textAlign: "center",
      paddingY: "20",
    },
    editableProps: [
      "heading",
      "subheading",
      "description",
      "primaryButton",
      "secondaryButton",
    ],
    propSchema: {
      // Content section
      heading: { type: "text", label: "Heading", group: "content" },
      subheading: { type: "text", label: "Subheading", group: "content" },
      description: { type: "textarea", label: "Description", group: "content" },
      primaryButton: {
        type: "text",
        label: "Primary Button",
        group: "content",
      },
      primaryHref: { type: "text", label: "Primary URL", group: "content" },
      secondaryButton: {
        type: "text",
        label: "Secondary Button",
        group: "content",
      },
      secondaryHref: { type: "text", label: "Secondary URL", group: "content" },
      // Visibility toggles
      showHeading: {
        type: "boolean",
        label: "Show Heading",
        group: "visibility",
      },
      showSubheading: {
        type: "boolean",
        label: "Show Subheading",
        group: "visibility",
      },
      showDescription: {
        type: "boolean",
        label: "Show Description",
        group: "visibility",
      },
      showPrimaryButton: {
        type: "boolean",
        label: "Show Primary Button",
        group: "visibility",
      },
      showSecondaryButton: {
        type: "boolean",
        label: "Show Secondary Button",
        group: "visibility",
      },
      showGradient: {
        type: "boolean",
        label: "Show Gradient",
        group: "visibility",
      },
      // Styling options
      headingSize: {
        type: "select",
        label: "Heading Size",
        group: "style",
        options: [
          { value: "3xl", label: "Small" },
          { value: "4xl", label: "Medium" },
          { value: "5xl", label: "Large" },
          { value: "6xl", label: "Extra Large" },
        ],
      },
      textAlign: {
        type: "select",
        label: "Text Align",
        group: "style",
        options: [
          { value: "left", label: "Left" },
          { value: "center", label: "Center" },
          { value: "right", label: "Right" },
        ],
      },
      paddingY: {
        type: "select",
        label: "Vertical Padding",
        group: "style",
        options: [
          { value: "10", label: "Small" },
          { value: "16", label: "Medium" },
          { value: "20", label: "Large" },
          { value: "32", label: "Extra Large" },
        ],
      },
    },
  },
  {
    id: "hero-split",
    name: "Hero Split",
    category: "hero",
    description: "Split hero with image on right",
    cli: "npx shadcn@latest add button",
    defaultProps: {
      heading: "Accelerate your workflow",
      description:
        "Automate repetitive tasks and focus on what matters. Our platform helps teams ship faster.",
      primaryButton: "Start Building",
      primaryHref: "#",
      secondaryButton: "Learn More",
      secondaryHref: "#",
      imagePlaceholder: true,
      // Visibility toggles
      showHeading: true,
      showDescription: true,
      showPrimaryButton: true,
      showSecondaryButton: true,
      showImage: true,
      // Style options
      imagePosition: "right",
      paddingY: "20",
    },
    editableProps: [
      "heading",
      "description",
      "primaryButton",
      "secondaryButton",
    ],
    propSchema: {
      // Content section
      heading: { type: "text", label: "Heading", group: "content" },
      description: { type: "textarea", label: "Description", group: "content" },
      primaryButton: {
        type: "text",
        label: "Primary Button",
        group: "content",
      },
      primaryHref: { type: "text", label: "Primary URL", group: "content" },
      secondaryButton: {
        type: "text",
        label: "Secondary Button",
        group: "content",
      },
      secondaryHref: { type: "text", label: "Secondary URL", group: "content" },
      // Visibility toggles
      showHeading: {
        type: "boolean",
        label: "Show Heading",
        group: "visibility",
      },
      showDescription: {
        type: "boolean",
        label: "Show Description",
        group: "visibility",
      },
      showPrimaryButton: {
        type: "boolean",
        label: "Show Primary Button",
        group: "visibility",
      },
      showSecondaryButton: {
        type: "boolean",
        label: "Show Secondary Button",
        group: "visibility",
      },
      showImage: { type: "boolean", label: "Show Image", group: "visibility" },
      // Style options
      imagePosition: {
        type: "select",
        label: "Image Position",
        group: "style",
        options: [
          { value: "left", label: "Left" },
          { value: "right", label: "Right" },
        ],
      },
      paddingY: {
        type: "select",
        label: "Vertical Padding",
        group: "style",
        options: [
          { value: "10", label: "Small" },
          { value: "16", label: "Medium" },
          { value: "20", label: "Large" },
          { value: "32", label: "Extra Large" },
        ],
      },
    },
  },
  {
    id: "hero-video",
    name: "Hero with Video",
    category: "hero",
    description: "Hero with video background placeholder",
    cli: "npx shadcn@latest add button",
    defaultProps: {
      heading: "Experience the future",
      description: "Immersive experiences that captivate your audience.",
      primaryButton: "Watch Video",
      primaryHref: "#",
    },
    editableProps: ["heading", "description", "primaryButton"],
  },

  // ============ FEATURES ============
  {
    id: "features-grid",
    name: "Features Grid",
    category: "features",
    description: "3-column features with icons",
    cli: "npx shadcn@latest add card",
    defaultProps: {
      heading: "Everything you need",
      description: "A complete toolkit for modern development.",
      columns: 3,
      features: [
        {
          icon: "Zap",
          title: "Lightning Fast",
          description: "Optimized for speed. Your pages load in milliseconds.",
        },
        {
          icon: "Shield",
          title: "Secure by Default",
          description: "Enterprise-grade security built into every layer.",
        },
        {
          icon: "Code",
          title: "Developer First",
          description: "Clean APIs and comprehensive documentation.",
        },
        {
          icon: "Puzzle",
          title: "Extensible",
          description: "Plugins and integrations for every use case.",
        },
        {
          icon: "Globe",
          title: "Global Scale",
          description: "Deploy to 200+ edge locations worldwide.",
        },
        {
          icon: "Headphones",
          title: "24/7 Support",
          description: "Expert help whenever you need it.",
        },
      ],
      // Visibility toggles
      showHeading: true,
      showDescription: true,
      showIcons: true,
    },
    editableProps: ["heading", "description"],
    propSchema: {
      heading: { type: "text", label: "Heading", group: "content" },
      description: { type: "textarea", label: "Description", group: "content" },
      features: { type: "array", label: "Features", group: "content" },
      // Visibility toggles
      showHeading: {
        type: "boolean",
        label: "Show Heading",
        group: "visibility",
      },
      showDescription: {
        type: "boolean",
        label: "Show Description",
        group: "visibility",
      },
      showIcons: { type: "boolean", label: "Show Icons", group: "visibility" },
      // Style options
      columns: {
        type: "select",
        label: "Columns",
        group: "style",
        options: [
          { value: 2, label: "2" },
          { value: 3, label: "3" },
          { value: 4, label: "4" },
        ],
      },
    },
  },
  {
    id: "features-list",
    name: "Features List",
    category: "features",
    description: "Vertical feature list with descriptions",
    cli: "npx shadcn@latest add card",
    defaultProps: {
      heading: "Why choose us",
      features: [
        {
          title: "Easy to use",
          description: "Intuitive interface that anyone can learn in minutes.",
        },
        {
          title: "Powerful integrations",
          description: "Connect with 100+ tools you already use.",
        },
        {
          title: "Real-time collaboration",
          description: "Work together with your team seamlessly.",
        },
      ],
    },
    editableProps: ["heading"],
  },
  {
    id: "features-alternating",
    name: "Features Alternating",
    category: "features",
    description: "Alternating image and text layout",
    cli: "npx shadcn@latest add card button",
    defaultProps: {
      features: [
        {
          heading: "Design with ease",
          description:
            "Drag and drop components to build beautiful interfaces.",
          imageSide: "right",
        },
        {
          heading: "Export clean code",
          description: "Get production-ready React code with one click.",
          imageSide: "left",
        },
      ],
    },
  },

  // ============ CONTENT ============
  {
    id: "content-section",
    name: "Content Section",
    category: "content",
    description: "Rich text content section",
    cli: "",
    defaultProps: {
      heading: "Our Story",
      content:
        "We started with a simple idea: make development accessible to everyone. Today, thousands of teams use our platform to build amazing products.\n\nOur mission is to democratize software development. We believe that great ideas shouldn't be limited by technical barriers.",
    },
    editableProps: ["heading", "content"],
  },
  {
    id: "content-two-column",
    name: "Two Column Content",
    category: "content",
    description: "Side-by-side content layout",
    cli: "",
    defaultProps: {
      leftHeading: "For Designers",
      leftContent:
        "Create pixel-perfect designs and hand off clean specifications to developers.",
      rightHeading: "For Developers",
      rightContent:
        "Build faster with pre-built components and automatic code generation.",
    },
    editableProps: [
      "leftHeading",
      "leftContent",
      "rightHeading",
      "rightContent",
    ],
  },

  // ============ PRICING ============
  {
    id: "pricing-simple",
    name: "Pricing Simple",
    category: "pricing",
    description: "Simple 3-tier pricing table",
    cli: "npx shadcn@latest add card button badge",
    defaultProps: {
      heading: "Simple, transparent pricing",
      description: "Choose the plan that's right for you.",
      plans: [
        {
          name: "Starter",
          price: "$0",
          period: "/month",
          description: "For individuals getting started",
          features: [
            "5 projects",
            "Basic components",
            "Community support",
            "1GB storage",
          ],
          buttonText: "Get Started",
          buttonVariant: "outline",
          popular: false,
        },
        {
          name: "Pro",
          price: "$29",
          period: "/month",
          description: "For growing teams",
          features: [
            "Unlimited projects",
            "All components",
            "Priority support",
            "100GB storage",
            "Custom domains",
            "Analytics",
          ],
          buttonText: "Start Free Trial",
          buttonVariant: "default",
          popular: true,
        },
        {
          name: "Enterprise",
          price: "Custom",
          period: "",
          description: "For large organizations",
          features: [
            "Everything in Pro",
            "Dedicated support",
            "SLA guarantee",
            "SSO/SAML",
            "Custom integrations",
            "On-premise option",
          ],
          buttonText: "Contact Sales",
          buttonVariant: "outline",
          popular: false,
        },
      ],
    },
    editableProps: ["heading", "description"],
  },
  {
    id: "pricing-comparison",
    name: "Pricing Comparison",
    category: "pricing",
    description: "Feature comparison table",
    cli: "npx shadcn@latest add card button table",
    defaultProps: {
      heading: "Compare plans",
      plans: ["Free", "Pro", "Enterprise"],
      features: [
        { name: "Projects", values: ["5", "Unlimited", "Unlimited"] },
        { name: "Storage", values: ["1GB", "100GB", "Unlimited"] },
        { name: "Support", values: ["Community", "Priority", "Dedicated"] },
      ],
    },
  },

  // ============ TESTIMONIALS ============
  {
    id: "testimonials-grid",
    name: "Testimonials Grid",
    category: "testimonials",
    description: "Grid of customer testimonials",
    cli: "npx shadcn@latest add card avatar",
    defaultProps: {
      heading: "Loved by developers",
      testimonials: [
        {
          quote:
            "This tool has completely transformed our workflow. We ship features 10x faster.",
          author: "Sarah Chen",
          role: "CTO",
          company: "TechCorp",
          avatar: "",
        },
        {
          quote:
            "The best low-code platform I've ever used. Clean code output and great UX.",
          author: "Mike Johnson",
          role: "Lead Developer",
          company: "StartupXYZ",
          avatar: "",
        },
        {
          quote:
            "Our designers and developers finally speak the same language.",
          author: "Emily Davis",
          role: "Design Lead",
          company: "DesignStudio",
          avatar: "",
        },
      ],
    },
    editableProps: ["heading"],
  },
  {
    id: "testimonial-single",
    name: "Testimonial Single",
    category: "testimonials",
    description: "Large featured testimonial",
    cli: "npx shadcn@latest add card avatar",
    defaultProps: {
      quote:
        "I've tried every page builder out there. This is the only one that produces code I'd actually ship to production.",
      author: "Alex Rivera",
      role: "Senior Engineer",
      company: "BigTech Inc",
      avatar: "",
    },
    editableProps: ["quote", "author", "role", "company"],
  },

  // ============ CTA ============
  {
    id: "cta-simple",
    name: "CTA Simple",
    category: "cta",
    description: "Simple call-to-action banner",
    cli: "npx shadcn@latest add button",
    defaultProps: {
      heading: "Ready to get started?",
      description: "Join thousands of teams building with our platform.",
      primaryButton: "Start Free Trial",
      primaryHref: "#",
      secondaryButton: "Talk to Sales",
      secondaryHref: "#",
    },
    editableProps: [
      "heading",
      "description",
      "primaryButton",
      "secondaryButton",
    ],
  },
  {
    id: "cta-newsletter",
    name: "CTA Newsletter",
    category: "cta",
    description: "Newsletter signup CTA",
    cli: "npx shadcn@latest add button input",
    defaultProps: {
      heading: "Stay in the loop",
      description: "Get the latest updates and tips delivered to your inbox.",
      placeholder: "Enter your email",
      buttonText: "Subscribe",
    },
    editableProps: ["heading", "description", "placeholder", "buttonText"],
  },
  {
    id: "cta-gradient",
    name: "CTA Gradient",
    category: "cta",
    description: "CTA with gradient background",
    cli: "npx shadcn@latest add button",
    defaultProps: {
      heading: "Build faster, ship sooner",
      description: "14-day free trial. No credit card required.",
      buttonText: "Get Started Now",
      buttonHref: "#",
    },
    editableProps: ["heading", "description", "buttonText"],
  },

  // ============ FORMS ============
  {
    id: "form-contact",
    name: "Contact Form",
    category: "forms",
    description: "Standard contact form",
    cli: "npx shadcn@latest add button input textarea label card",
    defaultProps: {
      heading: "Get in touch",
      description:
        "We'd love to hear from you. Send us a message and we'll respond within 24 hours.",
      fields: [
        {
          label: "Full Name",
          type: "text",
          placeholder: "John Doe",
          required: true,
        },
        {
          label: "Email",
          type: "email",
          placeholder: "john@example.com",
          required: true,
        },
        {
          label: "Subject",
          type: "text",
          placeholder: "How can we help?",
          required: false,
        },
        {
          label: "Message",
          type: "textarea",
          placeholder: "Your message...",
          required: true,
        },
      ],
      submitButton: "Send Message",
    },
    editableProps: ["heading", "description", "submitButton"],
  },
  {
    id: "form-login",
    name: "Login Form",
    category: "forms",
    description: "User login form",
    cli: "npx shadcn@latest add button input label card checkbox",
    defaultProps: {
      heading: "Welcome back",
      description: "Enter your credentials to access your account.",
      emailPlaceholder: "name@example.com",
      passwordPlaceholder: "Enter your password",
      submitButton: "Sign In",
      showRemember: true,
      showForgot: true,
    },
    editableProps: ["heading", "description", "submitButton"],
  },
  {
    id: "form-signup",
    name: "Signup Form",
    category: "forms",
    description: "User registration form",
    cli: "npx shadcn@latest add button input label card checkbox",
    defaultProps: {
      heading: "Create an account",
      description: "Enter your details to get started.",
      fields: [
        { label: "Full Name", type: "text", placeholder: "John Doe" },
        { label: "Email", type: "email", placeholder: "john@example.com" },
        {
          label: "Password",
          type: "password",
          placeholder: "Create a password",
        },
        {
          label: "Confirm Password",
          type: "password",
          placeholder: "Confirm your password",
        },
      ],
      submitButton: "Create Account",
      termsText: "I agree to the Terms of Service and Privacy Policy",
    },
    editableProps: ["heading", "description", "submitButton"],
  },

  // ============ NAVIGATION ============
  {
    id: "navbar-simple",
    name: "Navbar Simple",
    category: "navigation",
    description: "Simple navigation bar",
    cli: "npx shadcn@latest add button navigation-menu",
    defaultProps: {
      logo: "Acme Inc",
      links: [
        { label: "Features", href: "#features" },
        { label: "Pricing", href: "#pricing" },
        { label: "About", href: "#about" },
        { label: "Contact", href: "#contact" },
      ],
      ctaButton: "Get Started",
      ctaHref: "#",
    },
    editableProps: ["logo", "ctaButton"],
  },
  {
    id: "navbar-dropdown",
    name: "Navbar with Dropdowns",
    category: "navigation",
    description: "Navigation with dropdown menus",
    cli: "npx shadcn@latest add button navigation-menu dropdown-menu",
    defaultProps: {
      logo: "Brand",
      menus: [
        { label: "Products", items: ["Product A", "Product B", "Product C"] },
        { label: "Solutions", items: ["Enterprise", "Startups", "Agencies"] },
        {
          label: "Resources",
          items: ["Documentation", "API Reference", "Support"],
        },
      ],
      ctaButton: "Sign Up",
    },
    editableProps: ["logo", "ctaButton"],
  },

  // ============ FOOTER ============
  {
    id: "footer-simple",
    name: "Footer Simple",
    category: "footer",
    description: "Simple footer with links",
    cli: "npx shadcn@latest add separator",
    defaultProps: {
      logo: "Acme Inc",
      tagline: "Building the future of development.",
      columns: [
        {
          title: "Product",
          links: ["Features", "Pricing", "Changelog", "Documentation"],
        },
        { title: "Company", links: ["About", "Blog", "Careers", "Press"] },
        { title: "Legal", links: ["Terms", "Privacy", "Cookies"] },
      ],
      copyright: "© 2024 Acme Inc. All rights reserved.",
    },
    editableProps: ["logo", "tagline", "copyright"],
  },
  {
    id: "footer-newsletter",
    name: "Footer with Newsletter",
    category: "footer",
    description: "Footer with newsletter signup",
    cli: "npx shadcn@latest add separator input button",
    defaultProps: {
      logo: "Brand",
      newsletterHeading: "Subscribe to our newsletter",
      newsletterDescription: "Get the latest updates delivered to your inbox.",
      columns: [
        { title: "Product", links: ["Features", "Pricing", "API"] },
        { title: "Support", links: ["Help Center", "Contact", "Status"] },
      ],
      copyright: "© 2024 Brand. All rights reserved.",
    },
    editableProps: [
      "logo",
      "newsletterHeading",
      "newsletterDescription",
      "copyright",
    ],
  },

  // ============ TEAM ============
  {
    id: "team-grid",
    name: "Team Grid",
    category: "team",
    description: "Team members grid",
    cli: "npx shadcn@latest add card avatar",
    defaultProps: {
      heading: "Meet our team",
      description: "The people behind the product.",
      members: [
        {
          name: "John Smith",
          role: "CEO & Founder",
          bio: "10+ years building products.",
          avatar: "",
        },
        {
          name: "Sarah Johnson",
          role: "CTO",
          bio: "Former Google engineer.",
          avatar: "",
        },
        {
          name: "Mike Chen",
          role: "Head of Design",
          bio: "Award-winning designer.",
          avatar: "",
        },
        {
          name: "Emily Davis",
          role: "Head of Marketing",
          bio: "Growth expert.",
          avatar: "",
        },
      ],
    },
    editableProps: ["heading", "description"],
  },

  // ============ STATS ============
  {
    id: "stats-simple",
    name: "Stats Simple",
    category: "stats",
    description: "Key metrics display",
    cli: "npx shadcn@latest add card",
    defaultProps: {
      heading: "Trusted by thousands",
      stats: [
        { value: "10K+", label: "Active Users" },
        { value: "50M+", label: "Pages Built" },
        { value: "99.9%", label: "Uptime" },
        { value: "150+", label: "Countries" },
      ],
    },
    editableProps: ["heading"],
  },
  {
    id: "stats-with-icons",
    name: "Stats with Icons",
    category: "stats",
    description: "Stats with accompanying icons",
    cli: "npx shadcn@latest add card",
    defaultProps: {
      stats: [
        { icon: "Users", value: "10,000+", label: "Happy Customers" },
        { icon: "Star", value: "4.9/5", label: "Average Rating" },
        { icon: "Award", value: "50+", label: "Awards Won" },
      ],
    },
  },

  // ============ GALLERY ============
  {
    id: "gallery-grid",
    name: "Gallery Grid",
    category: "gallery",
    description: "Image gallery grid",
    cli: "npx shadcn@latest add aspect-ratio",
    defaultProps: {
      heading: "Our Work",
      columns: 3,
      images: [
        { src: "", alt: "Project 1", caption: "E-commerce Platform" },
        { src: "", alt: "Project 2", caption: "Mobile App" },
        { src: "", alt: "Project 3", caption: "Dashboard" },
        { src: "", alt: "Project 4", caption: "Landing Page" },
        { src: "", alt: "Project 5", caption: "Admin Panel" },
        { src: "", alt: "Project 6", caption: "Blog Theme" },
      ],
    },
    editableProps: ["heading"],
  },

  // ============ BLOG ============
  {
    id: "blog-cards",
    name: "Blog Cards",
    category: "blog",
    description: "Blog post cards grid",
    cli: "npx shadcn@latest add card badge",
    defaultProps: {
      heading: "Latest from our blog",
      description: "Insights, tutorials, and updates from our team.",
      posts: [
        {
          title: "Getting Started with Our Platform",
          excerpt: "A complete guide to building your first page.",
          date: "Dec 15, 2024",
          tag: "Tutorial",
          image: "",
        },
        {
          title: "Best Practices for Component Design",
          excerpt: "Learn how to create reusable, maintainable components.",
          date: "Dec 10, 2024",
          tag: "Design",
          image: "",
        },
        {
          title: "Announcing v2.0",
          excerpt: "Major updates including new features and improvements.",
          date: "Dec 5, 2024",
          tag: "News",
          image: "",
        },
      ],
    },
    editableProps: ["heading", "description"],
  },

  // ============ MISC ============
  {
    id: "faq-accordion",
    name: "FAQ Accordion",
    category: "content",
    description: "Frequently asked questions",
    cli: "npx shadcn@latest add accordion",
    defaultProps: {
      heading: "Frequently Asked Questions",
      description: "Find answers to common questions about our platform.",
      items: [
        {
          question: "How do I get started?",
          answer:
            "Simply sign up for a free account and follow our quick start guide. You'll be building pages in minutes.",
        },
        {
          question: "What payment methods do you accept?",
          answer:
            "We accept all major credit cards, PayPal, and bank transfers for enterprise customers.",
        },
        {
          question: "Can I cancel my subscription?",
          answer:
            "Yes, you can cancel your subscription at any time. Your access will continue until the end of your billing period.",
        },
        {
          question: "Do you offer refunds?",
          answer:
            "We offer a 14-day money-back guarantee. If you're not satisfied, contact support for a full refund.",
        },
        {
          question: "Is there a free trial?",
          answer:
            "Yes! Our Pro plan includes a 14-day free trial with no credit card required.",
        },
      ],
    },
    editableProps: ["heading", "description"],
  },
  {
    id: "logo-cloud",
    name: "Logo Cloud",
    category: "content",
    description: "Trusted by logos section",
    cli: "npx shadcn@latest add",
    defaultProps: {
      heading: "Trusted by industry leaders",
      logos: ["Vercel", "Next.js", "React", "TailwindCSS", "Stripe", "GitHub"],
    },
    editableProps: ["heading"],
  },
  {
    id: "divider",
    name: "Divider",
    category: "content",
    description: "Section divider",
    cli: "npx shadcn@latest add separator",
    defaultProps: {
      style: "line",
      spacing: "lg",
    },
    propSchema: {
      style: {
        type: "select",
        label: "Style",
        options: [
          { value: "line", label: "Line" },
          { value: "dots", label: "Dots" },
          { value: "gradient", label: "Gradient" },
        ],
      },
      spacing: {
        type: "select",
        label: "Spacing",
        options: [
          { value: "sm", label: "Small" },
          { value: "md", label: "Medium" },
          { value: "lg", label: "Large" },
        ],
      },
    },
  },
];

// Get block by ID
export const getBlockById = (id) => blocks.find((b) => b.id === id);

// Get blocks by category
export const getBlocksByCategory = (categoryId) =>
  blocks.filter((b) => b.category === categoryId);

// Get all unique CLI commands
export const getAllBlockCliCommands = () => {
  const cliSet = new Set();
  blocks.forEach((b) => {
    if (b.cli) {
      b.cli.split(" ").forEach((part) => {
        if (!part.startsWith("npx") && !part.includes("@")) {
          cliSet.add(part);
        }
      });
    }
  });
  return Array.from(cliSet);
};
