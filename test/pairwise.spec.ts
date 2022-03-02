import { assert } from "chai";
import { pairwise } from "../src/pairwise";

describe("pairwise", function () {
  it("kinda works", function () {
    const iterator = pairwise({ a: [1, 2, 3], b: ["a", "b"], c: [true, false] });

    assert.deepEqual(
      [...iterator],
      [
        { a: 1, b: "a", c: true },
        { a: 1, b: "b", c: false },
        { a: 2, b: "a", c: false },
        { a: 2, b: "b", c: true },
        { a: 3, b: "a", c: true },
        { a: 3, b: "b", c: false },
      ]
    );
  });
});
