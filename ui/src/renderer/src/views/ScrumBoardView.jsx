import React from "react";
import { Typography } from "antd";

const { Title, Text } = Typography;

export default function ScrumBoardView() {
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
        Scrum Board
      </Title>
      <Text style={{ color: "var(--color-text-secondary)" }}>
        Coming soon.
      </Text>
    </div>
  );
}
