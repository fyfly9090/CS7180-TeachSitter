// RED: AI Teacher Matching Logic Test
import { describe, test, expect } from "vitest";
import { matchTeachers } from "../lib/ai/match";

describe("AI Teacher Matching Logic", () => {
  test("should rank teachers from the same classroom higher than others", async () => {
    const mockParent = { child_classroom: "Sunflower" };
    const mockTeachers = [
      { id: "1", name: "Teacher A", classroom: "Rose" },
      { id: "2", name: "Teacher B", classroom: "Sunflower" },
    ];

    const result = await matchTeachers(mockParent, mockTeachers);

    expect(result[0].id).toBe("2"); // Teacher B (Sunflower)
    expect(result[0].reasoning).toContain("familiarity");
  });

  test("should not show classroom reasoning when no classroom is specified", async () => {
    const mockParent = { child_classroom: "" };
    const mockTeachers = [
      { id: "1", name: "Teacher A", classroom: "Rose" },
      { id: "2", name: "Teacher B", classroom: "Sunflower" },
    ];

    const result = await matchTeachers(mockParent, mockTeachers);

    for (const teacher of result) {
      expect(teacher.reasoning).not.toContain("classroom");
    }
  });

  test("should give teachers sequential unique ranks when no classroom is specified", async () => {
    const mockParent = { child_classroom: "" };
    const mockTeachers = [
      { id: "1", name: "Teacher A", classroom: "Rose" },
      { id: "2", name: "Teacher B", classroom: "Sunflower" },
    ];

    const result = await matchTeachers(mockParent, mockTeachers);

    // Each teacher gets a unique sequential rank (1, 2, ...) so badges don't collide
    const ranks = result.map((t) => t.rank);
    expect(ranks).toEqual([1, 2]);
  });
});
