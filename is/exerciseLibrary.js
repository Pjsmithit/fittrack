import { db } from "./db.js";

// Static reference data — mirrors the enums from the native spec.
export const EQUIPMENT = [
  { id: "bodyweight", label: "Bodyweight" },
  { id: "dumbbell", label: "Dumbbell" },
  { id: "bench", label: "Bench" },
  { id: "treadmill", label: "Treadmill" },
  { id: "fullGym", label: "Full Gym" },
];

export const GOALS = [
  { id: "fatLoss", label: "Fat Loss", repRangeBias: "12-15", restSecondsBias: 30 },
  { id: "strength", label: "Strength", repRangeBias: "4-6", restSecondsBias: 120 },
  { id: "generalFitness", label: "General Fitness", repRangeBias: "8-12", restSecondsBias: 60 },
  { id: "endurance", label: "Endurance", repRangeBias: "15-20", restSecondsBias: 30 },
];

export const SPLITS = [
  { id: "fullBody", label: "Full Body" },
  { id: "pushPull", label: "Push / Pull" },
  { id: "upperLower", label: "Upper / Lower" },
];

export const RESTRICTIONS = [
  { id: "kneeFriendly", label: "Knee-Friendly" },
  { id: "shoulderFriendly", label: "Shoulder-Friendly" },
  { id: "lowerBackFriendly", label: "Lower-Back-Friendly" },
];

export function goalById(id) {
  return GOALS.find((g) => g.id === id) || GOALS[2];
}
export function splitById(id) {
  return SPLITS.find((s) => s.id === id) || SPLITS[0];
}

/**
 * Seeds the exercises store from the bundled JSON on first load, or
 * whenever new entries have been added to the bundled file since the
 * last seed. Existing IDs are never duplicated or overwritten, so it's
 * safe to add to exercise-library.json incrementally later.
 */
export async function seedExerciseLibraryIfNeeded() {
  const existing = await db.getAll("exercises");
  const existingIDs = new Set(existing.map((e) => e.id));

  const res = await fetch("data/exercise-library.json");
  const seeds = await res.json();

  const toInsert = seeds.filter((s) => !existingIDs.has(s.id));
  if (toInsert.length > 0) {
    await db.putAll("exercises", toInsert);
  }
}

export async function getExerciseLibrary() {
  return db.getAll("exercises");
}

export async function getExerciseById(id) {
  return db.get("exercises", id);
}
