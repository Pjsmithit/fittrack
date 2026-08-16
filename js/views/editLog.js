import { h, mount, showTabbar, showToast } from "../dom.js";
import { db } from "../db.js";
import { navigate } from "../router.js";

export async function renderEditLog({ logId }) {
  showTabbar(false);

  const log = await db.get("logs", logId);
  if (!log) {
    showToast("Log entry not found");
    navigate("/progress");
    return;
  }

  // Deep-copy into a draft so cancelling makes no changes.
  const draft = {
    status: log.status,
    overallNotes: log.overallNotes || "",
    sessionFeelingRating: log.sessionFeelingRating ?? null,
    exercises: log.exerciseLogs.map((ex) => ({
      exerciseID: ex.exerciseID,
      exerciseName: ex.exerciseName,
      notes: ex.notes || "",
      rpe: ex.rpe ?? null,
      sets: ex.sets.map((s) => ({ reps: s.reps, weightKg: s.weightKg })),
    })),
  };

  function render() {
    const screen = h("div", { class: "screen", style: "padding-top:0" }, [
      h("div", { class: "topbar" }, [
        h("button", { class: "topbar-action", onClick: () => navigate("/progress") }, "Cancel"),
        h("h1", { style: "font-size:16px" }, log.dayTitle),
        h("button", { class: "topbar-action", onClick: onSave }, "Save"),
      ]),
      h("div", { style: "padding:16px" }, [
        h("p", { style: "margin-bottom:12px" }, new Date(log.date).toLocaleString()),

        h("div", { class: "card" }, [
          h("h2", {}, "Session Status"),
          h(
            "div",
            { class: "segmented", style: "margin-top:8px" },
            [
              ["completed", "Completed"],
              ["partial", "Partial"],
              ["skipped", "Skipped"],
            ].map(([value, label]) =>
              h(
                "button",
                {
                  class: draft.status === value ? "active" : "",
                  onClick: () => { draft.status = value; render(); },
                },
                label
              )
            )
          ),
        ]),

        ...draft.exercises.map((ex, exIndex) =>
          h("div", { class: "card" }, [
            h("h2", {}, ex.exerciseName),
            ...ex.sets.map((set, i) =>
              h("div", { style: "display:flex;align-items:flex-end;gap:8px;padding:10px 0;border-top:1px solid var(--border)" }, [
                h("span", { class: "set-index", style: "padding-bottom:12px" }, `${i + 1}`),
                h("div", { class: "set-field", style: "flex:1" }, [
                  h("label", {}, "Reps"),
                  h("input", {
                    type: "number",
                    inputmode: "numeric",
                    value: set.reps,
                    onInput: (e) => { set.reps = Number(e.target.value) || 0; },
                  }),
                ]),
                h("div", { class: "set-field", style: "flex:1" }, [
                  h("label", {}, "Weight (kg)"),
                  h("input", {
                    type: "number",
                    inputmode: "decimal",
                    step: "1.25",
                    value: set.weightKg,
                    onInput: (e) => { set.weightKg = Number(e.target.value) || 0; },
                  }),
                ]),
                h(
                  "button",
                  {
                    class: "stepper-btn",
                    style: "flex-shrink:0;background:var(--warn);color:#fff;border:none;font-size:14px",
                    onClick: () => { ex.sets.splice(i, 1); render(); },
                  },
                  "\u2715"
                ),
              ])
            ),
            h("button", {
              class: "btn btn-secondary",
              style: "margin-top:8px",
              onClick: () => {
                const last = ex.sets[ex.sets.length - 1];
                ex.sets.push({ reps: last ? last.reps : 0, weightKg: last ? last.weightKg : 0 });
                render();
              },
            }, "+ Add Set"),
            h("div", { class: "field", style: "margin-top:12px" }, [
              h("label", {}, "RPE (1\u201310)"),
              h("input", {
                type: "number",
                inputmode: "numeric",
                min: "0",
                max: "10",
                value: ex.rpe ?? "",
                onInput: (e) => { ex.rpe = e.target.value === "" ? null : Number(e.target.value); },
              }),
            ]),
            h("div", { class: "field" }, [
              h("label", {}, "Notes"),
              h("input", {
                type: "text",
                value: ex.notes,
                onInput: (e) => { ex.notes = e.target.value; },
              }),
            ]),
          ])
        ),

        h("div", { class: "card" }, [
          h("h2", {}, "Overall"),
          h("div", { class: "field", style: "margin-top:8px" }, [
            h("label", {}, "Session notes"),
            h("textarea", {
              value: draft.overallNotes,
              onInput: (e) => { draft.overallNotes = e.target.value; },
            }, draft.overallNotes),
          ]),
          stepper(`Felt: ${draft.sessionFeelingRating ?? "\u2014"} / 5`, () => {
            draft.sessionFeelingRating = Math.max(0, (draft.sessionFeelingRating ?? 1) - 1);
            render();
          }, () => {
            draft.sessionFeelingRating = Math.min(5, (draft.sessionFeelingRating ?? 0) + 1);
            render();
          }),
        ]),

        h("button", { class: "btn btn-primary", onClick: onSave, style: "margin-bottom:12px" }, "Save Changes"),
        h("button", { class: "btn btn-danger", style: "background:none;border:1px solid var(--warn)", onClick: onDelete }, "Delete This Log Entry"),
      ]),
    ]);
    mount(screen);
  }

  async function onSave() {
    const updated = {
      ...log,
      status: draft.status,
      overallNotes: draft.overallNotes,
      sessionFeelingRating: draft.sessionFeelingRating,
      exerciseLogs: draft.exercises.map((ex) => ({
        exerciseID: ex.exerciseID,
        exerciseName: ex.exerciseName,
        notes: ex.notes,
        rpe: ex.rpe,
        sets: ex.sets.map((s, i) => ({ setNumber: i + 1, reps: s.reps, weightKg: s.weightKg })),
      })),
    };
    await db.put("logs", updated);
    showToast("Log updated");
    navigate("/progress");
  }

  async function onDelete() {
    const confirmed = window.confirm("Delete this log entry? This can't be undone.");
    if (!confirmed) return;
    await db.delete("logs", logId);
    showToast("Log entry deleted");
    navigate("/progress");
  }

  render();
}

function stepper(label, onDec, onInc) {
  return h("div", { class: "stepper-row" }, [
    h("span", { class: "stepper-label" }, label),
    h("div", { class: "stepper-controls" }, [
      h("button", { class: "stepper-btn", onClick: onDec }, "\u2212"),
      h("button", { class: "stepper-btn", onClick: onInc }, "+"),
    ]),
  ]);
}
