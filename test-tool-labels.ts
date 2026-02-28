// test-tool-label.ts
import { getDrugLabel } from "./tools/getDrugLabel.js";

const run = async () => {
  const result = await getDrugLabel({ drugName: "Metformin" });
  console.log(result);
};

run();
