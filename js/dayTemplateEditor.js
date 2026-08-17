import { h } from "./dom.js";
import { showExercisePickerSheet } from "./exercisePicker.js";

/**
 * Repeats a day template to produce an exact total number of training
 * days, packing them into "weeks" of up to `template.length` days each
 * (the last one truncated if the total isn't an exact multiple) so the
 * result still fits the existing weeks→days→exercises schema.
 */
export function buildWeeksForTotalDays(template, totalDays) {
  const weeks = [];
  let daysPlaced = 0;
  let weekNumber = 1;
  while (daysPlaced < totalDays) {
    const remaining = totalDays - daysPlaced;
    const count = Math.min(template.length, remaining);
    const days = [];
    for (let i = 0; i < count; i++) {
      const dayTemplate = template[i];
      days.push({
        dayNumber: i + 1,
        title: dayTemplate.title,
        exercises: dayTemplate.exercises.map((ex, orderIndex) => ({ ...ex, orderIndex })),
      });
    }
    weeks.push({ weekNumber, isRotationWeek: false, days });
    daysPlaced += count;
    weekNumber += 1;
  }
  return weeks;
}

/**
 * Renders the editable list of day cards for a program template.
 * `days` is mutated in place (title, exercises, sets/rest per
 * exercise, order, superset links); `onChange` is called after every
 * mutation so the caller can re-render itself. Returns an array of
 * DOM nodes to splice into the caller's screen.
 */
export function renderDayTemplateEditor(days, library, onChange) {
  function insertionPoint(day, index) {
    return h("button", {
      style: "width:100%;background:none;border:none;border-top:1px dashed var(--border);border-bottom:1px dashed var(--border);color:var(--text-faint);font-family:var(--font-display);font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;padding:6px 0;margin:2px 0;cursor:pointer",
      onClick: () => {
        showExercisePickerSheet(library, (exercise) => {
          day.exercises.splice(index, 0, {
            exerciseID: exercise.id,
            exerciseName: exercise.name,
            sets: exercise.defaultSets,
            repRange: exercise.defaultRepRange,
            restSeconds: exercise.defaultRestSeconds,
            linkedToNext: false,
          });
          onChange();
        });
      },
    }, "+ Add exercise here");
  }

  function exerciseRow(day, ex, exIndex) {
    const isLast = exIndex === day.exercises.length - 1;
    return h("li", {
      style: ex.linkedToNext
        ? "padding:10px 0 6px;border-left:3px solid var(--accent);padding-left:10px;margin-bottom:0"
        : "padding:10px 0;border-bottom:1px solid var(--border);margin-bottom:6px",
    }, [
      h("div", { style: "display:flex;justify-content:space-between;align-items:flex-start;gap:8px" }, [
        h("div", { class: "row-title" }, ex.exerciseName),
        h("div", { style: "display:flex;gap:6px;flex-shrink:0" }, [
          h("button", {
            class: "stepper-btn",
            style: `width:28px;height:28px;font-size:13px;${exIndex === 0 ? "opacity:0.35" : ""}`,
            disabled: exIndex === 0,
            onClick: () => {
              if (exIndex === 0) return;
              [day.exercises[exIndex - 1], day.exercises[exIndex]] = [day.exercises[exIndex], day.exercises[exIndex - 1]];
              onChange();
            },
          }, "\u2191"),
          h("button", {
            class: "stepper-btn",
            style: `width:28px;height:28px;font-size:13px;${isLast ? "opacity:0.35" : ""}`,
            disabled: isLast,
            onClick: () => {
              if (isLast) return;
              [day.exercises[exIndex], day.exercises[exIndex + 1]] = [day.exercises[exIndex + 1], day.exercises[exIndex]];
              onChange();
            },
          }, "\u2193"),
          h("button", {
            class: "stepper-btn",
            style: "background:var(--warn);color:#fff;border:none;font-size:13px;width:28px;height:28px",
            onClick: () => { day.exercises.splice(exIndex, 1); onChange(); },
          }, "\u2715"),
        ]),
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
      !isLast
        ? h("button", {
            class: `chip ${ex.linkedToNext ? "active" : ""}`,
            style: "margin-top:8px;font-size:12px;padding:6px 12px;min-height:32px",
            onClick: () => { ex.linkedToNext = !ex.linkedToNext; onChange(); },
          }, ex.linkedToNext ? "\u26AD Superset with next \u2014 on" : "\u26AD Superset with next")
        : null,
    ]);
  }

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
        : null,

      h("ul", { class: "card-list", style: "list-style:none;padding:0;margin:0" }, [
        insertionPoint(day, 0),
        ...day.exercises.flatMap((ex, exIndex) => [
          exerciseRow(day, ex, exIndex),
          insertionPoint(day, exIndex + 1),
        ]),
      ]),

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
