#!/usr/bin/env node
// scripts/check-hi-bye-schedules.js
//
// This script checks the status of the HI and BYE recurring schedules
// and logs diagnostic information to help troubleshoot issues

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// The schedule IDs to check
const SCHEDULE_IDS = [
  '3cddcb90-8fbf-4355-9895-0dea7032f6c0', // BYE
  '3f4d0b72-39d7-406e-a411-59de832f13e6'  // HI
];

// Schedule names for reference
const SCHEDULE_NAMES = {
  '3cddcb90-8fbf-4355-9895-0dea7032f6c0': 'BYE (Profile Removal)',
  '3f4d0b72-39d7-406e-a411-59de832f13e6': 'HI (Profile Installation)'
};

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('\n⚠️ ERROR: Supabase credentials are missing!');
  console.error('You can run this script with the service role key directly:');
  console.error('SUPABASE_URL=your_url SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/check-hi-bye-schedules.js\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchedules() {
  console.log('Checking HI and BYE schedules status...\n');
  
  const now = new Date();
  const nowStr = now.toISOString();
  console.log(`Current time: ${nowStr}`);
  
  // Find execution window times
  const pastWindow = new Date(now.getTime() - 15 * 60 * 1000);
  const futureWindow = new Date(now.getTime() + 5 * 60 * 1000);
  
  console.log(`Executor window: ${pastWindow.toISOString()} to ${futureWindow.toISOString()}`);
  console.log('(Schedules with start_time in this window and last_executed_at=NULL will be picked up)\n');
  
  // Check each schedule
  for (const scheduleId of SCHEDULE_IDS) {
    try {
      console.log(`Checking schedule: ${SCHEDULE_NAMES[scheduleId]} (${scheduleId})`);
      
      // Get the schedule details
      const { data: schedule, error: fetchError } = await supabase
        .from('schedules')
        .select('*')
        .eq('id', scheduleId)
        .single();
      
      if (fetchError) {
        console.error(`  ERROR: Could not fetch schedule: ${fetchError.message}`);
        continue;
      }
      
      if (!schedule) {
        console.error(`  ERROR: Schedule not found`);
        continue;
      }
      
      // Output schedule details
      console.log(`  Name: ${schedule.name}`);
      console.log(`  Enabled: ${schedule.enabled ? 'Yes' : 'No'}`);
      console.log(`  Schedule type: ${schedule.schedule_type || 'Not set'}`);
      console.log(`  Recurrence pattern: ${schedule.recurrence_pattern || 'Not set'}`);
      console.log(`  Start time: ${schedule.start_time}`);
      console.log(`  Last executed at: ${schedule.last_executed_at || 'NULL'}`);
      
      // Check if this schedule would be picked up by the executor
      const startTime = new Date(schedule.start_time);
      const inWindow = startTime >= pastWindow && startTime <= futureWindow;
      const lastExecutedNull = schedule.last_executed_at === null;
      const wouldExecute = schedule.enabled && inWindow && lastExecutedNull;
      
      console.log('\n  Execution eligibility:');
      console.log(`  - Enabled: ${schedule.enabled ? '✓' : '✗'}`);
      console.log(`  - Start time in window: ${inWindow ? '✓' : '✗'}`);
      console.log(`  - Last executed is NULL: ${lastExecutedNull ? '✓' : '✗'}`);
      console.log(`  - Would be executed: ${wouldExecute ? '✓ YES' : '✗ NO'}`);
      
      if (!wouldExecute) {
        console.log('\n  Reason not eligible for execution:');
        if (!schedule.enabled) {
          console.log('  - Schedule is disabled');
        }
        if (!inWindow) {
          console.log(`  - Start time (${schedule.start_time}) is outside execution window`);
          
          // Calculate how far off it is
          const diffMs = startTime - now;
          const diffMin = Math.round(diffMs / 60000);
          if (diffMin > 0) {
            console.log(`  - Start time is ${diffMin} minutes in the future`);
          } else {
            console.log(`  - Start time was ${Math.abs(diffMin)} minutes ago`);
          }
        }
        if (!lastExecutedNull) {
          console.log('  - Last executed at is not NULL, so it will not run again');
        }
      }
      
      console.log('\n---------------------------------------\n');
      
    } catch (err) {
      console.error(`Error checking schedule ${scheduleId}:`, err);
    }
  }
  
  console.log('Schedule check complete.');
}

// Run the function
checkSchedules().catch(err => {
  console.error('Error in checkSchedules:', err);
  process.exit(1);
});
