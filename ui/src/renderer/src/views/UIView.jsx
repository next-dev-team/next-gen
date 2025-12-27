import React from "react";
import { Typography } from "antd";

const { Title, Text } = Typography;

export default function UIView() {
  return (
    <div
      style={{
        background: "var(--color-bg-container)",
        borderRadius: 16,
        padding: 32,
        minHeight: 400,
        border: "1px solid var(--color-border)",
      }}
    >
      <Title
        level={3}
        style={{
          color: "var(--color-text-primary)",
          marginTop: 0,
          marginBottom: 8,
        }}
      >
        UI Library
      </Title>
      <Text style={{ color: "var(--color-text-secondary)" }}>
        Browse and preview UI components. Coming soon.
      </Text>
    </div>
  );
}
