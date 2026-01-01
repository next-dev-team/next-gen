import { MoonOutlined, SettingOutlined, SunOutlined } from "@ant-design/icons";
import { Card, Divider, Space, Switch, Typography } from "antd";
import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";

const { Title, Text, Paragraph } = Typography;

export default function SettingsView() {
  const { isDarkMode, setIsDarkMode } = useOutletContext();
  const [startOnBoot, setStartOnBoot] = useState(false);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getStartOnBoot().then(setStartOnBoot);
    }
  }, []);

  const handleStartOnBootChange = (checked) => {
    setStartOnBoot(checked);
    if (window.electronAPI) {
      window.electronAPI.setStartOnBoot(checked);
    }
  };

  return (
    <div style={{ padding: "16px 24px", maxWidth: 600, margin: "0 auto" }}>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <div style={{ marginBottom: 8 }}>
          <Title level={4} style={{ margin: 0 }}>
            <SettingOutlined style={{ marginRight: 8 }} />
            Settings
          </Title>
        </div>

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
        </Card>

        <Card title="Appearance" variant="outlined">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Space direction="vertical" size={0}>
              <Text strong>Dark Mode</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Switch between visual themes.
              </Text>
            </Space>
            <Space size="small">
              {isDarkMode ? (
                <MoonOutlined style={{ fontSize: 16, color: "#6366f1" }} />
              ) : (
                <SunOutlined style={{ fontSize: 16, color: "#faad14" }} />
              )}
              <Switch
                size="small"
                checked={isDarkMode}
                onChange={(checked) => setIsDarkMode(checked)}
              />
            </Space>
          </div>
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
    </div>
  );
}
