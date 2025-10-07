# n8n Workflows for PSA Reminders

This directory contains n8n workflow JSON files for the Personal Stability Assistant reminder system.

## Workflows Overview

There are **two approaches** to implementing reminders:

### Approach A: Wait-Based (Simple, Low Volume)
- **Files:** `reminder-scheduler.json`, `reminder-action-handler.json`
- **Best for:** Small personal use, <100 reminders per day
- **Pros:** Simple setup, no database required
- **Cons:** n8n keeps executions in memory, limited scalability

### Approach B: Cron-Based (Production, High Volume)
- **Files:** `reminder-storage-webhook.json`, `reminder-scheduler-cron.json`, `reminder-action-handler.json`
- **Best for:** Production use, unlimited reminders
- **Pros:** Scalable, persistent storage, better reliability
- **Cons:** Requires PostgreSQL database

---

## Approach A: Wait-Based Workflows

### 1. `reminder-scheduler.json`
**Purpose:** Receives reminder requests from the PSA app and schedules notifications using n8n Wait node.

**Webhook URL:** `https://your-n8n-instance.com/webhook/ntf`

**How it works:**
1. Receives POST request from `/api/reminders` with payload:
   ```json
   {
     "task": "Meeting with John",
     "date": "2025-10-03",
     "start": "14:30",
     "offsetMinutes": 30,
     "startInLabel": "30m",
     "source": "schedule-page",
     "nowEpoch": 1727890488000
   }
   ```

2. Calculates the exact notification time (appointment time - offset)
3. Validates that the notification time is in the future
4. Uses n8n Wait node to delay until notification time
5. Sends Pushcut notification to iOS device
6. Injects reminder message into PSA chat
7. Optionally logs to database

**Response:**
```json
{
  "ok": true,
  "scheduled": true,
  "notificationTime": "2025-10-03T14:00:00.000Z",
  "reminderLabel": "30m before",
  "delayMinutes": 1440
}
```

### 2. `reminder-action-handler.json`
**Purpose:** Handles user actions on reminder notifications (Done, Snooze, Dismiss).

**Webhook URL:** `https://your-n8n-instance.com/webhook/reminder-action`

**How it works:**
1. Receives action from reminder buttons
2. Routes based on action type:
   - **Done:** Marks complete, sends confirmation to chat
   - **Snooze:** Waits specified duration, then re-sends notification
   - **Dismiss:** Silently dismisses, sends confirmation to chat

**Request payload:**
```json
{
  "action": "Snooze 10m",
  "task": "Meeting with John",
  "ritualId": "reminder-meeting-123",
  "userId": "user-1",
  "timestamp": 1727890488000
}
```

## Setup Instructions

### Prerequisites
- n8n instance (self-hosted or cloud)
- Pushcut account and API key (for iOS notifications)
- PSA app deployed and accessible

### Step 1: Import Workflows
1. Open n8n web interface
2. Go to **Workflows** → **Import from File**
3. Import `reminder-scheduler.json`
4. Import `reminder-action-handler.json`

### Step 2: Configure Credentials

#### Pushcut API Credential
1. In n8n, go to **Credentials** → **New**
2. Select **Pushcut API**
3. Enter your Pushcut API key
4. Name it: `Pushcut API`

#### PSA Basic Auth (Optional)
If your PSA app requires authentication for `/api/inject-ritual`:
1. Create **HTTP Basic Auth** credential
2. Enter username and password
3. Name it: `PSA Basic Auth`

#### PostgreSQL (Optional)
For logging reminders:
1. Create **PostgreSQL** credential
2. Enter your database connection details
3. Name it: `PostgreSQL`
4. Enable the "Log Reminder" node in the workflow

### Step 3: Set Environment Variables
In n8n, set these environment variables:

```bash
PSA_APP_URL=https://your-psa-app.vercel.app
```

### Step 4: Activate Webhooks
1. Open `reminder-scheduler` workflow
2. Click **Execute Workflow** to activate the webhook
3. Copy the webhook URL (e.g., `https://your-n8n.com/webhook/ntf`)
4. Open `reminder-action-handler` workflow
5. Activate and copy its webhook URL

### Step 5: Update PSA App Environment Variables
In your PSA app (Vercel/deployment), set:

```bash
NOTIFY_WEBHOOK_URL=https://your-n8n.com/webhook/ntf
NOTIFY_WEBHOOK_BASIC_USER=myuser  # Optional
NOTIFY_WEBHOOK_BASIC_PASS=mypass  # Optional
```

