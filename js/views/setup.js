import { h, mount, showTabbar, showToast } from "../dom.js";
import { EQUIPMENT, GOALS, SPLITS, RESTRICTIONS } from "../exerciseLibrary.js";
import { generateAndSaveProgram } from "../programGenerator.js";
import { navigate } from "../router.js";

export async function renderSetup() {
  showTabbar(false);

  const state = {
    goal: "generalFitness",
    daysPerWeek: 3,
    sessionLengthMinutes: 45,
    equipment: new Set(["dumbbell", "bodyweight"]),
    restrictions: new Set(),
    splitStyle: "fullBody",
    programLengthWeeks: 4,
    includeTreadmillWalking: false,
  };

  function render() {
    const screen = h("div", { class: "screen", style: "padding-top:0" }, [
      h("div", { class: "topbar" }, [
        h("button", { class: "topbar-action", onClick: () => navigate("/program") }, "Cancel"),
        h("h1", {}, "New Program"),
        h("span", { style: "width:48px" }),
      ]),
      h("div", { style: "padding:16px" }, [
        section("Goal", [
          h(
            "div",
            { class: "segmented" },
            GOALS.map((g) =>
              h(
                "button",
                {
                  class: g.id === state.goal ? "active" : "",
                  onClick: () => {
                    state.goal = g.id;
                    render();
                  },
                },
                g.label
              )
            )
          ),
        ]),

        section("Schedule", [
          stepperRow(`Days per week: ${state.daysPerWeek}`, () => {
            state.daysPerWeek = Math.max(1, state.daysPerWeek - 1);
            render();
          }, () => {
            state.daysPerWeek = Math.min(6, state.daysPerWeek + 1);
            render();
          }),
          stepperRow(`Session length: ${state.sessionLengthMinutes} min`, () => {
            state.sessionLengthMinutes = Math.max(15, state.sessionLengthMinutes - 5);
            render();
          }, () => {
            state.sessionLengthMinutes = Math.min(90, state.sessionLengthMinutes + 5);
            render();
          }),
          stepperRow(`Program length: ${state.programLengthWeeks} weeks`, () => {
            state.programLengthWeeks = Math.max(4, state.programLengthWeeks - 4);
            render();
          }, () => {
            state.programLengthWeeks = Math.min(12, state.programLengthWeeks + 4);
            render();
          }),
        ]),

        section("Equipment", [
          h(
            "div",
            { class: "chip-grid" },
            EQUIPMENT.map((eq) =>
              h(
                "button",
                {
                  class: `chip ${state.equipment.has(eq.id) ? "active" : ""}`,
                  onClick: () => {
                    if (state.equipment.has(eq.id)) state.equipment.delete(eq.id);
                    else state.equipment.add(eq.id);
                    render();
                  },
                },
                eq.label
              )
            )
          ),
        ]),

        section("Split Style", [
          h(
            "div",
            { class: "segmented" },
            SPLITS.map((s) =>
              h(
                "button",
                {
                  class: s.id === state.splitStyle ? "active" : "",
                  onClick: () => {
                    state.splitStyle = s.id;
                    render();
                  },
                },
                s.label
              )
            )
          ),
        ]),

        section("Restrictions", [
          h(
            "div",
            { class: "chip-grid" },
            RESTRICTIONS.map((r) =>
              h(
                "button",
                {
                  class: `chip ${state.restrictions.has(r.id) ? "active" : ""}`,
                  onClick: () => {
                    if (state.restrictions.has(r.id)) state.restrictions.delete(r.id);
                    else state.restrictions.add(r.id);
                    render();
                  },
                },
                r.label
              )
            )
          ),
        ]),

        section("Cardio Breaks", [
          h("p", { style: "margin-top:-4px" }, "Adds a short walk before your first exercise and between every exercise after that."),
          h(
            "div",
            { class: "chip-grid" },
            [
              h(
                "button",
                {
                  class: `chip ${state.includeTreadmillWalking ? "active" : ""}`,
                  onClick: () => {
                    state.includeTreadmillWalking = !state.includeTreadmillWalking;
                    render();
                  },
                },
                state.includeTreadmillWalking ? "\u2713 Walking breaks on" : "Add walking breaks"
              ),
            ]
          ),
        ]),

        h("button", {
          class: "btn btn-primary",
          disabled: state.equipment.size === 0,
          onClick: async () => {
            const program = await generateAndSaveProgram({
              goal: state.goal,
              daysPerWeek: state.daysPerWeek,
              sessionLengthMinutes: state.sessionLengthMinutes,
              equipment: Array.from(state.equipment),
              restrictions: Array.from(state.restrictions),
              splitStyle: state.splitStyle,
              programLengthWeeks: state.programLengthWeeks,
              includeTreadmillWalking: state.includeTreadmillWalking,
            });
            showToast("Program generated");
            navigate(`/program/${program.id}`);
          },
        }, "Generate Program"),
      ]),
    ]);
    mount(screen);
  }

  render();
}

function section(title, children) {
  return h("div", { style: "margin-bottom:20px" }, [
    h("h2", { style: "margin-bottom:10px" }, title),
    ...children,
  ]);
}

function stepperRow(label, onDec, onInc) {
  return h("div", { class: "stepper-row" }, [
    h("span", { class: "stepper-label" }, label),
    h("div", { class: "stepper-controls" }, [
      h("button", { class: "stepper-btn", onClick: onDec }, "\u2212"),
      h("button", { class: "stepper-btn", onClick: onInc }, "+"),
    ]),
  ]);
}
