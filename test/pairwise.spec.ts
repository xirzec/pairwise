import { assert } from "chai";
import { pairwise } from "../src/pairwise";

describe("pairwise", function () {
  it("kinda works", function () {
    const iterator = pairwise({ a: [1, 2, 3], b: ["a", "b"], c: [true, false] });
    for (const value of iterator) {
      assert.ok(value);
    }
  });
});
