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

interface SolutionItemCandidate {
  param: string;
  value: unknown;
  score: number;
}

// generate value combinations of all input values for each pair
function generateUncovered<Config extends ConfigurationMatrix>(
  config: Config,
  param1: string,
  param2: string
): UncoveredItem[] {
  const param1Values = config[param1] ?? [];
  const param2Values = config[param2] ?? [];
  const result: UncoveredItem[] = [];

  for (const value1 of param1Values) {
    for (const value2 of param2Values) {
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
  const configKeys = Object.keys(config);

  let combinations: Combination[] = [];

  for (let i = 0; i < configKeys.length - 1; i++) {
    for (let j = i + 1; j < configKeys.length; j++) {
      const param1 = configKeys[i]!;
      const param2 = configKeys[j]!;
      combinations.push({
        param1: param1,
        param2: param2,
        uncovered: generateUncovered(config, param1, param2),
      });
    }
  }

  // mark any solutions passed in as covered
  if (Array.isArray(include)) {
    for (const solution of include) {
      combinations = updateUncoveredCombinations(combinations, solution);
      yield solution;
    }
  }

  while (combinations.length) {
    // take first combination from pair with most uncovered slots
    const mostUncoveredPair = combinations.reduce((previous, current) => {
      if (previous.uncovered.length >= current.uncovered.length) {
        return previous;
      } else {
        return current;
      }
    });

    const solution: Record<string, unknown> = {};
    const combination = mostUncoveredPair.uncovered[0]!;
    solution[mostUncoveredPair.param1] = combination.value1;
    solution[mostUncoveredPair.param2] = combination.value2;

    // while not all parameters are in the solution yet
    let solutionKeys = Object.keys(solution);
    while (solutionKeys.length < configKeys.length) {
      const candidates: SolutionItemCandidate[] = [];

      // any uncovered parameter is a candidate
      for (const param of configKeys) {
        if (!solutionKeys.includes(param)) {
          for (const value of config[param]!) {
            candidates.push({
              param,
              value,
              score: 0,
            });
          }
        }
      }

      let bestCandidate = candidates[0]!;

      const increment = function (param: string, value: unknown) {
        const candidate = candidates.find((c) => {
          return c.param === param && c.value === value;
        });
        if (candidate) {
          candidate.score++;
          if (candidate.score > bestCandidate.score) {
            bestCandidate = candidate;
          }
        }
      };

      // find pairs that contain a parameter not in the solution
      for (const combination of combinations) {
        const hasParam1 = !solutionKeys.includes(combination.param1);
        const hasParam2 = !solutionKeys.includes(combination.param2);

        if (!hasParam1 || !hasParam2) {
          // filter uncovered combinations consistent with existing inputs from these pairs
          for (const uncovered of combination.uncovered) {
            if (hasParam1 && uncovered.value1 === solution[combination.param1]) {
              increment(combination.param2, uncovered.value2);
            } else if (hasParam2 && uncovered.value2 === solution[combination.param2]) {
              increment(combination.param1, uncovered.value1);
            } else {
              increment(combination.param1, uncovered.value1);
              increment(combination.param2, uncovered.value2);
            }
          }
        }
      }

      // pick a value that satisfies the most of these combinations
      solution[bestCandidate.param] = bestCandidate.value;
      solutionKeys = Object.keys(solution);
    }

    // remove what is covered by the new solution
    combinations = updateUncoveredCombinations(combinations, solution);
    yield solution as ResultConfiguration<Config>;
  }
}
