# Multi-LLM Response Summarization

Full-stack demo with:

- `frontend/`: React dashboard with a dark animated UI
- `backend/`: Node HTTP streaming API for live multi-model synthesis

## Run

Backend:

```bash
cd backend
copy .env.example .env
npm start
```

Frontend:

```bash
cd frontend
npm start
```

The React app proxies API requests to `http://localhost:4000` in development.

Add the required API keys in `backend/.env`:

```bash
OPENROUTER_API_KEY=your_openrouter_api_key
SUMMARY_MODEL=openrouter/free
```

Why this is enough:

- `OPENROUTER_API_KEY`: used for all model calls and the final synthesis

## API

- `GET /api/models`
- `GET /api/health`
- `POST /api/summarize`

`POST /api/summarize` streams newline-delimited JSON events so the UI can show:

- which real model is currently generating
- each model's live partial output in its own column
- the final synthesized output

## Live Models

The backend is now configured to allow only this OpenRouter free model list:

- `stepfun/step-3.5-flash:free` via OpenRouter
- `qwen/qwen3-coder:free` via OpenRouter
- `qwen/qwen3-next-80b-a3b-instruct:free` via OpenRouter
- `openai/gpt-oss-20b:free` via OpenRouter
- `liquid/lfm-2.5-1.2b-thinking:free` via OpenRouter
- `google/gemma-3-27b-it:free` via OpenRouter
- `arcee-ai/trinity-large-preview:free` via OpenRouter
- `z-ai/glm-4.5-air:free` via OpenRouter
- `nvidia/nemotron-3-nano-30b-a3b:free` via OpenRouter
- `arcee-ai/trinity-mini:free` via OpenRouter
- `nvidia/nemotron-nano-9b-v2:free` via OpenRouter
- `nvidia/nemotron-nano-12b-v2-vl:free` via OpenRouter
- `openai/gpt-oss-120b:free` via OpenRouter
- `liquid/lfm-2.5-1.2b-instruct:free` via OpenRouter
- `mistralai/mistral-small-3.1-24b-instruct:free` via OpenRouter
- `venice/uncensored:free` via OpenRouter
- `qwen/qwen3-4b:free` via OpenRouter
- `nousresearch/hermes-3-405b-instruct:free` via OpenRouter
- `google/gemma-3-4b-it:free` via OpenRouter
- `google/gemma-3-12b-it:free` via OpenRouter
- `google/gemma-3n-e4b-it:free` via OpenRouter
- `google/gemma-3n-e2b-it:free` via OpenRouter
- `meta-llama/llama-3.3-70b-instruct:free` via OpenRouter

The final synthesis is generated through `openrouter/free`, which selects an available free model at runtime.
