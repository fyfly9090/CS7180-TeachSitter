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

    // 预期的断言：Sunflower 班级的老师应该排在第一位
    const result = await matchTeachers(mockParent, mockTeachers);

    expect(result[0].id).toBe("2"); // Teacher B (Sunflower)
    expect(result[0].reasoning).toContain("familiarity");
  });
});
