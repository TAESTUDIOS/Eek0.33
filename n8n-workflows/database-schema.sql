-- Database schema for PSA Reminder System (Cron-based approach)
-- This schema is required for the cron-based reminder workflows

-- Main reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id SERIAL PRIMARY KEY,
  task VARCHAR(500) NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_start TIME NOT NULL,
  offset_minutes INTEGER NOT NULL DEFAULT 0,
  notification_time TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  sent_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);
CREATE INDEX IF NOT EXISTS idx_reminders_notification_time ON reminders(notification_time);
CREATE INDEX IF NOT EXISTS idx_reminders_status_notification ON reminders(status, notification_time);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Optional: Reminder logs table for audit trail
CREATE TABLE IF NOT EXISTS reminder_logs (
  id SERIAL PRIMARY KEY,
  reminder_id INTEGER REFERENCES reminders(id) ON DELETE SET NULL,
  task VARCHAR(500) NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_start TIME NOT NULL,
  offset_minutes INTEGER NOT NULL,
  notification_time TIMESTAMP NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'sent', 'failed', 'snoozed', 'dismissed', 'completed'
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminder_logs_reminder_id ON reminder_logs(reminder_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_action ON reminder_logs(action);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_created_at ON reminder_logs(created_at);

-- View for upcoming reminders (next 24 hours)
CREATE OR REPLACE VIEW upcoming_reminders AS
SELECT 
  id,
  task,
  appointment_date,
  appointment_start,
  offset_minutes,
  notification_time,
  status,
  EXTRACT(EPOCH FROM (notification_time - NOW())) / 60 AS minutes_until_notification,
  metadata
FROM reminders
WHERE status = 'pending'
  AND notification_time > NOW()
  AND notification_time <= NOW() + INTERVAL '24 hours'
ORDER BY notification_time ASC;

-- View for overdue reminders (should have been sent but weren't)
CREATE OR REPLACE VIEW overdue_reminders AS
SELECT 
  id,
  task,
  appointment_date,
  appointment_start,
  offset_minutes,
  notification_time,
  status,
  EXTRACT(EPOCH FROM (NOW() - notification_time)) / 60 AS minutes_overdue,
  metadata
FROM reminders
WHERE status = 'pending'
  AND notification_time < NOW()
ORDER BY notification_time ASC;

-- Function to clean up old reminders (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_reminders()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM reminders
  WHERE status IN ('sent', 'expired', 'dismissed')
    AND created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to mark expired reminders (past notification time but still pending)
CREATE OR REPLACE FUNCTION mark_expired_reminders()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE reminders
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'pending'
    AND notification_time < NOW() - INTERVAL '5 minutes';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Sample queries for monitoring

-- Count reminders by status
-- SELECT status, COUNT(*) as count FROM reminders GROUP BY status;

-- Get next 10 upcoming reminders
-- SELECT * FROM upcoming_reminders LIMIT 10;

-- Get overdue reminders that need attention
-- SELECT * FROM overdue_reminders;

-- Clean up old reminders (run periodically)
-- SELECT cleanup_old_reminders();

-- Mark expired reminders
-- SELECT mark_expired_reminders();

-- Get reminder statistics
-- SELECT 
--   COUNT(*) FILTER (WHERE status = 'pending') as pending,
--   COUNT(*) FILTER (WHERE status = 'sent') as sent,
--   COUNT(*) FILTER (WHERE status = 'expired') as expired,
--   COUNT(*) FILTER (WHERE status = 'dismissed') as dismissed
-- FROM reminders;
