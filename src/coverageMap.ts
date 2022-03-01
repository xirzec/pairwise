export interface UncoveredItem {
  value1: unknown;
  value2: unknown;
}

export interface Combination {
  param1: string;
  param2: string;
  uncovered: UncoveredItem[];
}

// generate value combinations of all input values for each pair
export function generateUncovered(firstArray: unknown[], secondArray: unknown[]): UncoveredItem[] {
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
export function updateUncoveredCombinations(
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
