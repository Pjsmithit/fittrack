import { h, mount, showTabbar, setTabbarActive } from "../dom.js";
import { db } from "../db.js";
import { navigate } from "../router.js";

export async function renderProgram() {
  showTabbar(true);
  setTabbarActive("program");

  const programs = await db.getAll("programs");
  const active = programs.find((p) => p.isActive);

  if (!active) {
    mount(
      h("div", { class: "screen" }, [
        h("div", { class: "topbar" }, [h("span"), h("h1", {}, "Program"), h("span")]),
        h("div", { class: "empty-state" }, [
          h("span", { class: "glyph" }, "\u{1F4CB}"),
          h("h2", {}, "No Active Program"),
          h("p", {}, "Generate a program to get started."),
          h("button", { class: "btn btn-primary", style: "margin-top:16px", onClick: () => navigate("/setup") }, "New Program"),
        ]),
      ])
    );
    return;
  }

  const weeksBlocks = active.weeks
    .slice()
    .sort((a, b) => a.weekNumber - b.weekNumber)
    .map((week) =>
      h("div", { class: "card" }, [
        h("div", { class: "eyebrow", style: "margin-bottom:8px" }, week.isRotationWeek ? `Week ${week.weekNumber} \u00b7 Rotation` : `Week ${week.weekNumber}`),
        h(
          "ul",
          { class: "card-list" },
          week.days
            .slice()
            .sort((a, b) => a.dayNumber - b.dayNumber)
            .map((day) =>
              h("li", {}, [
                h("div", { class: "row-split" }, [
                  h(
                    "button",
                    {
                      class: "row-link",
                      onClick: () => navigate(`/day/${active.id}/${week.weekNumber}/${day.dayNumber}`),
                    },
                    [
                      h("div", { class: "row-title" }, day.title),
                      h("div", { class: "row-sub" }, `${day.exercises.length} exercises \u203a`),
                    ]
                  ),
                  h(
                    "button",
                    {
                      class: "log-pill",
                      onClick: () => navigate(`/log/${active.id}/${week.weekNumber}/${day.dayNumber}`),
                    },
                    "Log"
                  ),
                ]),
              ])
            )
        ),
      ])
    );

  mount(
    h("div", { class: "screen" }, [
      h("div", { class: "topbar" }, [
        h("span"),
        h("h1", {}, "Program"),
        h("button", { class: "topbar-action", onClick: () => navigate("/setup") }, "+ New"),
      ]),
      h("div", { style: "padding:16px" }, [
        h("div", { class: "card" }, [
          h("h2", {}, active.name),
          h("p", {}, `${active.daysPerWeek} days/week \u00b7 ${active.sessionLengthMinutes} min \u00b7 ${active.totalWeeks} weeks`),
        ]),
        ...weeksBlocks,
      ]),
    ])
  );
}
