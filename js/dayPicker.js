import { h } from "./dom.js";
import { navigate } from "./router.js";

/**
 * Shows a bottom sheet listing every day in the given program so the
 * user can jump straight to logging a workout without first drilling
 * into Program → week → day. Used from the Progress tab's "Log
 * Workout" action; the Program tab also exposes a direct "Log" pill
 * per day for the same one-tap access.
 */
export function showDayPickerSheet(program) {
  const overlay = h("div", {
    style: "position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:40;display:flex;align-items:flex-end",
    onClick: (e) => { if (e.target === overlay) document.body.removeChild(overlay); },
  });

  const weekBlocks = program.weeks
    .slice()
    .sort((a, b) => a.weekNumber - b.weekNumber)
    .map((week) =>
      h("div", { style: "margin-bottom:12px" }, [
        h("div", { class: "eyebrow", style: "margin-bottom:6px" }, `Week ${week.weekNumber}`),
        h(
          "div",
          { class: "card", style: "padding:0" },
          h(
            "ul",
            { class: "card-list" },
            week.days
              .slice()
              .sort((a, b) => a.dayNumber - b.dayNumber)
              .map((day) =>
                h("li", {}, [
                  h(
                    "button",
                    {
                      class: "row",
                      onClick: () => {
                        document.body.removeChild(overlay);
                        navigate(`/log/${program.id}/${week.weekNumber}/${day.dayNumber}`);
                      },
                    },
                    [
                      h("span", {}, [
                        h("div", { class: "row-title" }, day.title),
                        h("div", { class: "row-sub" }, `${day.exercises.length} exercises`),
                      ]),
                      h("span", { class: "row-chevron" }, "\u203a"),
                    ]
                  ),
                ])
              )
          )
        ),
      ])
    );

  const sheet = h("div", {
    style:
      "background:var(--bg-elevated);width:100%;max-height:80vh;overflow-y:auto;border-radius:16px 16px 0 0;padding:16px;padding-bottom:calc(16px + env(safe-area-inset-bottom))",
  }, [
    h("h2", { style: "margin-bottom:12px" }, "Log a Workout"),
    h("p", { style: "margin-bottom:12px" }, "Pick which day you're logging."),
    ...weekBlocks,
  ]);

  overlay.appendChild(sheet);
  document.body.appendChild(overlay);
}
