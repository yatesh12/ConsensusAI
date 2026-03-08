import { startTransition, useEffect, useMemo, useRef, useState } from "react";

const API_BASE = process.env.REACT_APP_API_URL || "";

const STARTER_PROMPTS = [
  "How can AI help students learn better?",
  "What are the risks of using AI in healthcare?",
  "Why is cybersecurity important in banking?",
  "How does AI improve ecommerce customer service?",
  "What role can AI play in climate change solutions?",
];

function createOutputState() {
  return {
    activeModelId: null,
    running: false,
    summaryLoading: false,
    outputs: {},
    summary: "",
    keyPoints: [],
    synthesisModel: "",
    bestModelId: "",
    bestReason: "",
  };
}

function classNames(...parts) {
  return parts.filter(Boolean).join(" ");
}

function formatContext(value) {
  if (!value) {
    return "Context unavailable";
  }

  return `${new Intl.NumberFormat().format(value)} ctx`;
}

function formatParagraphs(text) {
  return String(text || "")
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

async function readErrorMessage(response, fallbackMessage) {
  const text = await response.text();
  if (!text) {
    return fallbackMessage;
  }

  try {
    const parsed = JSON.parse(text);
    return parsed.error || parsed.detail || fallbackMessage;
  } catch {
    return text;
  }
}

function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-col gap-4 border-b border-gray-700 px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-50">{title}</h2>
        {description ? (
          <p className="mt-3 text-sm leading-7 text-slate-400">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function LoadingLines({ count = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={classNames(
            "h-3 animate-pulse rounded-full bg-slate-800/90",
            index === count - 1 ? "w-2/3" : "w-full"
          )}
        />
      ))}
    </div>
  );
}

function StatCard({ label, value, tone = "default" }) {
  const toneClasses = {
    default: "border-white/8 bg-slate-950/40 text-slate-100",
    mint: "border-mint/20 bg-mint/10 text-mint",
    sky: "border-sky/20 bg-sky/10 text-sky",
    amber: "border-amber/20 bg-amber/10 text-amber",
  };

  return (
    <div className={classNames("rounded-2xl border px-4 py-4", toneClasses[tone])}>
      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function ModelSelectionCard({ model, selected, onToggle }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(model.id)}
      disabled={!model.available}
      className={classNames(
        "group relative overflow-hidden rounded-2xl border p-4 text-left transition duration-200",
        "focus:outline-none focus:ring-2 focus:ring-mint/40",
        selected
          ? "border-mint/35 bg-slate-900/80 shadow-[0_14px_30px_rgba(4,18,32,0.42)]"
          : "border-white/8 bg-slate-950/35 hover:border-white/15 hover:bg-slate-900/70",
        !model.available && "cursor-not-allowed opacity-45"
      )}
    >
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{
          background: `linear-gradient(90deg, ${model.accent || "#7cf2cc"}, transparent)`,
        }}
      />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-100">{model.name}</p>
          <p className="mt-1 text-xs leading-6 text-slate-400">{model.strength}</p>
        </div>

        <span
          className={classNames(
            "inline-flex min-w-[52px] items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
            selected
              ? "bg-mint/15 text-mint"
              : "border border-white/10 bg-slate-900/80 text-slate-500"
          )}
        >
          {selected ? "ON" : "OFF"}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-400">
        <span className="truncate">{formatContext(model.context)}</span>
        <span>{model.available ? "Available" : "Unavailable"}</span>
      </div>
    </button>
  );
}

