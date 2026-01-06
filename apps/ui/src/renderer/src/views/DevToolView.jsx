import { BugOutlined } from "@ant-design/icons";
import { Card, Empty, Space, Typography } from "antd";
import React from "react";

const { Title, Text } = Typography;

export default function DevToolView() {
  return (
    <div style={{ padding: "16px 24px", maxWidth: 800, margin: "0 auto" }}>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <div style={{ marginBottom: 8 }}>
          <Title level={4} style={{ margin: 0 }}>
            <BugOutlined style={{ marginRight: 8 }} />
            Developer Tools
          </Title>
        </div>

        <Card variant="outlined">
          <Empty
            description={
              <Space direction="vertical">
                <Text strong>Development Tools in Progress</Text>
                <Text type="secondary">
                  This view will provide advanced debugging and inspection tools.
                </Text>
              </Space>
            }
          />
        </Card>
      </Space>
    </div>
  );
}
