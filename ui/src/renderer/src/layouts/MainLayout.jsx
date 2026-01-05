import {
  AppstoreOutlined,
  BugOutlined,
  CameraOutlined,
  DatabaseOutlined,
  GlobalOutlined,
  GithubOutlined,
  LayoutOutlined,
  RocketOutlined,
  SettingOutlined,
  TableOutlined,
} from "@ant-design/icons";
import {
  Button,
  Dropdown,
  Layout,
  Segmented,
  Tooltip,
  Typography,
  message,
} from "antd";
import React from "react";
import { useLocation, useNavigate, useOutlet } from "react-router-dom";
import { useResourceStore } from "../stores/resourceStore";

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

export default function MainLayout({
  isDarkMode,
  setIsDarkMode,
  designMode,
  setDesignMode,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const isWeb = typeof __WEB__ !== "undefined" && Boolean(__WEB__);
  const canAppCapture =
    !isWeb &&
    Boolean(
      window.electronAPI?.appCapture?.capturePage &&
      window.electronAPI?.appCapture?.captureRegion &&
      window.electronAPI?.clipboardWriteImageDataUrl
    );

  const addScreenshot = useResourceStore((s) => s.addScreenshot);

  const [captureOverlayOpen, setCaptureOverlayOpen] = React.useState(false);
  const [captureRect, setCaptureRect] = React.useState(null);
  const captureRectRef = React.useRef(null);
  const captureDragRef = React.useRef({ active: false, startX: 0, startY: 0 });

  const closeCaptureOverlay = React.useCallback(() => {
    captureDragRef.current.active = false;
    captureRectRef.current = null;
    setCaptureRect(null);
    setCaptureOverlayOpen(false);
  }, []);

  const captureAndCopy = React.useCallback(
    async ({ mode, rect }) => {
      if (!canAppCapture) {
        message.error("Screenshot capture is not available");
        return;
      }

      try {
        const res =
          mode === "full"
            ? await window.electronAPI.appCapture.capturePage()
            : await window.electronAPI.appCapture.captureRegion(rect);

        if (!res?.ok || !res?.dataUrl) {
          message.error(res?.error ? String(res.error) : "Capture failed");
          return;
        }

        const ts = new Date().toISOString().replaceAll(":", "-");
        addScreenshot({
          name: `app-${mode}-${ts}.png`,
          source: "app",
          mode,
          dataUrl: String(res.dataUrl),
          mimeType: String(res?.mimeType || "image/png"),
          byteLength: Number(res?.byteLength) || 0,
          meta: rect ? { rect } : null,
          originId: `${mode}::${ts}`,
        });

        const ok = await window.electronAPI.clipboardWriteImageDataUrl(
          res.dataUrl
        );
        if (!ok) {
          message.error("Copy to clipboard failed");
          return;
        }
        message.success("Copied screenshot to clipboard");
      } catch (err) {
        message.error(String(err?.message || err || "Capture failed"));
      }
    },
    [addScreenshot, canAppCapture]
  );

  const startAreaCapture = React.useCallback(() => {
    if (!canAppCapture) {
      message.error("Screenshot capture is not available");
      return;
    }
    setCaptureOverlayOpen(true);
    captureRectRef.current = null;
    setCaptureRect(null);
  }, [canAppCapture]);

  React.useEffect(() => {
    if (!captureOverlayOpen) return;
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      closeCaptureOverlay();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [captureOverlayOpen, closeCaptureOverlay]);

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
            level={5}
            style={{ color: "var(--color-text-primary)", margin: 0 }}
          >
            {activeTab === "ui"
              ? "UI Builder"
              : activeTab === "resources"
                ? "Resources"
                : "Next Gen"}
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
              //       <DatabaseOutlined />
              //       <span>Resources</span>
              //     </div>
              //   ),
              //   value: "resources",
              // },
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
          {canAppCapture ? (
            <Tooltip title="Capture screenshot">
              <Dropdown
                trigger={["click"]}
                placement="bottomRight"
                menu={{
                  items: [
                    { key: "area", label: "Area (default)" },
                    { key: "full", label: "Full" },
                  ],
                  onClick: ({ key }) => {
                    if (key === "full") {
                      captureAndCopy({ mode: "full" });
                      return;
                    }
                    startAreaCapture();
                  },
                }}
              >
                <Button
                  type="text"
                  icon={<CameraOutlined />}
                  style={{ color: "var(--color-text-secondary)" }}
                />
              </Dropdown>
            </Tooltip>
          ) : null}

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
            <Dropdown
              trigger={["click"]}
              placement="bottomRight"
              menu={{
                items: [
                  {
                    key: "resources",
                    label: "Resources",
                    icon: <DatabaseOutlined />,
                  },
                  {
                    key: "settings",
                    label: "Settings",
                    icon: <SettingOutlined />,
                  },
                ],
                onClick: ({ key }) => {
                  if (key === "resources") {
                    navigate("/resources");
                  } else if (key === "settings") {
                    navigate("/settings");
                  }
                },
              }}
            >
              <Button
                type="text"
                icon={<SettingOutlined />}
                style={{ color: "var(--color-text-secondary)", fontSize: 18 }}
              />
            </Dropdown>
          </Tooltip>
        </div>
      </Header>

      {/* Main Content */}
      <Content
        className="flex flex-col flex-1 overflow-hidden"
        style={{ padding: "0 48px 24px" }}
      >
        <KeepAliveOutlet
          outletContext={{
            isDarkMode,
            setIsDarkMode,
            designMode,
            setDesignMode,
          }}
          keepAliveKeys={["browser"]}
        />
      </Content>

      {captureOverlayOpen ? (
        <div
          role="presentation"
          onMouseDown={(e) => {
            captureDragRef.current.active = true;
            captureDragRef.current.startX = e.clientX;
            captureDragRef.current.startY = e.clientY;
            const next = { x: e.clientX, y: e.clientY, width: 0, height: 0 };
            captureRectRef.current = next;
            setCaptureRect(next);
          }}
          onMouseMove={(e) => {
            if (!captureDragRef.current.active) return;
            const x1 = captureDragRef.current.startX;
            const y1 = captureDragRef.current.startY;
            const x2 = e.clientX;
            const y2 = e.clientY;
            const x = Math.min(x1, x2);
            const y = Math.min(y1, y2);
            const width = Math.max(0, Math.abs(x2 - x1));
            const height = Math.max(0, Math.abs(y2 - y1));
            const next = { x, y, width, height };
            captureRectRef.current = next;
            setCaptureRect(next);
          }}
          onMouseUp={async () => {
            const r = captureRectRef.current;
            closeCaptureOverlay();
            if (!r) return;
            const width = Math.floor(Number(r.width) || 0);
            const height = Math.floor(Number(r.height) || 0);
            if (width < 2 || height < 2) return;
            await captureAndCopy({
              mode: "area",
              rect: {
                x: Math.floor(Number(r.x) || 0),
                y: Math.floor(Number(r.y) || 0),
                width,
                height,
              },
            });
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            closeCaptureOverlay();
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            background: "rgba(15,23,42,0.18)",
            cursor: "crosshair",
            WebkitAppRegion: "no-drag",
            userSelect: "none",
          }}
        >
          {captureRect ? (
            <div
              style={{
                position: "absolute",
                left: captureRect.x,
                top: captureRect.y,
                width: captureRect.width,
                height: captureRect.height,
                border: "1px solid var(--color-primary)",
                background: "rgba(79,70,229,0.12)",
                boxShadow: "0 0 0 1px rgba(15,23,42,0.45) inset",
              }}
            />
          ) : null}
        </div>
      ) : null}
    </Layout>
  );
}
