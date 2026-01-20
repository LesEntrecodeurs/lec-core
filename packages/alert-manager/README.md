# @lec/alert

Critical alerting system for Ragnar. Monitors worker failures, detects critical errors, and sends grouped email alerts to administrators.

## Features

- **Alert Debouncing**: Groups alerts of the same type within a 5-minute window to prevent spam
- **Multiple Alert Types**: JOB_FAILURE, REPEATED_FAILURES, RATE_LIMIT, WORKER_DOWN
- **Severity Levels**: CRITICAL, HIGH, MEDIUM, LOW with color-coded emails
- **Email Notifications**: Sends alerts via Resend with React Email templates
- **Failure Detection**: Tracks failure rates and triggers alerts when thresholds are exceeded
- **Structured Logging**: All alert operations logged with full context

## Installation

This package is part of the Ragnar monorepo and is automatically available as a workspace dependency.

```json
{
  "dependencies": {
    "@lec/alert": "workspace:*"
  }
}
```

## Configuration

Add the following environment variables to your `.env`:

```bash
# Alert Configuration
ADMIN_EMAIL=admin@lec.com           # Required: Alert destination email
ALERT_ENABLED=true                     # Optional: Enable/disable alerting (default: true)
ALERT_FAILURES_THRESHOLD=5             # Optional: Failures before REPEATED_FAILURES alert (default: 5)
ALERT_TIME_WINDOW_MINUTES=10           # Optional: Time window for failure counting (default: 10)
ALERT_WEBHOOK_URL=                     # Optional: Webhook endpoint for alerts
```

## Usage

### Basic Alert Sending

```typescript
import { AlertManager, AlertType, AlertSeverity } from '@lec/alert';

// Send a critical alert
await AlertManager.getInstance().sendAlert({
  type: AlertType.JOB_FAILURE,
  severity: AlertSeverity.CRITICAL,
  workerName: 'digest-worker',
  timestamp: new Date(),
  context: {
    jobId: 'job-123',
    userId: 'user-456',
    error: 'OpenAI API timeout',
  },
  message: 'Digest generation failed after 3 retries',
});
```

### Worker Integration

Integrate alerts into BullMQ workers:

```typescript
import { AlertManager, AlertType, AlertSeverity } from '@lec/alert';
import { Worker } from 'bullmq';

const worker = new Worker('my-queue', processJob, { connection });

worker.on('failed', async (job, err) => {
  logger.error({ jobId: job?.id, error: err.message }, 'job failed');

  // Send alert on final failure
  if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
    await AlertManager.getInstance().sendAlert({
      type: AlertType.JOB_FAILURE,
      severity: AlertSeverity.CRITICAL,
      workerName: 'my-worker',
      timestamp: new Date(),
      context: {
        jobId: job.id,
        error: err.message,
        retryCount: job.attemptsMade,
      },
      message: `Job failed after ${job.attemptsMade} retries`,
    });
  }
});
```

### Failure Detection

Track job failures and automatically alert when thresholds are exceeded:

```typescript
import { FailureDetector } from '@lec/alert';

// Track a job failure
await FailureDetector.getInstance().trackJobFailure(
  'job-123',
  'digest-worker',
  'OpenAI API timeout'
);

// Automatically sends REPEATED_FAILURES alert if:
// - 5 failures occur within 10 minutes (configurable)
```

## Alert Types

### JOB_FAILURE

Triggered when a job fails after all retry attempts.

- **Severity**: CRITICAL
- **When**: Final failure (attemptsMade >= maxAttempts)
- **Context**: jobId, userId, error, retryCount

### REPEATED_FAILURES

Triggered when a worker exceeds the failure threshold within the time window.

- **Severity**: HIGH
- **When**: X failures in Y minutes (configurable)
- **Context**: failureCount, timeWindowMinutes, jobId, error

### RATE_LIMIT

Triggered when an API rate limit is hit (HTTP 429).

