import { h, mount, showTabbar, showToast } from "../dom.js";
import { db, uuid } from "../db.js";
import { navigate } from "../router.js";

export async function renderLog({ programId, weekNumber, dayNumber }) {
  showTabbar(false);
  const program = await db.get("programs", programId);
  if (!program) return navigate("/program");

  const week = program.weeks.find((w) => String(w.weekNumber) === String(weekNumber));
  const day = week?.days.find((d) => String(d.dayNumber) === String(dayNumber));
  if (!day) return navigate("/program");

  const draft = {
    status: "completed",
    overallNotes: "",
    sessionFeelingRating: null,
    exercises: day.exercises
      .slice()
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((planned) => ({
        exerciseID: planned.exerciseID,
        exerciseName: planned.exerciseName,
        notes: "",
        rpe: null,
        sets: Array.from({ length: planned.sets }, () => ({ reps: 0, weightKg: 0 })),
      })),
  };

  function render() {
    const screen = h("div", { class: "screen", style: "padding-top:0" }, [
      h("div", { class: "topbar" }, [
        h("button", { class: "topbar-action", onClick: () => navigate(`/day/${programId}/${weekNumber}/${dayNumber}`) }, "Cancel"),
        h("h1", { style: "font-size:16px" }, day.title),
        h("button", { class: "topbar-action", onClick: onSave }, "Save"),
      ]),
      h("div", { style: "padding:16px" }, [
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
                  onClick: () => {
                    draft.status = value;
                    render();
                  },
                },
                label
              )
            )
          ),
        ]),

        ...draft.exercises.map((ex) =>
          h("div", { class: "card" }, [
            h("h2", {}, ex.exerciseName),
            ...ex.sets.map((set, i) =>
              h("div", { class: "set-row" }, [
                h("span", { class: "set-index" }, `${i + 1}`),
                h("div", { class: "set-field" }, [
                  h("label", {}, "Reps"),
                  h("input", {
                    type: "number",
                    inputmode: "numeric",
                    value: set.reps,
                    onInput: (e) => { set.reps = Number(e.target.value) || 0; },
                  }),
                ]),
                h("div", { class: "set-field" }, [
                  h("label", {}, "Weight (kg)"),
                  h("input", {
                    type: "number",
                    inputmode: "decimal",
                    step: "1.25",
                    value: set.weightKg,
                    onInput: (e) => { set.weightKg = Number(e.target.value) || 0; },
                  }),
                ]),
              ])
            ),
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
              onInput: (e) => { draft.overallNotes = e.target.value; },
            }),
          ]),
          stepper(`Felt: ${draft.sessionFeelingRating ?? "\u2014"} / 5`, () => {
            draft.sessionFeelingRating = Math.max(0, (draft.sessionFeelingRating ?? 1) - 1);
            render();
          }, () => {
            draft.sessionFeelingRating = Math.min(5, (draft.sessionFeelingRating ?? 0) + 1);
            render();
          }),
        ]),

        h("button", { class: "btn btn-primary", onClick: onSave }, "Save Workout"),
      ]),
    ]);
    mount(screen);
  }

  async function onSave() {
    const log = {
      id: uuid(),
      date: new Date().toISOString(),
      programName: program.name,
      dayTitle: day.title,
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
    await db.put("logs", log);
    showToast("Workout saved");
    navigate(`/day/${programId}/${weekNumber}/${dayNumber}`);
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
