import { createItemCandidateMap } from "./candidateMap";
import { createCombinationMap } from "./coverageMap";

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

  const combinationMap = createCombinationMap(configEntries);

  // mark any solutions passed in as covered
  if (Array.isArray(include)) {
    for (const solution of include) {
      combinationMap.markSolutionCovered(new Map(Object.entries(solution)));
      yield solution;
    }
  }

  while (!combinationMap.isEmpty()) {
    const solution = combinationMap.getBestPartialSolution();

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
      for (const combination of combinationMap) {
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
    combinationMap.markSolutionCovered(solution);
    yield solutionToObject(solution) as ResultConfiguration<Config>;
  }
}
