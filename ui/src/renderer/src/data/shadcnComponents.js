// Complete shadcn/ui component library with CLI commands
// Each component includes: id, name, category, description, cli, preview type, and default props

export const shadcnCategories = [
  { id: "inputs", name: "Inputs", icon: "FormInput" },
  { id: "layout", name: "Layout", icon: "Layout" },
  { id: "data-display", name: "Data Display", icon: "Table" },
  { id: "feedback", name: "Feedback", icon: "Bell" },
  { id: "navigation", name: "Navigation", icon: "Menu" },
  { id: "overlay", name: "Overlay", icon: "Layers" },
  { id: "typography", name: "Typography", icon: "Type" },
];

export const shadcnComponents = [
  // ============ INPUTS ============
  {
    id: "button",
    name: "Button",
    category: "inputs",
    description: "Displays a button or a component that looks like a button.",
    cli: "npx shadcn@latest add button",
    defaultProps: {
      children: "Button",
      variant: "default",
      size: "default",
    },
    editableProps: ["children"],
    propSchema: {
      children: { type: "text", label: "Label" },
      variant: {
        type: "select",
        label: "Variant",
        options: [
          { value: "default", label: "Default" },
          { value: "secondary", label: "Secondary" },
          { value: "outline", label: "Outline" },
          { value: "ghost", label: "Ghost" },
          { value: "destructive", label: "Destructive" },
          { value: "link", label: "Link" },
        ],
      },
      size: {
        type: "select",
        label: "Size",
        options: [
          { value: "default", label: "Default" },
          { value: "sm", label: "Small" },
          { value: "lg", label: "Large" },
          { value: "icon", label: "Icon" },
        ],
      },
    },
  },
  {
    id: "input",
    name: "Input",
    category: "inputs",
    description: "Displays a form input field.",
    cli: "npx shadcn@latest add input",
    defaultProps: {
      placeholder: "Enter text...",
      type: "text",
    },
    propSchema: {
      placeholder: { type: "text", label: "Placeholder" },
      type: {
        type: "select",
        label: "Type",
        options: [
          { value: "text", label: "Text" },
          { value: "email", label: "Email" },
          { value: "password", label: "Password" },
          { value: "number", label: "Number" },
          { value: "tel", label: "Phone" },
          { value: "url", label: "URL" },
        ],
      },
      disabled: { type: "boolean", label: "Disabled" },
    },
  },
  {
    id: "textarea",
    name: "Textarea",
    category: "inputs",
    description: "Displays a multi-line text input.",
    cli: "npx shadcn@latest add textarea",
    defaultProps: {
      placeholder: "Enter your message...",
      rows: 4,
    },
    propSchema: {
      placeholder: { type: "text", label: "Placeholder" },
      rows: { type: "number", label: "Rows", min: 2, max: 20 },
      disabled: { type: "boolean", label: "Disabled" },
    },
  },
  {
    id: "checkbox",
    name: "Checkbox",
    category: "inputs",
    description: "A control that allows the user to toggle between checked and not checked.",
    cli: "npx shadcn@latest add checkbox",
    defaultProps: {
      label: "Accept terms and conditions",
      checked: false,
    },
    editableProps: ["label"],
    propSchema: {
      label: { type: "text", label: "Label" },
      checked: { type: "boolean", label: "Checked" },
      disabled: { type: "boolean", label: "Disabled" },
    },
  },
  {
    id: "radio-group",
    name: "Radio Group",
    category: "inputs",
    description: "A set of checkable buttons where only one can be checked at a time.",
    cli: "npx shadcn@latest add radio-group",
    defaultProps: {
      options: [
        { value: "option1", label: "Option 1" },
        { value: "option2", label: "Option 2" },
        { value: "option3", label: "Option 3" },
      ],
      defaultValue: "option1",
    },
    propSchema: {
      options: { type: "array", label: "Options" },
      defaultValue: { type: "text", label: "Default Value" },
    },
  },
  {
    id: "select",
    name: "Select",
    category: "inputs",
    description: "Displays a list of options for the user to pick from.",
    cli: "npx shadcn@latest add select",
    defaultProps: {
      placeholder: "Select an option",
      options: [
        { value: "option1", label: "Option 1" },
        { value: "option2", label: "Option 2" },
        { value: "option3", label: "Option 3" },
      ],
    },
    propSchema: {
      placeholder: { type: "text", label: "Placeholder" },
      options: { type: "array", label: "Options" },
    },
  },
  {
    id: "switch",
    name: "Switch",
    category: "inputs",
    description: "A control that toggles between on and off states.",
    cli: "npx shadcn@latest add switch",
    defaultProps: {
      label: "Airplane Mode",
      checked: false,
    },
    editableProps: ["label"],
    propSchema: {
      label: { type: "text", label: "Label" },
      checked: { type: "boolean", label: "Checked" },
      disabled: { type: "boolean", label: "Disabled" },
    },
  },
  {
    id: "slider",
    name: "Slider",
    category: "inputs",
    description: "An input where the user selects a value from within a given range.",
    cli: "npx shadcn@latest add slider",
    defaultProps: {
      defaultValue: 50,
      min: 0,
      max: 100,
      step: 1,
    },
    propSchema: {
      defaultValue: { type: "number", label: "Value" },
      min: { type: "number", label: "Min" },
      max: { type: "number", label: "Max" },
      step: { type: "number", label: "Step" },
    },
  },
  {
    id: "date-picker",
    name: "Date Picker",
    category: "inputs",
    description: "A date picker component with calendar popup.",
    cli: "npx shadcn@latest add calendar popover button",
    defaultProps: {
      placeholder: "Pick a date",
    },
    propSchema: {
      placeholder: { type: "text", label: "Placeholder" },
    },
  },
  {
    id: "combobox",
    name: "Combobox",
    category: "inputs",
    description: "Autocomplete input and target listbox with keyboard navigation.",
    cli: "npx shadcn@latest add command popover button",
    defaultProps: {
      placeholder: "Select framework...",
      options: [
        { value: "next", label: "Next.js" },
        { value: "react", label: "React" },
        { value: "vue", label: "Vue" },
        { value: "svelte", label: "Svelte" },
      ],
    },
    propSchema: {
      placeholder: { type: "text", label: "Placeholder" },
      options: { type: "array", label: "Options" },
    },
  },

  // ============ LAYOUT ============
  {
    id: "card",
    name: "Card",
    category: "layout",
    description: "Displays a card with header, content, and footer.",
    cli: "npx shadcn@latest add card",
    defaultProps: {
      title: "Card Title",
      description: "Card description goes here.",
      content: "Card content with any text you want.",
      footer: "",
    },
    editableProps: ["title", "description", "content"],
    propSchema: {
      title: { type: "text", label: "Title" },
      description: { type: "text", label: "Description" },
      content: { type: "textarea", label: "Content" },
      footer: { type: "text", label: "Footer" },
    },
  },
  {
    id: "accordion",
    name: "Accordion",
    category: "layout",
    description: "A vertically stacked set of interactive headings.",
    cli: "npx shadcn@latest add accordion",
    defaultProps: {
      type: "single",
      items: [
        { title: "Is it accessible?", content: "Yes. It adheres to the WAI-ARIA design pattern." },
        { title: "Is it styled?", content: "Yes. It comes with default styles that matches your theme." },
        { title: "Is it animated?", content: "Yes. It's animated by default with smooth transitions." },
      ],
    },
    propSchema: {
      type: {
        type: "select",
        label: "Type",
        options: [
          { value: "single", label: "Single" },
          { value: "multiple", label: "Multiple" },
        ],
      },
      items: { type: "array", label: "Items" },
    },
  },
  {
    id: "tabs",
    name: "Tabs",
    category: "layout",
    description: "A set of layered sections of content displayed one at a time.",
    cli: "npx shadcn@latest add tabs",
    defaultProps: {
      defaultValue: "tab1",
      tabs: [
        { value: "tab1", label: "Account", content: "Make changes to your account here." },
        { value: "tab2", label: "Password", content: "Change your password here." },
        { value: "tab3", label: "Settings", content: "Manage your settings here." },
      ],
    },
    propSchema: {
      tabs: { type: "array", label: "Tabs" },
      defaultValue: { type: "text", label: "Default Tab" },
    },
  },
  {
    id: "separator",
    name: "Separator",
    category: "layout",
    description: "Visually or semantically separates content.",
    cli: "npx shadcn@latest add separator",
    defaultProps: {
      orientation: "horizontal",
    },
    propSchema: {
      orientation: {
        type: "select",
        label: "Orientation",
        options: [
          { value: "horizontal", label: "Horizontal" },
          { value: "vertical", label: "Vertical" },
        ],
      },
    },
  },
  {
    id: "aspect-ratio",
    name: "Aspect Ratio",
    category: "layout",
    description: "Displays content within a desired ratio.",
    cli: "npx shadcn@latest add aspect-ratio",
    defaultProps: {
      ratio: 16 / 9,
    },
    propSchema: {
      ratio: { type: "number", label: "Ratio" },
    },
  },
  {
    id: "scroll-area",
    name: "Scroll Area",
    category: "layout",
    description: "Augments native scroll functionality for custom styling.",
    cli: "npx shadcn@latest add scroll-area",
    defaultProps: {
      height: 200,
    },
    propSchema: {
      height: { type: "number", label: "Height (px)" },
    },
  },
  {
    id: "resizable",
    name: "Resizable",
    category: "layout",
    description: "Accessible resizable panel groups and layouts.",
    cli: "npx shadcn@latest add resizable",
    defaultProps: {
      direction: "horizontal",
    },
    propSchema: {
      direction: {
        type: "select",
        label: "Direction",
        options: [
          { value: "horizontal", label: "Horizontal" },
          { value: "vertical", label: "Vertical" },
        ],
      },
    },
  },
  {
    id: "collapsible",
    name: "Collapsible",
    category: "layout",
    description: "An interactive component which expands/collapses a panel.",
    cli: "npx shadcn@latest add collapsible",
    defaultProps: {
      title: "Toggle Content",
      content: "This content can be collapsed.",
    },
    editableProps: ["title", "content"],
    propSchema: {
      title: { type: "text", label: "Title" },
      content: { type: "textarea", label: "Content" },
    },
  },

  // ============ DATA DISPLAY ============
  {
    id: "badge",
    name: "Badge",
    category: "data-display",
    description: "Displays a badge or a component that looks like a badge.",
    cli: "npx shadcn@latest add badge",
    defaultProps: {
      children: "Badge",
      variant: "default",
    },
    editableProps: ["children"],
    propSchema: {
      children: { type: "text", label: "Label" },
      variant: {
        type: "select",
        label: "Variant",
        options: [
          { value: "default", label: "Default" },
          { value: "secondary", label: "Secondary" },
          { value: "outline", label: "Outline" },
          { value: "destructive", label: "Destructive" },
        ],
      },
    },
  },
  {
    id: "avatar",
    name: "Avatar",
    category: "data-display",
    description: "An image element with a fallback for representing the user.",
    cli: "npx shadcn@latest add avatar",
    defaultProps: {
      src: "",
      fallback: "CN",
    },
    propSchema: {
      src: { type: "text", label: "Image URL" },
      fallback: { type: "text", label: "Fallback Text" },
    },
  },
  {
    id: "table",
    name: "Table",
    category: "data-display",
    description: "A responsive table component with headers and rows.",
    cli: "npx shadcn@latest add table",
    defaultProps: {
      headers: ["Name", "Status", "Role"],
      rows: [
        ["John Doe", "Active", "Admin"],
        ["Jane Smith", "Active", "User"],
        ["Bob Wilson", "Inactive", "User"],
      ],
    },
    propSchema: {
      headers: { type: "array", label: "Headers" },
      rows: { type: "array", label: "Rows" },
    },
  },
  {
    id: "skeleton",
    name: "Skeleton",
    category: "data-display",
    description: "Used to show a placeholder while content is loading.",
    cli: "npx shadcn@latest add skeleton",
    defaultProps: {
      width: "100%",
      height: 20,
    },
    propSchema: {
      width: { type: "text", label: "Width" },
      height: { type: "number", label: "Height (px)" },
    },
  },
  {
    id: "calendar",
    name: "Calendar",
    category: "data-display",
    description: "A date field component that allows users to enter and edit date.",
    cli: "npx shadcn@latest add calendar",
    defaultProps: {},
    propSchema: {},
  },
  {
    id: "carousel",
    name: "Carousel",
    category: "data-display",
    description: "A carousel with motion and swipe built using Embla.",
    cli: "npx shadcn@latest add carousel",
    defaultProps: {
      items: ["Slide 1", "Slide 2", "Slide 3"],
    },
    propSchema: {
      items: { type: "array", label: "Slides" },
    },
  },
  {
    id: "chart",
    name: "Chart",
    category: "data-display",
    description: "Beautiful charts using Recharts.",
    cli: "npx shadcn@latest add chart",
    defaultProps: {
      type: "bar",
    },
    propSchema: {
      type: {
        type: "select",
        label: "Type",
        options: [
          { value: "bar", label: "Bar" },
          { value: "line", label: "Line" },
          { value: "pie", label: "Pie" },
        ],
      },
    },
  },
  {
    id: "progress",
    name: "Progress",
    category: "data-display",
    description: "Displays an indicator showing the completion progress of a task.",
    cli: "npx shadcn@latest add progress",
    defaultProps: {
      value: 60,
    },
    propSchema: {
      value: { type: "number", label: "Value (%)", min: 0, max: 100 },
    },
  },

  // ============ FEEDBACK ============
  {
    id: "alert",
    name: "Alert",
    category: "feedback",
    description: "Displays a callout for user attention.",
    cli: "npx shadcn@latest add alert",
    defaultProps: {
      title: "Heads up!",
      description: "You can add components to your app using the CLI.",
      variant: "default",
    },
    editableProps: ["title", "description"],
    propSchema: {
      title: { type: "text", label: "Title" },
      description: { type: "text", label: "Description" },
      variant: {
        type: "select",
        label: "Variant",
        options: [
          { value: "default", label: "Default" },
          { value: "destructive", label: "Destructive" },
        ],
      },
    },
  },
  {
    id: "alert-dialog",
    name: "Alert Dialog",
    category: "feedback",
    description: "A modal dialog that interrupts the user with important content.",
    cli: "npx shadcn@latest add alert-dialog",
    defaultProps: {
      title: "Are you absolutely sure?",
      description: "This action cannot be undone.",
      triggerText: "Open Dialog",
      cancelText: "Cancel",
      confirmText: "Continue",
    },
    editableProps: ["title", "description"],
    propSchema: {
      title: { type: "text", label: "Title" },
      description: { type: "textarea", label: "Description" },
      triggerText: { type: "text", label: "Trigger Text" },
      cancelText: { type: "text", label: "Cancel Text" },
      confirmText: { type: "text", label: "Confirm Text" },
    },
  },
  {
    id: "toast",
    name: "Toast",
    category: "feedback",
    description: "A succinct message that is displayed temporarily.",
    cli: "npx shadcn@latest add toast sonner",
    defaultProps: {
      title: "Event Created",
      description: "Sunday, December 03, 2023 at 9:00 AM",
    },
    propSchema: {
      title: { type: "text", label: "Title" },
      description: { type: "text", label: "Description" },
    },
  },
  {
    id: "tooltip",
    name: "Tooltip",
    category: "feedback",
    description: "A popup that displays information related to an element.",
    cli: "npx shadcn@latest add tooltip",
    defaultProps: {
      content: "Add to library",
      triggerText: "Hover",
    },
    propSchema: {
      content: { type: "text", label: "Content" },
      triggerText: { type: "text", label: "Trigger Text" },
    },
  },
  {
    id: "sonner",
    name: "Sonner",
    category: "feedback",
    description: "An opinionated toast component for React.",
    cli: "npx shadcn@latest add sonner",
    defaultProps: {
      message: "Event has been created",
    },
    propSchema: {
      message: { type: "text", label: "Message" },
    },
  },

  // ============ NAVIGATION ============
  {
    id: "breadcrumb",
    name: "Breadcrumb",
    category: "navigation",
    description: "Displays the path to the current resource using a hierarchy of links.",
    cli: "npx shadcn@latest add breadcrumb",
    defaultProps: {
      items: [
        { label: "Home", href: "/" },
        { label: "Components", href: "/components" },
        { label: "Breadcrumb", href: "#" },
      ],
    },
    propSchema: {
      items: { type: "array", label: "Items" },
    },
  },
  {
    id: "menubar",
    name: "Menubar",
    category: "navigation",
    description: "A visually persistent menu common in desktop applications.",
    cli: "npx shadcn@latest add menubar",
    defaultProps: {
      menus: [
        { label: "File", items: ["New", "Open", "Save"] },
        { label: "Edit", items: ["Undo", "Redo", "Cut", "Copy"] },
        { label: "View", items: ["Zoom In", "Zoom Out"] },
      ],
    },
    propSchema: {
      menus: { type: "array", label: "Menus" },
    },
  },
  {
    id: "navigation-menu",
    name: "Navigation Menu",
    category: "navigation",
    description: "A collection of links for navigating websites.",
    cli: "npx shadcn@latest add navigation-menu",
    defaultProps: {
      items: [
        { label: "Getting Started", href: "#" },
        { label: "Components", href: "#" },
        { label: "Documentation", href: "#" },
      ],
    },
    propSchema: {
      items: { type: "array", label: "Items" },
    },
  },
  {
    id: "pagination",
    name: "Pagination",
    category: "navigation",
    description: "Pagination with page navigation, next and previous links.",
    cli: "npx shadcn@latest add pagination",
    defaultProps: {
      currentPage: 1,
      totalPages: 10,
    },
    propSchema: {
      currentPage: { type: "number", label: "Current Page" },
      totalPages: { type: "number", label: "Total Pages" },
    },
  },
  {
    id: "command",
    name: "Command",
    category: "navigation",
    description: "Fast, composable, unstyled command menu for React.",
    cli: "npx shadcn@latest add command",
    defaultProps: {
      placeholder: "Type a command or search...",
    },
    propSchema: {
      placeholder: { type: "text", label: "Placeholder" },
    },
  },
  {
    id: "context-menu",
    name: "Context Menu",
    category: "navigation",
    description: "Displays a menu located at the pointer triggered by right-click.",
    cli: "npx shadcn@latest add context-menu",
    defaultProps: {
      items: ["Back", "Forward", "Reload", "Save As..."],
    },
    propSchema: {
      items: { type: "array", label: "Items" },
    },
  },
  {
    id: "dropdown-menu",
    name: "Dropdown Menu",
    category: "navigation",
    description: "Displays a menu to the user triggered by a button.",
    cli: "npx shadcn@latest add dropdown-menu",
    defaultProps: {
      triggerText: "Open Menu",
      items: ["Profile", "Settings", "Logout"],
    },
    propSchema: {
      triggerText: { type: "text", label: "Trigger Text" },
      items: { type: "array", label: "Items" },
    },
  },
  {
    id: "sidebar",
    name: "Sidebar",
    category: "navigation",
    description: "A composable, themeable and customizable sidebar component.",
    cli: "npx shadcn@latest add sidebar",
    defaultProps: {
      items: ["Dashboard", "Projects", "Settings", "Help"],
    },
    propSchema: {
      items: { type: "array", label: "Items" },
    },
  },

  // ============ OVERLAY ============
  {
    id: "dialog",
    name: "Dialog",
    category: "overlay",
    description: "A window overlaid on the primary window.",
    cli: "npx shadcn@latest add dialog",
    defaultProps: {
      title: "Edit Profile",
      description: "Make changes to your profile here.",
      triggerText: "Open Dialog",
    },
    editableProps: ["title", "description"],
    propSchema: {
      title: { type: "text", label: "Title" },
      description: { type: "textarea", label: "Description" },
      triggerText: { type: "text", label: "Trigger Text" },
    },
  },
  {
    id: "drawer",
    name: "Drawer",
    category: "overlay",
    description: "A drawer component that slides from the edge of the screen.",
    cli: "npx shadcn@latest add drawer",
    defaultProps: {
      title: "Move Goal",
      description: "Set your daily activity goal.",
      triggerText: "Open Drawer",
    },
    editableProps: ["title", "description"],
    propSchema: {
      title: { type: "text", label: "Title" },
      description: { type: "textarea", label: "Description" },
      triggerText: { type: "text", label: "Trigger Text" },
    },
  },
  {
    id: "sheet",
    name: "Sheet",
    category: "overlay",
    description: "Extends the Dialog component to display content that complements the main content.",
    cli: "npx shadcn@latest add sheet",
    defaultProps: {
      title: "Edit Profile",
      description: "Make changes to your profile here.",
      triggerText: "Open Sheet",
      side: "right",
    },
    editableProps: ["title", "description"],
    propSchema: {
      title: { type: "text", label: "Title" },
      description: { type: "textarea", label: "Description" },
      triggerText: { type: "text", label: "Trigger Text" },
      side: {
        type: "select",
        label: "Side",
        options: [
          { value: "top", label: "Top" },
          { value: "right", label: "Right" },
          { value: "bottom", label: "Bottom" },
          { value: "left", label: "Left" },
        ],
      },
    },
  },
  {
    id: "popover",
    name: "Popover",
    category: "overlay",
    description: "Displays rich content in a portal triggered by a button.",
    cli: "npx shadcn@latest add popover",
    defaultProps: {
      triggerText: "Open Popover",
      content: "Place content for the popover here.",
    },
    propSchema: {
      triggerText: { type: "text", label: "Trigger Text" },
      content: { type: "textarea", label: "Content" },
    },
  },
  {
    id: "hover-card",
    name: "Hover Card",
    category: "overlay",
    description: "For sighted users to preview content available behind a link.",
    cli: "npx shadcn@latest add hover-card",
    defaultProps: {
      triggerText: "@nextjs",
      title: "Next.js",
      description: "The React Framework for the Web.",
    },
    propSchema: {
      triggerText: { type: "text", label: "Trigger Text" },
      title: { type: "text", label: "Title" },
      description: { type: "text", label: "Description" },
    },
  },

  // ============ TYPOGRAPHY ============
  {
    id: "heading",
    name: "Heading",
    category: "typography",
    description: "Display headings from H1 to H4.",
    cli: "",
    defaultProps: {
      text: "Heading Text",
      level: "2",
    },
    editableProps: ["text"],
    propSchema: {
      text: { type: "text", label: "Text" },
      level: {
        type: "select",
        label: "Level",
        options: [
          { value: "1", label: "H1" },
          { value: "2", label: "H2" },
          { value: "3", label: "H3" },
          { value: "4", label: "H4" },
        ],
      },
    },
  },
  {
    id: "paragraph",
    name: "Paragraph",
    category: "typography",
    description: "Standard paragraph text.",
    cli: "",
    defaultProps: {
      text: "This is a paragraph of text. You can edit this directly on the canvas.",
    },
    editableProps: ["text"],
    propSchema: {
      text: { type: "textarea", label: "Text" },
    },
  },
  {
    id: "label",
    name: "Label",
    category: "typography",
    description: "Renders an accessible label associated with controls.",
    cli: "npx shadcn@latest add label",
    defaultProps: {
      text: "Label Text",
    },
    editableProps: ["text"],
    propSchema: {
      text: { type: "text", label: "Text" },
    },
  },
];

// Get component by ID
export const getComponentById = (id) =>
  shadcnComponents.find((c) => c.id === id);

// Get components by category
export const getComponentsByCategory = (categoryId) =>
  shadcnComponents.filter((c) => c.category === categoryId);

// Get all CLI commands for batch install
export const getAllCliCommands = () => {
  const components = shadcnComponents
    .filter((c) => c.cli && !c.cli.includes(" "))
    .map((c) => c.id);
  return `npx shadcn@latest add ${components.join(" ")}`;
};

// Get individual CLI command
export const getCliCommand = (componentId) => {
  const component = getComponentById(componentId);
  return component?.cli || "";
};