- **Severity**: HIGH
- **When**: Rate limit error detected
- **Context**: API name, retry-after header

### WORKER_DOWN

Triggered when a worker stops sending heartbeats.

- **Severity**: CRITICAL
- **When**: No heartbeat in 10 minutes
- **Context**: Last heartbeat timestamp

## Alert Debouncing

Alerts of the same type are grouped within a 5-minute window:

1. First alert of a type starts a 5-minute timer
2. Subsequent alerts of the same type are added to the buffer
3. After 5 minutes, all buffered alerts are sent in a single email
4. This prevents alert spam during cascading failures

## Email Format

Alert emails include:

- **Header**: Severity-coded banner (red for CRITICAL, yellow for HIGH)
- **Summary**: Total alert count, alert type, severity
- **Details**: Each alert with worker, timestamp, message, and context
- **Action Button**: Link to Bull Board dashboard
- **Footer**: Response guidance

Example subject lines:

- `🚨 CRITICAL: JOB_FAILURE`
- `⚠️ HIGH: REPEATED_FAILURES`
- `ℹ️ MEDIUM: WORKER_DOWN`

## Testing

### Simulate a Job Failure

```typescript
// Simulate enough retries to trigger alert
const job = {
  id: 'test-job',
  attemptsMade: 3,
  opts: { attempts: 3 },
  data: { userId: 'test-user' }
};

await AlertManager.getInstance().sendAlert({
  type: AlertType.JOB_FAILURE,
  severity: AlertSeverity.CRITICAL,
  workerName: 'test-worker',
  timestamp: new Date(),
  context: { jobId: job.id },
  message: 'Test failure',
});
```

### Test Debouncing

```typescript
// Send multiple alerts quickly
for (let i = 0; i < 5; i++) {
  await AlertManager.getInstance().sendAlert({
    type: AlertType.JOB_FAILURE,
    severity: AlertSeverity.CRITICAL,
    workerName: 'test-worker',
    timestamp: new Date(),
    context: { jobId: `job-${i}` },
    message: `Test failure ${i}`,
  });
}

// Wait 5 minutes - single grouped email will be sent
```

## Architecture

### Singleton Pattern

`AlertManager` uses a singleton pattern to maintain shared state:

- Single alert buffer across all imports
- Single set of debounce timers
- Graceful cleanup on process termination

### Error Handling

- Alerts use `Result<T, E>` type for error handling
- Alert failures are logged but don't throw exceptions
- System continues operating even if alerting fails

### Dependencies

- `@lec/core` - Alert types, configuration
- `@lec/email` - Resend client
- `@lec/logger` - Structured logging
- `@react-email/components` - Email templates
- `resend` - Email sending

## Troubleshooting

### Alerts Not Being Sent

1. **Check ADMIN_EMAIL**: Ensure `ADMIN_EMAIL` is set in environment
2. **Check ALERT_ENABLED**: Ensure `ALERT_ENABLED=true` (default)
3. **Check Logs**: Search for `"alert created"` and `"alert email sent"` in logs
4. **Check Resend**: Verify `RESEND_API_KEY` and `FROM_EMAIL` are configured

### Alerts Delayed

- Alerts are debounced by 5 minutes by design
- First alert of a type starts the timer
- Grouped email sent after timer expires

### Too Many Alerts

- Increase `ALERT_FAILURES_THRESHOLD` (default: 5)
- Increase `ALERT_TIME_WINDOW_MINUTES` (default: 10)
- Fix the root cause of failures

## Alert Response Procedures

### Viewing Failed Jobs in Bull Board

All alert emails include a link to the Bull Board dashboard. Bull Board provides:

- **Real-time Queue Monitoring**: View job counts by status (active, waiting, failed, completed)
- **Job Details**: Click any job to see full data, error messages, and stack traces
- **Retry Controls**: Manually retry failed jobs individually or in bulk
- **Job Logs**: View all attempts and their results

**Access Bull Board:**