function ResponseCard({ model, isActive }) {
  const state = model.state || {};
  const status = state.status || "idle";

  return (
    <article
      className={classNames(
        "glass-panel relative overflow-hidden border",
        "flex h-[390px] flex-col",
        isActive && "ring-1 ring-mint/35"
      )}
    >
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{
          background: `linear-gradient(90deg, ${model.accent || "#7cf2cc"}, transparent)`,
        }}
      />

      <div className="flex items-start justify-between gap-4 border-b border-gray-700 px-5 py-4">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{model.provider}</p>
          <h3 className="mt-1 truncate text-lg font-semibold tracking-tight text-slate-100">
            {model.name}
          </h3>
          <p className="mt-2 truncate text-xs text-slate-500">
            {state.resolvedModel || model.slug || "Waiting for live route"}
          </p>
        </div>

        <span
          className={classNames(
            "rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
            status === "running" && "bg-mint/15 text-mint",
            status === "done" && "bg-sky/15 text-sky",
            status === "error" && "bg-rose/15 text-rose-300",
            (status === "idle" || status === "queued") && "bg-slate-900/90 text-slate-400"
          )}
        >
          {status}
        </span>
      </div>

      <div className="flex items-center justify-between border-b border-gray-700 px-5 py-3 text-xs text-slate-500">
        <span>{formatContext(model.context)}</span>
        <span>{isActive ? "Generating now" : "Standby"}</span>
      </div>

      <div className="soft-scroll flex-1 overflow-auto px-5 py-4">
        {status === "running" && !state.text ? (
          <LoadingLines count={7} />
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-200">
            {state.error ||
              state.text ||
              "Run the prompt to populate this card with the selected live model output."}
          </p>
        )}
      </div>
    </article>
  );
}