### Step 6: Update Reminder Buttons (Optional)
If you want reminder buttons to call the action handler, update your PSA app's reminder injection to include the webhook URL in button metadata.

## Testing

### Test Reminder Scheduler
```bash
curl -X POST https://your-n8n.com/webhook/ntf \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Test Reminder",
    "date": "2025-10-03",
    "start": "15:00",
    "offsetMinutes": 5,
    "startInLabel": "5m",
    "source": "test"
  }'
```

Expected: You should receive a Pushcut notification in 5 minutes.

### Test Action Handler
```bash
curl -X POST https://your-n8n.com/webhook/reminder-action \
  -H "Content-Type: application/json" \
  -d '{
    "action": "Done",
    "task": "Test Reminder",
    "ritualId": "test-123"
  }'
```

Expected: Confirmation message injected into PSA chat.

## Customization

### Change Notification Format
Edit the "Send Pushcut Notification" node:
- **title:** Notification title
- **text:** Notification body
- **sound:** Notification sound (default, alarm, etc.)

### Add More Actions
In `reminder-action-handler.json`:
1. Add new case in "Switch on Action" node
2. Create handler node for the new action
3. Connect to appropriate response nodes

### Database Logging Schema
If enabling PostgreSQL logging, create this table:

```sql
CREATE TABLE reminder_logs (
  id SERIAL PRIMARY KEY,
  task VARCHAR(255) NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_start TIME NOT NULL,
  offset_minutes INTEGER NOT NULL,
  notification_time TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'sent',
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Troubleshooting

### Reminders Not Sending
1. Check n8n execution logs for errors
2. Verify webhook URL is correct in PSA app
3. Ensure Pushcut credential is valid
4. Check that notification time is in the future

### Chat Injection Failing
1. Verify `PSA_APP_URL` environment variable
2. Check if `/api/inject-ritual` endpoint exists in PSA app
3. Verify authentication credentials if required

### Snooze Not Working
1. Check n8n execution timeout settings (must be long enough for wait duration)
2. Verify "Wait Snooze Duration" node is not disabled
3. Check n8n logs for wait node errors

## Architecture Notes

- **Wait Node Limitations:** n8n Wait nodes keep executions in memory. For very long delays (>24 hours), consider using a cron-based approach instead.
- **Scaling:** Each reminder creates a separate n8n execution. For high volume, consider batching or using a dedicated job queue.
- **Timezone:** All times are handled in ISO format. Ensure your PSA app sends correct timezone-aware timestamps.

---

## Approach B: Cron-Based Workflows

### 3. `reminder-storage-webhook.json`
**Purpose:** Receives reminder requests and stores them in PostgreSQL database.

**Webhook URL:** `https://your-n8n-instance.com/webhook/ntf`

**How it works:**
1. Receives same payload as Approach A
2. Calculates notification time
3. Stores in `reminders` table with status `pending`
4. Returns immediate confirmation

### 4. `reminder-scheduler-cron.json`
**Purpose:** Runs every minute to check for and send due reminders.

**Trigger:** Cron schedule (every minute)

**How it works:**
1. Queries database for reminders due in the next minute
2. Sends Pushcut notification for each
3. Injects message into PSA chat
4. Updates status to `sent` in database

### Database Setup

**Schema file:** `database-schema.sql`

**Tables:**
- **`reminders`** - Main table storing all reminders
- **`reminder_logs`** - Audit trail (optional)

**Views:**
- **`upcoming_reminders`** - Next 24 hours of reminders
- **`overdue_reminders`** - Missed reminders

**Functions:**
- **`cleanup_old_reminders()`** - Delete reminders older than 30 days
- **`mark_expired_reminders()`** - Mark missed reminders as expired

**Setup:**
```bash
psql -U your_user -d your_database -f database-schema.sql
```

---

## Which Approach Should You Use?

| Feature | Wait-Based | Cron-Based |
|---------|-----------|------------|
| Setup Complexity | ⭐ Simple | ⭐⭐⭐ Complex |
| Database Required | ❌ No | ✅ Yes (PostgreSQL) |
| Max Reminders | ~100/day | Unlimited |
| Reliability | Good | Excellent |
| Monitoring | Limited | Full audit trail |
| Memory Usage | High (keeps executions) | Low |
| Best For | Personal use | Production |

**Recommendation:** Start with **Wait-Based** for simplicity. Migrate to **Cron-Based** when you need more than 50-100 reminders per day or want better monitoring.
