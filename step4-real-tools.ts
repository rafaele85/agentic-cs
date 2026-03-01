// increment4-real-tools.ts
import OpenAI from "openai";
import { runQa, printQa } from "./qa-check.js";
import { searchClinicalTrials } from "./tools/searchClinicalTrials.js";
import { getAdverseEvents } from "./tools/getAdverseEvents.js";
import { getDrugLabel } from "./tools/getDrugLabel.js";

const client = new OpenAI({
  baseURL: "http://localhost:8000/v1",
  apiKey: "not-needed",
});

const realTools: Record<string, (args: any) => Promise<string>> = {
  searchClinicalTrials,
  getAdverseEvents,
  getDrugLabel,
};

const tools: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "searchClinicalTrials",
      description:
        "Search ClinicalTrials.gov for studies matching a query. Can filter by condition, drug, phase, and patient age group.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search terms, e.g. drug names, conditions" },
          ageGroup: { type: "string", description: "e.g. 'elderly', 'adult', 'child'" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getAdverseEvents",
      description:
        "Query FDA adverse event reports (FAERS) for a specific drug. Returns total report count and most common reactions.",
      parameters: {
        type: "object",
        properties: {
          drugName: { type: "string", description: "Drug name to search adverse events for" },
          reaction: { type: "string", description: "Optional: filter by specific reaction type" },
        },
        required: ["drugName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getDrugLabel",
      description:
        "Get FDA drug label including contraindications, warnings, drug interactions, and geriatric use guidance.",
      parameters: {
        type: "object",
        properties: {
          drugName: { type: "string", description: "Drug name to get label for" },
        },
        required: ["drugName"],
      },
    },
  },
];

const question =
  "Are there any safety concerns combining Metformin and Lisinopril for a 70-year-old diabetic patient with kidney disease?";

const run = async () => {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `You are a clinical research analyst. Use the available tools to research questions thoroughly before answering.
Do not guess — look up the data. Use multiple tools to cross-reference findings.
When you have enough data, provide a final answer with specific numbers and trial IDs.`,
    },
    { role: "user", content: question },
  ];

  const toolCallLog: string[] = [];
  const MAX_STEPS = 10;

  for (let step = 1; step <= MAX_STEPS; step++) {
    console.log(`\n--- Step ${step} ---`);

    const response = await client.chat.completions.create({
      model: "",
      messages,
      tools,
      temperature: 0.2,
    });

    const message = response.choices[0].message;

    if (message.tool_calls && message.tool_calls.length > 0) {
      console.log("Tool calls:");
      messages.push(message);

      for (const tc of message.tool_calls) {
        const args = JSON.parse(tc.function.arguments);
        const logEntry = `${tc.function.name}(${JSON.stringify(args)})`;
        console.log(`  → ${logEntry}`);
        toolCallLog.push(logEntry);

        const result = await realTools[tc.function.name]?.(args) ?? '{"error": "Unknown tool"}';
        console.log(`  ← ${result.slice(0, 150)}...`);

        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: result,
        });
      }
    } else {
      console.log("\n=== FINAL AGENT ANSWER ===\n");
      console.log(message.content);
      printQa(runQa(message.content ?? "", toolCallLog));
      break;
    }

    if (step === MAX_STEPS) {
      console.log("\n(Reached max steps, stopping)");
      printQa(runQa("", toolCallLog));
    }
  }
};

run();
