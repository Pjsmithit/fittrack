import { h, mount, showTabbar } from "../dom.js";
import { db } from "../db.js";
import { navigate } from "../router.js";

const PERIODS = [
  { id: "week", label: "Week", days: 7 },
  { id: "month", label: "Month", days: 30 },
  { id: "all", label: "All", days: null },
];

export async function renderLogGrid() {
  showTabbar(false);

  const [logs, programs] = await Promise.all([db.getAll("logs"), db.getAll("programs")]);
  const activeProgram = programs.find((p) => p.isActive);

  let period = "month";

  function buildRows() {
    // Row order: exercises in the order they first appear in the
    // active program (matches "the program down the left"). Falls
    // back to first-appearance order in the logs themselves if there
    // is no active program, so the grid still works.
    const seen = new Set();
    const rows = [];

    if (activeProgram) {
      const weeks = [...activeProgram.weeks].sort((a, b) => a.weekNumber - b.weekNumber);
      for (const week of weeks) {
        const days = [...week.days].sort((a, b) => a.dayNumber - b.dayNumber);
        for (const day of days) {
          const exercises = [...day.exercises].sort((a, b) => a.orderIndex - b.orderIndex);
          for (const ex of exercises) {
            if (!seen.has(ex.exerciseID)) {
              seen.add(ex.exerciseID);
              rows.push({ exerciseID: ex.exerciseID, exerciseName: ex.exerciseName });
            }
          }
        }
      }
    }

    if (rows.length === 0) {
      for (const log of logs) {
        for (const exLog of log.exerciseLogs) {
          if (!seen.has(exLog.exerciseID)) {
            seen.add(exLog.exerciseID);
            rows.push({ exerciseID: exLog.exerciseID, exerciseName: exLog.exerciseName });
          }
        }
      }
    }

    return rows;
  }

  function buildColumns() {
    const periodDef = PERIODS.find((p) => p.id === period);
    let filtered = logs;
    if (periodDef.days !== null) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - periodDef.days);
      filtered = logs.filter((l) => new Date(l.date) >= cutoff);
    }
    return filtered.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  function formatWeight(w) {
    return Number.isInteger(w) ? String(w) : w.toFixed(1);
  }

  function cellContent(row, log) {
    const exLog = log.exerciseLogs.find((e) => e.exerciseID === row.exerciseID);
    if (!exLog || exLog.sets.length === 0) {
      return h("span", { style: "color:var(--text-faint)" }, "\u2013");
    }
    return h(
      "div",
      { style: "display:flex;flex-direction:column;gap:2px;font-family:var(--font-mono);font-size:11px;line-height:1.4" },
      exLog.sets
        .slice()
        .sort((a, b) => a.setNumber - b.setNumber)
        .map((s) => h("span", {}, `${formatWeight(s.weightKg)}\u00d7${s.reps}`))
    );
  }

  function render() {
    const rows = buildRows();
    const columns = buildColumns();

    const table = columns.length === 0 || rows.length === 0
      ? h("div", { class: "empty-state" }, [
          h("span", { class: "glyph" }, "\u{1F4CA}"),
          h("h2", {}, "Nothing Logged Yet"),
          h("p", {}, rows.length === 0
            ? "Generate a program and log a workout to see it here."
            : "No workouts logged in this period."),
        ])
      : h("div", { class: "grid-wrap" }, [
          h("table", { class: "log-grid" }, [
            h(
              "thead",
              {},
              h(
                "tr",
                {},
                [
                  h("th", { class: "sticky-col" }, "Exercise"),
                  ...columns.map((log) =>
                    h(
                      "th",
                      {},
                      h("div", {}, [
                        h("div", {}, new Date(log.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })),
                        h("div", { style: "font-weight:400;color:var(--text-faint);font-size:10px" }, log.dayTitle),
                      ])
                    )
                  ),
                ]
              )
            ),
            h(
              "tbody",
              {},
              rows.map((row) =>
                h("tr", {}, [
                  h("td", { class: "sticky-col" }, row.exerciseName),
                  ...columns.map((log) => h("td", {}, cellContent(row, log))),
                ])
              )
            ),
          ]),
        ]);

    const screen = h("div", { class: "screen", style: "padding-top:0" }, [
      h("div", { class: "topbar" }, [
        h("button", { class: "topbar-action", onClick: () => navigate("/progress") }, "\u2039 Back"),
        h("h1", {}, "Log Grid"),
        h("span", { style: "width:48px" }),
      ]),
      h("div", { style: "padding:16px" }, [
        h(
          "div",
          { class: "segmented", style: "margin-bottom:16px" },
          PERIODS.map((p) =>
            h(
              "button",
              {
                class: p.id === period ? "active" : "",
                onClick: () => { period = p.id; render(); },
              },
              p.label
            )
          )
        ),
        h("p", { style: "margin-bottom:12px" }, "Exercises down the left, each logged session across the top. Cells show weight\u00d7reps per set."),
        table,
      ]),
    ]);
    mount(screen);
  }

  render();
}
