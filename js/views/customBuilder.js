import { h, mount, showTabbar, showToast } from "../dom.js";
import { db, uuid } from "../db.js";
import { navigate } from "../router.js";
import { renderDayTemplateEditor } from "../dayTemplateEditor.js";

export async function renderCustomBuilder() {
  showTabbar(false);

  const library = await db.getAll("exercises");

  const state = {
    name: "My Program",
    weeksCount: 4,
    days: [{ title: "Day 1", exercises: [] }],
  };

  function render() {
    const totalExercises = state.days.reduce((sum, d) => sum + d.exercises.length, 0);
    const canSave = state.days.length > 0 && totalExercises > 0 && state.name.trim().length > 0;

    const screen = h("div", { class: "screen", style: "padding-top:0" }, [
      h("div", { class: "topbar" }, [
        h("button", { class: "topbar-action", onClick: () => navigate("/program") }, "Cancel"),
        h("h1", {}, "Build Program"),
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

        h("p", { style: "margin:12px 0" }, "This day structure repeats for every week of the program \u2014 add each training day once, and the exercises, sets, and reps you set here apply across all weeks."),

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

    const program = {
      id: uuid(),
      name: state.name.trim(),
      createdDate: new Date().toISOString(),
      goal: null,
      splitStyle: null,
      daysPerWeek: state.days.length,
      sessionLengthMinutes: null,
      totalWeeks: weeksCount,
      isActive: true,
      isCustom: true,
      weeks,
    };

    await db.put("programs", program);
    showToast("Program saved");
    navigate(`/program/${program.id}`);
  }

  render();
}
