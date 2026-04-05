// Expertise utility — single source of truth for allowed expertise values.
// Used by: Zod validation schema, page component, and property-based tests.

export const ALL_EXPERTISE = [
  "Art & Crafts",
  "Outdoor Play",
  "STEM Activities",
  "Music & Dance",
  "Storytelling",
  "Social Skills",
] as const;

export type ExpertiseValue = (typeof ALL_EXPERTISE)[number];

/**
 * Pure toggle function: adds tag if absent, removes it if present.
 * Always returns a new array with no duplicates.
 */
export function toggleExpertise(current: string[], tag: string): string[] {
  return current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag];
}
