# Studio Focus

Website for **Studio Focus**, a gym in Garça/SP (Brazil). Besides presenting the gym, it gives members free fitness tools and reminders, and it is installable as an app (PWA).

**Live:** [www.studiofocus.app.br](https://www.studiofocus.app.br/)

## Features

- **Fitness calculators:** BMI, daily calories (Harris-Benedict), water intake, macros (Mifflin-St Jeor + TDEE), goal simulator and 1RM estimate.
- **Workout builder:** exercise library and a weekly training plan.
- **Supplement alarms:** Web Push notifications (e.g. creatine and whey) that keep working with the browser closed.
- **AI assistant:** chat widget powered by the Google Gemini API.
- **Admin area:** login and a dashboard for managing students.
- **Booking:** first free class scheduled through WhatsApp.

## Stack

| Layer | Technologies |
|---|---|
| Front-end | HTML, CSS, JavaScript, Service Worker (PWA) |
| Serverless API | Vercel Functions (Node.js) in `api/` |
| Notifications | `web-push` (VAPID) + Redis (`ioredis`, e.g. Upstash) |
| AI | Google Gemini API |
| Hosting | GitHub Pages (site) and Vercel (API) |

## Project structure

```
index.html          main page and calculators
chat-widget.*       AI chat widget
sw.js               service worker (offline + push)
admin/              admin login and dashboard
api/                serverless functions (chat and push notifications)
docs/               specs for each tool
tests/              Python tests for the helper scripts
```

## Running locally

The site is static, so any local server works:

```bash
npx serve .
```

The functions in `api/` run on Vercel. Copy `.env.example` to `.env` and fill in the Gemini variables. The push alarms also need `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `REDIS_URL` and `CRON_SECRET` configured on Vercel. See [CRON_SETUP.md](CRON_SETUP.md) for the per-minute cron setup.

## Author

Developed by [Leonardo de Oliveira](https://github.com/leozxinho).
