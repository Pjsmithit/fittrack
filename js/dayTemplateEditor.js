import { h } from "./dom.js";
import { showExercisePickerSheet } from "./exercisePicker.js";

/**
 * Renders the editable list of day cards for a program template.
 * `days` is mutated in place (title, exercises, sets/rest per
 * exercise); `onChange` is called after every mutation so the caller
 * can re-render itself. Returns an array of DOM nodes to splice into
 * the caller's screen.
 */
export function renderDayTemplateEditor(days, library, onChange) {
  const dayCards = days.map((day, dayIndex) =>
    h("div", { class: "card" }, [
      h("div", { class: "field" }, [
        h("label", {}, `Day ${dayIndex + 1} name`),
        h("input", {
          type: "text",
          value: day.title,
          onInput: (e) => { day.title = e.target.value; },
        }),
      ]),

      day.exercises.length === 0
        ? h("p", {}, "No exercises yet.")
        : h(
            "ul",
            { class: "card-list" },
            day.exercises.map((ex, exIndex) =>
              h("li", { style: "padding:10px 0" }, [
                h("div", { style: "display:flex;justify-content:space-between;align-items:flex-start;gap:8px" }, [
                  h("div", { class: "row-title" }, ex.exerciseName),
                  h("button", {
                    class: "stepper-btn",
                    style: "background:var(--warn);color:#fff;border:none;font-size:13px;width:28px;height:28px;flex-shrink:0",
                    onClick: () => { day.exercises.splice(exIndex, 1); onChange(); },
                  }, "\u2715"),
                ]),
                h("div", { class: "stepper-row" }, [
                  h("span", { class: "stepper-label" }, `Sets: ${ex.sets}`),
                  h("div", { class: "stepper-controls" }, [
                    h("button", { class: "stepper-btn", onClick: () => { ex.sets = Math.max(1, ex.sets - 1); onChange(); } }, "\u2212"),
                    h("button", { class: "stepper-btn", onClick: () => { ex.sets = Math.min(10, ex.sets + 1); onChange(); } }, "+"),
                  ]),
                ]),
                h("div", { class: "field", style: "margin:6px 0 0" }, [
                  h("label", {}, "Rep range"),
                  h("input", {
                    type: "text",
                    value: ex.repRange,
                    onInput: (e) => { ex.repRange = e.target.value; },
                  }),
                ]),
              ])
            )
          ),

      h("button", {
        class: "btn btn-secondary",
        style: "margin-top:10px",
        onClick: () => {
          showExercisePickerSheet(library, (exercise) => {
            day.exercises.push({
              exerciseID: exercise.id,
              exerciseName: exercise.name,
              sets: exercise.defaultSets,
              repRange: exercise.defaultRepRange,
              restSeconds: exercise.defaultRestSeconds,
            });
            onChange();
          });
        },
      }, "+ Add Exercise"),

      h("button", {
        class: "btn btn-danger",
        style: "margin-top:8px;background:none;border:1px solid var(--warn)",
        onClick: () => {
          days.splice(dayIndex, 1);
          onChange();
        },
      }, "Remove Day"),
    ])
  );

  const addDayButton = h("button", {
    class: "btn btn-secondary",
    style: "margin-bottom:16px",
    onClick: () => {
      days.push({ title: `Day ${days.length + 1}`, exercises: [] });
      onChange();
    },
  }, "+ Add Day");

  return [...dayCards, addDayButton];
}
