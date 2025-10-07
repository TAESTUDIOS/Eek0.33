# Workflow Files Reference

Quick reference for all n8n workflow files in this directory.

## File List

| File | Purpose | Approach | Required |
|------|---------|----------|----------|
| `reminder-scheduler.json` | Schedule reminders using Wait node | Wait-Based | ✅ Core |
| `reminder-action-handler.json` | Handle button actions (Done/Snooze/Dismiss) | Both | ✅ Core |
| `reminder-storage-webhook.json` | Store reminders in database | Cron-Based | Optional |
| `reminder-scheduler-cron.json` | Check database every minute for due reminders | Cron-Based | Optional |
| `database-schema.sql` | PostgreSQL schema for cron approach | Cron-Based | Optional |

## Documentation Files

| File | Description |
|------|-------------|
| `README.md` | Complete documentation for all workflows |
| `QUICK-START.md` | 15-minute setup guide for beginners |
| `WORKFLOW-FILES.md` | This file - quick reference |

## Workflow Dependency Map

### Wait-Based Setup (Recommended for Start)
```
PSA App
   ↓
reminder-scheduler.json (webhook: /webhook/ntf)
   ↓
Pushcut + Chat Injection
   ↓
reminder-action-handler.json (webhook: /webhook/reminder-action)
```

**Files needed:**
- ✅ `reminder-scheduler.json`
- ✅ `reminder-action-handler.json`

### Cron-Based Setup (Production Scale)
```
PSA App
   ↓
reminder-storage-webhook.json (webhook: /webhook/ntf)
   ↓
PostgreSQL Database
   ↑
reminder-scheduler-cron.json (runs every minute)
   ↓
Pushcut + Chat Injection
   ↓
reminder-action-handler.json (webhook: /webhook/reminder-action)
```

**Files needed:**
- ✅ `reminder-storage-webhook.json`
- ✅ `reminder-scheduler-cron.json`
- ✅ `reminder-action-handler.json`
- ✅ `database-schema.sql`

## Webhook URLs Summary

After importing workflows, you'll have these webhook endpoints:

| Workflow | Webhook Path | Used By | Method |
|----------|--------------|---------|--------|
| reminder-scheduler | `/webhook/ntf` | PSA `/api/reminders` | POST |
| reminder-storage-webhook | `/webhook/ntf` | PSA `/api/reminders` | POST |
| reminder-action-handler | `/webhook/reminder-action` | PSA button clicks | POST |

**Note:** Both scheduler approaches use the same webhook path (`/webhook/ntf`). Only import one scheduler workflow at a time.

## Node Types Used

Understanding what each workflow does:

### reminder-scheduler.json
- **Webhook** - Receives reminder request
- **If** - Validates input
- **Code** - Calculates notification time
- **If** - Checks if time is in future
- **Wait** - Delays until notification time ⏰
- **Pushcut** - Sends iOS notification
- **HTTP Request** - Injects to chat
- **Respond to Webhook** - Returns confirmation

### reminder-action-handler.json
- **Webhook** - Receives button action
- **If** - Validates action
- **Switch** - Routes by action type
- **Code** - Processes each action
- **Wait** - For snooze duration
- **Pushcut** - Re-sends notification after snooze
- **HTTP Request** - Injects response to chat
- **Respond to Webhook** - Returns confirmation

### reminder-storage-webhook.json
- **Webhook** - Receives reminder request
- **If** - Validates input
- **Code** - Calculates times
- **If** - Checks if future
- **PostgreSQL** - Inserts into database
- **Respond to Webhook** - Returns confirmation

### reminder-scheduler-cron.json
- **Schedule Trigger** - Runs every minute
- **PostgreSQL** - Queries due reminders
- **If** - Checks if any found
- **Split in Batches** - Processes each reminder
- **Code** - Formats data
- **Pushcut** - Sends notification
- **HTTP Request** - Injects to chat
- **PostgreSQL** - Marks as sent

## Credentials Required

| Credential Type | Used In | Required For |
|----------------|---------|--------------|
| Pushcut API | All scheduler workflows | iOS notifications |
| HTTP Basic Auth | All workflows (optional) | PSA app authentication |
| PostgreSQL | Cron-based workflows | Database storage |

## Environment Variables

Set these in your n8n instance:

```bash
# Required for all approaches
PSA_APP_URL=https://your-psa-app.vercel.app

# Optional - if PSA requires auth
PSA_BASIC_USER=username
PSA_BASIC_PASS=password
```

## Import Order

### For Wait-Based:
1. Import `reminder-scheduler.json`
2. Configure Pushcut credential
3. Set `PSA_APP_URL` environment variable
4. Activate workflow
5. Import `reminder-action-handler.json`
6. Activate workflow

### For Cron-Based:
1. Set up PostgreSQL database
2. Run `database-schema.sql`
3. Import `reminder-storage-webhook.json`
4. Configure PostgreSQL credential
5. Activate workflow
6. Import `reminder-scheduler-cron.json`
7. Activate workflow
8. Import `reminder-action-handler.json`
9. Activate workflow

## Testing Checklist

After setup, test these scenarios:

- [ ] Create reminder 5 minutes in future → Receive notification
- [ ] Create reminder with "1 hour" offset → Scheduled correctly
- [ ] Click "Done" button → Confirmation in chat
- [ ] Click "Snooze 10m" → Notification after 10 minutes
- [ ] Click "Dismiss" → Confirmation in chat
- [ ] Create reminder in past → Error response
- [ ] Create reminder with invalid data → Error response

## Performance Notes

### Wait-Based
- **Memory:** ~5-10 MB per waiting execution
- **Max concurrent:** Depends on n8n instance (typically 100-500)
- **Recommended load:** <100 reminders per day

### Cron-Based
- **Memory:** Minimal (only during execution)
- **Max concurrent:** Limited by database, not n8n
- **Recommended load:** Unlimited
- **Database size:** ~1 KB per reminder

## Migration Path

**Start → Scale:**

1. **Start:** Use Wait-Based (simple, no database)
2. **Monitor:** Track number of daily reminders
3. **Migrate at:** 50-100 reminders/day or when you need audit trail
4. **How:**
   - Set up PostgreSQL
   - Import cron workflows
   - Switch `NOTIFY_WEBHOOK_URL` to storage webhook
   - Deactivate wait-based scheduler
   - Keep action handler (works with both)

## Common Issues

| Issue | Solution | File |
|-------|----------|------|
| "Webhook not found" | Activate workflow | Any |
| "Credential not found" | Create Pushcut credential | Scheduler |
| "Table does not exist" | Run database-schema.sql | Cron workflows |
| "Invalid input" | Check payload format | All |
| "Past time" error | Reminder time already passed | Scheduler |
| Notification not received | Check Pushcut credential | Scheduler |
| Chat injection fails | Verify PSA_APP_URL | All |

## Support Resources

- **Full docs:** See `README.md`
- **Quick setup:** See `QUICK-START.md`
- **Database schema:** See `database-schema.sql`
- **n8n community:** https://community.n8n.io
