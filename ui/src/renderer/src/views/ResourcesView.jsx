import React, { useMemo, useState } from "react";
import {
  Button,
  Input,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  message,
} from "antd";
import { useResourceStore } from "../stores/resourceStore";

const COLUMN_LAYOUT = {
  table: {
    background: "var(--color-bg-container)",
    borderRadius: 12,
    padding: 16,
    border: "1px solid var(--color-border)",
  },
  header: {
    marginBottom: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 500,
    color: "var(--color-text-primary)",
  },
  subtitle: {
    fontSize: 12,
    color: "var(--color-text-secondary)",
  },
};

export default function ResourcesView() {
  const [activeTab, setActiveTab] = useState("screenshots");
  const [recordSearch, setRecordSearch] = useState("");
  const [shotSearch, setShotSearch] = useState("");
  const [activeCollectionId, setActiveCollectionId] = useState("all");

  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [collectionModalMode, setCollectionModalMode] = useState("create");
  const [collectionDraftName, setCollectionDraftName] = useState("");
  const [collectionTargetId, setCollectionTargetId] = useState(null);

  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [recordTargetId, setRecordTargetId] = useState(null);
  const [recordDraftCollectionId, setRecordDraftCollectionId] =
    useState("default");
  const [recordDraftKey, setRecordDraftKey] = useState("");
  const [recordDraftValue, setRecordDraftValue] = useState("{}");

  const [shotViewerOpen, setShotViewerOpen] = useState(false);
  const [shotViewerItem, setShotViewerItem] = useState(null);

  const collections = useResourceStore((s) => s.collections);
  const records = useResourceStore((s) => s.records);
  const screenshots = useResourceStore((s) => s.screenshots);
  const createCollection = useResourceStore((s) => s.createCollection);
  const renameCollection = useResourceStore((s) => s.renameCollection);
  const deleteCollection = useResourceStore((s) => s.deleteCollection);
  const upsertRecord = useResourceStore((s) => s.upsertRecord);
  const deleteRecord = useResourceStore((s) => s.deleteRecord);
  const deleteScreenshot = useResourceStore((s) => s.deleteScreenshot);

  const collectionNameById = useMemo(() => {
    const map = new Map();
    collections.forEach((c) => {
      map.set(c.id, c.name || c.id);
    });
    return map;
  }, [collections]);

  const filteredRecords = useMemo(() => {
    const query = recordSearch.trim().toLowerCase();
    const byCollection =
      activeCollectionId === "all"
        ? records
        : records.filter((r) => r.collectionId === activeCollectionId);
    if (!query) return byCollection;
    return byCollection.filter((r) => {
      const k = String(r.key || "").toLowerCase();
      const v = JSON.stringify(r.value ?? "").toLowerCase();
      const c = String(
        collectionNameById.get(r.collectionId) || ""
      ).toLowerCase();
      return k.includes(query) || v.includes(query) || c.includes(query);
    });
  }, [records, recordSearch, collectionNameById, activeCollectionId]);

  const filteredScreenshots = useMemo(() => {
    const query = shotSearch.trim().toLowerCase();
    if (!query) return screenshots;
    return screenshots.filter((s) => {
      const name = String(s.name || "").toLowerCase();
      const source = String(s.source || "").toLowerCase();
      const mode = String(s.mode || "").toLowerCase();
      return (
        name.includes(query) || source.includes(query) || mode.includes(query)
      );
    });
  }, [screenshots, shotSearch]);

  const openCreateCollection = () => {
    setCollectionModalMode("create");
    setCollectionDraftName("");
    setCollectionTargetId(null);
    setCollectionModalOpen(true);
  };

  const openRenameCollection = (collectionId) => {
    const current = collections.find((c) => c.id === collectionId);
    setCollectionModalMode("rename");
    setCollectionDraftName(String(current?.name || ""));
    setCollectionTargetId(collectionId);
    setCollectionModalOpen(true);
  };

  const confirmCollectionModal = async () => {
    const name = String(collectionDraftName || "").trim();
    if (!name) {
      message.error("Collection name is required");
      return;
    }
    if (collectionModalMode === "create") {
      const id = createCollection(name);
      if (id) {
        setActiveCollectionId(id);
        message.success("Collection created");
      }
      setCollectionModalOpen(false);
      return;
    }
    if (collectionTargetId) {
      const ok = renameCollection(collectionTargetId, name);
      if (ok) message.success("Collection renamed");
    }
    setCollectionModalOpen(false);
  };

  const openCreateRecord = () => {
    setRecordTargetId(null);
    setRecordDraftCollectionId(
      activeCollectionId === "all" ? "default" : activeCollectionId
    );
    setRecordDraftKey("");
    setRecordDraftValue("{}");
    setRecordModalOpen(true);
  };

  const openEditRecord = (record) => {
    setRecordTargetId(record.id);
    setRecordDraftCollectionId(String(record.collectionId || "default"));
    setRecordDraftKey(String(record.key || ""));
    try {
      const text =
        record.value == null
          ? "null"
          : typeof record.value === "string"
            ? record.value
            : JSON.stringify(record.value, null, 2);
      setRecordDraftValue(text);
    } catch {
      setRecordDraftValue(String(record.value ?? ""));
    }
    setRecordModalOpen(true);
  };

  const confirmRecordModal = async () => {
    const key = String(recordDraftKey || "").trim();
    if (!key) {
      message.error("Key is required");
      return;
    }
    const raw = String(recordDraftValue ?? "").trim();
    let parsed;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      message.error("Value must be valid JSON");
      return;
    }
    upsertRecord({
      id: recordTargetId,
      collectionId: recordDraftCollectionId,
      key,
      value: parsed,
    });
    message.success(recordTargetId ? "Record updated" : "Record created");
    setRecordModalOpen(false);
  };

  const openShotViewer = (shot) => {
    setShotViewerItem(shot);
    setShotViewerOpen(true);
  };

  const copyShotToClipboard = async (shot) => {
    const fn = window.electronAPI?.clipboardWriteImageDataUrl;
    if (typeof fn !== "function") {
      message.error("Clipboard is not available");
      return;
    }
    try {
      const ok = await fn(shot.dataUrl);
      if (!ok) {
        message.error("Copy failed");
        return;
      }
      message.success("Copied to clipboard");
    } catch {
      message.error("Copy failed");
    }
  };

  const recordColumns = [
    {
      title: "Collection",
      dataIndex: "collectionId",
      key: "collectionId",
      width: 140,
      render: (value) => (
        <Tag color="blue">{collectionNameById.get(value) || value}</Tag>
      ),
    },
    {
      title: "Key",
      dataIndex: "key",
      key: "key",
      ellipsis: true,
    },
    {
      title: "Value",
      dataIndex: "value",
      key: "value",
      ellipsis: true,
      render: (value) => {
        try {
          if (value == null) return "";
          if (typeof value === "string") return value;
          return JSON.stringify(value);
        } catch {
          return String(value ?? "");
        }
      },
    },
    {
      title: "Updated",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 170,
      render: (value) => {
        if (!value) return "";
        try {
          const d = new Date(value);
          if (Number.isNaN(d.getTime())) return value;
          return d.toLocaleString();
        } catch {
          return value;
        }
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 140,
      render: (_, record) => (
        <Space size={8}>
          <Tooltip title="Edit">
            <Button
              type="link"
              size="small"
              onClick={() => openEditRecord(record)}
            >
              Edit
            </Button>
          </Tooltip>
          <Tooltip title="Delete">
            <Popconfirm
              title="Delete this record?"
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
              onConfirm={() => deleteRecord(record.id)}
            >
              <Button type="link" size="small" danger>
                Delete
              </Button>
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const screenshotColumns = [
    {
      title: "Preview",
      dataIndex: "dataUrl",
      key: "preview",
      width: 96,
      render: (value, record) => (
        <div
          style={{
            width: 72,
            height: 46,
            borderRadius: 8,
            overflow: "hidden",
            border: "1px solid var(--color-border)",
            background: "var(--color-bg-elevated)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={value}
            alt={record.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      ),
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      ellipsis: true,
    },
    {
      title: "Source",
      dataIndex: "source",
      key: "source",
      width: 140,
      render: (value) => <Tag>{value || "unknown"}</Tag>,
    },
    {
      title: "Mode",
      dataIndex: "mode",
      key: "mode",
      width: 90,
      render: (value) => <Tag color="purple">{value || "area"}</Tag>,
    },
    {
      title: "Size",
      dataIndex: "byteLength",
      key: "byteLength",
      width: 120,
      render: (v) => {
        const n = Number(v) || 0;
        if (!n) return "";
        if (n < 1024) return `${n} B`;
        if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
        return `${(n / (1024 * 1024)).toFixed(1)} MB`;
      },
    },
    {
      title: "Captured",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 170,
      render: (value) => {
        if (!value) return "";
        try {
          const d = new Date(value);
          if (Number.isNaN(d.getTime())) return value;
          return d.toLocaleString();
        } catch {
          return value;
        }
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 170,
      render: (_, record) => (
        <Space size={8}>
          <Tooltip title="Preview">
            <Button
              type="link"
              size="small"
              onClick={() => openShotViewer(record)}
            >
              View
            </Button>
          </Tooltip>
          <Tooltip title="Copy to clipboard">
            <Button
              type="link"
              size="small"
              onClick={() => copyShotToClipboard(record)}
            >
              Copy
            </Button>
          </Tooltip>
          <Tooltip title="Delete">
            <Popconfirm
              title="Delete this screenshot?"
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
              onConfirm={() => deleteScreenshot(record.id)}
            >
              <Button type="link" size="small" danger>
                Delete
              </Button>
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div
      style={{
        paddingTop: 24,
        paddingBottom: 24,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        height: "100%",
      }}
    >
      <div style={COLUMN_LAYOUT.header}>
        <div>
          <div style={COLUMN_LAYOUT.title}>Resources</div>
          <div style={COLUMN_LAYOUT.subtitle}>
            Manage key/value data and captured screenshots in one place.
          </div>
        </div>
        <Segmented
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { label: "Screenshots", value: "screenshots" },
            { label: "Data Store", value: "data" },
          ]}
        />
      </div>

      {activeTab === "data" ? (
        <div style={COLUMN_LAYOUT.table}>
          <div
            style={{
              marginBottom: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Space size={10}>
              <Select
                size="small"
                value={activeCollectionId}
                style={{ minWidth: 180 }}
                onChange={setActiveCollectionId}
                options={[
                  { label: "All collections", value: "all" },
                  ...collections.map((c) => ({
                    label: c.name || c.id,
                    value: c.id,
                  })),
                ]}
              />
              <Button size="small" onClick={openCreateRecord}>
                Add record
              </Button>
              <Button size="small" onClick={openCreateCollection}>
                New collection
              </Button>
              {activeCollectionId !== "all" &&
              activeCollectionId !== "default" ? (
                <>
                  <Button
                    size="small"
                    onClick={() => openRenameCollection(activeCollectionId)}
                  >
                    Rename
                  </Button>
                  <Popconfirm
                    title="Delete this collection and its records?"
                    okText="Delete"
                    cancelText="Cancel"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => {
                      const ok = deleteCollection(activeCollectionId);
                      if (ok) {
                        setActiveCollectionId("all");
                        message.success("Collection deleted");
                      }
                    }}
                  >
                    <Button size="small" danger>
                      Delete
                    </Button>
                  </Popconfirm>
                </>
              ) : null}
            </Space>
            <Input.Search
              allowClear
              size="small"
              placeholder="Search"
              style={{ maxWidth: 260 }}
              value={recordSearch}
              onChange={(e) => setRecordSearch(e.target.value)}
            />
          </div>
          <Table
            size="small"
            rowKey="id"
            columns={recordColumns}
            dataSource={filteredRecords}
            pagination={{ pageSize: 10, size: "small" }}
          />
        </div>
      ) : null}

      {activeTab === "screenshots" ? (
        <div style={COLUMN_LAYOUT.table}>
          <div
            style={{
              marginBottom: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                fontSize: 13,
                color: "var(--color-text-secondary)",
              }}
            >
              Captured screenshots from Browser inspector and global capture.
            </div>
            <Input.Search
              allowClear
              size="small"
              placeholder="Search name, source, mode"
              style={{ maxWidth: 260 }}
              value={shotSearch}
              onChange={(e) => setShotSearch(e.target.value)}
            />
          </div>
          <Table
            size="small"
            rowKey="id"
            columns={screenshotColumns}
            dataSource={filteredScreenshots}
            pagination={{ pageSize: 10, size: "small" }}
          />
        </div>
      ) : null}

      <Modal
        title={
          collectionModalMode === "create"
            ? "New collection"
            : "Rename collection"
        }
        open={collectionModalOpen}
        onCancel={() => setCollectionModalOpen(false)}
        onOk={confirmCollectionModal}
        okText={collectionModalMode === "create" ? "Create" : "Save"}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
            Name
          </div>
          <Input
            value={collectionDraftName}
            onChange={(e) => setCollectionDraftName(e.target.value)}
            placeholder="e.g. users, settings, products"
            autoFocus
          />
        </div>
      </Modal>

      <Modal
        title={recordTargetId ? "Edit record" : "New record"}
        open={recordModalOpen}
        onCancel={() => setRecordModalOpen(false)}
        onOk={confirmRecordModal}
        okText={recordTargetId ? "Save" : "Create"}
        width={720}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div
              style={{
                width: 90,
                fontSize: 12,
                color: "var(--color-text-secondary)",
              }}
            >
              Collection
            </div>
            <Select
              value={recordDraftCollectionId}
              onChange={setRecordDraftCollectionId}
              style={{ flex: 1 }}
              options={collections.map((c) => ({
                label: c.name || c.id,
                value: c.id,
              }))}
            />
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div
              style={{
                width: 90,
                fontSize: 12,
                color: "var(--color-text-secondary)",
              }}
            >
              Key
            </div>
            <Input
              value={recordDraftKey}
              onChange={(e) => setRecordDraftKey(e.target.value)}
              placeholder="unique identifier"
            />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div
              style={{
                width: 90,
                fontSize: 12,
                color: "var(--color-text-secondary)",
                paddingTop: 6,
              }}
            >
              Value (JSON)
            </div>
            <Input.TextArea
              value={recordDraftValue}
              onChange={(e) => setRecordDraftValue(e.target.value)}
              placeholder='{"example": true}'
              autoSize={{ minRows: 10, maxRows: 18 }}
              style={{
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
              }}
            />
          </div>
        </div>
      </Modal>

      <Modal
        title={shotViewerItem?.name || "Screenshot"}
        open={shotViewerOpen}
        footer={
          shotViewerItem ? (
            <Space>
              <Button onClick={() => copyShotToClipboard(shotViewerItem)}>
                Copy
              </Button>
              <Button
                danger
                onClick={() => {
                  deleteScreenshot(shotViewerItem.id);
                  setShotViewerOpen(false);
                }}
              >
                Delete
              </Button>
              <Button type="primary" onClick={() => setShotViewerOpen(false)}>
                Close
              </Button>
            </Space>
          ) : (
            <Button type="primary" onClick={() => setShotViewerOpen(false)}>
              Close
            </Button>
          )
        }
        onCancel={() => setShotViewerOpen(false)}
        width={860}
      >
        {shotViewerItem ? (
          <div
            style={{
              width: "100%",
              borderRadius: 12,
              overflow: "hidden",
              border: "1px solid var(--color-border)",
              background: "var(--color-bg-elevated)",
            }}
          >
            <img
              src={shotViewerItem.dataUrl}
              alt={shotViewerItem.name}
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
