import { h, mount, showTabbar, showToast } from "../dom.js";
import { db, uuid } from "../db.js";
import { navigate } from "../router.js";
import { renderDayTemplateEditor, buildWeeksForTotalDays } from "../dayTemplateEditor.js";

export async function renderCustomBuilder() {
  showTabbar(false);

  const library = await db.getAll("exercises");

  const state = {
    name: "My Program",
    totalDays: 28,
    days: [{ title: "Day 1", exercises: [] }],
  };

  function render() {
    const totalExercises = state.days.reduce((sum, d) => sum + d.exercises.length, 0);
    const canSave = state.days.length > 0 && totalExercises > 0 && state.name.trim().length > 0;
    const cycles = state.days.length > 0 ? (state.totalDays / state.days.length) : 0;

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
          h("span", { class: "stepper-label" }, `Repeat for: ${state.totalDays} days total`),
          h("div", { class: "stepper-controls" }, [
            h("button", { class: "stepper-btn", onClick: () => { state.totalDays = Math.max(state.days.length || 1, state.totalDays - 1); render(); } }, "\u2212"),
            h("button", { class: "stepper-btn", onClick: () => { state.totalDays = Math.min(180, state.totalDays + 1); render(); } }, "+"),
          ]),
        ]),
        state.days.length > 0
          ? h("p", { style: "margin:-4px 0 12px;font-size:13px" }, `That's your ${state.days.length}-day cycle repeated ${cycles.toFixed(1)} times.`)
          : null,

        h("p", { style: "margin:12px 0" }, "Build your training days once below \u2014 the app repeats this cycle automatically to fill the total days you set above. No need to duplicate anything."),

        ...renderDayTemplateEditor(state.days, library, render),
      ]),
    ]);
    mount(screen);
  }

  async function onSave() {
    const weeks = buildWeeksForTotalDays(state.days, state.totalDays);

    const program = {
      id: uuid(),
      name: state.name.trim(),
      createdDate: new Date().toISOString(),
      goal: null,
      splitStyle: null,
      daysPerWeek: state.days.length,
      sessionLengthMinutes: null,
      totalWeeks: weeks.length,
      totalDays: state.totalDays,
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
