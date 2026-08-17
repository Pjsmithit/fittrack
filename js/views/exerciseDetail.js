import { h, mount, showTabbar, showToast } from "../dom.js";
import { db } from "../db.js";
import { getExerciseById, getExerciseLibrary } from "../exerciseLibrary.js";
import { navigate } from "../router.js";

export async function renderExercise({ programId, weekNumber, dayNumber, exerciseIndex }) {
  showTabbar(true);
  const program = await db.get("programs", programId);
  if (!program) return navigate("/program");

  const week = program.weeks.find((w) => String(w.weekNumber) === String(weekNumber));
  const day = week?.days.find((d) => String(d.dayNumber) === String(dayNumber));
  const planned = day?.exercises.find((e) => String(e.orderIndex) === String(exerciseIndex));
  if (!planned) return navigate("/program");

  const libraryExercise = await getExerciseById(planned.exerciseID);

  async function persist() {
    await db.put("programs", program);
  }

  function render() {
    const videoBlock = libraryExercise
      ? videoView(libraryExercise.youtubeVideoID)
      : h("div", { class: "empty-state" }, [
          h("span", { class: "glyph" }, "\u2753"),
          h("h2", {}, "Exercise Not Found"),
          h("p", {}, "This exercise may have been removed from the library."),
        ]);

    const screen = h("div", { class: "screen", style: "padding-top:0" }, [
      h("div", { class: "topbar" }, [
        h("button", { class: "topbar-action", onClick: () => navigate(`/day/${programId}/${weekNumber}/${dayNumber}`) }, "\u2039 Back"),
        h("h1", { style: "font-size:16px" }, planned.exerciseName),
        h("span", { style: "width:48px" }),
      ]),
      h("div", { style: "padding:16px" }, [
        videoBlock,
        libraryExercise ? h("p", { style: "margin:12px 0 20px" }, libraryExercise.exerciseDescription || libraryExercise.description || "") : null,

        h("div", { class: "card" }, [
          h("h2", {}, "Plan"),
          stepper(`Sets: ${planned.sets}`, () => {
            planned.sets = Math.max(1, planned.sets - 1);
            persist();
            render();
          }, () => {
            planned.sets = Math.min(10, planned.sets + 1);
            persist();
            render();
          }),
          h("div", { class: "field", style: "margin-top:12px" }, [
            h("label", {}, "Rep range"),
            h("input", {
              type: "text",
              value: planned.repRange,
              onInput: (e) => {
                planned.repRange = e.target.value;
              },
              onChange: persist,
            }),
          ]),
          stepper(`Rest: ${planned.restSeconds}s`, () => {
            planned.restSeconds = Math.max(0, planned.restSeconds - 15);
            persist();
            render();
          }, () => {
            planned.restSeconds = Math.min(240, planned.restSeconds + 15);
            persist();
            render();
          }),
          h("button", {
            class: "btn btn-secondary",
            style: "margin-top:12px",
            onClick: async () => {
              await showSwapSheet(planned, async (exercise) => {
                planned.exerciseID = exercise.id;
                planned.exerciseName = exercise.name;
                await persist();
                navigate(`/exercise/${programId}/${weekNumber}/${dayNumber}/${exerciseIndex}`);
                renderExercise({ programId, weekNumber, dayNumber, exerciseIndex });
              });
            },
          }, "Swap Exercise"),
        ]),
      ]),
    ]);
    mount(screen);
  }

  render();
}

function stepper(label, onDec, onInc) {
  return h("div", { class: "stepper-row" }, [
    h("span", { class: "stepper-label" }, label),
    h("div", { class: "stepper-controls" }, [
      h("button", { class: "stepper-btn", onClick: onDec }, "\u2212"),
      h("button", { class: "stepper-btn", onClick: onInc }, "+"),
    ]),
  ]);
}

function videoView(videoID) {
  const wrap = h("div", { class: "video-wrap" });

  function showOffline() {
    wrap.innerHTML = "";
    wrap.appendChild(
      h("div", { class: "video-offline" }, [
        h("span", { style: "font-size:26px" }, "\u{1F4F6}"),
        h("span", {}, "Video needs an internet connection"),
        h("button", {
          class: "btn btn-secondary",
          style: "width:auto;padding:8px 16px;min-height:36px;font-size:13px",
          onClick: () => attachIframe(),
        }, "Try Again"),
      ])
    );
  }

  function attachIframe() {
    if (!navigator.onLine) return showOffline();
    wrap.innerHTML = "";
    const iframe = h("iframe", {
      src: `https://www.youtube-nocookie.com/embed/${videoID}?playsinline=1&rel=0&modestbranding=1`,
      allow: "accelerometer; encrypted-media; gyroscope; picture-in-picture",
      allowfullscreen: "true",
      onError: showOffline,
    });
    wrap.appendChild(iframe);
  }

  attachIframe();
  return wrap;
}

async function showSwapSheet(planned, onPick) {
  const library = await getExerciseLibrary();
  const overlay = h("div", {
    style:
      "position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:40;display:flex;align-items:flex-end",
    onClick: (e) => { if (e.target === overlay) document.body.removeChild(overlay); },
  });
  const sheet = h("div", {
    style:
      "background:var(--bg-elevated);width:100%;max-height:80vh;overflow-y:auto;border-radius:16px 16px 0 0;padding:16px;padding-bottom:calc(16px + env(safe-area-inset-bottom))",
  }, [
    h("h2", { style: "margin-bottom:12px" }, "Swap Exercise"),
    h(
      "div",
      { class: "card", style: "padding:0" },
      h(
        "ul",
        { class: "card-list" },
        library.map((exercise) =>
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
                  h("div", { class: "row-sub" }, exercise.primaryMuscle),
                ]),
                exercise.id === planned.exerciseID ? h("span", {}, "\u2713") : null,
              ]
            ),
          ])
        )
      )
    ),
  ]);
  overlay.appendChild(sheet);
  document.body.appendChild(overlay);
}
