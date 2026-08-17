import { h, mount, showTabbar } from "../dom.js";
import { db } from "../db.js";
import { navigate } from "../router.js";

export async function renderDay({ programId, weekNumber, dayNumber }) {
  showTabbar(false);
  const program = await db.get("programs", programId);
  if (!program) return navigate("/program");

  const week = program.weeks.find((w) => String(w.weekNumber) === String(weekNumber));
  const day = week?.days.find((d) => String(d.dayNumber) === String(dayNumber));
  if (!day) return navigate("/program");

  mount(
    h("div", { class: "screen", style: "padding-top:0" }, [
      h("div", { class: "topbar" }, [
        h("button", { class: "topbar-action", onClick: () => navigate(`/program/${programId}`) }, "\u2039 Back"),
        h("h1", {}, day.title),
        h("button", {
          class: "topbar-action",
          onClick: () => navigate(`/log/${programId}/${weekNumber}/${dayNumber}`),
        }, "Log"),
      ]),
      h("div", { style: "padding:16px" }, [
        h("div", { class: "card" }, [
          h(
            "ul",
            { class: "card-list" },
            day.exercises
              .slice()
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((ex) =>
                h("li", {}, [
                  h(
                    "button",
                    {
                      class: "row",
                      onClick: () =>
                        navigate(`/exercise/${programId}/${weekNumber}/${dayNumber}/${ex.orderIndex}`),
                    },
                    [
                      h("span", {}, [
                        h("div", { class: "row-title" }, ex.exerciseName),
                        h("div", { class: "row-sub" }, `${ex.sets} sets \u00d7 ${ex.repRange} reps \u00b7 ${ex.restSeconds}s rest`),
                      ]),
                      h("span", { class: "row-chevron" }, "\u203a"),
                    ]
                  ),
                ])
              )
          ),
        ]),
      ]),
    ])
  );
}
