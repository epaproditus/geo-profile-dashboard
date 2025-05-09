#!/usr/bin/env node

// This script directly executes the schedule logic without needing an HTTP request
// It can be run by a cron job as root

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function executeSchedules() {
  // Track execution start time for telemetry
  const startTime = Date.now();
  let cronitorStatus = 'success';
  let cronitorMessage = '';
  
  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get the SimpleMDM API key
    const simpleMdmApiKey = process.env.SIMPLEMDM_API_KEY || process.env.VITE_SIMPLEMDM_API_KEY;
    
    if (!simpleMdmApiKey) {
      throw new Error('SimpleMDM API key not configured');
    }

    // Find schedules due for execution
    const now = new Date();
    const pastWindow = new Date(now.getTime() - 15 * 60 * 1000);
    
    const { data: schedulesToExecute, error: schedulesError } = await supabase
      .from('schedules')
      .select('*')
      .eq('enabled', true)
      .lte('start_time', now.toISOString())
      .gt('start_time', pastWindow.toISOString())
      .is('last_executed_at', null)
      .order('start_time', { ascending: true });
    
    if (schedulesError) {
      throw new Error(`Error fetching schedules: ${schedulesError.message}`);
    }
    
    // If no schedules to execute, return success
    if (!schedulesToExecute || schedulesToExecute.length === 0) {
      logToFile('No schedules to execute');
      return { message: 'No schedules to execute' };
    }
    
    logToFile(`Found ${schedulesToExecute.length} schedules to execute`);
    
    // Process each schedule
    const results = await Promise.all(schedulesToExecute.map(async (schedule) => {
      try {
        // For recurring schedules, calculate the next execution time
        let updateData = { last_executed_at: now.toISOString() };
        
        if (schedule.schedule_type === 'recurring' && schedule.recurrence_pattern) {
          // Calculate next execution time based on recurrence pattern
          const nextTime = calculateNextExecutionTime(
            new Date(schedule.start_time), 
            schedule.recurrence_pattern,
            schedule.recurrence_days
          );
          
          if (nextTime) {
            updateData.start_time = nextTime.toISOString();
            updateData.last_executed_at = null; // Reset so it can execute again
          }
        }
        
        // Get devices that match the filter
        let targetDevices = [];
        
        // If there's a device filter, apply it
        if (schedule.device_filter) {
          try {
            const filter = JSON.parse(schedule.device_filter);
            // Fetch devices based on the filter
            const { data: devices } = await fetchFilteredDevices(filter, simpleMdmApiKey);
            targetDevices = devices || [];
          } catch (filterError) {
            logToFile(`Error processing device filter for schedule ${schedule.id}: ${filterError.message}`);
            // If filter fails, don't apply to any devices
            targetDevices = [];
          }
        } else {
          // If no filter, get all devices
          const { data: devices } = await fetchAllDevices(simpleMdmApiKey);
          targetDevices = devices || [];
        }
        
        // Apply the profile to each device
        const profileApplicationResults = await Promise.all(
          targetDevices.map(device => 
            pushProfileToDevice(schedule.profile_id, device.id, simpleMdmApiKey)
          )
        );
        
        // Update the schedule in the database
        const { error: updateError } = await supabase
          .from('schedules')
          .update(updateData)
          .eq('id', schedule.id);
        
        if (updateError) {
          throw new Error(`Failed to update schedule: ${updateError.message}`);
        }
        
        return {
          scheduleId: schedule.id,
          profileId: schedule.profile_id,
          devicesCount: targetDevices.length,
          success: true,
          message: `Profile ${schedule.profile_id} pushed to ${targetDevices.length} devices`,
          nextExecution: updateData.start_time || null
        };
      } catch (scheduleError) {
        logToFile(`Error executing schedule ${schedule.id}: ${scheduleError}`);
        return {
          scheduleId: schedule.id,
          success: false,
          error: scheduleError.message
        };
      }
    }));
    
    // Send telemetry to Cronitor with execution results
    const executionTime = Date.now() - startTime;
    cronitorMessage = `Executed ${results.filter(r => r.success).length} schedules, ${results.filter(r => !r.success).length} failed`;
    
    await sendCronitorTelemetry({
      status: results.some(r => !r.success) ? 'warning' : 'success',
      message: cronitorMessage,
      metrics: {
        duration: executionTime,
        count: schedulesToExecute.length
      }
    });
    
    logToFile(cronitorMessage);
    return {
      executed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
      executionTime
    };
  } catch (error) {
    logToFile(`Schedule execution error: ${error.message}`);
    
    // Send failure telemetry to Cronitor
    cronitorStatus = 'fail';
    cronitorMessage = `Error: ${error.message}`;
    
    await sendCronitorTelemetry({
      status: cronitorStatus,
      message: cronitorMessage
    });
    
    return { error: 'Schedule execution failed', details: error.message };
  }
}

