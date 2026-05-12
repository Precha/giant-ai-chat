# Giant AI Chat Widget

Universal AI chat widget for Giant Bicycles — add it to any website with one script tag.

**Capabilities:** Product recommendations (Giant / Liv / Momentum) · Dealer finder with GPS · Streaming responses powered by Claude claude-sonnet-4-6

---

## Deploy in 2 minutes

### 1. Fork & deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_GITHUB/giant-ai-chat&env=ANTHROPIC_API_KEY&envDescription=Get%20your%20key%20at%20console.anthropic.com)

Set `ANTHROPIC_API_KEY` when prompted. Done.

### 2. Embed on your website

```html
<script src="https://YOUR-DEPLOY.vercel.app/widget.js"></script>
<giant-chat
  api-url="https://YOUR-DEPLOY.vercel.app/api/chat"
  platform="web"
  market="US"
  lang="en"
></giant-chat>
```

**Shopify** — add to `theme.liquid` before `</body>`:
```html
<script src="https://YOUR-DEPLOY.vercel.app/widget.js"></script>
<giant-chat
  api-url="https://YOUR-DEPLOY.vercel.app/api/chat"
  platform="shopify"
  market="{{ shop.metafields.market.value | default: 'US' }}"
  lang="{{ request.locale.iso_code }}"
></giant-chat>
```

**Salesforce Commerce Cloud** — add to `htmlHead.isml`:
```html
<script src="https://YOUR-DEPLOY.vercel.app/widget.js"></script>
<giant-chat
  api-url="https://YOUR-DEPLOY.vercel.app/api/chat"
  platform="sfcc"
  market="${pdict.currentLocale.country}"
  lang="${pdict.currentLocale.language}"
></giant-chat>
```

---

## Run locally

```bash
git clone https://github.com/YOUR_GITHUB/giant-ai-chat
cd giant-ai-chat
npm install
cp .env.example .env.local
# Edit .env.local — add your ANTHROPIC_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Update data

Product and dealer data lives in `data/`. To refresh:

- Replace files in `data/products/` with new Giant product JSON exports
- Replace `data/dealers/dealers_US.json` with a fresh dealer export
- Restart the server (data loads once at startup)

---

## Cost estimate

| Traffic | Est. monthly cost |
|---|---|
| Low (~30 chats/day) | ~$10–20 |
| Medium (~100 chats/day) | ~$40–80 |
| High (~300 chats/day) | ~$100–160 |

Prompt caching is enabled — reduces Claude API costs ~90% on repeated system prompts.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| AI | Claude claude-sonnet-4-6 · Anthropic SDK · streaming + prompt caching |
| Widget | Vanilla Web Component + Shadow DOM (zero dependencies) |
| Data | Local JSON, in-memory keyword search |
| Deploy | Vercel (free tier sufficient for demo) |