1. Click the "View Bull Board Dashboard" button in the alert email
2. Or navigate directly to: `http://localhost:3001` (development)
3. Production URL: Set `BULL_BOARD_URL` environment variable

### Manually Retrying Failed Jobs

**Via Bull Board UI:**

1. Navigate to the failed queue (e.g., "digest-queue")
2. Click on the "Failed" tab
3. Select jobs to retry (or use "Retry All")
4. Click "Retry" button
5. Monitor the "Active" tab for progress

**Via CLI (if implemented):**

```bash
# Retry specific job
bun run retry-job --queue=digest-queue --job=job-123

# Retry all failed jobs in queue
bun run retry-all --queue=digest-queue
```

### Common Alert Scenarios

#### Scenario 1: JOB_FAILURE - OpenAI API Timeout

**Alert Context:**
- Type: JOB_FAILURE
- Severity: CRITICAL
- Error: "OpenAI API timeout"

**Response:**
1. Check OpenAI API status: https://status.openai.com
2. If API is down: Wait for recovery, jobs will auto-retry
3. If API is up: Check network connectivity and firewall rules
4. Review `OPENAI_API_KEY` environment variable
5. Manually retry failed jobs via Bull Board after resolving

**Prevention:**
- Increase timeout configuration if network is slow
- Add circuit breaker pattern for API calls
- Consider fallback to different model or provider

#### Scenario 2: REPEATED_FAILURES - High Failure Rate

**Alert Context:**
- Type: REPEATED_FAILURES
- Severity: HIGH
- Context: 5+ failures in 10 minutes

**Response:**
1. Open Bull Board and check the "Failed" tab
2. Identify common error pattern across failures
3. Check if it's a systematic issue (API down, database unavailable, configuration error)
4. If systematic: Fix root cause before retrying
5. If transient: Wait for auto-recovery and monitor

**Prevention:**
- Implement better error handling for known transient errors
- Add health checks before job processing
- Increase retry delays for temporary issues

#### Scenario 3: RATE_LIMIT - API Quota Exceeded

**Alert Context:**
- Type: RATE_LIMIT
- Severity: HIGH
- Error: HTTP 429
- Context: Includes retry-after header

**Response:**
1. Check the retry-after duration in alert context
2. Wait for the specified duration before retrying
3. Review API usage patterns and optimize if possible
4. Consider upgrading API tier if hitting limits frequently

**Prevention:**
- Implement rate limiting in application code
- Add backoff strategy for API calls
- Monitor API usage and set up proactive alerts before limits

#### Scenario 4: WORKER_DOWN - Worker Not Responding

**Alert Context:**
- Type: WORKER_DOWN
- Severity: CRITICAL
- Context: No heartbeat in 10 minutes

**Response:**
1. Check if worker process is running: `ps aux | grep worker`
2. Check worker logs for crash or errors
3. Restart worker if crashed: `bun run worker:restart`
4. Check system resources (CPU, memory, disk)
5. Review recent deployments or configuration changes

**Prevention:**
- Implement process monitoring (PM2, systemd)
- Add automatic restart on crash
- Set up resource alerts before critical levels

### Alert Escalation Matrix

| Severity | Response Time | Escalation Path |
|----------|---------------|-----------------|
| CRITICAL | < 5 minutes | On-call engineer → Engineering lead → CTO |
| HIGH | < 1 hour | On-call engineer → Engineering lead |
| MEDIUM | < 4 hours | Assigned engineer |
| LOW | Next business day | Backlog |

### Post-Incident Review

After resolving critical alerts:

1. **Document**: Record what happened, root cause, and resolution
2. **Analyze**: Review why the issue wasn't caught earlier
3. **Improve**: Update alerts, monitoring, or error handling
4. **Share**: Communicate learnings with the team

## Related Packages

- `@lec/core` - Core types and configuration
- `@lec/email` - Email sending infrastructure
- `@lec/logger` - Structured logging

## License

Private - Ragnar Project
