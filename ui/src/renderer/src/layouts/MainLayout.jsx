import {
  AppstoreOutlined,
  BugOutlined,
  GlobalOutlined,
  GithubOutlined,
  LayoutOutlined,
  RocketOutlined,
  SettingOutlined,
  TableOutlined,
} from "@ant-design/icons";
import { Button, Layout, Segmented, Tooltip, Typography } from "antd";
import React from "react";
import { useLocation, useNavigate, useOutlet } from "react-router-dom";

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

function KeepAliveOutlet({ outletContext, keepAliveKeys }) {
  const location = useLocation();
  const outlet = useOutlet(outletContext);
  const cacheRef = React.useRef(new Map());
  const [, forceRender] = React.useState(0);

  const currentKey =
    location.pathname === "/"
      ? "generator"
      : location.pathname.substring(1).split("/")[0];
  const shouldKeepAlive = keepAliveKeys.includes(currentKey);

  React.useEffect(() => {
    if (!shouldKeepAlive) return;
    if (!outlet) return;
    if (cacheRef.current.has(currentKey)) return;

    cacheRef.current.set(currentKey, outlet);
    forceRender((v) => v + 1);
  }, [currentKey, outlet, shouldKeepAlive]);

  const entries = Array.from(cacheRef.current.entries());
  const hasCurrent = cacheRef.current.has(currentKey);
  const renderEntries =
    shouldKeepAlive && outlet && !hasCurrent
      ? [...entries, [currentKey, outlet]]
      : entries;

  return (
    <div className="relative flex-1 min-h-0 w-full">
      {renderEntries.map(([key, element]) => (
        <div
          key={key}
          className="absolute inset-0 w-full h-full"
          style={{ display: key === currentKey ? "block" : "none" }}
        >
          {element}
        </div>
      ))}
      {!shouldKeepAlive ? <div className="w-full h-full">{outlet}</div> : null}
    </div>
  );
}

export default function MainLayout({ isDarkMode, setIsDarkMode }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Derive active tab from pathname
  const activeTab =
    location.pathname === "/"
      ? "generator"
      : location.pathname.substring(1).split("/")[0];

  const handleTabChange = (value) => {
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
            gap: 12,
            flex: 1,
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
            {activeTab === "ui" ? "UI Builder" : "Next Gen"}
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
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            WebkitAppRegion: "no-drag",
          }}
        >
          <Segmented
            value={activeTab}
            onChange={handleTabChange}
            options={[
              {
                label: (
                  <div
                    style={{
                      padding: "2px 4px",
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
                      padding: "2px 4px",
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
                      padding: "2px 4px",
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
                      padding: "2px 4px",
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
              {
                label: (
                  <div
                    style={{
                      padding: "2px 4px",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <GlobalOutlined />
                    <span>Browser</span>
                  </div>
                ),
                value: "browser",
              },
              // {
              //   label: (
              //     <div
              //       style={{
              //         padding: "2px 4px",
              //         display: "flex",
              //         alignItems: "center",
              //         gap: 8,
              //       }}
              //     >
              //       <BugOutlined />
              //       <span>Dev Tool</span>
              //     </div>
              //   ),
              //   value: "dev-tool",
              // },
            ]}
            style={{
              padding: 2,
              borderRadius: 12,
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 12,
            flex: 1,
            WebkitAppRegion: "no-drag",
          }}
        >
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

          <Tooltip title="Settings">
            <Button
              type="text"
              icon={<SettingOutlined />}
              style={{ color: "var(--color-text-secondary)", fontSize: 18 }}
              onClick={() => navigate("/settings")}
            />
          </Tooltip>
        </div>
      </Header>

      {/* Main Content */}
      <Content
        className="flex flex-col flex-1 overflow-hidden"
        style={{ padding: "0 48px 24px" }}
      >
        <KeepAliveOutlet
          outletContext={{ isDarkMode, setIsDarkMode }}
          keepAliveKeys={["browser"]}
        />
      </Content>
    </Layout>
  );
}
