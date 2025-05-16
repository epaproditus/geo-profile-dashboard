#!/usr/bin/env node
// scripts/update-schedules-direct.js
//
// This script directly updates the recurring schedules by their IDs
// to reset their last_executed_at to null and update start_time to the next day

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { parseISO, format, addDays } from 'date-fns';

// The schedule IDs to update
const SCHEDULE_IDS = [
  '3cddcb90-8fbf-4355-9895-0dea7032f6c0', // BYE
  '3f4d0b72-39d7-406e-a411-59de832f13e6'  // HI
];

// Initialize Supabase client with direct credentials
// Replace these with your actual credentials if environment variables are not available
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://your-supabase-url.supabase.co';
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('\n⚠️ ERROR: SUPABASE_SERVICE_ROLE_KEY is not set in your environment!');
  console.error('You can run this script with the service role key directly like this:');
  console.error('SUPABASE_SERVICE_ROLE_KEY=your_actual_key node scripts/update-schedules-direct.js\n');
  process.exit(1);
}

console.log(`Using Supabase URL: ${supabaseUrl}`);
console.log(`Using Supabase Key: ${supabaseKey.substring(0, 5)}...`);

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateSchedules() {
  console.log('Directly updating recurring schedules...');
  
  for (const scheduleId of SCHEDULE_IDS) {
    console.log(`Processing schedule: ${scheduleId}`);
    
    try {
      // First, get the current schedule to see its time
      const { data: schedule, error: fetchError } = await supabase
        .from('schedules')
        .select('*')
        .eq('id', scheduleId)
        .single();
      
      if (fetchError) {
        console.error(`Error fetching schedule ${scheduleId}:`, fetchError.message);
        continue;
      }
      
      if (!schedule) {
        console.error(`Schedule ${scheduleId} not found`);
        continue;
      }
      
      console.log(`Found schedule: ${schedule.name} (${schedule.action_type})`);
      console.log(`Current start_time: ${schedule.start_time}`);
      console.log(`Current last_executed_at: ${schedule.last_executed_at}`);
      
      // Parse the original start_time
      const originalStartTime = parseISO(schedule.start_time);
      
      // Create tomorrow's date with the same time
      const tomorrow = addDays(new Date(), 1);
      const newStartTime = new Date(
        tomorrow.getFullYear(),
        tomorrow.getMonth(),
        tomorrow.getDate(),
        originalStartTime.getHours(),
        originalStartTime.getMinutes(),
        originalStartTime.getSeconds()
      );
      
      console.log(`New start_time: ${format(newStartTime, 'yyyy-MM-dd HH:mm:ss')}`);
      
      // Ensure we have proper recurrence settings
      const updateData = {
        start_time: newStartTime.toISOString(),
        last_executed_at: null,  // Reset so it can be executed
        schedule_type: 'recurring', // Ensure it's marked as recurring
        recurrence_pattern: schedule.recurrence_pattern || 'daily' // Ensure pattern exists
      };

      // Log the update we're performing
      console.log(`Updating schedule with data:`, updateData);
      
      // Update the schedule
      const { error: updateError } = await supabase
        .from('schedules')
        .update(updateData)
        .eq('id', scheduleId);
      
      if (updateError) {
        console.error(`Error updating schedule ${scheduleId}:`, updateError.message);
      } else {
        console.log(`Successfully reset schedule ${scheduleId}`);
      }
    } catch (err) {
      console.error(`Error processing schedule ${scheduleId}:`, err.message);
    }
  }
  
  console.log('Finished updating schedules.');
}

// Run the function
updateSchedules()
  .then(() => {
    console.log('Script completed successfully.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