function SummaryBody({ summary, loading }) {
  const paragraphs = formatParagraphs(summary);

  if (loading && !summary) {
    return <LoadingLines count={8} />;
  }

  if (!paragraphs.length) {
    return (
      <p className="text-sm leading-7 text-slate-400">
        After the selected models finish, the backend will merge their strongest points into one
        clean final answer here.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {paragraphs.map((paragraph) => (
        <p key={paragraph} className="whitespace-pre-wrap text-[15px] leading-8 text-slate-200">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

function App() {
  const [prompt, setPrompt] = useState(STARTER_PROMPTS[0]);
  const [models, setModels] = useState([]);
  const [selectedModels, setSelectedModels] = useState([]);
  const [providers, setProviders] = useState({
    openrouter: false,
  });
  const [error, setError] = useState("");
  const [streamState, setStreamState] = useState(createOutputState);
  const [loadingModels, setLoadingModels] = useState(true);
  const controllerRef = useRef(null);

  const missingKeys = useMemo(() => {
    return [
      ...new Set(models.filter((model) => !model.available).map((model) => model.requiredKey)),
    ];
  }, [models]);

  const availableModels = useMemo(
    () => models.filter((model) => model.available),
    [models]
  );

  const renderedModels = useMemo(
    () =>
      models
        .filter((model) => selectedModels.includes(model.id))
        .map((model) => ({
          ...model,
          state: streamState.outputs[model.id] || {
            status: "idle",
            text: "",
            resolvedModel: "",
            error: "",
          },
        })),
    [models, selectedModels, streamState.outputs]
  );

  const activeModelName = useMemo(() => {
    return (
      models.find((model) => model.id === streamState.activeModelId)?.name ||
      "Waiting for prompt"
    );
  }, [models, streamState.activeModelId]);

  const completedCount = useMemo(
    () => renderedModels.filter((model) => model.state.status === "done").length,
    [renderedModels]
  );

  const failedCount = useMemo(
    () => renderedModels.filter((model) => model.state.status === "error").length,
    [renderedModels]
  );

  useEffect(() => {
    let ignore = false;

    async function loadModels() {
      try {
        const response = await fetch(`${API_BASE}/api/models`);
        if (!response.ok) {
          const errorMessage = await readErrorMessage(response, "Failed to load models.");
          throw new Error(errorMessage);
        }

        const data = await response.json();
        if (!ignore) {
          const nextModels = data.models || [];
          setModels(nextModels);
          setSelectedModels(
            nextModels
              .filter((model) => model.available)
              .slice(0, 6)
              .map((model) => model.id)
          );
          setProviders(data.providers || { openrouter: false });
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError.message);
        }
      } finally {
        if (!ignore) {
          setLoadingModels(false);
        }
      }
    }

    loadModels();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => () => controllerRef.current?.abort(), []);

  function setOutput(modelId, patch) {
    setStreamState((current) => ({
      ...current,
      outputs: {
        ...current.outputs,
        [modelId]: {
          ...(current.outputs[modelId] || {}),
          ...patch,
        },
      },
    }));
  }

  function handleEvent(event) {
    startTransition(() => {
      if (event.type === "session.started") {
        const seededOutputs = {};
        (event.models || []).forEach((model) => {
          seededOutputs[model.id] = {
            status: "queued",
            text: "",
            resolvedModel: "",
            error: "",
          };
        });

        setStreamState({
          activeModelId: null,
          running: true,
          summaryLoading: false,
          outputs: seededOutputs,
          summary: "",
          keyPoints: [],
          synthesisModel: "",
          bestModelId: "",
          bestReason: "",
        });
        return;
      }

      if (event.type === "model.started") {
        setStreamState((current) => ({
          ...current,
          activeModelId: event.modelId,
        }));
        setOutput(event.modelId, { status: "running", text: "", error: "" });
        return;
      }

      if (event.type === "model.chunk") {
        setOutput(event.modelId, {
          status: "running",
          text: event.partial,
          resolvedModel: event.resolvedModel || "",
        });
        return;
      }

      if (event.type === "model.completed") {
        setOutput(event.modelId, {
          status: "done",
          text: event.response,
          resolvedModel: event.resolvedModel || "",
          error: "",
        });
        return;
      }

      if (event.type === "model.error") {
        setOutput(event.modelId, {
          status: "error",
          error: event.error || "Model request failed.",
        });
        return;
      }

      if (event.type === "summary.started") {
        setStreamState((current) => ({
          ...current,
          activeModelId: null,
          summaryLoading: true,
          synthesisModel: event.sourceModel || "",
        }));
        return;
      }

      if (event.type === "summary.completed") {
        setStreamState((current) => ({
          ...current,
          summaryLoading: false,
          summary: event.summary,
          keyPoints: event.keyPoints || [],
          synthesisModel: event.synthesisModel || current.synthesisModel,
          bestModelId: event.bestModelId || "",
          bestReason: event.bestReason || "",
        }));
        return;
      }

      if (event.type === "session.error") {
        setError(event.detail || event.error || "The backend stream failed.");
        setStreamState((current) => ({
          ...current,
          activeModelId: null,
          running: false,
          summaryLoading: false,
        }));
        return;
      }

      if (event.type === "session.completed") {
        setStreamState((current) => ({
          ...current,
          activeModelId: null,
          running: false,
          summaryLoading: false,
        }));
      }
    });
  }

  function toggleModel(modelId) {
    setSelectedModels((current) => {
      if (current.includes(modelId)) {
        return current.filter((id) => id !== modelId);
      }

      return [...current, modelId];
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!prompt.trim()) {
      setError("Enter a question first.");
      return;
    }

    if (loadingModels) {
      setError("Model availability is still loading. Wait a second and try again.");
      return;
    }

    if (!models.length) {
      setError("Could not load models from the backend. Start the backend and refresh the page.");
      return;
    }

    if (selectedModels.length === 0) {
      setError(
        missingKeys.length
          ? `No live models are available yet. Add ${missingKeys.join(
              " and "
            )} in backend/.env, then restart the backend.`
          : "Select at least one model."
      );
      return;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setError("");
    setStreamState(createOutputState());

    try {
      const response = await fetch(`${API_BASE}/api/summarize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          models: selectedModels,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorMessage = await readErrorMessage(
          response,
          "Summarization request failed."
        );
        throw new Error(errorMessage);
      }

      if (!response.body) {
        throw new Error("Streaming response body missing.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        lines.forEach((line) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return;
          }
          handleEvent(JSON.parse(trimmed));
        });
      }

      if (buffer.trim()) {
        handleEvent(JSON.parse(buffer));
      }
    } catch (requestError) {
      if (requestError.name !== "AbortError") {
        setError(requestError.message);
        setStreamState((current) => ({
          ...current,
          running: false,
          summaryLoading: false,
          activeModelId: null,
        }));
      }
    }
  }

  function stopRun() {
    controllerRef.current?.abort();
    setStreamState((current) => ({
      ...current,
      running: false,
      summaryLoading: false,
      activeModelId: null,
    }));
  }

  function selectAllModels() {
    setSelectedModels(availableModels.map((model) => model.id));
  }

  function clearSelectedModels() {
    setSelectedModels([]);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-hero-grid bg-[size:136px_136px] opacity-20" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-black" />
      <div className="pointer-events-none absolute -left-24 top-24 h-80 w-80 rounded-full bg-mint/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-sky/10 blur-3xl" />

      <main className="relative mx-auto flex w-full flex-col gap-6">
    <section
  className="relative w-full overflow-hidden bg-center bg-cover bg-no-repeat mt-16"
  style={{
    backgroundImage:
      "url('https://www.sciencealert.com/images/2023/08/MarsPlanetIllustration-642x260.jpg')",
  }}
  aria-label="Hero: Multi-LLM response summarization"
>
  {/* full-width dark gradient + subtle blur for readability */}
  <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/70 pointer-events-none" />

  {/* preserve the same empty space at top while placing content lower */}
  <div className="relative z-10">
    <div className="mx-auto max-w-7xl px-6">
      {/* top spacer keeps the empty area above content (adjust pt value to match your design) */}
      <div className="pt-36 pb-8">
        {/* centered hero content constrained to a comfortable reading width */}
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-mint">
            Multi-LLM response summarization
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-50 md:text-5xl">
            Compare model outputs and produce one clear answer
          </h1>

          <p className="mt-4 mx-auto max-w-3xl text-sm leading-7 text-slate-200 md:text-base">
            Select models, view their responses side-by-side, and generate a concise final
            summary. The UI streams backend events and highlights which model contributed to the
            final answer.
          </p>

          {/* subtle CTA / quick stats pill row (keeps logic intact but visually lighter) */}
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <div className="rounded-full bg-white/6 px-4 py-2 text-sm text-slate-100">
              <strong className="mr-2">{availableModels.length}</strong>
              Available models
            </div>
            <div className="rounded-full bg-white/6 px-4 py-2 text-sm text-slate-100">
              <strong className="mr-2">{selectedModels.length}</strong>
              Selected models
            </div>
            <div className="rounded-full bg-white/6 px-4 py-2 text-sm text-slate-100">
              <strong className="mr-2">{streamState.running ? activeModelName : "Idle"}</strong>
              Run status
            </div>
          </div>
        </div>
      </div>

      {/* metrics row: visually separated card row with subtle lift */}
      <div className="mb-12 -mt-6">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex justify-center">
              <div className="w-full max-w-sm transform rounded-lg bg-gradient-to-br from-white/6 to-white/3 p-4 shadow-lg backdrop-blur-sm">
                <StatCard label="Available models" value={availableModels.length} tone="mint" />
              </div>
            </div>

            <div className="flex justify-center">
              <div className="w-full max-w-sm transform rounded-lg bg-gradient-to-br from-white/6 to-white/3 p-4 shadow-lg backdrop-blur-sm">
                <StatCard label="Selected models" value={selectedModels.length} tone="sky" />
              </div>
            </div>

            <div className="flex justify-center">
              <div className="w-full max-w-sm transform rounded-lg bg-gradient-to-br from-white/6 to-white/3 p-4 shadow-lg backdrop-blur-sm">
                <StatCard
                  label="Run status"
                  value={streamState.running ? activeModelName : "Idle"}
                  tone="amber"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
<div className="mx-auto max-w-[1500px] px-6 py-12">

 <section className="overflow-hidden">
  <div className="mx-auto max-w-7xl px-6 py-8 mb-12">
    <SectionHeading
      eyebrow="Searchbar"
      title="Ask one question and generate live responses"
      description="Use one prompt across the selected models. The active model and summary stage are tracked in real time."
      action={
        <div className="rounded-2xl border border-gray-700 bg-slate-950/40 px-4 py-3">
          <div className="flex items-center gap-3">
            <span
              className={classNames(
                "inline-flex h-3 w-3 rounded-full",
                streamState.running
                  ? "animate-pulseSoft bg-mint shadow-[0_0_14px_rgba(124,242,204,0.65)]"
                  : streamState.summaryLoading
                  ? "animate-pulseSoft bg-amber"
                  : "bg-slate-600"
              )}
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-medium text-slate-100">
                {streamState.summaryLoading ? "Building final summary" : activeModelName}
              </p>
              <p className="text-xs text-slate-500">
                {streamState.running
                  ? "Currently generating"
                  : streamState.summaryLoading
                  ? "Merging successful outputs"
                  : "Ready"}
              </p>
            </div>
          </div>
        </div>
      }
    />

    <div className="mt-6 space-y-6 p-6">
      {/* Search area: input with icon and right-side icon buttons inside the label */}
    <div className="w-full max-w-3xl mx-auto">
  <form onSubmit={handleSubmit} className="grid gap-3">
    {/* Row: input (left) + button group (right) */}
    <div className="grid grid-cols-[1fr_auto] items-center gap-3">
      {/* Input block */}
  <section className="w-full">
  <div className="mx-auto max-w-3xl px-4">
    {/* Search wrapper */}
    <form onSubmit={handleSubmit} className="w-full">
      <label className="relative block w-full bg-slate-900/50 border border-gray-800 rounded-2xl p-0">
        {/* Eyebrow (small label above input) */}
        <span className="absolute left-5 -top-2 inline-block rounded px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 bg-slate-900/60">
          Question
        </span>

        {/* Left icon */}
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>

        {/* Input: symmetric vertical padding for true vertical centering */}
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder='Ask AI — e.g., "Summarize this article in 3 bullets"'
          aria-label="Ask AI"
          className="h-14 w-full rounded-2xl border border-transparent bg-transparent px-5 pl-12 py-4 text-sm text-slate-100 outline-none transition focus:border-mint/40 focus:ring-2 focus:ring-mint/20"
        />

        {/* Right-side icon buttons inside the label (vertically centered) */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {/* Generate primary */}
          <button
            type="submit"
            disabled={streamState.running || !prompt.trim() || loadingModels}
            aria-label={loadingModels ? "Loading" : streamState.running ? "Running" : "Generate"}
            className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-950 shadow-md transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            title="Generate"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Stop secondary */}
          <button
            type="button"
            onClick={stopRun}
            disabled={!streamState.running}
            aria-label="Stop"
            className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-red-900 text-slate-200 transition hover:bg-slate-800/80 disabled:cursor-not-allowed disabled:opacity-50"
            title="Stop"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="6" y="6" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
        </div>
      </label>


    </form>
  </div>
</section>

    </div>

    {/* Mobile fallback: buttons below input */}
    <div className="mt-3 flex w-full justify-center gap-3 sm:hidden">
      <button
        type="submit"
        disabled={streamState.running || !prompt.trim() || loadingModels}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-mint to-sky px-4 text-sm font-semibold text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <button
        type="button"
        onClick={stopRun}
        disabled={!streamState.running}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-gray-700 bg-slate-950/40 px-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-900/80 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="6" y="6" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>
    </div>
  </form>
</div>

      {/* Starter prompt chips centered */}
      <div className="flex w-full justify-center mt-4">
        <div className="flex flex-wrap gap-2 max-w-3xl justify-center">
          {STARTER_PROMPTS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setPrompt(item)}
              className="rounded-full border border-gray-700 bg-white/10 px-4 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-900/80"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row centered */}
   <div className="flex w-full justify-center mt-6">
  <div className="w-full max-w-5xl">
    {/* Single-row fixed-width stat cards, no wrap, no scroll */}
    <div className="flex items-stretch justify-between flex-nowrap overflow-hidden">
      <div className="w-56 flex-shrink-0">
        <StatCard
          label="Provider"
          value={providers.openrouter ? "OpenRouter live" : "No provider"}
        />
      </div>

      <div className="w-56 flex-shrink-0">
        <StatCard label="Completed" value={completedCount} tone="sky" />
      </div>

      <div className="w-56 flex-shrink-0">
        <StatCard label="Failed" value={failedCount} tone="amber" />
      </div>

      <div className="w-56 flex-shrink-0">
        <StatCard
          label="Summary"
          value={streamState.summaryLoading ? "Merging" : streamState.summary ? "Ready" : "Idle"}
          tone="mint"
        />
      </div>
    </div>
  </div>
</div>

      {/* Error */}
      {error ? (
        <div className="rounded-2xl border border-rose/20 bg-rose/10 px-4 py-3 text-sm leading-7 text-rose-100 max-w-3xl mx-auto mt-4">
          {error}
        </div>
      ) : null}
    </div>
  </div>
</section>

        <section className="glass-panel overflow-hidden mb-12">
          <SectionHeading
            eyebrow="List of models"
            title="Choose the models you want in this run"
            description="Only currently available free models can be selected. Use select all or keep a smaller focused set for faster runs."
            action={
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-gray-700 bg-slate-950/45 px-3 py-2 text-xs text-slate-300">
                  {providers.openrouter ? "OPENROUTER_API_KEY detected" : "Add OPENROUTER_API_KEY"}
                </span>
                <button
                  type="button"
                  onClick={selectAllModels}
                  className="rounded-full border border-gray-700 bg-slate-950/35 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-900/70"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={clearSelectedModels}
                  className="rounded-full border border-gray-700 bg-slate-950/35 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-900/70"
                >
                  Clear
                </button>
              </div>
            }
          />

          <div className="soft-scroll grid max-h-[420px] gap-4 overflow-auto px-6 py-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {loadingModels
              ? Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-gray-700 bg-slate-950/35 p-4"
                  >
                    <LoadingLines count={3} />
                  </div>
                ))
              : models.map((model) => (
                  <ModelSelectionCard
                    key={model.id}
                    model={model}
                    selected={selectedModels.includes(model.id)}
                    onToggle={toggleModel}
                  />
                ))}
          </div>
        </section>

        <section className="glass-panel overflow-hidden mb-12">
          <SectionHeading
            eyebrow="Selected models response"
            title="Live outputs from the selected models"
            description="Each card keeps a fixed height and streams its own response so you can compare structure, quality, and completeness side by side."
          />

          <div className="grid gap-5 px-6 py-6 md:grid-cols-2 xl:grid-cols-3">
            {renderedModels.length ? (
              renderedModels.map((model) => (
                <ResponseCard
                  key={model.id}
                  model={model}
                  isActive={streamState.activeModelId === model.id}
                />
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-white/10 bg-slate-950/20 p-8 text-sm leading-7 text-slate-500 md:col-span-2 xl:col-span-3">
                Select at least one available model to show the live response area.
              </div>
            )}
          </div>
        </section>

        <section className="glass-panel overflow-hidden mb-12">
          <SectionHeading
            eyebrow="Final summary result"
            title="Merged answer from successful model responses"
            description="The backend synthesizes a final answer, extracts key points, and notes which model contributed the strongest base response."
            action={
              <span
                className={classNames(
                  "w-fit rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em]",
                  streamState.summaryLoading
                    ? "bg-amber/15 text-amber"
                    : streamState.summary
                      ? "bg-mint/15 text-mint"
                      : "border border-gray-700 bg-slate-950/45 text-slate-400"
                )}
              >
                {streamState.summaryLoading
                  ? "Synthesizing"
                  : streamState.summary
                    ? "Summary ready"
                    : "Waiting"}
              </span>
            }
          />

          <div className="grid gap-6 px-6 py-6 xl:grid-cols-[minmax(0,1.5fr)_360px]">
            <div className="space-y-4">
              <div className="rounded-3xl border border-gray-700 bg-slate-950/45 p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-mint">
                  Final output
                </p>
                <div className="mt-4">
                  <SummaryBody
                    summary={streamState.summary}
                    loading={streamState.summaryLoading}
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-gray-700 bg-slate-950/35 p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Key points
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {(streamState.keyPoints || []).length ? (
                    streamState.keyPoints.map((point) => (
                      <div
                        key={point}
                        className="rounded-2xl border border-gray-700 bg-slate-950/45 p-4 text-sm leading-7 text-slate-200"
                      >
                        {point}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/20 p-4 text-sm leading-7 text-slate-500 md:col-span-2">
                      Key points will appear here after the synthesis step finishes.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-gray-700 bg-slate-950/35 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Summary model
                </p>
                <p className="mt-3 text-sm font-medium leading-7 text-slate-100">
                  {streamState.synthesisModel || "openrouter/free"}
                </p>
              </div>

              <div className="rounded-3xl border border-gray-700 bg-slate-950/35 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Best contributing model
                </p>
                <p className="mt-3 text-sm font-medium leading-7 text-slate-100">
                  {streamState.bestModelId || "Will be selected after synthesis"}
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-400">
                  {streamState.bestReason ||
                    "The final summary prioritizes the merged answer, then explains which model provided the strongest base contribution."}
                </p>
              </div>

              <div className="rounded-3xl border border-gray-700 bg-slate-950/35 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Run overview
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <StatCard label="Selected" value={selectedModels.length} tone="default" />
                  <StatCard label="Completed" value={completedCount} tone="sky" />
                  <StatCard label="Errors" value={failedCount} tone="amber" />
                </div>
              </div>
            </div>
          </div>
        </section>
        </div>
      </main>
    </div>
  );
}

export default App;
