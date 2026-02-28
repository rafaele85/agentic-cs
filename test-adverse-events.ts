// test-tool-adverse.ts
import { getAdverseEvents } from "./tools/getAdverseEvents.js";

const run = async () => {
  const result = await getAdverseEvents({ drugName: "Metformin" });
  console.log(result);
};

run();
