# Microvisuals Automation Pipeline

## Goal

Fully automated content pipeline with daily approval via Telegram.

```
[Topics List] → [Generate Metaphor] → [Generate Image] → [Queue]
                                                            ↓
                                                    [8am Telegram Bot]
                                                            ↓
                                                   [You: Approve/Reject]
                                                            ↓
                                              [Auto-post Twitter + Insta]
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     n8n / Make.com                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. [Cron: Daily 6am]                                   │
│          ↓                                              │
│  2. [Pick topic from Google Sheet / Notion]             │
│          ↓                                              │
│  3. [OpenAI GPT-4o-mini → Generate metaphor JSON]       │
│          ↓                                              │
│  4. [OpenAI DALL-E → Generate image]                    │
│          ↓                                              │
│  5. [Save to queue + Cloudinary]                        │
│          ↓                                              │
│  6. [Cron: 8am → Telegram notification with preview]    │
│          ↓                                              │
│  7. [You tap "Approve" or "Reject"]                     │
│          ↓                                              │
│  8. [Post to Twitter + Instagram]                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## API Decisions

### No Claude API Needed

Use OpenAI for everything - simpler, one API key.

| Task | Solution | Cost |
|------|----------|------|
| Metaphor generation | GPT-4o-mini | ~$0.00015 per metaphor |
| Image generation | DALL-E 3 | ~$0.04-0.08 per image |
| **Total per post** | | **~$0.05-0.10** |

### Cost Breakdown (Monthly)

| Posts/Day | Monthly Posts | Cost/Month |
|-----------|---------------|------------|
| 1 | 30 | $1.50 - $3.00 |
| 2 | 60 | $3.00 - $6.00 |
| 3 | 90 | $4.50 - $9.00 |

---

## Tech Stack

| Component | Tool | Cost | Notes |
|-----------|------|------|-------|
| Automation | n8n (self-host) | Free | Or Make.com (1000 ops/month free) |
| Scheduling | n8n/Make cron | Free | Built-in |
| Telegram bot | Telegram Bot API | Free | Create via @BotFather |
| Twitter posting | Twitter API v2 | Free | Basic tier |
| Instagram posting | Meta Graph API | Free | Requires Facebook Page |
| Image storage | Cloudinary | Free | 25GB free tier |
| Topic storage | Google Sheets / Notion | Free | Simple database |

---

## Setup Requirements

### 1. OpenAI API
- Sign up: https://platform.openai.com
- Get API key
- Enable GPT-4o-mini + DALL-E access

### 2. Telegram Bot
- Message @BotFather on Telegram
- `/newbot` → follow prompts
- Save the bot token
- Get your chat ID (message @userinfobot)

### 3. n8n (Self-Hosted) or Make.com
**Option A: n8n (Recommended - Free)**
```bash
npx n8n
```
Or Docker:
```bash
docker run -it --rm -p 5678:5678 n8nio/n8n
```

**Option B: Make.com**
- Sign up: https://make.com
- Free tier: 1000 operations/month

### 4. Twitter Developer Account
- Apply: https://developer.twitter.com
- Create project + app
- Get API keys (Consumer + Access tokens)
- Enable OAuth 1.0a with Read/Write

### 5. Instagram (Meta Graph API)
- Create Facebook Page (required for Instagram API)
- Connect Instagram Business/Creator account
- Get access token via Meta Developer Portal
- https://developers.facebook.com

### 6. Cloudinary (Image Storage)
- Sign up: https://cloudinary.com
- Get cloud name, API key, API secret
- Free tier: 25GB storage, 25GB bandwidth

---

## Workflow Details

### Step 1: Topic Source

Store topics in Google Sheets or Notion:

| ID | Topic | Status | Generated | Posted |
|----|-------|--------|-----------|--------|
| 1 | ignoring automation tools | pending | | |
| 2 | saying yes to everything | pending | | |
| 3 | skipping documentation | pending | | |

### Step 2: Metaphor Generation Prompt

```
SYSTEM: You are a metaphor engine. Generate visual metaphors.

Respond with JSON only. No markdown.

INPUT: "${topic}"

Generate:
{
  "step1": {
    "subject": "",
    "pressure": "",
    "conflict": "",
    "cost": "",
    "emotion": ""
  },
  "step2_object": "",
  "step3_mechanic": {
    "rule": "",
    "x_maps_to": "",
    "y_maps_to": ""
  },
  "step4_best": {
    "line1": "",
    "line2": ""
  },
  "step5_visual": "",
  "step5_dalle_prompt": "[object + failure state]. Flat 2D vector. Pure black background. White shapes only. No gradients. No texture. Minimal. Bauhaus poster style. Centered."
}
```

### Step 3: Image Generation

Use DALL-E 3 with the `step5_dalle_prompt` from metaphor JSON.

Settings:
- Model: `dall-e-3`
- Size: `1024x1024`
- Quality: `hd`
- Style: `vivid`

### Step 4: Telegram Notification

Send message with:
- Image preview
- Quote text
- Inline keyboard: [Approve] [Reject] [Edit]

```
Daily Post Preview

"Taking the stairs to the 50th floor
when the elevator is right there."

[Approve] [Reject] [Reschedule]
```

### Step 5: Posting

**Twitter:**
- Upload image via media/upload endpoint
- Create tweet with image + caption

**Instagram:**
- Upload to Cloudinary first
- Use Instagram Graph API container + publish flow

---

## File Structure (If Building Custom)

```
microvisuals-bot/
├── src/
│   ├── index.ts           # Main entry
│   ├── generate.ts        # OpenAI metaphor + image
│   ├── telegram.ts        # Bot + notifications
│   ├── twitter.ts         # Twitter posting
│   ├── instagram.ts       # Instagram posting
│   ├── storage.ts         # Cloudinary + queue
│   └── scheduler.ts       # Cron jobs
├── .env                   # API keys
├── package.json
└── README.md
```

### Environment Variables

```env
# OpenAI
OPENAI_API_KEY=sk-...

# Telegram
TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_CHAT_ID=123456789

# Twitter
TWITTER_API_KEY=...
TWITTER_API_SECRET=...
TWITTER_ACCESS_TOKEN=...
TWITTER_ACCESS_SECRET=...

# Instagram (Meta)
META_ACCESS_TOKEN=...
INSTAGRAM_ACCOUNT_ID=...

# Cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Schedule
GENERATE_CRON=0 6 * * *    # 6am daily
NOTIFY_CRON=0 8 * * *      # 8am daily
```

---

## Next Steps

- [ ] Set up OpenAI API account
- [ ] Create Telegram bot via @BotFather
- [ ] Choose automation platform (n8n vs Make.com)
- [ ] Set up Twitter Developer account
- [ ] Set up Meta Developer account for Instagram
- [ ] Create Cloudinary account
- [ ] Build or configure the workflow
- [ ] Test with single post
- [ ] Go live

---

## Alternative: Simple Node.js Script

If you prefer code over no-code tools:

```bash
# Install dependencies
npm init -y
npm install openai telegraf twitter-api-v2 cloudinary node-cron

# Run daily
node index.js
```

Can build this as a simple script that runs on a VPS or Raspberry Pi.

---

*Last updated: 2024-12-23*
