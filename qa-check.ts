interface QaResult {
  check: string;
  passed: boolean;
  detail: string;
}

const runQa = (finalAnswer: string, toolCallLog: string[]): QaResult[] => {
  const results: QaResult[] = [];

  // 1. Did the agent cite specific trial IDs?
  const nctPattern = /NCT\d{7,11}/g;
  const trialIds = finalAnswer.match(nctPattern) ?? [];
  results.push({
    check: "Trial IDs cited",
    passed: trialIds.length > 0,
    detail: trialIds.length > 0
      ? `Found ${trialIds.length}: ${trialIds.join(", ")}`
      : "No NCT IDs found in answer",
  });

  // 2. Did the agent use adverse events tool?
  const usedAdverseEvents = toolCallLog.some((t) => t.includes("getAdverseEvents"));
  results.push({
    check: "Adverse events consulted",
    passed: usedAdverseEvents,
    detail: usedAdverseEvents
      ? "getAdverseEvents was called"
      : "MISSING: agent never checked adverse event data",
  });

  // 3. Does the answer contain specific numbers (not vague language)?
  const numberPattern = /\d{2,}[,%]/g;
  const specificNumbers = finalAnswer.match(numberPattern) ?? [];
  results.push({
    check: "Contains specific data points",
    passed: specificNumbers.length >= 2,
    detail: specificNumbers.length >= 2
      ? `Found ${specificNumbers.length} data points`
      : `Only ${specificNumbers.length} data points — answer may be vague`,
  });

  // 4. Does it mention eGFR thresholds (key safety info)?
  const egfrPattern = /eGFR\s*(?:below|above|[<>])?\s*\d+/gi;
  const egfrMentions = finalAnswer.match(egfrPattern) ?? [];
  results.push({
    check: "eGFR thresholds mentioned",
    passed: egfrMentions.length > 0,
    detail: egfrMentions.length > 0
      ? `Found: ${egfrMentions.join(", ")}`
      : "MISSING: no renal dosing thresholds",
  });

  // 5. Does it flag the terminated trial?
  const mentionsTermination = /terminat|stopped early|higher.+than.+expected/i.test(finalAnswer);
  results.push({
    check: "Terminated trial flagged",
    passed: mentionsTermination,
    detail: mentionsTermination
      ? "Agent flagged a terminated trial as a safety signal"
      : "MISSING: did not highlight terminated trial",
  });

  // 6. Traceability: every drug name in answer should have a corresponding tool call
  const drugsInAnswer = ["Metformin", "Lisinopril"].filter((d) =>
    finalAnswer.toLowerCase().includes(d.toLowerCase())
  );
  const drugsLookedUp = ["Metformin", "Lisinopril"].filter((d) =>
    toolCallLog.some((t) => t.includes(d))
  );
  const allDrugsTraced = drugsInAnswer.every((d) => drugsLookedUp.includes(d));
  results.push({
    check: "All mentioned drugs were researched",
    passed: allDrugsTraced,
    detail: allDrugsTraced
      ? `Drugs mentioned: ${drugsInAnswer.join(", ")} — all have tool calls`
      : `Mentioned ${drugsInAnswer.join(", ")} but only looked up ${drugsLookedUp.join(", ")}`,
  });

  return results;
};

const printQa = (results: QaResult[]) => {
  console.log("\n=== QA REPORT ===\n");
  const passed = results.filter((r) => r.passed).length;
  console.log(`Score: ${passed}/${results.length}\n`);
  for (const r of results) {
    const icon = r.passed ? "✅" : "❌";
    console.log(`${icon} ${r.check}`);
    console.log(`   ${r.detail}\n`);
  }
};

export { runQa, printQa };
export type { QaResult };
