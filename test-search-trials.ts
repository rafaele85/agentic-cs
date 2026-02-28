// test-tool-trials.ts
import { searchClinicalTrials } from "./tools/searchClinicalTrials.js";

const run = async () => {
  const result = await searchClinicalTrials({ query: "Metformin Lisinopril" });
  console.log(result);
};

run();
