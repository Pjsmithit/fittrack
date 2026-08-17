import { h, mount, showTabbar, setTabbarActive, showToast } from "../dom.js";
import { db, uuid } from "../db.js";
import { showDayPickerSheet } from "../dayPicker.js";
import { navigate } from "../router.js";
import { APP_VERSION, LAST_UPDATED } from "../version.js";
import { exportBackup, readFileAsJSON, isValidBackupPayload, restoreBackup } from "../backup.js";

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
  const exerciseCount = await db.count("exercises");
  logs.sort((a, b) => new Date(b.date) - new Date(a.date));
  bodyweight.sort((a, b) => new Date(a.date) - new Date(b.date));
  programs.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
  const programsWithWeeks = programs.filter((p) => p.weeks && p.weeks.length > 0);

  let selectedProgramID = programs[0]?.id || null;

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
    const selectedProgram = programs.find((p) => p.id === selectedProgramID) || null;

    const screen = h("div", { class: "screen", style: "padding-top:0" }, [
      h("div", { class: "topbar" }, [
        h("span"),
        h("h1", {}, "Progress"),
        programsWithWeeks.length > 0
          ? h("button", { class: "topbar-action", onClick: () => showDayPickerSheet(programsWithWeeks) }, "+ Log")
          : h("span"),
      ]),
      h("div", { style: "padding:16px" }, [
        h("div", { class: "card" }, [
          h("div", { class: "row-split", style: "padding:0" }, [
            h("div", { class: "row-link", style: "cursor:default;padding:0" }, [
              h("h2", {}, "Data & Storage"),
              h("p", { style: "margin:0" }, "Where your data lives, and how much of it there is."),
            ]),
            h("button", {
              class: "log-pill",
              onClick: () => showDataInfoSheet({ logs: logs.length, programs: programs.length, bodyweight: bodyweight.length, exercises: exerciseCount }),
            }, "View"),
          ]),
        ]),

        h("div", { class: "card" }, [
          h("div", { class: "row-split", style: "padding:0" }, [
            h("div", { class: "row-link", style: "cursor:default;padding:0" }, [
              h("h2", {}, "Log Grid"),
              h("p", { style: "margin:0" }, "Exercises \u00d7 sessions, at a glance."),
            ]),
            h("button", { class: "log-pill", onClick: () => navigate("/grid") }, "View"),
          ]),
        ]),

        programs.length > 0
          ? h("div", { class: "card" }, [
              h("h2", {}, "Adherence"),
              h(
                "select",
                {
                  style:
                    "width:100%;background:var(--bg-elevated-2);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:10px;margin:8px 0;font-size:15px;min-height:44px",
                  onChange: (e) => { selectedProgramID = e.target.value; render(); },
                },
                programs.map((p) =>
                  h("option", { value: p.id, selected: p.id === selectedProgramID ? "selected" : null }, p.name)
                )
              ),
              selectedProgram ? h("canvas", { class: "chart", id: "adherenceChart" }) : h("p", {}, "Pick a program above."),
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
            onClick: () => showBodyweightEntrySheet(null, async () => { await renderProgress(); }),
          }, "Add Bodyweight Entry"),
          bodyweight.length > 0
            ? h("button", {
                class: "btn btn-secondary",
                style: "margin-top:8px",
                onClick: () => showManageBodyweightSheet(bodyweight, async () => { await renderProgress(); }),
              }, "Edit / Delete Entries")
            : null,
        ]),

        h("div", { class: "card" }, [
          h("h2", {}, "History"),
          logs.length === 0
            ? h("p", {}, "No workouts logged yet.")
            : h(
                "ul",
                { class: "card-list" },
                logs.map((log) =>
                  h("li", {}, [
                    h(
                      "button",
                      { class: "row", onClick: () => navigate(`/edit-log/${log.id}`) },
                      [
                        h("span", {}, [
                          h("div", { class: "row-title" }, log.dayTitle),
                          h("div", { class: "row-sub" }, new Date(log.date).toLocaleString()),
                        ]),
                        h("span", { style: "display:flex;align-items:center;gap:8px" }, [
                          h("span", { class: `badge ${log.status === "completed" ? "success" : log.status === "skipped" ? "warn" : ""}` }, log.status),
                          h("span", { class: "row-chevron" }, "\u203a"),
                        ]),
                      ]
                    ),
                  ])
                )
              ),
        ]),
      ]),
    ]);
    mount(screen);

    requestAnimationFrame(() => {
      if (selectedProgram) drawAdherenceChart(selectedProgram, logs);
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

function showDataInfoSheet(counts) {
  const origin = window.location.origin + window.location.pathname.replace(/index\.html$/, "");
  const overlay = h("div", {
    style: "position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:40;display:flex;align-items:flex-end",
    onClick: (e) => { if (e.target === overlay) document.body.removeChild(overlay); },
  });
  const sheet = h("div", {
    style: "background:var(--bg-elevated);width:100%;max-height:85vh;overflow-y:auto;border-radius:16px 16px 0 0;padding:16px;padding-bottom:calc(16px + env(safe-area-inset-bottom))",
  }, [
    h("h2", { style: "margin-bottom:12px" }, "Data & Storage"),

    h("div", { class: "card" }, [
      h("div", { class: "eyebrow", style: "margin-bottom:8px" }, "This version"),
      h("p", {}, `FitTrack v${APP_VERSION} \u00b7 Updated ${LAST_UPDATED}`),
    ]),

    h("div", { class: "card" }, [
      h("div", { class: "eyebrow", style: "margin-bottom:8px" }, "Stored on this device only"),
      h("p", {}, "Everything is saved locally in this browser's on-device database (IndexedDB), tied to this installed app. Nothing is uploaded anywhere — not to a server, not to Anthropic, not anywhere else. No account, no sign-in, no internet connection needed to read or write it."),
    ]),

    h("div", { class: "card" }, [
      h("div", { class: "eyebrow", style: "margin-bottom:8px" }, "This installation"),
      h("p", { style: "font-family:var(--font-mono);font-size:12px;word-break:break-all" }, origin),
      h("p", {}, "Data is scoped to this exact web address. If you ever install FitTrack again from a different URL, that copy starts with its own separate, empty storage."),
    ]),

    h("div", { class: "card" }, [
      h("div", { class: "eyebrow", style: "margin-bottom:8px" }, "Currently stored"),
      h("ul", { class: "card-list" }, [
        h("li", { class: "row", style: "cursor:default" }, [h("span", {}, "Logged workouts"), h("span", {}, String(counts.logs))]),
        h("li", { class: "row", style: "cursor:default" }, [h("span", {}, "Bodyweight entries"), h("span", {}, String(counts.bodyweight))]),
        h("li", { class: "row", style: "cursor:default" }, [h("span", {}, "Programs generated"), h("span", {}, String(counts.programs))]),
        h("li", { class: "row", style: "cursor:default" }, [h("span", {}, "Exercises in library"), h("span", {}, String(counts.exercises))]),
      ]),
    ]),

    h("div", { class: "card" }, [
      h("div", { class: "eyebrow", style: "margin-bottom:8px" }, "Backup"),
      h("p", {}, "Export everything as a file you can save to iCloud Drive, email yourself, or AirDrop — worth doing before an iOS update or if you haven't opened the app in a while."),
      h("button", {
        class: "btn btn-primary",
        style: "margin-top:4px",
        onClick: async () => {
          const method = await exportBackup();
          if (method === "share") showToast("Backup ready \u2014 choose where to save it");
          else if (method === "download") showToast("Backup downloaded");
        },
      }, "Export Backup"),
      h("button", {
        class: "btn btn-secondary",
        style: "margin-top:8px",
        onClick: () => importFileInput.click(),
      }, "Import Backup"),
      h("p", { style: "margin-top:8px;font-size:12px" }, "Importing replaces everything currently on this device with what's in the backup file."),
    ]),

    h("div", { class: "card" }, [
      h("div", { class: "eyebrow", style: "margin-bottom:8px" }, "Worth knowing"),
      h("p", {}, "iOS can, in rare low-storage situations, clear an installed web app's data if it goes unopened for roughly a week or more. Opening FitTrack periodically avoids this — exporting a backup beforehand removes the risk entirely."),
    ]),
  ]);

  const importFileInput = h("input", {
    type: "file",
    accept: "application/json,.json",
    style: "display:none",
    onChange: async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      showToast("Reading backup file\u2026");
      let payload;
      try {
        payload = await readFileAsJSON(file);
      } catch (err) {
        showToast("Couldn't read that file \u2014 is it a valid backup?");
        return;
      }
      if (!isValidBackupPayload(payload)) {
        showToast("That doesn't look like a FitTrack backup file");
        return;
      }
      showRestoreConfirmSheet(payload, async () => {
        try {
          await restoreBackup(payload);
          document.body.removeChild(overlay);
          showToast("Backup restored");
          renderProgress();
        } catch (err) {
          const message = err && err.message ? err.message : String(err);
          showToast("Restore failed \u2014 see error banner");
          if (window.__showBootError) {
            window.__showBootError(`Restore failed: ${message}`);
          }
        }
      });
    },
  });
  sheet.appendChild(importFileInput);
  overlay.appendChild(sheet);
  document.body.appendChild(overlay);
}

function showRestoreConfirmSheet(payload, onConfirm) {
  const counts = {
    logs: payload.data.logs.length,
    programs: payload.data.programs.length,
    bodyweight: payload.data.bodyweight.length,
  };
  const confirmOverlay = h("div", {
    style: "position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:60;display:flex;align-items:flex-end",
    onClick: (e) => { if (e.target === confirmOverlay) document.body.removeChild(confirmOverlay); },
  });
  const confirmSheet = h("div", {
    style: "background:var(--bg-elevated);width:100%;border-radius:16px 16px 0 0;padding:16px;padding-bottom:calc(16px + env(safe-area-inset-bottom))",
  }, [
    h("h2", { style: "margin-bottom:8px" }, "Restore This Backup?"),
    h("p", {}, `From ${new Date(payload.exportedAt).toLocaleString()} \u2014 ${counts.programs} programs, ${counts.logs} logged workouts, ${counts.bodyweight} bodyweight entries.`),
    h("p", { style: "color:var(--warn);font-weight:600" }, "This replaces everything currently on this device. This can't be undone."),
    h("button", {
      class: "btn btn-danger",
      style: "background:var(--warn);color:#fff;margin-top:8px",
      onClick: async () => {
        document.body.removeChild(confirmOverlay);
        await onConfirm();
      },
    }, "Restore & Replace Everything"),
    h("button", {
      class: "btn btn-secondary",
      style: "margin-top:10px",
      onClick: () => document.body.removeChild(confirmOverlay),
    }, "Cancel"),
  ]);
  confirmOverlay.appendChild(confirmSheet);
  document.body.appendChild(confirmOverlay);
}

function showBodyweightEntrySheet(existing, onChanged) {
  let weightKg = existing ? existing.weightKg : 70;
  let date = existing ? existing.date.slice(0, 10) : new Date().toISOString().slice(0, 10);

  const overlay = h("div", {
    style: "position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:50;display:flex;align-items:flex-end",
    onClick: (e) => { if (e.target === overlay) document.body.removeChild(overlay); },
  });
  const weightInput = h("input", {
    type: "number",
    inputmode: "decimal",
    step: "0.1",
    value: weightKg,
    onInput: (e) => { weightKg = Number(e.target.value) || 0; },
  });
  const dateInput = h("input", {
    type: "date",
    value: date,
    onInput: (e) => { date = e.target.value; },
  });

  const sheet = h("div", {
    style: "background:var(--bg-elevated);width:100%;border-radius:16px 16px 0 0;padding:16px;padding-bottom:calc(16px + env(safe-area-inset-bottom))",
  }, [
    h("h2", { style: "margin-bottom:12px" }, existing ? "Edit Bodyweight" : "Add Bodyweight"),
    h("div", { class: "field" }, [h("label", {}, "Date"), dateInput]),
    h("div", { class: "field" }, [h("label", {}, "Weight (kg)"), weightInput]),
    h("button", {
      class: "btn btn-primary",
      onClick: async () => {
        const record = {
          id: existing ? existing.id : uuid(),
          date: new Date(date + "T12:00:00").toISOString(),
          weightKg,
        };
        await db.put("bodyweight", record);
        document.body.removeChild(overlay);
        showToast(existing ? "Bodyweight updated" : "Bodyweight saved");
        onChanged();
      },
    }, "Save"),
    existing
      ? h("button", {
          class: "btn btn-danger",
          style: "background:none;border:1px solid var(--warn);margin-top:10px",
          onClick: () => {
            document.body.removeChild(overlay);
            showConfirmSheet(
              "Delete This Entry?",
              `${new Date(existing.date).toLocaleDateString()} \u2014 ${existing.weightKg} kg. This can't be undone.`,
              async () => {
                await db.delete("bodyweight", existing.id);
                showToast("Entry deleted");
                onChanged();
              }
            );
          },
        }, "Delete Entry")
      : null,
  ]);
  overlay.appendChild(sheet);
  document.body.appendChild(overlay);
}

function showManageBodyweightSheet(entries, onChanged) {
  const overlay = h("div", {
    style: "position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:40;display:flex;align-items:flex-end",
    onClick: (e) => { if (e.target === overlay) document.body.removeChild(overlay); },
  });
  const sorted = entries.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  const sheet = h("div", {
    style: "background:var(--bg-elevated);width:100%;max-height:80vh;overflow-y:auto;border-radius:16px 16px 0 0;padding:16px;padding-bottom:calc(16px + env(safe-area-inset-bottom))",
  }, [
    h("h2", { style: "margin-bottom:12px" }, "Bodyweight Entries"),
    h(
      "div",
      { class: "card", style: "padding:0" },
      h(
        "ul",
        { class: "card-list" },
        sorted.map((entry) =>
          h("li", {}, [
            h(
              "button",
              {
                class: "row",
                onClick: () => {
                  document.body.removeChild(overlay);
                  showBodyweightEntrySheet(entry, onChanged);
                },
              },
              [
                h("span", {}, [
                  h("div", { class: "row-title" }, `${entry.weightKg} kg`),
                  h("div", { class: "row-sub" }, new Date(entry.date).toLocaleDateString()),
                ]),
                h("span", { class: "row-chevron" }, "\u203a"),
              ]
            ),
          ])
        )
      )
    ),
  ]);
  overlay.appendChild(sheet);
  document.body.appendChild(overlay);
}

/** Generic confirm sheet — used instead of window.confirm() since native
 * dialogs can silently fail to appear when triggered from deep inside
 * an async chain on iOS Safari. */
function showConfirmSheet(title, message, onConfirm) {
  const overlay = h("div", {
    style: "position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:60;display:flex;align-items:flex-end",
    onClick: (e) => { if (e.target === overlay) document.body.removeChild(overlay); },
  });
  const sheet = h("div", {
    style: "background:var(--bg-elevated);width:100%;border-radius:16px 16px 0 0;padding:16px;padding-bottom:calc(16px + env(safe-area-inset-bottom))",
  }, [
    h("h2", { style: "margin-bottom:8px" }, title),
    h("p", { style: "color:var(--warn);font-weight:600" }, message),
    h("button", {
      class: "btn btn-danger",
      style: "background:var(--warn);color:#fff;margin-top:8px",
      onClick: async () => {
        document.body.removeChild(overlay);
        await onConfirm();
      },
    }, "Confirm"),
    h("button", {
      class: "btn btn-secondary",
      style: "margin-top:10px",
      onClick: () => document.body.removeChild(overlay),
    }, "Cancel"),
  ]);
  overlay.appendChild(sheet);
  document.body.appendChild(overlay);
}
