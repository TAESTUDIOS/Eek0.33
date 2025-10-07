# Quick Start Guide - PSA Reminders

Get your reminder system up and running in 15 minutes.

## Prerequisites

- [ ] n8n instance running (self-hosted or cloud)
- [ ] Pushcut account with API key
- [ ] PSA app deployed and accessible

## Step-by-Step Setup (Wait-Based Approach)

### 1. Import Workflows (5 minutes)

1. Open n8n web interface
2. Click **Workflows** → **Import from File**
3. Import these files:
   - `reminder-scheduler.json`
   - `reminder-action-handler.json`

### 2. Configure Pushcut (2 minutes)

1. In n8n, go to **Credentials** → **New**
2. Select **Pushcut API**
3. Enter your Pushcut API key (get it from Pushcut app → Settings → API)
4. Save as: `Pushcut API`

### 3. Set Environment Variables (2 minutes)

In your n8n instance, add this environment variable:

```bash
PSA_APP_URL=https://your-psa-app.vercel.app
```

**How to set:**
- **Docker:** Add to `docker-compose.yml` or `-e` flag
- **Cloud:** Add in n8n cloud settings
- **Self-hosted:** Add to `.env` file

### 4. Activate Webhooks (3 minutes)

#### Reminder Scheduler
1. Open `reminder-scheduler` workflow
2. Click **Execute Workflow** button (top right)
3. Copy the webhook URL shown (e.g., `https://your-n8n.com/webhook/ntf`)
4. Save it for next step

#### Action Handler
1. Open `reminder-action-handler` workflow
2. Click **Execute Workflow**
3. Copy the webhook URL (e.g., `https://your-n8n.com/webhook/reminder-action`)

### 5. Update PSA App (3 minutes)

In your PSA app deployment (Vercel/hosting), set this environment variable:

```bash
NOTIFY_WEBHOOK_URL=https://your-n8n.com/webhook/ntf
```

**Vercel:**
1. Go to project → Settings → Environment Variables
2. Add `NOTIFY_WEBHOOK_URL`
3. Redeploy

**Other hosting:** Add to your environment configuration and redeploy.

### 6. Test It! (5 minutes)

#### Test 1: Create a reminder
1. Open PSA app → Schedule page
2. Click "Add Task"
3. Fill in:
   - Title: "Test Reminder"
   - Date: Today
   - Time: 5 minutes from now
   - Check "At start" reminder
4. Click Save

**Expected:** You should receive a Pushcut notification in 5 minutes!

#### Test 2: Manual webhook test
```bash
curl -X POST https://your-n8n.com/webhook/ntf \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Quick Test",
    "date": "2025-10-03",
    "start": "15:00",
    "offsetMinutes": 1,
    "source": "test"
  }'
```

**Expected:** Notification in 1 minute.

## Troubleshooting

### No notification received?

1. **Check n8n execution log:**
   - Go to **Executions** in n8n
   - Look for failed executions
   - Check error messages

2. **Verify Pushcut credential:**
   - Test credential in n8n
   - Check API key is correct
   - Ensure Pushcut app is installed on iOS device

3. **Check webhook URL:**
   - Verify `NOTIFY_WEBHOOK_URL` in PSA app matches n8n webhook
   - Ensure no typos or extra spaces

4. **Check time calculation:**
   - Ensure reminder time is in the future
   - Check your server timezone settings

### Notification sent but not in chat?

1. **Check PSA_APP_URL:**
   - Verify it's set correctly in n8n
   - Ensure no trailing slash
   - Test URL is accessible from n8n server

2. **Check /api/inject-ritual endpoint:**
   - Verify endpoint exists in PSA app
   - Check if authentication is required

### "Invalid input" error?

Check your payload includes:
- `task` (string)
- `date` (YYYY-MM-DD format)
- `start` (HH:mm format)
- `offsetMinutes` (number, >= 0)

## Next Steps

### Enable Action Buttons

To make reminder buttons work:

1. Update PSA app's reminder injection to include action webhook
2. When user clicks button, POST to:
   ```
   https://your-n8n.com/webhook/reminder-action
   ```
   With payload:
   ```json
   {
     "action": "Done",
     "task": "Task name",
     "ritualId": "reminder-123"
   }
   ```

### Monitor Your Reminders

In n8n:
- Go to **Executions** to see all reminder history
- Filter by workflow to see specific types
- Check for failed executions

### Scale to Production

When you're ready for more reminders:
1. Follow the **Cron-Based Approach** in main README
2. Set up PostgreSQL database
3. Import cron workflows
4. Migrate existing reminders

## Support

- **n8n docs:** https://docs.n8n.io
- **Pushcut docs:** https://www.pushcut.io/support
- **PSA issues:** Check your app repository

## Summary

✅ You now have:
- Reminders scheduled automatically
- iOS notifications via Pushcut
- Chat integration
- Action buttons (Done, Snooze, Dismiss)

🎉 Your reminder system is live!
