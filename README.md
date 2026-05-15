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

## Conversation log (Supabase)

每次對話結束後自動寫入 Supabase `conversation_logs` 資料表。
需設定環境變數：`SUPABASE_URL`、`SUPABASE_ANON_KEY`。

### 常用查詢

```sql
-- 熱門問題 Top 10
select user_message, count(*) as count
from conversation_logs
group by user_message
order by count desc
limit 10;

-- 各 intent 使用量
select intent, count(*) as count
from conversation_logs
group by intent
order by count desc;

-- 最近 50 筆對話
select created_at, user_message, ai_response
from conversation_logs
order by created_at desc
limit 50;
```

### 滿意度查詢（feedback 資料表）

```sql
-- 找到負評的對話
select f.session_id, f.message_index, f.created_at,
       c.user_message, c.ai_response
from feedback f
join conversation_logs c 
  on c.session_id = f.session_id
where f.rating = 'down'
order by f.created_at desc;
```

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| AI | Claude claude-sonnet-4-6 · Anthropic SDK · streaming + prompt caching |
| Widget | Vanilla Web Component + Shadow DOM (zero dependencies) |
| Data | Local JSON, in-memory keyword search |
| Deploy | Vercel (free tier sufficient for demo) |
