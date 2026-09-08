import * as cr from "./commit-reveal";
// ponytail: single provider today; ORAO VRF slots in here behind RANDOMNESS_PROVIDER
export const provider = process.env.RANDOMNESS_PROVIDER ?? "commit";
export const { commit, memoIx, reveal, computeRoll } = cr;
