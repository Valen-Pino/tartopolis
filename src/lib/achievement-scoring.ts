export type ScoringInputs = {
  women?: number;
  men?: number;
  visiting?: boolean;
  pau?: boolean;
  infidelity?: boolean;
  trio?: boolean;
};

export const additionalOptions = [
  { key: "visiting", label: "De Visitante", points: 2 },
  { key: "pau", label: "Tiene Pau", points: 10 },
  { key: "infidelity", label: "Infidelidad", points: 4 },
  { key: "trio", label: "Trío", points: 2 },
] as const;

export function hasAdditionalPoints(slug: string) {
  return ["tartear", "detonacion", "felattio"].includes(slug);
}

export function optionsFor(slug: string) {
  return additionalOptions.filter(({ key }) =>
    hasAdditionalPoints(slug) &&
    (key !== "visiting" || slug !== "tartear") &&
    (key !== "trio" || slug === "detonacion"),
  );
}

// Used for the live preview; the database independently validates and computes it.
export function calculatePoints(slug: string, inputs: ScoringInputs, fixed: number) {
  if (slug === "atraer-after") return Math.max(0, (inputs.women ?? 0) - (inputs.men ?? 0));
  return fixed + optionsFor(slug).reduce((sum, option) => sum + (inputs[option.key] ? option.points : 0), 0);
}

export function formatPoints(points: number) {
  return `${points > 0 ? "+" : ""}${points}`;
}
