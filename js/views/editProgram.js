import { h, mount, showTabbar, showToast } from "../dom.js";
import { db } from "../db.js";
import { navigate } from "../router.js";
import { renderDayTemplateEditor } from "../dayTemplateEditor.js";

export async function renderEditProgram({ programId }) {
  showTabbar(false);

  const [program, library] = await Promise.all([db.get("programs", programId), db.getAll("exercises")]);
  if (!program) {
    navigate("/program");
    return;
  }

  const firstWeek = program.weeks.slice().sort((a, b) => a.weekNumber - b.weekNumber)[0];

  const state = {
    name: program.name,
    weeksCount: program.totalWeeks,
    // Deep-copy the first week's days as the editable template.
    days: (firstWeek ? firstWeek.days : [])
      .slice()
      .sort((a, b) => a.dayNumber - b.dayNumber)
      .map((day) => ({
        title: day.title,
        exercises: day.exercises
          .slice()
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((ex) => ({ exerciseID: ex.exerciseID, exerciseName: ex.exerciseName, sets: ex.sets, repRange: ex.repRange, restSeconds: ex.restSeconds })),
      })),
  };

  function render() {
    const totalExercises = state.days.reduce((sum, d) => sum + d.exercises.length, 0);
    const canSave = state.days.length > 0 && totalExercises > 0 && state.name.trim().length > 0;

    const screen = h("div", { class: "screen", style: "padding-top:0" }, [
      h("div", { class: "topbar" }, [
        h("button", { class: "topbar-action", onClick: () => navigate(`/program/${programId}`) }, "Cancel"),
        h("h1", {}, "Edit Program"),
        h("button", { class: "topbar-action", disabled: !canSave, onClick: onSave }, "Save"),
      ]),
      h("div", { style: "padding:16px" }, [
        h("div", { class: "field" }, [
          h("label", {}, "Program name"),
          h("input", {
            type: "text",
            value: state.name,
            onInput: (e) => { state.name = e.target.value; },
          }),
        ]),

        h("div", { class: "stepper-row" }, [
          h("span", { class: "stepper-label" }, `Weeks: ${state.weeksCount}`),
          h("div", { class: "stepper-controls" }, [
            h("button", { class: "stepper-btn", onClick: () => { state.weeksCount = Math.max(1, state.weeksCount - 1); render(); } }, "\u2212"),
            h("button", { class: "stepper-btn", onClick: () => { state.weeksCount = Math.min(16, state.weeksCount + 1); render(); } }, "+"),
          ]),
        ]),

        h("p", { style: "margin:12px 0" }, "Saving rebuilds every week from this day template \u2014 if this program had different exercises in a later rotation week, that variation is replaced with this consistent structure."),

        ...renderDayTemplateEditor(state.days, library, render),
      ]),
    ]);
    mount(screen);
  }

  async function onSave() {
    const weeksCount = state.weeksCount;
    const weeks = Array.from({ length: weeksCount }, (_, i) => ({
      weekNumber: i + 1,
      isRotationWeek: false,
      days: state.days.map((day, dayIndex) => ({
        dayNumber: dayIndex + 1,
        title: day.title,
        exercises: day.exercises.map((ex, orderIndex) => ({ ...ex, orderIndex })),
      })),
    }));

    const updated = {
      ...program,
      name: state.name.trim(),
      daysPerWeek: state.days.length,
      totalWeeks: weeksCount,
      isCustom: true,
      weeks,
    };

    await db.put("programs", updated);
    showToast("Program updated");
    navigate(`/program/${programId}`);
  }

  render();
}
