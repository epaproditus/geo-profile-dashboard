#!/usr/bin/env node
// filepath: scripts/executor.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Function to log messages to file and console
function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  
  // Try to log to file, but don't fail if it doesn't work
  try {
    const logFile = process.env.LOG_FILE || './scheduler.log';
    fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`);
  } catch (err) {
    console.error(`Could not write to log file: ${err.message}`);
  }
}

async function executeSchedules() {
  log('Starting schedule execution');
  
  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      log('Missing Supabase credentials');
      return { error: 'Database configuration missing' };
    }
    
    log(`Connecting to Supabase: ${supabaseUrl}`);
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test connection with a simple query
    const { data, error } = await supabase
      .from('schedules')
      .select('id', { count: 'exact', head: true });
    
    if (error) {
      log(`Database error: ${error.message}`);
      return { error: error.message };
    }
    
    log(`Database connection successful. Ready to check for schedules.`);
    
    // Find schedules due for execution
    const now = new Date();
    // Look for schedules that should have run in the last 15 minutes
    const pastWindow = new Date(now.getTime() - 15 * 60 * 1000);
    
    log(`Looking for schedules due between ${pastWindow.toISOString()} and ${now.toISOString()}`);
    
    const { data: schedulesToExecute, error: schedulesError } = await supabase
      .from('schedules')
      .select('*')
      .eq('enabled', true)
      .lte('start_time', now.toISOString())
      .gt('start_time', pastWindow.toISOString())
      .is('last_executed_at', null)
      .order('start_time', { ascending: true });
    
    if (schedulesError) {
      log(`Error fetching schedules: ${schedulesError.message}`);
      return { error: `Error fetching schedules: ${schedulesError.message}` };
    }
    
    // If no schedules to execute, return success
    if (!schedulesToExecute || schedulesToExecute.length === 0) {
      log('No schedules to execute');
      return { message: 'No schedules to execute' };
    }
    
    log(`Found ${schedulesToExecute.length} schedules to execute`);
    
    // Execute each schedule (simplified for testing)
    const results = await Promise.all(schedulesToExecute.map(async (schedule) => {
      try {
        log(`Executing schedule ${schedule.id}`);
        
        // Update execution time
        const { error: updateError } = await supabase
          .from('schedules')
          .update({ last_executed_at: now.toISOString() })
          .eq('id', schedule.id);
        
        if (updateError) {
          throw new Error(`Failed to update schedule: ${updateError.message}`);
        }
        
        log(`Successfully marked schedule ${schedule.id} as executed`);
        
        return {
          scheduleId: schedule.id,
          success: true,
          message: `Schedule ${schedule.id} marked as executed`
        };
      } catch (scheduleError) {
        log(`Error executing schedule ${schedule.id}: ${scheduleError.message}`);
        return {
          scheduleId: schedule.id,
          success: false,
          error: scheduleError.message
        };
      }
    }));
    
    const summary = {
      executed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
    
    log(`Execution complete: ${summary.executed} succeeded, ${summary.failed} failed`);
    return summary;
  } catch (error) {
    log(`Schedule execution error: ${error.message}`);
    return { error: 'Schedule execution failed', details: error.message };
  }
}

// Execute the function and log results
executeSchedules()
  .then(result => {
    log(`Execution complete: ${JSON.stringify(result, null, 2)}`);
  })
  .catch(error => {
    log(`Fatal error: ${error.message}`);
    process.exit(1);
  });
