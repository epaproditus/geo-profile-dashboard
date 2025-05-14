#!/usr/bin/env node
// scripts/fix-recurring-schedules.js
//
// This script fixes recurring schedules that were not properly reset after execution
// It resets the last_executed_at field to null and updates the start_time to today
// for the same time as the original schedule.

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { parseISO, format, addDays } from 'date-fns';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixRecurringSchedules() {
  console.log('Fixing recurring schedules...');
  
  // Get all recurring schedules that have been executed (have last_executed_at)
  // but were not properly reset for the next run
  const { data: schedulesToFix, error: fetchError } = await supabase
    .from('schedules')
    .select('*')
    .eq('schedule_type', 'recurring')
    .not('last_executed_at', 'is', null)
    .eq('enabled', true);
  
  if (fetchError) {
    console.error('Error fetching schedules:', fetchError.message);
    return;
  }
  
  if (!schedulesToFix || schedulesToFix.length === 0) {
    console.log('No recurring schedules need to be fixed.');
    return;
  }
  
  console.log(`Found ${schedulesToFix.length} recurring schedules to fix.`);
  
  // Process each schedule
  for (const schedule of schedulesToFix) {
    console.log(`Processing schedule: ${schedule.id} (${schedule.name})`);
    
    try {
      // Parse the original start_time to extract time components
      const originalStartTime = parseISO(schedule.start_time);
      
      // Get today's date
      const now = new Date();
      
      // Create a new date for today with the same time as the original schedule
      const hours = originalStartTime.getHours();
      const minutes = originalStartTime.getMinutes();
      const seconds = originalStartTime.getSeconds();
      
      // Start with today's date
      let newStartTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hours,
        minutes,
        seconds
      );
      
      // If the time has already passed today, set it for tomorrow
      if (newStartTime < now) {
        newStartTime = addDays(newStartTime, 1);
        console.log(`  Time already passed today, scheduling for tomorrow`);
      }
      
      console.log(`  Original start time: ${format(originalStartTime, 'yyyy-MM-dd HH:mm:ss')}`);
      console.log(`  New start time: ${format(newStartTime, 'yyyy-MM-dd HH:mm:ss')}`);
      
      // Update the schedule
      const { error: updateError } = await supabase
        .from('schedules')
        .update({
          start_time: newStartTime.toISOString(),
          last_executed_at: null
        })
        .eq('id', schedule.id);
      
      if (updateError) {
        console.error(`  Error updating schedule ${schedule.id}:`, updateError.message);
      } else {
        console.log(`  Successfully updated schedule ${schedule.id}`);
      }
    } catch (err) {
      console.error(`  Error processing schedule ${schedule.id}:`, err.message);
    }
  }
  
  console.log('Finished fixing recurring schedules.');
}

// Run the function
fixRecurringSchedules()
  .then(() => {
    console.log('Script completed successfully.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
