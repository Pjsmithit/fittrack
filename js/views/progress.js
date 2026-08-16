import { h, mount, showTabbar, setTabbarActive, showToast } from "../dom.js";
import { db, uuid } from "../db.js";
import { showDayPickerSheet } from "../dayPicker.js";
import { navigate } from "../router.js";

let charts = {};

function destroyCharts() {
  Object.values(charts).forEach((c) => c?.destroy());
  charts = {};
}

export async function renderProgress() {
  showTabbar(true);
  setTabbarActive("progress");
  destroyCharts();

  const [logs, programs, bodyweight] = await Promise.all([
    db.getAll("logs"),
    db.getAll("programs"),
    db.getAll("bodyweight"),
  ]);
  logs.sort((a, b) => new Date(b.date) - new Date(a.date));
  bodyweight.sort((a, b) => new Date(a.date) - new Date(b.date));
  const activeProgram = programs.find((p) => p.isActive);

  const exerciseNameByID = {};
  const exerciseIDsOrdered = [];
  for (const log of logs) {
    for (const exLog of log.exerciseLogs) {
      if (!(exLog.exerciseID in exerciseNameByID)) {
        exerciseNameByID[exLog.exerciseID] = exLog.exerciseName;
        exerciseIDsOrdered.push(exLog.exerciseID);
      }
    }
  }

  let selectedExerciseID = exerciseIDsOrdered[0] || null;

  function render() {
    const screen = h("div", { class: "screen", style: "padding-top:0" }, [
      h("div", { class: "topbar" }, [
        h("span"),
        h("h1", {}, "Progress"),
        activeProgram
          ? h("button", { class: "topbar-action", onClick: () => showDayPickerSheet(activeProgram) }, "+ Log")
          : h("span"),
      ]),
      h("div", { style: "padding:16px" }, [
        h("div", { class: "card" }, [
          h("div", { class: "row-split", style: "padding:0" }, [
            h("div", { class: "row-link", style: "cursor:default;padding:0" }, [
              h("h2", {}, "Log Grid"),
              h("p", { style: "margin:0" }, "Exercises \u00d7 sessions, at a glance."),
            ]),
            h("button", { class: "log-pill", onClick: () => navigate("/grid") }, "View"),
          ]),
        ]),

        activeProgram
          ? h("div", { class: "card" }, [
              h("h2", {}, "Adherence"),
              h("canvas", { class: "chart", id: "adherenceChart" }),
            ])
          : null,

        exerciseIDsOrdered.length > 0
          ? h("div", { class: "card" }, [
              h("h2", {}, "Exercise Progress"),
              h(
                "select",
                {
                  style:
                    "width:100%;background:var(--bg-elevated-2);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:10px;margin:8px 0;font-size:15px;min-height:44px",
                  onChange: (e) => {
                    selectedExerciseID = e.target.value;
                    render();
                  },
                },
                exerciseIDsOrdered.map((id) =>
                  h("option", { value: id, selected: id === selectedExerciseID ? "selected" : null }, exerciseNameByID[id])
                )
              ),
              h("canvas", { class: "chart", id: "exerciseChart" }),
            ])
          : null,

        h("div", { class: "card" }, [
          h("h2", {}, "Bodyweight"),
          bodyweight.length === 0
            ? h("p", {}, "No bodyweight entries yet.")
            : h("canvas", { class: "chart", id: "bodyweightChart" }),
          h("button", {
            class: "btn btn-secondary",
            style: "margin-top:12px",
            onClick: () => showAddBodyweightSheet(async () => { await renderProgress(); }),
          }, "Add Bodyweight Entry"),
        ]),

        h("div", { class: "card" }, [
          h("h2", {}, "History"),
          logs.length === 0
            ? h("p", {}, "No workouts logged yet.")
            : h(
                "ul",
                { class: "card-list" },
                logs.map((log) =>
                  h("li", { class: "row", style: "cursor:default" }, [
                    h("span", {}, [
                      h("div", { class: "row-title" }, log.dayTitle),
                      h("div", { class: "row-sub" }, new Date(log.date).toLocaleString()),
                    ]),
                    h("span", { class: `badge ${log.status === "completed" ? "success" : log.status === "skipped" ? "warn" : ""}` }, log.status),
                  ])
                )
              ),
        ]),
      ]),
    ]);
    mount(screen);

    requestAnimationFrame(() => {
      if (activeProgram) drawAdherenceChart(activeProgram, logs);
      if (selectedExerciseID) drawExerciseChart(selectedExerciseID, logs, exerciseNameByID);
      if (bodyweight.length > 0) drawBodyweightChart(bodyweight);
    });
  }

  render();
}

