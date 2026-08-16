import { db, uuid } from "./db.js";
import { goalById, splitById } from "./exerciseLibrary.js";

/**
 * Builds a multi-week program from settings + the seeded exercise
 * library. Progression model: weeks 1-3 of each rotation repeat the
 * same exercises (so weight/rep progress is trackable on identical
 * movements), and every 4th week is flagged as a rotation week where
 * exercises are re-selected from the eligible pool to vary the
 * stimulus.
 */
export function generateProgram(settings, library) {
  const goal = goalById(settings.goal);
  const split = splitById(settings.splitStyle);
  const eligible = eligibleExercises(settings, library);
  const dayTitles = buildDayTitles(settings.splitStyle, settings.daysPerWeek);
  const exercisesPerDay = exercisesPerSession(settings.sessionLengthMinutes);

  const program = {
    id: uuid(),
    name: `${goal.label} — ${split.label}`,
    createdDate: new Date().toISOString(),
    goal: settings.goal,
    splitStyle: settings.splitStyle,
    daysPerWeek: settings.daysPerWeek,
    sessionLengthMinutes: settings.sessionLengthMinutes,
    totalWeeks: settings.programLengthWeeks,
    isActive: true,
    weeks: [],
  };

  let rotationSeed = 0;
  for (let weekNumber = 1; weekNumber <= Math.max(settings.programLengthWeeks, 1); weekNumber++) {
    const isRotationWeek = weekNumber > 1 && (weekNumber - 1) % 4 === 0;
    if (isRotationWeek) rotationSeed += 1;

    const week = { weekNumber, isRotationWeek, days: [] };

    dayTitles.forEach((title, index) => {
      const dayPool = poolForDay(title, eligible);
      const picks = pick(exercisesPerDay, dayPool, rotationSeed);

      const exercises = picks.map((exercise, orderIndex) => ({
        orderIndex,
        exerciseID: exercise.id,
        exerciseName: exercise.name,
        sets: exercise.defaultSets,
        repRange: goal.repRangeBias,
        restSeconds: goal.restSecondsBias,
      }));

      week.days.push({ dayNumber: index + 1, title, exercises });
    });

    program.weeks.push(week);
  }

  return program;
}

export async function generateAndSaveProgram(settings) {
  const library = await db.getAll("exercises");

  // Deactivate any currently active program rather than deleting it,
  // so past programs remain visible in history.
  const existing = await db.getAll("programs");
  await Promise.all(
    existing.filter((p) => p.isActive).map((p) => db.put("programs", { ...p, isActive: false }))
  );

  const program = generateProgram(settings, library);
  await db.put("programs", program);
  return program;
}

// ---- Filtering ----

function eligibleExercises(settings, library) {
  const equipmentSet = new Set(settings.equipment);
  const restrictionSet = new Set(settings.restrictions);
  return library.filter((exercise) => {
    if (!equipmentSet.has(exercise.equipment)) return false;
    // exercise.restrictionsToAvoid lists which restriction-filters this
    // exercise fails; exclude it if the user has that restriction active.
    const failsUserRestriction = (exercise.restrictionsToAvoid || []).some((r) =>
      restrictionSet.has(r)
    );
    return !failsUserRestriction;
  });
}

// ---- Day structure ----

function buildDayTitles(split, daysPerWeek) {
  if (split === "fullBody") {
    return Array.from({ length: daysPerWeek }, (_, i) => `Full Body ${i + 1}`);
  }
  if (split === "pushPull") {
    const pattern = ["Push", "Pull", "Legs"];
    return Array.from({ length: daysPerWeek }, (_, i) => `${pattern[i % 3]} ${Math.floor(i / 3) + 1}`);
  }
  // upperLower
  const pattern = ["Upper", "Lower"];
  return Array.from({ length: daysPerWeek }, (_, i) => `${pattern[i % 2]} ${Math.floor(i / 2) + 1}`);
}

function poolForDay(title, exercises) {
  const lower = title.toLowerCase();
  if (lower.includes("push")) {
    return exercises.filter(
      (e) => e.pattern === "push" || ["chest", "shoulders", "triceps"].includes(e.primaryMuscle)
    );
  }
  if (lower.includes("pull")) {
    return exercises.filter((e) => e.pattern === "pull" || ["back", "biceps"].includes(e.primaryMuscle));
  }
  if (lower.includes("legs") || lower.includes("lower")) {
    return exercises.filter(
      (e) =>
        ["squat", "hinge", "lunge"].includes(e.pattern) ||
        ["quads", "hamstrings", "glutes", "calves"].includes(e.primaryMuscle)
    );
  }
  if (lower.includes("upper")) {
    return exercises.filter(
      (e) =>
        ["push", "pull"].includes(e.pattern) ||
        !["quads", "hamstrings", "glutes", "calves"].includes(e.primaryMuscle)
    );
  }
  return exercises; // full body: everything eligible
}

function exercisesPerSession(sessionLengthMinutes) {
  return Math.max(3, Math.min(8, Math.floor(sessionLengthMinutes / 7)));
}

/**
 * Deterministically varies exercise selection between rotation weeks
 * while staying stable within a rotation.
 */
function pick(count, pool, rotationSeed) {
  if (pool.length === 0) return [];
  const sorted = [...pool].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const offset = rotationSeed % sorted.length;
  const rotated = [...sorted.slice(offset), ...sorted.slice(0, offset)];
  if (rotated.length >= count) return rotated.slice(0, count);
  const result = [];
  let i = 0;
  while (result.length < count) {
    result.push(rotated[i % rotated.length]);
    i += 1;
  }
  return result;
}
