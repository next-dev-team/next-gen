import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  AppstoreOutlined,
  GithubOutlined,
  LayoutOutlined,
  MoonOutlined,
  RocketOutlined,
  SettingOutlined,
  SunOutlined,
  TableOutlined,
} from "@ant-design/icons";
import {
  Button,
  Layout,
  Segmented,
  Switch,
  Tooltip,
  Typography,
} from "antd";

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

export default function MainLayout({ isDarkMode, setIsDarkMode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [startOnBoot, setStartOnBoot] = useState(false);
  const [activeTab, setActiveTab] = useState("generator");

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getStartOnBoot().then(setStartOnBoot);
    }
  }, []);

  // Sync activeTab with current location
  useEffect(() => {
    const path = location.pathname.substring(1); // remove leading slash
    if (path === "" || path === "generator") setActiveTab("generator");
    else if (path === "projects") setActiveTab("projects");
    else if (path === "ui") setActiveTab("ui");
    else if (path === "scrum-board") setActiveTab("scrum-board");
  }, [location]);

  const handleStartOnBootChange = (checked) => {
    setStartOnBoot(checked);
    if (window.electronAPI) {
      window.electronAPI.setStartOnBoot(checked);
    }
  };

  const handleTabChange = (value) => {
    setActiveTab(value);
    navigate(`/${value}`);
  };

  return (
    <Layout
      style={{
        height: "100vh",
        background: "var(--color-bg-base)",
        transition: "background 0.3s ease",
      }}
    >
      {/* Header */}
      <Header
        style={{
          background: "var(--color-bg-container)",
          borderBottom: "1px solid var(--color-border)",
          padding: "0 24px",
          paddingRight: 150, // Space for window control buttons
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 64,
          WebkitAppRegion: "drag", // Make header draggable
          transition: "background 0.3s ease, border-color 0.3s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            WebkitAppRegion: "no-drag",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <RocketOutlined style={{ color: "#fff", fontSize: 18 }} />
          </div>
          <Title
            level={4}
            style={{ color: "var(--color-text-primary)", margin: 0 }}
          >
            Next Gen
          </Title>
          <Text
            style={{
              color: "var(--color-text-secondary)",
              fontSize: 12,
              padding: "2px 8px",
              background: "var(--color-bg-elevated)",
              borderRadius: 4,
            }}
          >
            v1.0
          </Text>

          {/* Divider */}
          <div
            style={{
              width: 1,
              height: 24,
              background: "var(--color-border)",
              margin: "0 8px",
            }}
          />

          {/* Start on boot - moved to left side for visibility */}
          <Tooltip title="Launch app when system starts">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 12px",
                background: startOnBoot
                  ? "rgba(99, 102, 241, 0.2)"
                  : "var(--color-bg-elevated)",
                borderRadius: 8,
                border: startOnBoot
                  ? "1px solid #6366f1"
                  : "1px solid var(--color-border)",
                transition: "all 0.2s",
              }}
            >
              <button
                type="button"
                onClick={() => handleStartOnBootChange(!startOnBoot)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  font: "inherit",
                }}
              >
                <SettingOutlined
                  style={{
                    color: startOnBoot
                      ? "#6366f1"
                      : "var(--color-text-secondary)",
                    fontSize: 14,
                  }}
                />
                <Text
                  style={{
                    color: startOnBoot
                      ? "var(--color-text-primary)"
                      : "var(--color-text-secondary)",
                    fontSize: 13,
                  }}
                >
                  Auto-start
                </Text>
              </button>
              <Switch
                size="small"
                checked={startOnBoot}
                onChange={handleStartOnBootChange}
              />
            </div>
          </Tooltip>

          {/* Divider */}
          <div
            style={{
              width: 1,
              height: 24,
              background: "var(--color-border)",
              margin: "0 8px",
            }}
          />

          {/* Theme Toggle */}
          <Tooltip
            title={
              isDarkMode ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            <Button
              type="text"
              icon={isDarkMode ? <SunOutlined /> : <MoonOutlined />}
              onClick={() => setIsDarkMode(!isDarkMode)}
              style={{ color: "var(--color-text-secondary)", fontSize: 18 }}
            />
          </Tooltip>

          {/* GitHub button - also on left */}
          <Tooltip title="View on GitHub">
            <Button
              type="text"
              icon={<GithubOutlined />}
              style={{ color: "var(--color-text-secondary)" }}
              onClick={() => {
                if (window.electronAPI?.openExternal) {
                  window.electronAPI.openExternal(
                    "https://github.com/next-dev-team/next-gen"
                  );
                }
              }}
            />
          </Tooltip>
        </div>
      </Header>

      {/* Main Content */}
      <Content style={{ padding: "24px 48px", overflowY: "auto" }}>
        {/* Tab Navigation */}
        <div
          style={{
            marginBottom: 24,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Segmented
            value={activeTab}
            onChange={handleTabChange}
            size="large"
            options={[
              {
                label: (
                  <div
                    style={{
                      padding: "4px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <RocketOutlined />
                    <span>Generator</span>
                  </div>
                ),
                value: "generator",
              },
              {
                label: (
                  <div
                    style={{
                      padding: "4px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <AppstoreOutlined />
                    <span>Projects</span>
                  </div>
                ),
                value: "projects",
              },
              {
                label: (
                  <div
                    style={{
                      padding: "4px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <LayoutOutlined />
                    <span>UI</span>
                  </div>
                ),
                value: "ui",
              },
              {
                label: (
                  <div
                    style={{
                      padding: "4px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <TableOutlined />
                    <span>Scrum Board</span>
                  </div>
                ),
                value: "scrum-board",
              },
            ]}
            style={{
              background: "var(--color-bg-elevated)",
              padding: 4,
              borderRadius: 12,
            }}
          />
        </div>

        <Outlet />
      </Content>

      {/* Footer */}
      <Footer
        style={{
          background: "transparent",
          borderTop: "1px solid var(--color-border)",
          textAlign: "center",
          padding: "16px 24px",
        }}
      >
        <Text style={{ color: "var(--color-text-secondary)" }}>
          Next Gen Generator © {new Date().getFullYear()}
        </Text>
      </Footer>
    </Layout>
  );
}