function drawAdherenceChart(program, logs) {
  const ctx = document.getElementById("adherenceChart");
  if (!ctx || !window.Chart) return;
  const weeks = [...program.weeks].sort((a, b) => a.weekNumber - b.weekNumber);
  const created = new Date(program.createdDate);
  const labels = [];
  const planned = [];
  const completed = [];

  weeks.forEach((week) => {
    const start = new Date(created);
    start.setDate(start.getDate() + (week.weekNumber - 1) * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const count = logs.filter((l) => {
      const d = new Date(l.date);
      return d >= start && d < end && l.status === "completed";
    }).length;
    labels.push(`Wk ${week.weekNumber}`);
    planned.push(week.days.length);
    completed.push(count);
  });

  charts.adherence = new window.Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Planned", data: planned, backgroundColor: "rgba(154,159,168,0.25)" },
        { label: "Completed", data: completed, backgroundColor: "#E3A63C" },
      ],
    },
    options: chartOptions(),
  });
}

function drawExerciseChart(exerciseID, logs, nameMap) {
  const ctx = document.getElementById("exerciseChart");
  if (!ctx || !window.Chart) return;
  const points = logs
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((log) => {
      const exLog = log.exerciseLogs.find((e) => e.exerciseID === exerciseID);
      if (!exLog || exLog.sets.length === 0) return null;
      const topSet = exLog.sets.reduce((max, s) => (s.weightKg > max.weightKg ? s : max), exLog.sets[0]);
      return { date: new Date(log.date).toLocaleDateString(), weight: topSet.weightKg };
    })
    .filter(Boolean);

  charts.exercise = new window.Chart(ctx, {
    type: "line",
    data: {
      labels: points.map((p) => p.date),
      datasets: [{ label: "Top set (kg)", data: points.map((p) => p.weight), borderColor: "#E3A63C", backgroundColor: "#E3A63C", tension: 0.25 }],
    },
    options: chartOptions(),
  });
}

function drawBodyweightChart(entries) {
  const ctx = document.getElementById("bodyweightChart");
  if (!ctx || !window.Chart) return;
  charts.bodyweight = new window.Chart(ctx, {
    type: "line",
    data: {
      labels: entries.map((e) => new Date(e.date).toLocaleDateString()),
      datasets: [{ label: "kg", data: entries.map((e) => e.weightKg), borderColor: "#59B37D", backgroundColor: "#59B37D", tension: 0.25 }],
    },
    options: chartOptions(),
  });
}

function chartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: "#9A9FA8" } } },
    scales: {
      x: { ticks: { color: "#9A9FA8" }, grid: { color: "#2C3038" } },
      y: { ticks: { color: "#9A9FA8" }, grid: { color: "#2C3038" } },
    },
  };
}

function showAddBodyweightSheet(onSaved) {
  let weightKg = 70;
  const overlay = h("div", {
    style: "position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:40;display:flex;align-items:flex-end",
    onClick: (e) => { if (e.target === overlay) document.body.removeChild(overlay); },
  });
  const input = h("input", {
    type: "number",
    inputmode: "decimal",
    step: "0.1",
    value: weightKg,
    onInput: (e) => { weightKg = Number(e.target.value) || 0; },
  });
  const sheet = h("div", {
    style: "background:var(--bg-elevated);width:100%;border-radius:16px 16px 0 0;padding:16px;padding-bottom:calc(16px + env(safe-area-inset-bottom))",
  }, [
    h("h2", { style: "margin-bottom:12px" }, "Add Bodyweight"),
    h("div", { class: "field" }, [h("label", {}, "Weight (kg)"), input]),
    h("button", {
      class: "btn btn-primary",
      onClick: async () => {
        await db.put("bodyweight", { id: uuid(), date: new Date().toISOString(), weightKg });
        document.body.removeChild(overlay);
        showToast("Bodyweight saved");
        onSaved();
      },
    }, "Save"),
  ]);
  overlay.appendChild(sheet);
  document.body.appendChild(overlay);
}
