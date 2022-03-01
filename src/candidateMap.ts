import { ConfigurationValue } from "./interfaces";

export interface SolutionItemCandidateMap {
  add(param: string, values: ConfigurationValue[]): void;
  increment(param: string, value: ConfigurationValue): void;
  getBestCandidate(): { param: string; value: ConfigurationValue };
}

export function createItemCandidateMap(): SolutionItemCandidateMap {
  const candidateMap = new Map<string, Map<ConfigurationValue, number>>();
  let bestCandidate: { param: string; value: ConfigurationValue; score: number };
  return {
    add(param: string, values: ConfigurationValue[]): void {
      let paramMap = candidateMap.get(param);
      if (!paramMap) {
        paramMap = new Map<ConfigurationValue, number>();
        candidateMap.set(param, paramMap);
      }
      for (const value of values) {
        if (!paramMap.has(value)) {
          paramMap.set(value, 0);
        }
        if (!bestCandidate) {
          bestCandidate = { param, value, score: 0 };
        }
      }
    },
    increment(param: string, value: ConfigurationValue): void {
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
    getBestCandidate(): { param: string; value: ConfigurationValue } {
      if (!bestCandidate) {
        throw new Error("Map is empty, can't compute best candidate!");
      }
      return bestCandidate;
    },
  };
}
