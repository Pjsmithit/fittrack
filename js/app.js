import { route, notFound, startRouter, navigate } from "./router.js";
import { seedExerciseLibraryIfNeeded } from "./exerciseLibrary.js";
import { renderSetup } from "./views/setup.js";
import { renderProgram } from "./views/program.js";
import { renderDay } from "./views/day.js";
import { renderExercise } from "./views/exerciseDetail.js";
import { renderLog } from "./views/logging.js";
import { renderProgress } from "./views/progress.js";
import { renderLogGrid } from "./views/logGrid.js";
import { renderEditLog } from "./views/editLog.js";
import { renderProgramDetail } from "./views/programDetail.js";
import { renderCustomBuilder } from "./views/customBuilder.js";
import { renderEditProgram } from "./views/editProgram.js";

route("/setup", renderSetup);
route("/program", renderProgram);
route("/program/:programId", renderProgramDetail);
route("/build", renderCustomBuilder);
route("/edit-program/:programId", renderEditProgram);
route("/day/:programId/:weekNumber/:dayNumber", renderDay);
route("/exercise/:programId/:weekNumber/:dayNumber/:exerciseIndex", renderExercise);
route("/log/:programId/:weekNumber/:dayNumber", renderLog);
route("/progress", renderProgress);
route("/grid", renderLogGrid);
route("/edit-log/:logId", renderEditLog);
notFound(renderProgram);

document.querySelectorAll(".tabbar button").forEach((btn) => {
  btn.addEventListener("click", () => navigate(`/${btn.dataset.tab}`));
});

async function boot() {
  try {
    await seedExerciseLibraryIfNeeded();
    startRouter();
  } catch (err) {
    if (window.__showBootError) {
      window.__showBootError(`Startup failed: ${err && err.message ? err.message : err}`);
    }
    throw err;
  }
}

boot();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {
      // Non-fatal: app still works, just without offline caching this session.
    });
  });
}
