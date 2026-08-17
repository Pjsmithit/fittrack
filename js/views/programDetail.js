import { h, mount, showTabbar } from "../dom.js";
import { db } from "../db.js";
import { navigate } from "../router.js";

export async function renderProgramDetail({ programId }) {
  showTabbar(false);

  const program = await db.get("programs", programId);
  if (!program) {
    navigate("/program");
    return;
  }

  function showOptionsSheet() {
    const overlay = h("div", {
      style: "position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:40;display:flex;align-items:flex-end",
      onClick: (e) => { if (e.target === overlay) document.body.removeChild(overlay); },
    });
    const sheet = h("div", {
      style: "background:var(--bg-elevated);width:100%;border-radius:16px 16px 0 0;padding:16px;padding-bottom:calc(16px + env(safe-area-inset-bottom))",
    }, [
      h("h2", { style: "margin-bottom:16px" }, program.name),
      h("button", {
        class: "btn btn-secondary",
        style: "margin-bottom:10px",
        onClick: () => { document.body.removeChild(overlay); navigate(`/edit-program/${program.id}`); },
      }, "Edit Program"),
      h("button", {
        class: "btn btn-danger",
        style: "background:none;border:1px solid var(--warn)",
        onClick: async () => {
          const confirmed = window.confirm(`Delete "${program.name}"? This can't be undone. Logged workouts from this program are kept.`);
          if (!confirmed) return;
          await db.delete("programs", program.id);
          document.body.removeChild(overlay);
          navigate("/program");
        },
      }, "Delete Program"),
    ]);
    overlay.appendChild(sheet);
    document.body.appendChild(overlay);
  }

  const weeksBlocks = program.weeks
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
                      onClick: () => navigate(`/day/${program.id}/${week.weekNumber}/${day.dayNumber}`),
                    },
                    [
                      h("div", { class: "row-title" }, day.title),
                      h("div", { class: "row-sub" }, `${day.exercises.length} exercises \u203a`),
                    ]
                  ),
                  h(
                    "button",
                    { class: "log-pill", onClick: () => navigate(`/log/${program.id}/${week.weekNumber}/${day.dayNumber}`) },
                    "Log"
                  ),
                ]),
              ])
            )
        ),
      ])
    );

  mount(
    h("div", { class: "screen", style: "padding-top:0" }, [
      h("div", { class: "topbar" }, [
        h("button", { class: "topbar-action", onClick: () => navigate("/program") }, "\u2039 Programs"),
        h("h1", { style: "font-size:16px" }, program.name),
        h("button", { class: "topbar-action", onClick: showOptionsSheet }, "\u22ef"),
      ]),
      h("div", { style: "padding:16px" }, [
        h("div", { class: "card" }, [
          h("h2", {}, program.name),
          h("p", {}, program.isCustom
            ? `${program.daysPerWeek}-day cycle \u00b7 ${program.totalDays || program.totalWeeks * program.daysPerWeek} days total`
            : `${program.daysPerWeek} days/week \u00b7 ${program.sessionLengthMinutes ? program.sessionLengthMinutes + " min \u00b7 " : ""}${program.totalWeeks} weeks`),
          program.isCustom ? h("span", { class: "badge" }, "Custom") : null,
        ]),
        ...weeksBlocks,
      ]),
    ])
  );
}
