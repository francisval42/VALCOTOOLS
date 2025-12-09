import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

const BLOCKED_PATTERNS = [
  /delete|remove|omit/i,
  /unsuitable|not suitable/i,
  /hardship|stress|financial distress/i,
  /shorten|reduce|condense/i,
  /weaken|soften|dilute/i,
];

function containsBlockedPattern(instruction: string): boolean {
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(instruction));
}

async function callAnthropic(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${error}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post("/api/ai/compliance-wash", async (req, res) => {
    try {
      const { note } = req.body;

      if (!note || typeof note !== "string") {
        return res.status(400).json({ error: "Note is required" });
      }

      const systemPrompt = `You are an Australian mortgage and finance compliance expert. Your task is to review and refine broker notes to ensure they meet responsible lending obligations under the National Consumer Credit Protection Act 2009.

Rules:
1. NEVER delete or remove any section headings (text in square brackets like [Client Objectives])
2. NEVER weaken or remove responsible lending language
3. NEVER shorten the note significantly
4. Preserve all factual content and figures
5. Improve clarity and professional tone
6. Use formal Australian English
7. Ensure proper grammar and spelling
8. Keep all compliance-critical statements intact

Return ONLY the refined note text, with no additional commentary.`;

      const result = await callAnthropic(systemPrompt, `Please review and refine this broker note for compliance:\n\n${note}`);
      res.json({ note: result });
    } catch (error: any) {
      console.error("Compliance wash error:", error);
      res.status(500).json({ error: error.message || "Failed to process compliance wash" });
    }
  });

  app.post("/api/ai/edit", async (req, res) => {
    try {
      const { note, instruction } = req.body;

      if (!note || typeof note !== "string") {
        return res.status(400).json({ error: "Note is required" });
      }

      if (!instruction || typeof instruction !== "string") {
        return res.status(400).json({ error: "Instruction is required" });
      }

      if (containsBlockedPattern(instruction)) {
        return res.status(400).json({
          error: "This instruction cannot be processed as it may weaken compliance language or remove critical sections.",
        });
      }

      const systemPrompt = `You are an Australian mortgage and finance compliance expert. Your task is to edit broker notes based on user instructions while maintaining compliance with responsible lending obligations.

CRITICAL RULES:
1. NEVER delete any section headings (text in square brackets like [Client Objectives])
2. NEVER remove or weaken responsible lending language
3. NEVER remove factual content unless replacing with equivalent or better content
4. Maintain formal Australian English
5. Preserve all compliance-critical statements
6. Keep the same overall structure and sections

Apply the user's instruction while following these rules. Return ONLY the edited note text.`;

      const result = await callAnthropic(systemPrompt, `Instruction: ${instruction}\n\nNote to edit:\n\n${note}`);
      res.json({ note: result });
    } catch (error: any) {
      console.error("AI edit error:", error);
      res.status(500).json({ error: error.message || "Failed to process AI edit" });
    }
  });

  return httpServer;
}
