export interface UncoveredItem {
  value1: unknown;
  value2: unknown;
}

export interface Combination {
  param1: string;
  param2: string;
  uncovered: UncoveredItem[];
}

export interface CombinationMap extends Iterable<Combination> {
  getBestPartialSolution(): Map<string, unknown>;
  markSolutionCovered(solution: Map<string, unknown>): void;
  isEmpty(): boolean;
}

function* combinationIterator(array: Combination[]): IterableIterator<Combination> {
  yield* array;
}

export function createCombinationMap(configEntries: Array<[string, unknown[]]>): CombinationMap {
  let combinations: Combination[] = [];

  for (const [param1, values1] of configEntries) {
    for (const [param2, values2] of configEntries) {
      if (param1 !== param2) {
        combinations.push({
          param1,
          param2,
          uncovered: generateUncovered(values1, values2),
        });
      }
    }
  }
  return {
    getBestPartialSolution(): Map<string, unknown> {
      // take first combination from pair with most uncovered slots
      let mostUncoveredPair = combinations[0]!;
      for (const combination of combinations) {
        if (combination.uncovered.length > mostUncoveredPair.uncovered.length) {
          mostUncoveredPair = combination;
        }
      }

      const solution = new Map<string, unknown>();
      const combination = mostUncoveredPair.uncovered[0]!;
      solution.set(mostUncoveredPair.param1, combination.value1);
      solution.set(mostUncoveredPair.param2, combination.value2);
      return solution;
    },
    markSolutionCovered(solution: Map<string, unknown>): void {
      combinations = updateUncoveredCombinations(combinations, solution);
    },
    isEmpty(): boolean {
      return combinations.length === 0;
    },
    [Symbol.iterator](): Iterator<Combination> {
      return combinationIterator(combinations);
    },
  };
}

// generate value combinations of all input values for each pair
function generateUncovered(firstArray: unknown[], secondArray: unknown[]): UncoveredItem[] {
  const result: UncoveredItem[] = [];

  for (const value1 of firstArray) {
    for (const value2 of secondArray) {
      result.push({
        value1,
        value2,
      });
    }
  }

  return result;
}

// when adding solutions to the results, simply remove them
// from pending combinations after all slots are covered
function updateUncoveredCombinations(
  combinations: Combination[],
  solution: Map<string, unknown>
): Combination[] {
  const remainingCombinations = combinations.filter(function (combination) {
    combination.uncovered = combination.uncovered.filter(function (uncovered) {
      if (
        solution.get(combination.param1) === uncovered.value1 &&
        solution.get(combination.param2) === uncovered.value2
      ) {
        // remove combinations now covered
        return false;
      }
      return true;
    });

    return combination.uncovered.length > 0;
  });

  return remainingCombinations;
}
