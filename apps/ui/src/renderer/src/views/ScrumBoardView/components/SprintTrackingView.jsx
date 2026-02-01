/**
 * SprintTrackingView Component
 *
 * Sprint tracking view with burndown charts and velocity metrics.
 */

import * as React from "react";

export default function SprintTrackingView({
  board,
  sprints,
  sprintNameById,
  filters,
  sprintSelector,
  selectedSprintId: propSprintId,
}) {
  const [localSprintId, setLocalSprintId] = React.useState("");

  const selectedSprintId = propSprintId || localSprintId;

  React.useEffect(() => {
    if (selectedSprintId) return;
    const firstActive = (sprints || []).find((s) => s.status === "active")?.id;
    if (firstActive) {
      setLocalSprintId(firstActive);
      return;
    }
    const first = (sprints || [])[0]?.id;
    if (first) setLocalSprintId(first);
  }, [selectedSprintId, sprints]);

  const selectedSprint = React.useMemo(
    () => (sprints || []).find((s) => s.id === selectedSprintId) || null,
    [sprints, selectedSprintId],
  );

  const isDoneList = React.useCallback((list) => {
    if (!list) return false;
    if (String(list.statusId || "") === "done") return true;
    return (
      String(list.name || "")
        .trim()
        .toLowerCase() === "done"
    );
  }, []);

  const sprintCards = React.useMemo(() => {
    if (!selectedSprintId) return [];
    const rows = [];
    for (const list of board?.lists || []) {
      for (const card of list.cards || []) {
        if (card.sprintId !== selectedSprintId) continue;
        rows.push({
          card,
          list,
          done: isDoneList(list),
        });
      }
    }
    return rows;
  }, [board, isDoneList, selectedSprintId]);

  const pointsSummary = React.useMemo(() => {
    let total = 0;
    let done = 0;
    let totalStories = 0;
    let doneStories = 0;

    for (const row of sprintCards) {
      totalStories += 1;
      const pts =
        typeof row.card.points === "number"
          ? row.card.points
          : Number.parseFloat(String(row.card.points || ""));
      if (Number.isFinite(pts)) total += pts;
      if (row.done) {
        doneStories += 1;
        if (Number.isFinite(pts)) done += pts;
      }
    }

    return {
      totalStories,
      doneStories,
      totalPoints: total,
      donePoints: done,
      remainingPoints: Math.max(0, total - done),
      completionPercent:
        total > 0
          ? Math.round((done / total) * 100)
          : totalStories > 0
            ? Math.round((doneStories / totalStories) * 100)
            : 0,
    };
  }, [sprintCards]);

  const burndown = React.useMemo(() => {
    const start = Date.parse(String(selectedSprint?.startDate || ""));
    const end = Date.parse(String(selectedSprint?.endDate || ""));
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
      return null;

    const msPerDay = 24 * 60 * 60 * 1000;
    const days = Math.max(1, Math.round((end - start) / msPerDay) + 1);

    const completed = sprintCards
      .map((row) => {
        const pts =
          typeof row.card.points === "number"
            ? row.card.points
            : Number.parseFloat(String(row.card.points || ""));
        const completedAtMs = Date.parse(String(row.card.completedAt || ""));
        return {
          pts: Number.isFinite(pts) ? pts : 0,
          completedAtMs: Number.isFinite(completedAtMs) ? completedAtMs : null,
        };
      })
      .filter((row) => row.pts > 0);

    const total = pointsSummary.totalPoints;
    const points = [];
    for (let i = 0; i < days; i += 1) {
      const dayEnd = start + i * msPerDay + (msPerDay - 1);
      const burned = completed
        .filter((c) => c.completedAtMs && c.completedAtMs <= dayEnd)
        .reduce((sum, c) => sum + c.pts, 0);
      points.push({
        day: i,
        remaining: Math.max(0, total - burned),
      });
    }

    const ideal = [];
    for (let i = 0; i < days; i += 1) {
      ideal.push({
        day: i,
        remaining: Math.max(0, total - (total * i) / (days - 1 || 1)),
      });
    }

    return { points, ideal };
  }, [pointsSummary.totalPoints, selectedSprint, sprintCards]);

  const velocity = React.useMemo(() => {
    const doneSprints = (sprints || []).filter((s) => s.status === "completed");
    const perSprint = doneSprints
      .map((s) => {
        let donePoints = 0;
        for (const list of board?.lists || []) {
          const doneList = isDoneList(list);
          for (const card of list.cards || []) {
            if (card.sprintId !== s.id) continue;
            if (!doneList) continue;
            const pts =
              typeof card.points === "number"
                ? card.points
                : Number.parseFloat(String(card.points || ""));
            if (Number.isFinite(pts)) donePoints += pts;
          }
        }
        return {
          sprintId: s.id,
          name: String(s.name || s.id),
          donePoints,
        };
      })
      .filter((row) => row.donePoints > 0);

    const avg =
      perSprint.length > 0
        ? Math.round(
            perSprint.reduce((sum, row) => sum + row.donePoints, 0) /
              perSprint.length,
          )
        : 0;

    return { perSprint, avg };
  }, [board, isDoneList, sprints]);

  const chartPath = React.useMemo(() => {
    if (!burndown || burndown.points.length < 2) return null;
    const width = 520;
    const height = 160;
    const padding = 16;
    const max = Math.max(
      1,
      ...burndown.points.map((p) => p.remaining),
      ...burndown.ideal.map((p) => p.remaining),
    );
    const xFor = (day) =>
      padding + (day / (burndown.points.length - 1)) * (width - padding * 2);
    const yFor = (remaining) =>
      height - padding - (remaining / max) * (height - padding * 2);

    const toPath = (series) =>
      series
        .map(
          (p, idx) =>
            `${idx === 0 ? "M" : "L"}${xFor(p.day).toFixed(1)},${yFor(
              p.remaining,
            ).toFixed(1)}`,
        )
        .join(" ");

    return {
      width,
      height,
      actual: toPath(burndown.points),
      ideal: toPath(burndown.ideal),
    };
  }, [burndown]);

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-border/50 bg-background/40 p-3">
        <div className="grid grid-cols-1 gap-3">
          {sprintSelector && (
            <div className="flex flex-col gap-3 w-full">{sprintSelector}</div>
          )}
          <div className="flex flex-col gap-3 w-full">{filters}</div>
        </div>
      </div>
    </div>
  );
}
