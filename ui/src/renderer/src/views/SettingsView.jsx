import {
  AppstoreOutlined,
  BgColorsOutlined,
  ControlOutlined,
  DesktopOutlined,
  MoonOutlined,
  SettingOutlined,
  SunOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Divider,
  Segmented,
  Space,
  Switch,
  Tabs,
  Tag,
  Typography,
} from "antd";
import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { keyboardShortcuts } from "../components/editor/hooks/useKeyboardShortcuts";

const { Title, Text } = Typography;

export default function SettingsView() {
  const { isDarkMode, setIsDarkMode, designMode, setDesignMode } =
    useOutletContext();
  const [startOnBoot, setStartOnBoot] = useState(false);
  const [runInBackground, setRunInBackground] = useState(true);
  const [keyboardControlsEnabled, setKeyboardControlsEnabled] = useState(true);
  const [quickToggleEnabled, setQuickToggleEnabled] = useState(true);
  const [appVisibility, setAppVisibility] = useState({
    visible: false,
    focused: false,
    minimized: false,
  });
  const [quickToggleShortcut, setQuickToggleShortcut] = useState(
    "CommandOrControl+Shift+Space"
  );

  useEffect(() => {
    let cleanupVisibility;
    let cleanupSettings;

    if (window.electronAPI) {
      window.electronAPI.getStartOnBoot().then(setStartOnBoot);
    }

    try {
      const raw = window.localStorage.getItem("runInBackground");
      if (raw !== null) setRunInBackground(raw === "true");
    } catch {}

    if (window.electronAPI?.getRunInBackground) {
      window.electronAPI
        .getRunInBackground()
        .then((value) => setRunInBackground(Boolean(value)))
        .catch(() => {});
    }

    try {
      const raw = window.localStorage.getItem("keyboardControlsEnabled");
      if (raw !== null) setKeyboardControlsEnabled(raw === "true");
    } catch {}

    if (window.electronAPI?.getKeyboardControlsEnabled) {
      window.electronAPI
        .getKeyboardControlsEnabled()
        .then((value) => setKeyboardControlsEnabled(Boolean(value)))
        .catch(() => {});
    }

    try {
      const raw = window.localStorage.getItem("quickToggleEnabled");
      if (raw !== null) setQuickToggleEnabled(raw === "true");
    } catch {}

    if (window.electronAPI?.getQuickToggleEnabled) {
      window.electronAPI
        .getQuickToggleEnabled()
        .then((value) => setQuickToggleEnabled(Boolean(value)))
        .catch(() => {});
    }

    if (window.electronAPI?.getQuickToggleShortcut) {
      window.electronAPI
        .getQuickToggleShortcut()
        .then((value) => {
          if (value) setQuickToggleShortcut(String(value));
        })
        .catch(() => {});
    }

    if (window.electronAPI?.getAppVisibility) {
      window.electronAPI
        .getAppVisibility()
        .then((value) => {
          if (value && typeof value === "object") setAppVisibility(value);
        })
        .catch(() => {});
    }

    if (window.electronAPI?.onAppVisibilityChanged) {
      cleanupVisibility = window.electronAPI.onAppVisibilityChanged(
        (payload) => {
          if (payload && typeof payload === "object") setAppVisibility(payload);
        }
      );
    }

    if (window.electronAPI?.onSettingsChanged) {
      cleanupSettings = window.electronAPI.onSettingsChanged(
        ({ key, value } = {}) => {
          if (key === "startOnBoot") setStartOnBoot(Boolean(value));
          if (key === "runInBackground") setRunInBackground(Boolean(value));
          if (key === "keyboardControlsEnabled")
            setKeyboardControlsEnabled(Boolean(value));
          if (key === "quickToggleEnabled") setQuickToggleEnabled(Boolean(value));
        }
      );
    }

    return () => {
      if (typeof cleanupVisibility === "function") cleanupVisibility();
      if (typeof cleanupSettings === "function") cleanupSettings();
    };
  }, []);

  const handleStartOnBootChange = (checked) => {
    setStartOnBoot(checked);
    if (window.electronAPI) {
      window.electronAPI.setStartOnBoot(checked);
    }
  };

  const handleRunInBackgroundChange = (checked) => {
    setRunInBackground(checked);
    try {
      window.localStorage.setItem(
        "runInBackground",
        checked ? "true" : "false"
      );
    } catch {}
    if (window.electronAPI?.setRunInBackground) {
      window.electronAPI.setRunInBackground(checked);
    }
  };

  const handleKeyboardControlsChange = (checked) => {
    setKeyboardControlsEnabled(checked);
    try {
      window.localStorage.setItem(
        "keyboardControlsEnabled",
        checked ? "true" : "false"
      );
    } catch {}
    if (window.electronAPI?.setKeyboardControlsEnabled) {
      window.electronAPI.setKeyboardControlsEnabled(checked);
    }
  };

  const handleQuickToggleEnabledChange = (checked) => {
    setQuickToggleEnabled(checked);
    try {
      window.localStorage.setItem(
        "quickToggleEnabled",
        checked ? "true" : "false"
      );
    } catch {}
    if (window.electronAPI?.setQuickToggleEnabled) {
      window.electronAPI.setQuickToggleEnabled(checked);
    }
  };

  const formatShortcutForDisplay = (shortcut) => {
    return String(shortcut)
      .replaceAll("CommandOrControl", "Ctrl/Cmd")
      .split("+")
      .join(" + ");
  };

  const renderShortcutKeys = (keys) => {
    return (
      <Space size={4} wrap>
        {keys.map((key, i) => (
          <React.Fragment key={`${key}-${i}`}>
            <Text code>{key === "Ctrl" ? "Ctrl/Cmd" : key}</Text>
            {i < keys.length - 1 && <Text type="secondary">+</Text>}
          </React.Fragment>
        ))}
      </Space>
    );
  };

  const items = [
    {
      key: "app",
      label: (
        <span>
          <AppstoreOutlined />
          App
        </span>
      ),
      children: (
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Card title="General" variant="outlined">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Space direction="vertical" size={0}>
                <Text strong>Auto-start</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Launch app when system starts.
                </Text>
              </Space>
              <Switch
                size="small"
                checked={startOnBoot}
                onChange={handleStartOnBootChange}
              />
            </div>

            <Divider style={{ margin: "12px 0" }} />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Space direction="vertical" size={0}>
                <Text strong>Run in Background</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Keep running when the window is closed.
                </Text>
              </Space>
              <Switch
                size="small"
                checked={runInBackground}
                onChange={handleRunInBackgroundChange}
              />
            </div>
          </Card>

          <Card title="System Tray" variant="outlined">
            <Space direction="vertical" size={10} style={{ width: "100%" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <Space direction="vertical" size={0}>
                  <Text strong>Window Status</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {appVisibility.visible
                      ? "The app window is currently visible."
                      : "The app is running in the background (tray only)."}
                  </Text>
                </Space>
                <Tag color={appVisibility.visible ? "green" : "default"}>
                  {appVisibility.visible ? "Visible" : "Hidden"}
                </Tag>
              </div>

              <Space size="small">
                <Button
                  size="small"
                  type="primary"
                  disabled={appVisibility.visible}
                  onClick={() => window.electronAPI?.showApp?.()}
                >
                  Show App
                </Button>
                <Button
                  size="small"
                  disabled={!appVisibility.visible}
                  onClick={() => window.electronAPI?.hideApp?.()}
                >
                  Hide App
                </Button>
              </Space>

              <Text type="secondary" style={{ fontSize: 12 }}>
                Double-click the tray icon to show/hide the app.
              </Text>
            </Space>
          </Card>

          <Card title="About" variant="outlined">
            <Space direction="vertical" size={0}>
              <Text>Next Gen v1.0</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Code generation and project management tool.
              </Text>
            </Space>
          </Card>
        </Space>
      ),
    },
    {
      key: "shortcuts",
      label: (
        <span>
          <ControlOutlined />
          Shortcuts
        </span>
      ),
      children: (
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Card title="Controls" variant="outlined">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Space direction="vertical" size={0}>
                <Text strong>Keyboard Controls</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Enable keyboard shortcuts and the shortcuts panel.
                </Text>
              </Space>
              <Switch
                size="small"
                checked={keyboardControlsEnabled}
                onChange={handleKeyboardControlsChange}
              />
            </div>

            <Divider style={{ margin: "12px 0" }} />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Space direction="vertical" size={0}>
                <Text strong>Toggle Window Shortcut</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Show/hide the window from anywhere.
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Shortcut:{" "}
                  <Text code>
                    {formatShortcutForDisplay(quickToggleShortcut)}
                  </Text>
                </Text>
                {!runInBackground && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Tip: Enable Run in Background to use this when the window is
                    closed.
                  </Text>
                )}
              </Space>
              <Switch
                size="small"
                checked={quickToggleEnabled}
                onChange={handleQuickToggleEnabledChange}
              />
            </div>
          </Card>

          <Card title="Editor Shortcuts" variant="outlined">
            <Space direction="vertical" size={10} style={{ width: "100%" }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Shortcuts below apply inside the UI Builder/editor.
              </Text>

              <div>
                <Text strong>Toggle Window (Global)</Text>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Show/hide the app from anywhere:{" "}
                    <Text code>
                      {formatShortcutForDisplay(quickToggleShortcut)}
                    </Text>
                  </Text>
                </div>
              </div>

              <Divider style={{ margin: "12px 0" }} />

              {keyboardShortcuts.map((category) => (
                <div key={category.category}>
                  <Text strong>{category.category}</Text>
                  <div style={{ marginTop: 8 }}>
                    <Space
                      direction="vertical"
                      size={6}
                      style={{ width: "100%" }}
                    >
                      {category.shortcuts.map((shortcut, idx) => (
                        <div
                          key={`${shortcut.description}-${idx}`}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          <Text style={{ fontSize: 13 }}>
                            {shortcut.description}
                          </Text>
                          {renderShortcutKeys(shortcut.keys)}
                        </div>
                      ))}
                    </Space>
                  </div>

                  <Divider style={{ margin: "12px 0" }} />
                </div>
              ))}
            </Space>
          </Card>
        </Space>
      ),
    },
    {
      key: "appearance",
      label: (
        <span>
          <BgColorsOutlined />
          Appearance
        </span>
      ),
      children: (
        <Card title="Theme" variant="outlined">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Space direction="vertical" size={0}>
              <Text strong>Theme Mode</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Switch between light, dark, or system-wide theme.
              </Text>
            </Space>
            <Segmented
              value={designMode}
              onChange={(value) => setDesignMode(value)}
              options={[
                {
                  label: (
                    <div style={{ padding: "0 8px" }}>
                      <DesktopOutlined
                        style={{
                          marginRight: 6,
                          color:
                            designMode === "system" ? "#10b981" : undefined,
                        }}
                      />
                      System
                    </div>
                  ),
                  value: "system",
                },
                {
                  label: (
                    <div style={{ padding: "0 8px" }}>
                      <SunOutlined
                        style={{
                          marginRight: 6,
                          color: designMode === "light" ? "#faad14" : undefined,
                        }}
                      />
                      Light
                    </div>
                  ),
                  value: "light",
                },
                {
                  label: (
                    <div style={{ padding: "0 8px" }}>
                      <MoonOutlined
                        style={{
                          marginRight: 6,
                          color: designMode === "dark" ? "#6366f1" : undefined,
                        }}
                      />
                      Dark
                    </div>
                  ),
                  value: "dark",
                },
              ]}
            />
          </div>
        </Card>
      ),
    },
  ];

  return (
    <div
      style={{
        height: "100%",
        overflowY: "auto",
        padding: "16px 24px",
      }}
    >
      <div className="max-w-3xl mx-auto">
        <div style={{ marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>
            <SettingOutlined style={{ marginRight: 8 }} />
            Settings
          </Title>
        </div>

        <Tabs defaultActiveKey="app" items={items} />

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}
