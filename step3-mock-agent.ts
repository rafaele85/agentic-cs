// increment3-agent.ts
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "http://localhost:8000/v1",
  apiKey: "not-needed",
});

// === MOCK TOOLS ===

const mockTools: Record<string, (args: Record<string, string>) => string> = {
  searchClinicalTrials: ({ query, ageGroup }) => JSON.stringify({
    totalFound: 3,
    trials: [
      {
        nctId: "NCT04032197",
        title: "Metformin and ACE Inhibitors in Elderly Diabetic Patients with CKD",
        phase: "Phase 3",
        status: "Completed",
        enrollment: 420,
        summary: "Evaluated renal outcomes in patients 65+ on combined metformin and ACE inhibitor therapy.",
      },
      {
        nctId: "NCT03891225",
        title: "Renal Safety of Metformin in CKD Stages 3-4",
        phase: "Phase 4",
        status: "Completed",
        enrollment: 780,
        summary: "Post-marketing study on metformin safety in moderate-to-severe kidney disease.",
      },
      {
        nctId: "NCT05217890",
        title: "Lactic Acidosis Risk Factors in Elderly Metformin Users",
        phase: "Phase 4",
        status: "Terminated",
        enrollment: 156,
        terminationReason: "Higher than expected rate of lactic acidosis events in the eGFR <30 subgroup.",
      },
    ],
  }),

  getAdverseEvents: ({ drugName, reaction }) => {
    const data: Record<string, object> = {
      Metformin: {
        totalReports: 84721,
        topReactions: [
          { reaction: "Lactic acidosis", count: 4231, percentOfTotal: "5.0%" },
          { reaction: "Diarrhoea", count: 12890, percentOfTotal: "15.2%" },
          { reaction: "Nausea", count: 9450, percentOfTotal: "11.2%" },
          { reaction: "Renal impairment", count: 3102, percentOfTotal: "3.7%" },
          { reaction: "Hypoglycaemia", count: 2870, percentOfTotal: "3.4%" },
        ],
        renalSubgroup: {
          reportsWithRenalImpairment: 8920,
          lacticAcidosisInRenalGroup: 2847,
          percentLacticAcidosisInRenalGroup: "31.9%",
        },
      },
      Lisinopril: {
        totalReports: 52340,
        topReactions: [
          { reaction: "Cough", count: 8920, percentOfTotal: "17.0%" },
          { reaction: "Hyperkalaemia", count: 4102, percentOfTotal: "7.8%" },
          { reaction: "Renal failure acute", count: 3450, percentOfTotal: "6.6%" },
          { reaction: "Hypotension", count: 2980, percentOfTotal: "5.7%" },
          { reaction: "Dizziness", count: 2340, percentOfTotal: "4.5%" },
        ],
      },
    };
    return JSON.stringify(data[drugName] ?? { error: "Drug not found" });
  },

  getDrugLabel: ({ drugName }) => {
    const labels: Record<string, object> = {
      Metformin: {
        contraindications: [
          "eGFR below 30 mL/min/1.73m²",
          "Acute or chronic metabolic acidosis including diabetic ketoacidosis",
        ],
        warnings: [
          "Lactic acidosis: risk increases with degree of renal impairment and patient age",
          "Assess renal function before initiation and periodically thereafter",
          "Discontinue at time of or prior to iodinated contrast imaging if eGFR 30-60",
        ],
        geriatricUse: "Elderly patients are more likely to have decreased renal function. Dose selection should be cautious. Monitor renal function more frequently.",
        renalDosing: "eGFR 30-45: not recommended to initiate. eGFR <30: contraindicated.",
      },
      Lisinopril: {
        contraindications: [
          "History of angioedema related to previous ACE inhibitor treatment",
          "Concomitant use with aliskiren in patients with diabetes",
        ],
        warnings: [
          "Can cause hyperkalemia, especially with renal impairment",
          "May cause acute renal failure in patients with bilateral renal artery stenosis",
          "Monitor renal function and potassium in elderly patients",
        ],
        drugInteractions: [
          "NSAIDs: may reduce antihypertensive effect and worsen renal function",
          "Potassium supplements: increased risk of hyperkalemia",
          "Metformin: no direct interaction, but combined renal effects warrant monitoring",
        ],
        geriatricUse: "Greater sensitivity of older individuals cannot be ruled out. Adjust dose based on renal function.",
      },
    };
    return JSON.stringify(labels[drugName] ?? { error: "Drug not found" });
  },
};

// === TOOL DEFINITIONS ===

const tools: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "searchClinicalTrials",
      description: "Search ClinicalTrials.gov for studies matching a query. Can filter by condition, drug, phase, and patient age group.",
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
      description: "Query FDA adverse event reports (FAERS) for a specific drug. Returns count of reports and most common reactions.",
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
      description: "Get FDA drug label information including contraindications, warnings, drug interactions, and use in specific populations.",
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

// === AGENT LOOP ===

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

  const MAX_STEPS = 10;

  for (let step = 1; step <= MAX_STEPS; step++) {
    console.log(`\n--- Step ${step} ---`);

    const response = await client.chat.completions.create({
      model: "Qwen/Qwen2.5-7B-Instruct",
      messages,
      tools,
      temperature: 0.2,
    });

    const message = response.choices[0].message;

    // If model wants to call tools
    if (message.tool_calls && message.tool_calls.length > 0) {
      console.log("Tool calls:");
      // Add assistant message with tool calls to history
      messages.push(message);

      for (const tc of message.tool_calls) {
        const args = JSON.parse(tc.function.arguments);
        console.log(`  → ${tc.function.name}(${JSON.stringify(args)})`);

        const result = mockTools[tc.function.name]?.(args) ?? '{"error": "Unknown tool"}';
        console.log(`  ← ${result.slice(0, 120)}...`);

        // Add tool result to history
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: result,
        });
      }
    } else {
      // Model is done — final answer
      console.log("\n=== FINAL AGENT ANSWER ===\n");
      console.log(message.content);
      break;
    }

    if (step === MAX_STEPS) {
      console.log("\n(Reached max steps, stopping)");
    }
  }
};

run();