// Helper function to send telemetry to Cronitor
async function sendCronitorTelemetry({ status = 'success', message = '', metrics = {} }) {
  try {
    const params = new URLSearchParams();
    
    // Add status and message
    params.append('state', status);
    if (message) params.append('message', message);
    
    // Add any metrics
    Object.entries(metrics).forEach(([key, value]) => {
      params.append(key, value.toString());
    });
    
    // Build the telemetry URL
    const telemetryUrl = `${CRONITOR_BASE_URL}${CRONITOR_MONITOR_KEY}?${params.toString()}`;
    
    // Send the telemetry ping
    const response = await fetch(telemetryUrl);
    
    if (!response.ok) {
      console.error('Failed to send Cronitor telemetry:', await response.text());
    }
  } catch (err) {
    console.error('Error sending Cronitor telemetry:', err);
  }
}

// Helper function to calculate next execution time based on recurrence pattern
function calculateNextExecutionTime(currentTime, pattern, recurrenceDays) {
  const nextTime = new Date(currentTime);
  
  switch (pattern) {
    case 'daily':
      nextTime.setDate(nextTime.getDate() + 1);
      break;
      
    case 'weekly':
      if (Array.isArray(recurrenceDays) && recurrenceDays.length > 0) {
        // Get current day of week (0 = Sunday, 6 = Saturday)
        const currentDay = nextTime.getDay();
        
        // Find the next day in the recurrence array
        const sortedDays = [...recurrenceDays].sort((a, b) => a - b);
        let nextDay = sortedDays.find(day => day > currentDay);
        
        if (nextDay === undefined) {
          // If no day is greater than current day, take the first day and add a week
          nextDay = sortedDays[0];
          nextTime.setDate(nextTime.getDate() + (7 - currentDay + nextDay));
        } else {
          // Set to the next day in the same week
          nextTime.setDate(nextTime.getDate() + (nextDay - currentDay));
        }
      } else {
        // Default: add 7 days
        nextTime.setDate(nextTime.getDate() + 7);
      }
      break;
      
    case 'monthly':
      // Move to the next month, same day
      nextTime.setMonth(nextTime.getMonth() + 1);
      break;
      
    default:
      return null; // Not a recurring schedule or unknown pattern
  }
  
  return nextTime;
}

// Helper function to fetch all devices from SimpleMDM
async function fetchAllDevices(apiKey) {
  try {
    const response = await fetch('https://a.simplemdm.com/api/v1/devices', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`SimpleMDM API error: ${response.status}`);
    }
    
    const data = await response.json();
    return { data: data.data };
  } catch (error) {
    console.error('Error fetching devices:', error);
    return { data: [], error };
  }
}

// Helper function to fetch filtered devices
async function fetchFilteredDevices(filter, apiKey) {
  // This is a simplified implementation
  // In a real-world scenario, you might need more complex filtering logic
  const devices = await fetchAllDevices(apiKey);
  
  if (!devices.data) return { data: [] };
  
  // Apply filter - this is very basic and should be enhanced based on your requirements
  let filteredDevices = devices.data;
  
  if (filter.groupIds && filter.groupIds.length > 0) {
    // If you have device group IDs to filter by, add logic here
    // This would require additional API calls to get group members
  }
  
  if (filter.nameContains) {
    filteredDevices = filteredDevices.filter(device => 
      device.attributes.name.toLowerCase().includes(filter.nameContains.toLowerCase())
    );
  }
  
  return { data: filteredDevices };
}

// Helper function to push a profile to a device
async function pushProfileToDevice(profileId, deviceId, apiKey) {
  try {
    const response = await fetch(`https://a.simplemdm.com/api/v1/profiles/${profileId}/devices/${deviceId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SimpleMDM API error (${response.status}): ${errorText}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error(`Error pushing profile ${profileId} to device ${deviceId}:`, error);
    return { success: false, error: error.message };
  }
}

function logToFile(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  try {
    // Check if we can write to the system log
    fs.appendFileSync(LOG_FILE, logMessage);
  } catch (error) {
    // If we can't write to the system log, log to the console
    console.error(`Could not write to log file: ${error.message}`);
    console.log(logMessage);
  }
}

// Execute schedules and handle the result
executeSchedules()
  .then(result => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
