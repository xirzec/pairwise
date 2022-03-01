import { createItemCandidateMap } from "./candidateMap";
import { Combination, generateUncovered, updateUncoveredCombinations } from "./coverageMap";

export interface ConfigurationMatrix {
  [key: string]: unknown[];
}

export type ResultConfiguration<Config extends ConfigurationMatrix> = {
  [key in keyof Config]: Config[key][number];
};

function solutionToObject(solution: Map<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of solution) {
    result[key] = value;
  }
  return result;
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
      combinations = updateUncoveredCombinations(combinations, new Map(Object.entries(solution)));
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

    const solution = new Map<string, unknown>();
    const combination = mostUncoveredPair.uncovered[0]!;
    solution.set(mostUncoveredPair.param1, combination.value1);
    solution.set(mostUncoveredPair.param2, combination.value2);

    // while not all parameters are in the solution yet
    while (solution.size < configEntries.length) {
      const candidates = createItemCandidateMap();

      // any uncovered parameter is a candidate
      for (const [param, values] of configEntries) {
        if (!solution.has(param)) {
          for (const value of values) {
            candidates.add(param, value);
          }
        }
      }

      // find pairs that contain a parameter not in the solution
      for (const combination of combinations) {
        const hasParam1 = !solution.has(combination.param1);
        const hasParam2 = !solution.has(combination.param2);

        if (!hasParam1 || !hasParam2) {
          // filter uncovered combinations consistent with existing inputs from these pairs
          for (const uncovered of combination.uncovered) {
            if (hasParam1 && uncovered.value1 === solution.get(combination.param1)) {
              candidates.increment(combination.param2, uncovered.value2);
            } else if (hasParam2 && uncovered.value2 === solution.get(combination.param2)) {
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
      solution.set(bestCandidate.param, bestCandidate.value);
    }

    // remove what is covered by the new solution
    combinations = updateUncoveredCombinations(combinations, solution);
    yield solutionToObject(solution) as ResultConfiguration<Config>;
  }
}
