export interface SolutionItemCandidateMap {
  add(param: string, values: unknown[]): void;
  increment(param: string, value: unknown): void;
  getBestCandidate(): { param: string; value: unknown };
}

export function createItemCandidateMap(): SolutionItemCandidateMap {
  const candidateMap = new Map<string, Map<unknown, number>>();
  let bestCandidate: { param: string; value: unknown; score: number };
  return {
    add(param: string, values: unknown[]): void {
      let paramMap = candidateMap.get(param);
      if (!paramMap) {
        paramMap = new Map<unknown, number>();
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
