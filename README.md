# ContentForge — Next.js + Vercel

## Local Development

```bash
npm install
```

Create a `.env.local` file:
```
ANTHROPIC_API_KEY=your_key_here
```

Then run:
```bash
npm run dev
```

Visit `http://localhost:3000` — the API route at `/api/claude` works out of the box with Next.js, no extra CLI needed.

## Deploy to Vercel

1. Push to GitHub
2. Import repo on [vercel.com](https://vercel.com)
3. Add environment variable: `ANTHROPIC_API_KEY`
4. Deploy 🚀

## Project Structure

```
contentforge/
├── app/
│   ├── api/
│   │   └── claude/
│   │       └── route.js        ← API route (server-side, key stays secret)
│   ├── ContentForgeApp.jsx     ← Main React app (client component)
│   ├── layout.js               ← Root layout
│   ├── page.js                 ← Root page
│   └── globals.css
├── lib/
│   └── api.js                  ← API helper functions
├── next.config.mjs
└── package.json
```

## Why Next.js over Vite + Vercel Functions?

- **No config needed** — API routes just work at `app/api/*/route.js`
- **One `npm run dev`** — runs both frontend and API routes together
- **Same deploy flow** — push to GitHub, Vercel auto-deploys
- **No `.cjs` workarounds** — Next.js handles ESM/CJS automatically
