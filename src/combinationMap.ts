import { ConfigurationValue } from "./interfaces";

export interface UncoveredItem {
  value1: ConfigurationValue;
  value2: ConfigurationValue;
}

export interface Combination {
  param1: string;
  param2: string;
  uncovered: UncoveredItem[];
}

export interface CombinationMap extends Iterable<Combination> {
  getBestPartialSolution(): Map<string, ConfigurationValue>;
  markSolutionCovered(solution: Map<string, ConfigurationValue>): void;
  isEmpty(): boolean;
}

function* combinationIterator(array: Combination[]): IterableIterator<Combination> {
  yield* array;
}

export function createCombinationMap(
  configEntries: Array<[string, ConfigurationValue[]]>
): CombinationMap {
  if (configEntries.length === 0) {
    throw new RangeError("Can't create combination map without entries");
  }
  let combinations: Combination[] = [];
  let mostUncoveredPair: Combination | undefined = undefined;

  for (let i = 0; i < configEntries.length - 1; i++) {
    for (let j = i + 1; j < configEntries.length; j++) {
      const entry1 = configEntries[i];
      const entry2 = configEntries[j];
      if (entry1 && entry2) {
        const [param1, values1] = entry1;
        const [param2, values2] = entry2;
        const newCombination = {
          param1,
          param2,
          uncovered: generateUncovered(values1, values2),
        };
        combinations.push(newCombination);
        if (
          !mostUncoveredPair ||
          newCombination.uncovered.length > mostUncoveredPair.uncovered.length
        ) {
          mostUncoveredPair = newCombination;
        }
      }
    }
  }

  return {
    getBestPartialSolution(): Map<string, ConfigurationValue> {
      const solution = new Map<string, ConfigurationValue>();
      // take first combination from pair with most uncovered slots
      const combination = mostUncoveredPair?.uncovered[0];
      if (mostUncoveredPair && combination) {
        solution.set(mostUncoveredPair.param1, combination.value1);
        solution.set(mostUncoveredPair.param2, combination.value2);
      }
      return solution;
    },
    markSolutionCovered(solution: Map<string, ConfigurationValue>): void {
      // when adding solutions to the results, simply remove them
      // from pending combinations after all slots are covered

      // bookkeeping for next optimal solution
      mostUncoveredPair = undefined;
      combinations = combinations.filter(function (combination) {
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

        if (
          combination.uncovered.length &&
          (!mostUncoveredPair || combination.uncovered.length > mostUncoveredPair.uncovered.length)
        ) {
          mostUncoveredPair = combination;
        }

        return combination.uncovered.length > 0;
      });
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
function generateUncovered(
  firstArray: ConfigurationValue[],
  secondArray: ConfigurationValue[]
): UncoveredItem[] {
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
