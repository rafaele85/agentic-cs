// increment2-tools.ts
import OpenAI from "openai";

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
        "Query FDA adverse event reports (FAERS) for a specific drug. Returns count of reports and most common reactions.",
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
        "Get FDA drug label information including contraindications, warnings, drug interactions, and use in specific populations.",
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
  const response = await client.chat.completions.create({
    model: "Qwen/Qwen2.5-7B-Instruct",
    messages: [
      {
        role: "system",
        content: "You are a clinical research analyst. Use the available tools to research questions thoroughly before answering. Do not guess — look up the data.",
      },
      { role: "user", content: question },
    ],
    tools,
    temperature: 0.2,
  });

  const message = response.choices[0].message;

  console.log("=== LLM RESPONSE WITH TOOLS AVAILABLE ===\n");

  if (message.tool_calls && message.tool_calls.length > 0) {
    console.log("Model wants to call these tools:\n");
    for (const tc of message.tool_calls) {
      console.log(`  → ${tc.function.name}(${tc.function.arguments})`);
    }
    console.log("\n(We're not executing them yet — just observing the model's decision)");
  } else {
    console.log("Model answered directly without tools:\n");
    console.log(message.content);
  }
};

const client = new OpenAI({
  baseURL: "http://localhost:8000/v1",
  apiKey: "not-needed",
});

run();
