# Adding Missing Database Columns

The scheduler was initially designed to use two columns that don't exist in the database yet:
- `last_execution_status` 
- `last_execution_result`

## Temporary Solution

The executor.js script has been modified to work without these columns, so the scheduler will continue to function correctly, but with reduced functionality. Currently, it will only update the `last_executed_at` timestamp when a job runs.

## Permanent Solution

To add these columns to the database, apply the migration file:

```bash
cd /path/to/geo-profile-dashboard
npx supabase db push
```

Or manually execute the SQL from the migration file:

```sql
ALTER TABLE schedules
ADD COLUMN IF NOT EXISTS last_execution_status TEXT,
ADD COLUMN IF NOT EXISTS last_execution_result JSONB;

CREATE INDEX IF NOT EXISTS idx_schedules_last_execution_status ON schedules(last_execution_status);
```

## After Migration

Once the columns are added, you can uncomment the relevant code in the `executor.js` script by removing the comment markers:

1. Find lines with `// last_execution_status` and `// last_execution_result`
2. Remove the `//` comment markers at the beginning of these lines

For example, change:

```javascript
// Update execution time in the database
const { error: updateError } = await supabase
  .from('schedules')
  .update({ 
    last_executed_at: now.toISOString()
    // last_execution_status: actionResult.success ? 'success' : 'failed',
    // last_execution_result: JSON.stringify(actionResult)
  })
  .eq('id', schedule.id);
```

To:

```javascript
// Update execution time in the database
const { error: updateError } = await supabase
  .from('schedules')
  .update({ 
    last_executed_at: now.toISOString(),
    last_execution_status: actionResult.success ? 'success' : 'failed',
    last_execution_result: JSON.stringify(actionResult)
  })
  .eq('id', schedule.id);
```
