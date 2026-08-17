import { h } from "./dom.js";

/**
 * Shows a bottom sheet listing every exercise in the library, grouped
 * by primary muscle for scannability. Tapping one calls onPick and
 * closes the sheet. Used to add exercises when building or editing a
 * custom program.
 */
export function showExercisePickerSheet(library, onPick) {
  const overlay = h("div", {
    style: "position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:50;display:flex;align-items:flex-end",
    onClick: (e) => { if (e.target === overlay) document.body.removeChild(overlay); },
  });

  const groups = {};
  const order = [];
  for (const ex of library) {
    const key = ex.primaryMuscle || "other";
    if (!groups[key]) {
      groups[key] = [];
      order.push(key);
    }
    groups[key].push(ex);
  }
  order.sort();

  const groupBlocks = order.map((muscle) =>
    h("div", { style: "margin-bottom:12px" }, [
      h("div", { class: "eyebrow", style: "margin-bottom:6px" }, muscle),
      h(
        "div",
        { class: "card", style: "padding:0" },
        h(
          "ul",
          { class: "card-list" },
          groups[muscle].map((exercise) =>
            h("li", {}, [
              h(
                "button",
                {
                  class: "row",
                  onClick: () => {
                    document.body.removeChild(overlay);
                    onPick(exercise);
                  },
                },
                [
                  h("span", {}, [
                    h("div", { class: "row-title" }, exercise.name),
                    h("div", { class: "row-sub" }, `${exercise.equipment} \u00b7 ${exercise.defaultSets} sets \u00d7 ${exercise.defaultRepRange}`),
                  ]),
                  h("span", { class: "row-chevron" }, "+"),
                ]
              ),
            ])
          )
        )
      ),
    ])
  );

  const sheet = h("div", {
    style: "background:var(--bg-elevated);width:100%;max-height:85vh;overflow-y:auto;border-radius:16px 16px 0 0;padding:16px;padding-bottom:calc(16px + env(safe-area-inset-bottom))",
  }, [
    h("h2", { style: "margin-bottom:12px" }, "Add Exercise"),
    ...groupBlocks,
  ]);

  overlay.appendChild(sheet);
  document.body.appendChild(overlay);
}
