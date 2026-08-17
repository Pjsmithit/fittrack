import { h } from "./dom.js";
import { navigate } from "./router.js";

/**
 * Shows a bottom sheet listing every day across every given program,
 * grouped by program then week, so the user can jump straight to
 * logging a workout from anywhere without drilling into Program →
 * program → week → day first.
 */
export function showDayPickerSheet(programs) {
  const overlay = h("div", {
    style: "position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:40;display:flex;align-items:flex-end",
    onClick: (e) => { if (e.target === overlay) document.body.removeChild(overlay); },
  });

  const programBlocks = programs.map((program) =>
    h("div", { style: "margin-bottom:16px" }, [
      h("h3", { style: "margin-bottom:8px" }, program.name),
      ...program.weeks
        .slice()
        .sort((a, b) => a.weekNumber - b.weekNumber)
        .map((week) =>
          h("div", { style: "margin-bottom:10px" }, [
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
        ),
    ])
  );

  const sheet = h("div", {
    style:
      "background:var(--bg-elevated);width:100%;max-height:80vh;overflow-y:auto;border-radius:16px 16px 0 0;padding:16px;padding-bottom:calc(16px + env(safe-area-inset-bottom))",
  }, [
    h("h2", { style: "margin-bottom:12px" }, "Log a Workout"),
    h("p", { style: "margin-bottom:12px" }, "Pick which day you're logging."),
    ...programBlocks,
  ]);

  overlay.appendChild(sheet);
  document.body.appendChild(overlay);
}
