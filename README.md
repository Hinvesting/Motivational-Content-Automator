<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1DdK7DzF5MmOBv06uzg7AH4MmzPYr6V1V

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:

   ```bash
   npm install
   ```

2. Local dev: copy `.env.example` to `.env.local` (or `.env`) and set your `GENAI_API_KEY`:

   ```bash
   cp .env.example .env.local
   # edit .env.local and set GENAI_API_KEY
   ```

3. Run the app:

   ```bash
   npm run dev
   ```

Notes about serverless GenAI proxy

- This project now exposes a serverless endpoint at `/api/gemini` (Vercel style) which holds the real GenAI key server-side.
- On deployment (Vercel), set the environment variable `GENAI_API_KEY` (not VITE_ prefixed) in your project settings.
- Do NOT put `GENAI_API_KEY` into client-side Vite env vars (VITE_ prefix) — secrets must remain server-side.

Quick verification after changes

1. Build and ensure the GenAI SDK is not bundled into the client:

   ```bash
   npm run build
   ```

2. Optionally preview the production build locally:

   ```bash
   npm run preview
   ```
