import {
  AppstoreOutlined,
  ClockCircleOutlined,
  CodeOutlined,
  CopyOutlined,
  DeleteOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  Badge,
  Button,
  Card,
  Col,
  Dropdown,
  Empty,
  Input,
  message,
  Popconfirm,
  Row,
  Space,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import React, { useCallback, useEffect, useState } from "react";
import { generators } from "../generators-config";
import { copyToClipboard } from "../utils/codeGenerator";

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

// Available IDEs with their icons/colors
const IDE_OPTIONS = [
  { key: "cursor", label: "Cursor", icon: "🖱️", color: "#00D4FF" },
  { key: "trae", label: "Trae", icon: "🔷", color: "#3B82F6" },
  {
    key: "google-antigravity",
    label: "Google Antigravity",
    icon: "☁️",
    color: "#4285F4",
  },
  { key: "vscode", label: "VS Code", icon: "💙", color: "#007ACC" },
  { key: "webstorm", label: "WebStorm", icon: "🌊", color: "#00CDD7" },
  { key: "zed", label: "Zed", icon: "⚡", color: "#F5A623" },
  { key: "sublime", label: "Sublime Text", icon: "🧡", color: "#FF9800" },
  { key: "nvim", label: "Neovim", icon: "🌿", color: "#57A143" },
  { key: "fleet", label: "Fleet", icon: "🚀", color: "#8B5CF6" },
];

// Get framework icon
const getFrameworkIcon = (framework) => {
  const icons = {
    "nextjs-15": "⚛️",
    "nextjs-16": "⚛️",
    "vite-react-9": "⚡",
    "tanstack-start": "🔄",
    vue3: "💚",
    nuxt4: "💚",
    "rnr-expo": "📱",
    "rnr-expo-uniwind": "📱",
    "turbo-uniwind": "📦",
    "electron-float": "⚡",
    "tron-mini": "🔌",
    "agent-rules": "🤖",
    "app-scaffold": "📦",
  };
  return icons[framework] || "📁";
};

// Get framework color
const getFrameworkColor = (framework) => {
  const colors = {
    "nextjs-15": "#000000",
    "nextjs-16": "#000000",
    "vite-react-9": "#646CFF",
    "tanstack-start": "#FF4154",
    vue3: "#42B883",
    nuxt4: "#00DC82",
    "rnr-expo": "#000020",
    "rnr-expo-uniwind": "#000020",
    "turbo-uniwind": "#EF4444",
    "electron-float": "#47848F",
    "tron-mini": "#10B981",
    "agent-rules": "#8B5CF6",
    "app-scaffold": "#3B82F6",
  };
  return colors[framework] || "#6366F1";
};

const generatorDescriptionsByName = generators.reduce((acc, generator) => {
  if (generator?.name) {
    acc[generator.name] = generator.description || "";
  }
  return acc;
}, {});

const getGeneratorDescription = (project) => {
  if (!project?.generator) return "";
  if (project.generator === "app-scaffold") {
    const appScaffold = generators.find((g) => g.name === "app-scaffold");
    const frontendPrompt = appScaffold?.prompts?.find(
      (prompt) => prompt.name === "frontend"
    );
    const choice = frontendPrompt?.choices?.find(
      (item) => item.value === project.framework
    );
    if (choice?.name) {
      return `${choice.name} app created with App Scaffold`;
    }
  }
  return generatorDescriptionsByName[project.generator] || "";
};

export const ProjectLauncher = ({ onNavigateToGenerator }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [defaultIDE, setDefaultIDE] = useState("cursor");

  const openExternal = (url) => {
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  // Load projects on mount
  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      if (window.electronAPI?.getProjects) {
        const savedProjects = await window.electronAPI.getProjects();
        setProjects(savedProjects);
      }
    } catch (err) {
      console.error("Failed to load projects:", err);
      message.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleOpenInIDE = async (project, ide) => {
    const selectedIDE = IDE_OPTIONS.find((item) => item.key === ide);
    const ideLabel = selectedIDE?.label || ide;
    const lowerIde = (ide || "").toLowerCase();

    // Show immediate feedback
    const loadingMessage = message.loading(`Opening ${project.name} in ${ideLabel}...`, 0);

    try {
      if (window.electronAPI?.openInIDE) {
        const result = await window.electronAPI.openInIDE(project.path, ide);
        loadingMessage(); // Clear loading message
        
        if (result && result.success) {
          message.success(`Opened ${project.name} in ${ideLabel}`);
        } else if (result && result.error) {
          throw new Error(result.error);
        }
      } else {
        loadingMessage();
        message.error("Electron API not available");
      }
    } catch (err) {
      loadingMessage(); // Clear loading message
      
      if (["vscode", "vs-code", "code"].includes(lowerIde)) {
        message.error({
          content: (
            <div style={{ fontSize: "13px" }}>
              <Text strong style={{ color: "inherit" }}>
                {ideLabel} command not found.
              </Text>
              <br />
              Install{" "}
              <Button
                type="link"
                size="small"
                style={{ padding: 0, height: "auto", color: "#6366f1" }}
                onClick={() => openExternal("https://code.visualstudio.com/")}
              >
                VS Code
              </Button>{" "}
              and run "Install 'code' command in PATH" from Command Palette.
              {err?.message && (
                <div style={{ opacity: 0.6, fontSize: "11px", marginTop: "4px" }}>
                  {err.message.includes("command not found")
                    ? "Error: command not found"
                    : err.message}
                </div>
              )}
            </div>
          ),
          duration: 6,
        });
      } else {
        message.error({
          content: (
            <div style={{ fontSize: "13px" }}>
              <Text strong style={{ color: "inherit" }}>
                {ideLabel} not found.
              </Text>
              <br />
              Ensure {ideLabel} is installed and available in your PATH.
              {err?.message && (
                <div style={{ opacity: 0.6, fontSize: "11px", marginTop: "4px" }}>
                  {err.message.includes("command not found")
                    ? `Error: ${lowerIde} command not found`
                    : err.message}
                </div>
              )}
            </div>
          ),
          duration: 5,
        });
      }
    }
  };

  const handleOpenFolder = async (project) => {
    try {
      if (window.electronAPI?.openFolder) {
        await window.electronAPI.openFolder(project.path);
      }
    } catch (err) {
      message.error(`Failed to open folder: ${err.message}`);
    }
  };

  const handleDeleteProject = async (projectId) => {
    try {
      if (window.electronAPI?.deleteProject) {
        const updatedProjects = await window.electronAPI.deleteProject(
          projectId
        );
        setProjects(updatedProjects);
        message.success("Project removed from list");
      }
    } catch (err) {
      message.error(`Failed to delete project: ${err.message}`);
    }
  };

  const handleAddExisting = async () => {
    try {
      if (window.electronAPI?.selectFolder) {
        const selectedPath = await window.electronAPI.selectFolder({
          title: "Select Project Folder",
        });
        if (selectedPath) {
          // Extract project name from path
          const pathParts = selectedPath.split(/[/\\]/);
          const projectName = pathParts[pathParts.length - 1];

          const newProject = {
            name: projectName,
            path: selectedPath,
            generator: "imported",
            framework: "custom",
          };

          if (window.electronAPI?.saveProject) {
            const updatedProjects = await window.electronAPI.saveProject(
              newProject
            );
            setProjects(updatedProjects);
            message.success(`Added ${projectName} to your projects`);
          }
        }
      }
    } catch (err) {
      message.error(`Failed to add project: ${err.message}`);
    }
  };

  // Filter projects based on search
  const filteredProjects = projects.filter((project) => {
    const query = searchQuery.toLowerCase();
    return (
      project.name?.toLowerCase().includes(query) ||
      project.path?.toLowerCase().includes(query) ||
      project.framework?.toLowerCase().includes(query) ||
      project.generator?.toLowerCase().includes(query)
    );
  });

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleCopyPath = async (path) => {
    const success = await copyToClipboard(path);
    if (success) {
      message.success("Project path copied to clipboard");
    } else {
      message.error("Failed to copy path");
    }
  };

  // IDE dropdown items
  const getIDEMenuItems = (project) => [
    ...IDE_OPTIONS.map((ide) => ({
      key: ide.key,
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>{ide.icon}</span>
          <span>{ide.label}</span>
        </span>
      ),
      onClick: () => handleOpenInIDE(project, ide.key),
    })),
    { type: "divider" },
    {
      key: "copy-path",
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CopyOutlined />
          <span>Copy Project Path</span>
        </span>
      ),
      onClick: () => handleCopyPath(project.path),
    },
  ];

  return (
    <div className="project-launcher">
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <Title level={3} style={{ color: "#f1f5f9", margin: 0 }}>
            <AppstoreOutlined style={{ marginRight: 12, color: "#6366f1" }} />
            Project Launcher
          </Title>
          <Text type="secondary">
            {projects.length} project{projects.length !== 1 ? "s" : ""} • Open
            in your favorite IDE
          </Text>
        </div>

        <Space>
          <Tooltip title="Add existing project">
            <Button
              icon={<PlusOutlined />}
              onClick={handleAddExisting}
              style={{
                background: "#334155",
                borderColor: "#475569",
                color: "#f1f5f9",
              }}
            >
              Add Project
            </Button>
          </Tooltip>
          <Tooltip title="Refresh list">
            <Button
              icon={<ReloadOutlined />}
              onClick={loadProjects}
              style={{
                background: "#334155",
                borderColor: "#475569",
                color: "#f1f5f9",
              }}
            />
          </Tooltip>
        </Space>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <Search
          placeholder="Search projects..."
          prefix={<SearchOutlined style={{ color: "#64748b" }} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ maxWidth: 400 }}
          allowClear
        />
      </div>

      {/* Default IDE Selector */}
      <div
        style={{
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Text style={{ color: "#94a3b8" }}>Quick open with:</Text>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {IDE_OPTIONS.slice(0, 5).map((ide) => (
            <Tag
              key={ide.key}
              onClick={() => setDefaultIDE(ide.key)}
              style={{
                cursor: "pointer",
                padding: "4px 10px",
                borderRadius: 6,
                background: defaultIDE === ide.key ? ide.color : "#334155",
                borderColor: defaultIDE === ide.key ? ide.color : "#475569",
                color: defaultIDE === ide.key ? "#fff" : "#94a3b8",
                transition: "all 0.2s",
              }}
            >
              {ide.icon} {ide.label}
            </Tag>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <ReloadOutlined spin style={{ fontSize: 32, color: "#6366f1" }} />
          <div style={{ color: "#94a3b8", marginTop: 16 }}>
            Loading projects...
          </div>
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card
          style={{
            background: "#1e293b",
            borderColor: "#334155",
            textAlign: "center",
          }}
        >
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span style={{ color: "#64748b" }}>
                {searchQuery
                  ? "No projects match your search"
                  : "No projects yet. Generate one or add an existing project!"}
              </span>
            }
          >
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddExisting}
                style={{
                  background:
                    "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
                  border: "none",
                }}
              >
                Add Existing Project
              </Button>
              {onNavigateToGenerator && (
                <Button
                  icon={<CodeOutlined />}
                  onClick={onNavigateToGenerator}
                  style={{
                    background: "#334155",
                    borderColor: "#475569",
                    color: "#f1f5f9",
                  }}
                >
                  Create New Project
                </Button>
              )}
            </Space>
          </Empty>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {filteredProjects.map((project) => (
            <Col xs={24} sm={12} lg={8} key={project.id}>
              <Card
                hoverable
                className="project-card"
                style={{
                  background: "#1e293b",
                  borderColor: "#334155",
                  transition: "all 0.3s ease",
                }}
                styles={{ body: { padding: 16 } }}
              >
                {/* Card Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: getFrameworkColor(
                        project.framework || project.generator
                      ),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      flexShrink: 0,
                    }}
                  >
                    {getFrameworkIcon(project.framework || project.generator)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      strong
                      style={{
                        fontSize: 15,
                        color: "#f1f5f9",
                        display: "block",
                        marginBottom: 2,
                      }}
                      ellipsis={{ tooltip: project.name }}
                    >
                      {project.name}
                    </Text>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Text
                        style={{
                          color: "#64748b",
                          fontSize: 12,
                          flex: 1,
                        }}
                        ellipsis={{ tooltip: project.path }}
                      >
                        {project.path}
                      </Text>
                      <Tooltip title="Copy path">
                        <Button
                          type="text"
                          size="small"
                          icon={<CopyOutlined style={{ fontSize: 10 }} />}
                          onClick={() => handleCopyPath(project.path)}
                          style={{
                            color: "#64748b",
                            width: 20,
                            height: 20,
                            minWidth: 20,
                            padding: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        />
                      </Tooltip>
                    </div>
                    {getGeneratorDescription(project) && (
                      <Text
                        style={{
                          color: "#9ca3af",
                          fontSize: 12,
                          display: "block",
                          marginTop: 2,
                        }}
                        ellipsis={{ tooltip: getGeneratorDescription(project) }}
                      >
                        {getGeneratorDescription(project)}
                      </Text>
                    )}
                  </div>
                  <Dropdown
                    menu={{ items: getIDEMenuItems(project) }}
                    trigger={["click"]}
                    placement="bottomRight"
                  >
                    <Button
                      type="text"
                      icon={<MoreOutlined />}
                      size="small"
                      style={{ color: "#64748b" }}
                    />
                  </Dropdown>
                </div>

                {/* Tags */}
                <div style={{ marginBottom: 12 }}>
                  {project.framework && (
                    <Tag color="blue" style={{ borderRadius: 4, fontSize: 11 }}>
                      {project.framework}
                    </Tag>
                  )}
                  {project.generator && (
                    <Tag
                      color="purple"
                      style={{ borderRadius: 4, fontSize: 11 }}
                    >
                      {project.generator}
                    </Tag>
                  )}
                </div>

                {/* Created Date */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    marginBottom: 12,
                    color: "#64748b",
                    fontSize: 12,
                  }}
                >
                  <ClockCircleOutlined />
                  <span>Created {formatDate(project.createdAt)}</span>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8 }}>
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => handleOpenInIDE(project, defaultIDE)}
                    style={{
                      flex: 1,
                      background:
                        IDE_OPTIONS.find((i) => i.key === defaultIDE)?.color ||
                        "#6366f1",
                      border: "none",
                    }}
                  >
                    {IDE_OPTIONS.find((i) => i.key === defaultIDE)?.icon} Open
                    in{" "}
                    {IDE_OPTIONS.find((i) => i.key === defaultIDE)?.label ||
                      defaultIDE}
                  </Button>
                  <Tooltip title="Open in Explorer">
                    <Button
                      size="small"
                      icon={<FolderOpenOutlined />}
                      onClick={() => handleOpenFolder(project)}
                      style={{
                        background: "#334155",
                        borderColor: "#475569",
                        color: "#f1f5f9",
                      }}
                    />
                  </Tooltip>
                  <Popconfirm
                    title="Remove project from list?"
                    description="This won't delete the actual files."
                    onConfirm={() => handleDeleteProject(project.id)}
                    okText="Remove"
                    cancelText="Cancel"
                  >
                    <Tooltip title="Remove from list">
                      <Button
                        size="small"
                        icon={<DeleteOutlined />}
                        danger
                        style={{
                          background: "transparent",
                          borderColor: "#475569",
                        }}
                      />
                    </Tooltip>
                  </Popconfirm>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Styles */}
      <style>{`
        .project-card:hover {
          border-color: #6366f1 !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        }
        
        .ant-input-affix-wrapper {
          background: #1e293b !important;
          border-color: #475569 !important;
        }
        
        .ant-input-affix-wrapper input {
          background: transparent !important;
          color: #f1f5f9 !important;
        }
        
        .ant-input-affix-wrapper:hover,
        .ant-input-affix-wrapper:focus {
          border-color: #6366f1 !important;
        }
      `}</style>
    </div>
  );
};

export default ProjectLauncher;
