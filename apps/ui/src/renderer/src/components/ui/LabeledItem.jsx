import React from "react";
import { Typography, Space, theme } from "antd";

const { Text } = Typography;

/**
 * LabeledItem Component
 * A reusable layout component that pairs a label with a child component.
 * Following design system standards for mobile mini-app responsiveness.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.label - The main label text or element
 * @param {React.ReactNode} props.subLabel - Optional descriptive text below the label
 * @param {React.ReactNode} props.children - The control or content element
 * @param {React.CSSProperties} props.style - Optional container style
 * @param {string} props.className - Optional container class
 */
const LabeledItem = ({ label, subLabel, children, style, className }) => {
  const { token } = theme.useToken();

  return (
    <div
      className={className}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        padding: "8px 0",
        ...style,
      }}
    >
      <Space direction="vertical" size={0} style={{ flex: 1, marginRight: 12 }}>
        <Text strong style={{ fontSize: 14, lineHeight: "20px" }}>
          {label}
        </Text>
        {subLabel && (
          <Text type="secondary" style={{ fontSize: 12, lineHeight: "18px" }}>
            {subLabel}
          </Text>
        )}
      </Space>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
};

export default LabeledItem;
