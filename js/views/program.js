import { h, mount, showTabbar, setTabbarActive } from "../dom.js";
import { db } from "../db.js";
import { navigate } from "../router.js";
import { APP_VERSION, LAST_UPDATED } from "../version.js";

export async function renderProgram() {
  showTabbar(true);
  setTabbarActive("program");

  const programs = await db.getAll("programs");
  programs.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));

  function showNewProgramSheet() {
    const overlay = h("div", {
      style: "position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:40;display:flex;align-items:flex-end",
      onClick: (e) => { if (e.target === overlay) document.body.removeChild(overlay); },
    });
    const sheet = h("div", {
      style: "background:var(--bg-elevated);width:100%;border-radius:16px 16px 0 0;padding:16px;padding-bottom:calc(16px + env(safe-area-inset-bottom))",
    }, [
      h("h2", { style: "margin-bottom:4px" }, "New Program"),
      h("p", { style: "margin-bottom:16px" }, "Auto-generate one from your goals and equipment, or build your own from scratch."),
      h("button", {
        class: "btn btn-primary",
        style: "margin-bottom:10px",
        onClick: () => { document.body.removeChild(overlay); navigate("/setup"); },
      }, "Auto-Generate"),
      h("button", {
        class: "btn btn-secondary",
        onClick: () => { document.body.removeChild(overlay); navigate("/build"); },
      }, "Build Custom"),
    ]);
    overlay.appendChild(sheet);
    document.body.appendChild(overlay);
  }

  const versionFooter = h("p", {
    style: "text-align:center;color:var(--text-faint);font-size:11px;margin-top:24px",
  }, `FitTrack v${APP_VERSION} \u00b7 Updated ${LAST_UPDATED}`);

  if (programs.length === 0) {
    mount(
      h("div", { class: "screen" }, [
        h("div", { class: "topbar" }, [h("span"), h("h1", {}, "Programs"), h("span")]),
        h("div", { class: "empty-state" }, [
          h("span", { class: "glyph" }, "\u{1F4CB}"),
          h("h2", {}, "No Programs Yet"),
          h("p", {}, "Auto-generate a program or build your own to get started."),
          h("button", { class: "btn btn-primary", style: "margin-top:16px", onClick: showNewProgramSheet }, "New Program"),
        ]),
        versionFooter,
      ])
    );
    return;
  }

  mount(
    h("div", { class: "screen" }, [
      h("div", { class: "topbar" }, [
        h("span"),
        h("h1", {}, "Programs"),
        h("button", { class: "topbar-action", onClick: showNewProgramSheet }, "+ New"),
      ]),
      h("div", { style: "padding:16px" }, [
        h(
          "div",
          { class: "card" },
          h(
            "ul",
            { class: "card-list" },
            programs.map((program) =>
              h("li", {}, [
                h(
                  "button",
                  { class: "row", onClick: () => navigate(`/program/${program.id}`) },
                  [
                    h("span", {}, [
                      h("div", { class: "row-title" }, program.name),
                      h("div", { class: "row-sub" }, [
                        program.isCustom
                          ? `${program.daysPerWeek}-day cycle \u00b7 ${program.totalDays || program.totalWeeks * program.daysPerWeek} days total`
                          : `${program.daysPerWeek} days/week \u00b7 ${program.totalWeeks} weeks`,
                        program.isCustom ? h("span", { class: "badge", style: "margin-left:8px" }, "Custom") : null,
                      ]),
                    ]),
                    h("span", { class: "row-chevron" }, "\u203a"),
                  ]
                ),
              ])
            )
          )
        ),
        versionFooter,
      ]),
    ])
  );
}
