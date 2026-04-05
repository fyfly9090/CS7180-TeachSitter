// @vitest-environment node
// TDD RED → GREEN: toggleExpertise pure function — property-based tests with fast-check

import { describe, test, expect } from "vitest";
import fc from "fast-check";
import { ALL_EXPERTISE, toggleExpertise } from "../lib/utils/expertise";

describe("toggleExpertise — property-based tests", () => {
  // Arbitrary that picks a random subset of ALL_EXPERTISE
  const subsetArb = fc.subarray(ALL_EXPERTISE as unknown as string[]);
  // Arbitrary that picks one value from ALL_EXPERTISE
  const tagArb = fc.constantFrom(...(ALL_EXPERTISE as unknown as string[]));

  test("toggle is idempotent: toggling the same tag twice returns the original set", () => {
    fc.assert(
      fc.property(subsetArb, tagArb, (selected, tag) => {
        const after1 = toggleExpertise(selected, tag);
        const after2 = toggleExpertise(after1, tag);
        expect([...after2].sort()).toEqual([...selected].sort());
      })
    );
  });

  test("toggling an absent tag adds it", () => {
    fc.assert(
      fc.property(subsetArb, tagArb, (selected, tag) => {
        const without = selected.filter((t) => t !== tag);
        const result = toggleExpertise(without, tag);
        expect(result).toContain(tag);
      })
    );
  });

  test("toggling a present tag removes it", () => {
    fc.assert(
      fc.property(subsetArb, tagArb, (selected, tag) => {
        const with_ = selected.includes(tag) ? selected : [...selected, tag];
        const result = toggleExpertise(with_, tag);
        expect(result).not.toContain(tag);
      })
    );
  });

  test("result never contains duplicates", () => {
    fc.assert(
      fc.property(subsetArb, tagArb, (selected, tag) => {
        const result = toggleExpertise(selected, tag);
        expect(result.length).toBe(new Set(result).size);
      })
    );
  });

  test("result is always a subset of ALL_EXPERTISE", () => {
    fc.assert(
      fc.property(subsetArb, tagArb, (selected, tag) => {
        const result = toggleExpertise(selected, tag);
        for (const item of result) {
          expect(ALL_EXPERTISE).toContain(item);
        }
      })
    );
  });
});
