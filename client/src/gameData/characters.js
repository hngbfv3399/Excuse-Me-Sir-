import { SKILL_TYPES } from "./skills";

export const CHARACTERS = {
  DEFAULT_RUNNER: {
    id: "DEFAULT_RUNNER",
    name: "일반 의적",
    baseSpeed: 3,
    skill: SKILL_TYPES.DASH
  },
  HEALER_RUNNER: {
    id: "HEALER_RUNNER",
    name: "의무병",
    baseSpeed: 2.8,
    skill: SKILL_TYPES.HEAL
  },
  DEFAULT_TAGGER: {
    id: "DEFAULT_TAGGER",
    name: "일반 관군",
    baseSpeed: 3.2,
    skill: SKILL_TYPES.DASH
  }
};
