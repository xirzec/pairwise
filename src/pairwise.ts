export interface ConfigurationMatrix {
  [key: string]: unknown[];
}

export type ResultConfiguration<Config extends ConfigurationMatrix> = {
  [key in keyof Config]: Config[key][number];
};

interface UncoveredItem {
  value1: unknown;
  value2: unknown;
}

interface Combination {
  param1: string;
  param2: string;
  uncovered: UncoveredItem[];
}

interface SolutionItemCandidateMap {
  add(param: string, value: unknown): void;
  increment(param: string, value: unknown): void;
  getBestCandidate(): { param: string; value: unknown };
}

function createItemCandidateMap(): SolutionItemCandidateMap {
  const candidateMap = new Map<string, Map<unknown, number>>();
  let bestCandidate: { param: string; value: unknown; score: number };
  return {
    add(param: string, value: unknown): void {
      let paramMap = candidateMap.get(param);
      if (!paramMap) {
        paramMap = new Map<unknown, number>();
        candidateMap.set(param, paramMap);
      }
      if (!paramMap.has(value)) {
        paramMap.set(value, 0);
      }
      if (!bestCandidate) {
        bestCandidate = { param, value, score: 0 };
      }
    },
    increment(param: string, value: unknown): void {
      const paramMap = candidateMap.get(param);
      const score = paramMap?.get(value);
      if (paramMap && score !== undefined) {
        const newScore = score + 1;
        paramMap.set(value, newScore);
        if (newScore > bestCandidate.score) {
          bestCandidate = { param, value, score: newScore };
        }
      }
    },
    getBestCandidate(): { param: string; value: unknown } {
      if (!bestCandidate) {
        throw new Error("Map is empty, can't compute best candidate!");
      }
      return bestCandidate;
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
  solution: Record<string, unknown>
): Combination[] {
  const remainingCombinations = combinations.filter(function (combination) {
    combination.uncovered = combination.uncovered.filter(function (uncovered) {
      if (
        solution[combination.param1] === uncovered.value1 &&
        solution[combination.param2] === uncovered.value2
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

// Useful for when you have a large number of configurations but don't want to
// exhaustively test all unique combinations. This function takes an object that describes
// all input parameters and their valid values, e.g.
// { rtl: [true, false], layout:['list', 'grid'] }
// and returns an array of objects that describe test cases for each unique
// pair combination of inputs, e.g.
// [ {rtl: true, layout: 'list'}, {rtl: true, layout: 'grid'}, ...]
// The second argument provides an array of solutions that *must* be included in the output
// more info: http://msdn.microsoft.com/en-us/library/cc150619.aspx
export function* pairwise<Config extends ConfigurationMatrix>(
  config: Config,
  include?: Array<ResultConfiguration<Config>>
): Iterable<ResultConfiguration<Config>> {
  const configEntries = Object.entries(config);

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

  // mark any solutions passed in as covered
  if (Array.isArray(include)) {
    for (const solution of include) {
      combinations = updateUncoveredCombinations(combinations, solution);
      yield solution;
    }
  }

  while (combinations[0]) {
    // take first combination from pair with most uncovered slots
    let mostUncoveredPair = combinations[0];
    for (const combination of combinations) {
      if (combination.uncovered.length > mostUncoveredPair.uncovered.length) {
        mostUncoveredPair = combination;
      }
    }

    const solution: Record<string, unknown> = {};
    const combination = mostUncoveredPair.uncovered[0]!;
    solution[mostUncoveredPair.param1] = combination.value1;
    solution[mostUncoveredPair.param2] = combination.value2;

    // while not all parameters are in the solution yet
    const solutionKeys = new Set<string>(Object.keys(solution));
    while (solutionKeys.size < configEntries.length) {
      const candidates = createItemCandidateMap();

      // any uncovered parameter is a candidate
      for (const [param, values] of configEntries) {
        if (!solutionKeys.has(param)) {
          for (const value of values) {
            candidates.add(param, value);
          }
        }
      }

      // find pairs that contain a parameter not in the solution
      for (const combination of combinations) {
        const hasParam1 = !solutionKeys.has(combination.param1);
        const hasParam2 = !solutionKeys.has(combination.param2);

        if (!hasParam1 || !hasParam2) {
          // filter uncovered combinations consistent with existing inputs from these pairs
          for (const uncovered of combination.uncovered) {
            if (hasParam1 && uncovered.value1 === solution[combination.param1]) {
              candidates.increment(combination.param2, uncovered.value2);
            } else if (hasParam2 && uncovered.value2 === solution[combination.param2]) {
              candidates.increment(combination.param1, uncovered.value1);
            } else {
              candidates.increment(combination.param1, uncovered.value1);
              candidates.increment(combination.param2, uncovered.value2);
            }
          }
        }
      }

      const bestCandidate = candidates.getBestCandidate();
      // pick a value that satisfies the most of these combinations
      solution[bestCandidate.param] = bestCandidate.value;
      solutionKeys.add(bestCandidate.param);
    }

    // remove what is covered by the new solution
    combinations = updateUncoveredCombinations(combinations, solution);
    yield solution as ResultConfiguration<Config>;
  }
}
