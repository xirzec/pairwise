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

// Useful for when you have a large number of configurations but don't want to
// exhaustively test all unique combinations. This function takes an object that describes
// all input parameters and their valid values, e.g.
// { rtl: [true, false], layout:['list', 'grid'] }
// and returns an array of objects that describe test cases for each unique
// pair combination of inputs, e.g.
// [ {rtl: true, layout: 'list'}, {rtl: true, layout: 'grid'}, ...]
// The second argument provides an array of solutions that *must* be included in the output
// more info: http://msdn.microsoft.com/en-us/library/cc150619.aspx
export function pairwise<Config extends ConfigurationMatrix>(
  inputs: Config,
  include?: Array<ResultConfiguration<Config>>
): Array<ResultConfiguration<Config>> {
  const results: Array<ResultConfiguration<Config>> = [];
  const inputKeys = Object.keys(inputs);

  let combinations: Combination[] = [];

  // generate value combinations of all input values for each pair
  function generateUncovered(param1: string, param2: string) {
    const param1Inputs = inputs[param1];
    const param2Inputs = inputs[param2];
    const result: UncoveredItem[] = [];

    if (!Array.isArray(param1Inputs) || !Array.isArray(param2Inputs)) {
      return result;
    }

    param1Inputs.forEach(function (value1) {
      param2Inputs.forEach(function (value2) {
        result.push({
          value1: value1,
          value2: value2,
        });
      });
    });

    return result;
  }

  // when adding solutions to the results, simply remove them
  // from pending combinations after all slots are covered
  function addSolution(solution: ResultConfiguration<Config>) {
    combinations = combinations.filter(function (combination) {
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

    results.push(solution);
  }

  for (let i = 0; i < inputKeys.length - 1; i++) {
    for (let j = i + 1; j < inputKeys.length; j++) {
      const param1 = inputKeys[i];
      const param2 = inputKeys[j];
      if (!param1 || !param2) {
        continue;
      }
      combinations.push({
        param1: param1,
        param2: param2,
        uncovered: generateUncovered(param1, param2),
      });
    }
  }

  // mark any solutions passed in as covered
  if (Array.isArray(include)) {
    include.forEach(function (solution) {
      addSolution(solution);
    });
  }

  while (combinations.length) {
    // take first combination from pair with most uncovered slots
    const mostUncoveredPair = combinations.reduce(function (previous, current) {
      if (previous === null) {
        return current;
      }

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
    while (solutionKeys.length < inputKeys.length) {
      const candidates: SolutionItemCandidate[] = [];

      // any uncovered parameter is a candidate
      inputKeys.forEach(function (param) {
        if (solutionKeys.indexOf(param) === -1) {
          inputs[param]?.forEach(function (value) {
            candidates.push({
              param: param,
              value: value,
              score: 0,
            });
          });
        }
      });

      let bestCandidate = candidates[0]!;

      const increment = function (param: string, value: unknown) {
        candidates.some(function (candidate) {
          if (candidate.param === param && candidate.value === value) {
            candidate.score++;
            if (candidate.score > bestCandidate.score) {
              bestCandidate = candidate;
            }
            return true;
          }
          return false;
        });
      };

      // find pairs that contain a parameter not in the solution
      combinations.forEach(function (combination) {
        const hasParam1 = solutionKeys.indexOf(combination.param1) !== -1;
        const hasParam2 = solutionKeys.indexOf(combination.param2) !== -1;

        if (!hasParam1 || !hasParam2) {
          // filter uncovered combinations consistent with existing inputs from these pairs
          combination.uncovered.forEach(function (uncovered) {
            if (hasParam1 && uncovered.value1 === solution[combination.param1]) {
              increment(combination.param2, uncovered.value2);
            } else if (hasParam2 && uncovered.value2 === solution[combination.param2]) {
              increment(combination.param1, uncovered.value1);
            } else {
              increment(combination.param1, uncovered.value1);
              increment(combination.param2, uncovered.value2);
            }
          });
        }
      });

      // pick a value that satisfies the most of these combinations
      solution[bestCandidate.param] = bestCandidate.value;
      solutionKeys = Object.keys(solution);
    }

    // remove what is covered by the new solution
    addSolution(solution as ResultConfiguration<Config>);
  }

  return results;
}
