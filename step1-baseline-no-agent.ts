// baseline.ts
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "http://localhost:8000/v1",
  apiKey: "not-needed",
});

const question =
  "Are there any safety concerns combining Metformin and Lisinopril for a 70-year-old diabetic patient with kidney disease?";

const run = async () => {
  const response = await client.chat.completions.create({
    model: "Qwen/Qwen2.5-7B-Instruct",
    messages: [
      {
        role: "system",
        content: "You are a clinical research analyst. Be specific and cite data when possible.",
      },
      { role: "user", content: question },
    ],
    temperature: 0.2,
  });

  console.log("=== SINGLE LLM CALL (no tools) ===\n");
  console.log(response.choices[0].message.content);
};

run();
