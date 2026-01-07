import React, { useState, useEffect, useRef } from "react";
import { Play, Terminal, CheckCircle, XCircle, Clock } from "lucide-react";
import { cn } from "../lib/utils";

const AVAILABLE_TESTS = [
  {
    id: "audio-stability",
    name: "Audio Stability Tests",
    path: "tests/audio-stability.spec.js",
    description:
      "Verifies audio playback stability (10s), stealth script crash prevention, and spoofing checks.",
  },
  {
    id: "anti-detection",
    name: "Anti-Detection Suite",
    path: "tests/anti-detection.spec.js",
    description:
      "Comprehensive test suite for all anti-detection features (User-Agent, WebGL, Timezone, etc.)",
  },
];

export default function TestManagementView() {
  const [runningTest, setRunningTest] = useState(null);
  const [logs, setLogs] = useState([]);
  const [results, setResults] = useState({});
  const [options, setOptions] = useState({ headless: true, silent: false });
  const logsEndRef = useRef(null);

  useEffect(() => {
    // Subscribe to test output
    const cleanup = window.electronAPI?.tests?.onOutput((payload) => {
      setLogs((prev) => [...prev, payload]);
    });
    return () => cleanup && cleanup();
  }, []);

  useEffect(() => {
    // Auto-scroll logs
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const handleRunTest = async (test) => {
    if (runningTest) return; // Prevent concurrent runs

    setRunningTest(test.id);
    setLogs((prev) => [
      ...prev,
      {
        type: "info",
        data: `--- Starting test: ${test.name} (Headless: ${options.headless}, Silent: ${options.silent}) ---`,
      },
    ]);
    setResults((prev) => ({ ...prev, [test.id]: "running" }));

    try {
      const result = await window.electronAPI.tests.run(test.path, options);
      const passed = result.code === 0;
      setResults((prev) => ({
        ...prev,
        [test.id]: passed ? "passed" : "failed",
      }));
      setLogs((prev) => [
        ...prev,
        {
          type: "info",
          data: `--- Test finished with exit code ${result.code} ---`,
        },
      ]);
    } catch (error) {
      console.error("Test failed to start:", error);
      setResults((prev) => ({ ...prev, [test.id]: "failed" }));
      setLogs((prev) => [
        ...prev,
        { type: "error", data: `Failed to invoke test: ${error.message}` },
      ]);
    } finally {
      setRunningTest(null);
    }
  };

  const getStatusIcon = (status) => {
    if (status === "passed")
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (status === "failed")
      return <XCircle className="w-5 h-5 text-red-500" />;
    if (status === "running")
      return <Clock className="w-5 h-5 text-yellow-500 animate-spin" />;
    return <Play className="w-5 h-5 text-muted-foreground" />;
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-base)] text-[var(--color-text-primary)]">
      <div className="p-6 border-b border-[var(--color-border)] flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">Test Management</h1>
          <p className="text-[var(--color-text-secondary)]">
            Run E2E tests to verify system stability and anti-detection
            features.
          </p>
        </div>
        <div className="flex gap-4 items-center bg-[var(--color-bg-elevated)] p-3 rounded-xl border border-[var(--color-border)]">
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={options.headless}
              onChange={(e) =>
                setOptions((prev) => ({ ...prev, headless: e.target.checked }))
              }
              className="rounded bg-[var(--color-bg-base)] border-[var(--color-border)] text-primary focus:ring-primary"
            />
            <span>Headless Mode</span>
          </label>
          <div className="w-px h-4 bg-[var(--color-border)] mx-2"></div>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={options.silent}
              onChange={(e) =>
                setOptions((prev) => ({ ...prev, silent: e.target.checked }))
              }
              className="rounded bg-[var(--color-bg-base)] border-[var(--color-border)] text-primary focus:ring-primary"
            />
            <span>Silent Mode</span>
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row p-6 gap-6">
        {/* Test List */}
        <div className="w-full md:w-1/3 flex flex-col gap-4 overflow-y-auto">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Terminal className="w-5 h-5" /> Available Tests
          </h2>
          {AVAILABLE_TESTS.map((test) => (
            <div
              key={test.id}
              className={cn(
                "p-4 rounded-xl border transition-all cursor-pointer",
                "hover:border-primary/50 hover:bg-muted/50",
                runningTest === test.id
                  ? "border-primary bg-primary/5"
                  : "border-[var(--color-border)] bg-[var(--color-bg-elevated)]"
              )}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium">{test.name}</h3>
                <div className="flex items-center gap-2">
                  {results[test.id] && (
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        results[test.id] === "passed"
                          ? "bg-green-500/10 text-green-500"
                          : results[test.id] === "failed"
                            ? "bg-red-500/10 text-red-500"
                            : "bg-yellow-500/10 text-yellow-500"
                      )}
                    >
                      {results[test.id].toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                {test.description}
              </p>
              <button
                onClick={() => handleRunTest(test)}
                disabled={!!runningTest}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full justify-center",
                  runningTest
                    ? "opacity-50 cursor-not-allowed bg-muted text-muted-foreground"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {runningTest === test.id ? "Running..." : "Run Test"}
                {!runningTest && <Play className="w-4 h-4 ml-1" />}
              </button>
            </div>
          ))}
        </div>

        {/* Console Output */}
        <div className="flex-1 flex flex-col min-h-[400px] border border-[var(--color-border)] rounded-xl bg-black/90 text-zinc-300 font-mono text-sm shadow-xl overflow-hidden">
          <div className="px-4 py-2 border-b border-white/10 bg-white/5 flex justify-between items-center">
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
              <span className="ml-2 text-xs text-zinc-500">
                Terminal Output
              </span>
            </span>
            <button
              onClick={() => setLogs([])}
              className="text-xs hover:text-white transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="flex-1 p-4 overflow-y-auto space-y-1">
            {logs.length === 0 && (
              <div className="h-full flex items-center justify-center text-zinc-600 italic">
                Ready to run tests...
              </div>
            )}
            {logs.map((log, i) => (
              <div
                key={i}
                className={cn(
                  "whitespace-pre-wrap break-all",
                  log.type === "stderr"
                    ? "text-red-400"
                    : log.type === "info"
                      ? "text-blue-400 font-bold my-2"
                      : log.type === "error"
                        ? "text-red-500 font-bold bg-red-500/10 p-2 rounded"
                        : "text-zinc-300"
                )}
              >
                {log.type === "stdout" || log.type === "stderr" ? "> " : ""}
                {log.data}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
