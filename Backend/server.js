const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");

loadEnvFile();

const PORT = Number(process.env.PORT || 4000);
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
const APP_ORIGIN = process.env.APP_ORIGIN || "http://localhost:3000";
const APP_NAME = process.env.APP_NAME || "Multi-LLM Response Summarization";
const SUMMARY_MODEL =
  process.env.SUMMARY_MODEL || "openrouter/free";

const MODEL_RULES = [
  {
    id: "stepfun",
    name: "Step 3.5 Flash",
    matchIds: ["stepfun/step-3.5-flash:free"],
    matchName: "Step 3.5 Flash",
    accent: "#76f2c5",
    strength: "Fast long-context reasoning",
  },
  {
    id: "qwen-coder",
    name: "Qwen3 Coder 480B A35B",
    matchIds: ["qwen/qwen3-coder:free"],
    matchName: "Qwen3 Coder 480B A35B",
    accent: "#ffb171",
    strength: "Coding and repository reasoning",
  },
  {
    id: "qwen-next",
    name: "Qwen3 Next 80B A3B Instruct",
    matchIds: ["qwen/qwen3-next-80b-a3b-instruct:free", "qwen/qwen3-next-80b-a3b-instruct"],
    matchName: "Qwen3 Next 80B A3B Instruct",
    accent: "#f093fb",
    strength: "Stable fast instruction following",
  },
  {
    id: "gpt-oss-20b",
    name: "gpt-oss-20b",
    matchIds: ["openai/gpt-oss-20b:free"],
    matchName: "gpt-oss-20b",
    accent: "#92a9ff",
    strength: "Balanced open-weight reasoning",
  },
  {
    id: "liquid-thinking",
    name: "LFM2.5-1.2B-Thinking",
    matchIds: ["liquid/lfm-2.5-1.2b-thinking:free"],
    matchName: "LFM2.5-1.2B-Thinking",
    accent: "#d4a5ff",
    strength: "Lightweight reasoning",
  },
  {
    id: "gemma-27b",
    name: "Gemma 3 27B",
    matchIds: ["google/gemma-3-27b-it:free"],
    matchName: "Gemma 3 27B",
    accent: "#9ee06f",
    strength: "Strong general-purpose open model",
  },
  {
    id: "trinity-large",
    name: "Trinity Large Preview",
    matchIds: ["arcee-ai/trinity-large-preview:free"],
    matchName: "Trinity Large Preview",
    accent: "#ff8fb1",
    strength: "Long-context structured answers",
  },
  {
    id: "glm-air",
    name: "GLM 4.5 Air",
    matchIds: ["z-ai/glm-4.5-air:free"],
    matchName: "GLM 4.5 Air",
    accent: "#73d5ff",
    strength: "Agentic reasoning and fast interaction",
  },
  {
    id: "nemotron-30b",
    name: "Nemotron 3 Nano 30B A3B",
    matchIds: ["nvidia/nemotron-3-nano-30b-a3b:free"],
    matchName: "Nemotron 3 Nano 30B A3B",
    accent: "#73d5ff",
    strength: "Programming-oriented accuracy",
  },
  {
    id: "trinity-mini",
    name: "Trinity Mini",
    matchIds: ["arcee-ai/trinity-mini:free"],
    matchName: "Trinity Mini",
    accent: "#7cf7d4",
    strength: "Compact long-context reasoning",
  },
  {
    id: "nemotron-9b",
    name: "Nemotron Nano 9B V2",
    matchIds: ["nvidia/nemotron-nano-9b-v2:free"],
    matchName: "Nemotron Nano 9B V2",
    accent: "#6ff0d0",
    strength: "Efficient general reasoning",
  },
  {
    id: "nemotron-vl",
    name: "Nemotron Nano 12B 2 VL",
    matchIds: ["nvidia/nemotron-nano-12b-v2-vl:free"],
    matchName: "Nemotron Nano 12B 2 VL",
    accent: "#c5ff7a",
    strength: "Document and multimodal-style reasoning",
  },
  {
    id: "gpt-oss-120b",
    name: "gpt-oss-120b",
    matchIds: ["openai/gpt-oss-120b:free"],
    matchName: "gpt-oss-120b",
    accent: "#f4a261",
    strength: "Open-weight high-reasoning responses",
  },
  {
    id: "liquid-instruct",
    name: "LFM2.5 1.2B Instruct",
    matchIds: ["liquid/lfm-2.5-1.2b-instruct:free"],
    matchName: "LFM2.5-1.2B-Instruct",
    accent: "#b18fff",
    strength: "Small fast instruct model",
  },
  {
    id: "mistral-small",
    name: "Mistral Small 3.1 24B",
    matchIds: [
      "mistralai/mistral-small-3.1-24b-instruct:free",
      "mistralai/mistral-small-3.1-24b-instruct-2503:free"
    ],
    matchName: "Mistral Small 3.1 24B",
    accent: "#ffc46b",
    strength: "Strong compact general-purpose model",
  },
  {
    id: "venice-uncensored",
    name: "Venice Uncensored",
    matchIds: ["venice/uncensored:free"],
    matchName: "Venice: Uncensored",
    accent: "#ff9f9f",
    strength: "Loose-style uncensored chat output",
  },
  {
    id: "qwen-4b",
    name: "Qwen3 4B",
    matchIds: ["qwen/qwen3-4b:free"],
    matchName: "Qwen3 4B",
    accent: "#7dd3fc",
    strength: "Compact general-purpose model",
  },
  {
    id: "hermes-405b",
    name: "Hermes 3 405B Instruct",
    matchIds: ["nousresearch/hermes-3-405b-instruct:free"],
    matchName: "Hermes 3 405B Instruct",
    accent: "#fca5a5",
    strength: "Large instruct model",
  },
  {
    id: "gemma-4b",
    name: "Gemma 3 4B",
    matchIds: ["google/gemma-3-4b-it:free"],
    matchName: "Gemma 3 4B",
    accent: "#86efac",
    strength: "Small general-purpose Gemma",
  },
  {
    id: "gemma-12b",
    name: "Gemma 3 12B",
    matchIds: ["google/gemma-3-12b-it:free"],
    matchName: "Gemma 3 12B",
    accent: "#4ade80",
    strength: "Mid-size general-purpose Gemma",
  },
  {
    id: "gemma-3n-4b",
    name: "Gemma 3n 4B",
    matchIds: ["google/gemma-3n-e4b-it:free", "google/gemma-3n-4b:free"],
    matchName: "Gemma 3n 4B",
    accent: "#34d399",
    strength: "Compact multimodal-ready Gemma",
  },
  {
    id: "gemma-3n-2b",
    name: "Gemma 3n 2B",
    matchIds: ["google/gemma-3n-e2b-it:free", "google/gemma-3n-2b:free"],
    matchName: "Gemma 3n 2B",
    accent: "#22c55e",
    strength: "Minimal footprint Gemma",
  },
  {
    id: "llama",
    name: "Llama 3.3 70B Instruct",
    matchIds: ["meta-llama/llama-3.3-70b-instruct:free"],
    matchName: "Llama 3.3 70B Instruct",
    accent: "#f7c66b",
    strength: "Strong instruction following",
  },
];

let modelCatalogCache = {
  expiresAt: 0,
  data: null,
};

function loadEnvFile() {
  [".env", ".env.example"].forEach((fileName) => {
    const envPath = path.join(__dirname, fileName);
    if (!fs.existsSync(envPath)) {
      return;
    }

    const content = fs.readFileSync(envPath, "utf8");
    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        return;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) {
        return;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed
        .slice(separatorIndex + 1)
        .trim()
        .replace(/^['"]|['"]$/g, "");
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    });
  });
}

function sendJson(res, statusCode, payload) {
  if (res.headersSent) {
    if (!res.writableEnded) {
      res.end(JSON.stringify(payload));
    }
    return;
  }

  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  res.end(JSON.stringify(payload));
}

function sendEvent(res, payload) {
  if (res.writableEnded) {
    return;
  }
  res.write(`${JSON.stringify(payload)}\n`);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchOpenRouterModels() {
  const response = await fetch(`${OPENROUTER_BASE_URL}/models`, {
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": APP_ORIGIN,
      "X-Title": APP_NAME,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to load OpenRouter model catalog: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  return Array.isArray(payload.data) ? payload.data : [];
}

function isFreeOpenRouterModel(model) {
  const prompt = Number(model?.pricing?.prompt || 0);
  const completion = Number(model?.pricing?.completion || 0);
  return prompt === 0 && completion === 0;
}

function matchesRule(model, rule) {
  const id = String(model.id || "").toLowerCase();
  const name = String(model.name || "").toLowerCase();
  const idMatch = (rule.matchIds || []).some((candidate) => id === candidate.toLowerCase());
  const nameMatch = name.includes(String(rule.matchName || "").toLowerCase());
  return idMatch || nameMatch;
}

function toPublicModel(rule, match) {
  return {
    id: rule.id,
    slug: match?.id || "",
    name: rule.name,
    provider: "OpenRouter Free",
    providerType: "openrouter",
    accent: rule.accent,
    strength: rule.strength,
    requiredKey: "OPENROUTER_API_KEY",
    context: match?.context_length || null,
    available: Boolean(OPENROUTER_API_KEY) && Boolean(match?.id),
  };
}

async function getConfiguredModels(forceRefresh = false) {
  if (!OPENROUTER_API_KEY) {
    return MODEL_RULES.map((rule) => toPublicModel(rule, null));
  }

  const now = Date.now();
  if (!forceRefresh && modelCatalogCache.data && modelCatalogCache.expiresAt > now) {
    return modelCatalogCache.data;
  }

  const upstreamModels = await fetchOpenRouterModels();
  const freeModels = upstreamModels.filter(isFreeOpenRouterModel);
  const resolved = MODEL_RULES.map((rule) => {
    const match = freeModels.find((model) => matchesRule(model, rule)) || null;
    return toPublicModel(rule, match);
  });

  modelCatalogCache = {
    expiresAt: now + 5 * 60 * 1000,
    data: resolved,
  };

  return resolved;
}

function isModelAvailable(model) {
  return Boolean(OPENROUTER_API_KEY) && Boolean(model?.slug);
}

function createSingleAnswerInstruction(prompt, model) {
  return [
    `Answer the user's question directly.`,
    `Prefer accuracy over style.`,
    `If you are uncertain, say so briefly instead of inventing details.`,
    `Keep the answer under 180 words.`,
    `Your specialty: ${model.strength}.`,
    `User question: ${prompt}`,
  ].join("\n");
}

function createSynthesisInstruction(prompt, outputs) {
  const outputsText = outputs
    .map(
      (item) =>
        `[${item.id}] ${item.name}\nProvider: ${item.provider}\nStrength: ${item.strength}\nAnswer:\n${item.response}`
    )
    .join("\n\n");

  return [
    "Synthesize the candidate answers into one strong final response.",
    "Primary goal: answer the user's question directly and clearly.",
    "Use the best parts across models, remove repetition, and avoid unsupported claims.",
    "Return exactly in this format:",
    "FINAL_OUTPUT:",
    "<2 short paragraphs maximum that directly answer the user's question>",
    "KEY_POINTS:",
    "- <point 1>",
    "- <point 2>",
    "- <point 3>",
    "BEST_MODEL_ID: <model id>",
    "BEST_REASON: <one sentence explaining why that model contributed the strongest base answer>",
    "",
    `User question:\n${prompt}`,
    "",
    `Candidate answers:\n${outputsText}`,
  ].join("\n");
}

function parseSynthesis(text) {
  const cleaned = String(text || "").trim();
  const finalOutputMatch = cleaned.match(/FINAL_OUTPUT:\s*([\s\S]*?)\nKEY_POINTS:/i);
  const keyPointsMatch = cleaned.match(/KEY_POINTS:\s*([\s\S]*?)\nBEST_MODEL_ID:/i);
  const bestModelMatch = cleaned.match(/BEST_MODEL_ID:\s*(.+)/i);
  const bestReasonMatch = cleaned.match(/BEST_REASON:\s*(.+)/i);
  const keyPoints = keyPointsMatch
    ? keyPointsMatch[1]
        .split("\n")
        .map((line) => line.trim().replace(/^-+\s*/, ""))
        .filter(Boolean)
    : [];

  return {
    finalOutput: finalOutputMatch ? finalOutputMatch[1].trim() : cleaned,
    keyPoints,
    bestModelId: bestModelMatch ? bestModelMatch[1].trim() : "",
    bestReason: bestReasonMatch ? bestReasonMatch[1].trim() : "",
  };
}

async function callOpenRouterStream(modelSlug, prompt, model, onDelta) {
  let response;
  let lastErrorText = "";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": APP_ORIGIN,
        "X-Title": APP_NAME,
      },
      body: JSON.stringify({
        model: modelSlug,
        stream: true,
        temperature: 0.3,
        max_tokens: 320,
        messages: [
          {
            role: "user",
            content: createSingleAnswerInstruction(prompt, model),
          },
        ],
      }),
    });

    if (response.ok && response.body) {
      break;
    }

    lastErrorText = await response.text();
    if (response.status === 429 || response.status >= 500) {
      if (attempt < 2) {
        await sleep(1200 * (attempt + 1));
        continue;
      }
    }
    throw new Error(`OpenRouter request failed: ${response.status} ${lastErrorText}`);
  }

  if (!response.ok || !response.body) {
    throw new Error(`OpenRouter request failed: ${response.status} ${lastErrorText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";
  let resolvedModel = modelSlug;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const event of events) {
      const lines = event.split("\n").filter((line) => line.startsWith("data: "));
      for (const line of lines) {
        const data = line.slice(6).trim();
        if (!data || data === "[DONE]") {
          continue;
        }

        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content || "";
        if (parsed.model) {
          resolvedModel = parsed.model;
        }
        if (delta) {
          fullText += delta;
          onDelta(fullText, delta, resolvedModel);
        }
      }
    }
  }

  return {
    text: fullText.trim(),
    resolvedModel,
  };
}

async function callOpenRouterOnce(modelSlug, prompt, temperature = 0.2) {
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": APP_ORIGIN,
      "X-Title": APP_NAME,
    },
    body: JSON.stringify({
      model: modelSlug,
      temperature,
      max_tokens: 420,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter request failed: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  return {
    text: payload.choices?.[0]?.message?.content?.trim() || "",
    resolvedModel: payload.model || modelSlug,
  };
}

async function runModel(prompt, model, onDelta) {
  return callOpenRouterStream(model.slug, prompt, model, onDelta);
}

async function streamSummarization(res, prompt, selectedModels) {
  sendEvent(res, {
    type: "session.started",
    prompt,
    models: selectedModels,
  });

  const completedOutputs = [];

  for (const model of selectedModels) {
    sendEvent(res, {
      type: "model.started",
      modelId: model.id,
      model,
    });

    let chunkCount = 0;
    try {
      const result = await runModel(prompt, model, (partial, delta, resolvedModel) => {
        chunkCount += 1;
        sendEvent(res, {
          type: "model.chunk",
          modelId: model.id,
          partial,
          delta,
          chunkCount,
          resolvedModel,
        });
      });

      const completed = {
        ...model,
        response: result.text,
        resolvedModel: result.resolvedModel,
      };
      completedOutputs.push(completed);

      sendEvent(res, {
        type: "model.completed",
        modelId: model.id,
        response: result.text,
        resolvedModel: result.resolvedModel,
      });
    } catch (error) {
      sendEvent(res, {
        type: "model.error",
        modelId: model.id,
        error: error.message,
      });
    }
  }

  if (!completedOutputs.length) {
    sendEvent(res, {
      type: "session.error",
      error: "No model returned a successful response.",
      detail: "All selected model requests failed. Check your OpenRouter availability or try fewer models.",
    });
    res.end();
    return;
  }

  sendEvent(res, {
    type: "summary.started",
    sourceModel: SUMMARY_MODEL,
  });

  const synthesis = await callOpenRouterOnce(
    SUMMARY_MODEL,
    createSynthesisInstruction(prompt, completedOutputs)
  );
  const parsed = parseSynthesis(synthesis.text);

  sendEvent(res, {
    type: "summary.completed",
    summary: parsed.finalOutput,
    keyPoints: parsed.keyPoints,
    synthesisModel: synthesis.resolvedModel,
    bestModelId: parsed.bestModelId,
    bestReason: parsed.bestReason,
    outputs: completedOutputs.map((item) => ({
      modelId: item.id,
      name: item.name,
      resolvedModel: item.resolvedModel,
    })),
  });

  sendEvent(res, {
    type: "session.completed",
  });
  res.end();
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    });
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/health") {
    try {
      const models = await getConfiguredModels();
      sendJson(res, 200, {
        ok: true,
        providers: {
          openrouter: Boolean(OPENROUTER_API_KEY),
        },
        models,
      });
    } catch (error) {
      sendJson(res, 500, {
        ok: false,
        error: error.message,
      });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/models") {
    try {
      const models = await getConfiguredModels();
      sendJson(res, 200, {
        providers: {
          openrouter: Boolean(OPENROUTER_API_KEY),
        },
        summaryModel: SUMMARY_MODEL,
        models,
      });
    } catch (error) {
      sendJson(res, 500, {
        error: error.message,
      });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/summarize") {
    try {
      const body = await parseBody(req);
      const prompt = normalizeText(body.prompt);
      const configuredModels = await getConfiguredModels();
      const selectedIds = Array.isArray(body.models) && body.models.length
        ? new Set(body.models)
        : new Set(configuredModels.map((model) => model.id));
      const selectedModels = configuredModels.filter((model) => selectedIds.has(model.id));

      if (!prompt) {
        sendJson(res, 400, { error: "A prompt is required." });
        return;
      }

      const unavailable = selectedModels.filter((model) => !isModelAvailable(model));
      if (unavailable.length) {
        sendJson(res, 503, {
          error: `Missing credentials for: ${unavailable
            .map((model) => `${model.name} (${model.requiredKey})`)
            .join(", ")}`,
        });
        return;
      }

      if (!selectedModels.length) {
        sendJson(res, 400, { error: "Select at least one model." });
        return;
      }

      res.writeHead(200, {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      });

      await streamSummarization(res, prompt, selectedModels);
      return;
    } catch (error) {
      if (res.headersSent) {
        sendEvent(res, {
          type: "session.error",
          error: "Failed to complete summarization request.",
          detail: error.message,
        });
        if (!res.writableEnded) {
          res.end();
        }
      } else {
        sendJson(res, 500, {
          error: "Failed to complete summarization request.",
          detail: error.message,
        });
      }
      return;
    }
  }

  sendJson(res, 404, { error: "Not found." });
});

server.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
