#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
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

// Function to call SimpleMDM API
async function callSimpleMDM(endpoint, method = 'GET', data = null) {
  const apiKey = process.env.SIMPLEMDM_API_KEY;
  if (!apiKey) {
    throw new Error('SimpleMDM API key is missing');
  }
  
  const baseUrl = 'https://a.simplemdm.com/api/v1';
  const url = `${baseUrl}/${endpoint}`;
  
  log(`Calling SimpleMDM API: ${method} ${endpoint}`);
  
  const options = {
    method,
    headers: {
      'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };
  
  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(url, options);
    
    // Handle empty responses (like 204 No Content)
    let responseData;
    const contentType = response.headers.get('content-type');
    
    if (response.status === 204 || !contentType || !contentType.includes('application/json')) {
      // For empty responses or non-JSON responses, don't try to parse JSON
      responseData = { success: true, status: response.status };
    } else {
      try {
        responseData = await response.json();
      } catch (jsonError) {
        log(`Warning: Could not parse JSON response: ${jsonError.message}`);
        responseData = { 
          success: response.ok,
          status: response.status,
          text: await response.text()
        };
      }
    }
    
    if (!response.ok) {
      log(`SimpleMDM API error: ${response.status} - ${JSON.stringify(responseData)}`);
      throw new Error(`SimpleMDM API error: ${response.status}`);
    }
    
    return responseData;
  } catch (error) {
    log(`SimpleMDM API call failed: ${error.message}`);
    throw error;
  }
}

// Helper function to push a profile to a device
async function pushProfileToDevice(profileId, deviceId, scheduleId, supabaseClient) {
  try {
    log(`Pushing profile ${profileId} to device ${deviceId}`);
    const result = await callSimpleMDM(`profiles/${profileId}/devices/${deviceId}`, 'POST');
    log(`Successfully pushed profile ${profileId} to device ${deviceId}`);
    
    // Log to the API logs table if it exists
    try {
      if (supabaseClient) {
        await supabaseClient.from('simplemdm_api_logs').insert({
          schedule_id: scheduleId,
          action_type: 'push_profile',
          profile_id: Number(profileId),
          device_id: String(deviceId),
          request_url: `/profiles/${profileId}/devices/${deviceId}`,
          request_method: 'POST',
          success: true
        });
      }
    } catch (logError) {
      // Don't fail if logging fails
      log(`Note: Failed to log API call to database: ${logError.message}`);
    }
    
    return { success: true, deviceId };
  } catch (error) {
    log(`Error pushing profile ${profileId} to device ${deviceId}: ${error.message}`);
    
    // Log failed API call
    try {
      if (supabaseClient) {
        await supabaseClient.from('simplemdm_api_logs').insert({
          schedule_id: scheduleId,
          action_type: 'push_profile',
          profile_id: Number(profileId),
          device_id: String(deviceId),
          request_url: `/profiles/${profileId}/devices/${deviceId}`,
          request_method: 'POST',
          success: false,
          error_message: error.message
        });
      }
    } catch (logError) {
      log(`Note: Failed to log API error to database: ${logError.message}`);
    }
    
    return { success: false, deviceId, error: error.message };
  }
}

// Helper function to fetch devices matching a filter
async function fetchFilteredDevices(filter, supabaseClient) {
  // Get all devices
  const allDevices = await callSimpleMDM('devices');
  const devices = allDevices.data || [];
  
  // Apply filters
  let filteredDevices = [...devices];
  
  // Filter by name contains
  if (filter.nameContains) {
    log(`Filtering devices where name contains '${filter.nameContains}'`);
    filteredDevices = filteredDevices.filter(device => 
      device.attributes.name && device.attributes.name.toLowerCase().includes(filter.nameContains.toLowerCase())
    );
  }
  
  // Filter by group IDs if specified
  if (filter.groupIds && filter.groupIds.length > 0) {
    log(`Filtering devices in groups: ${filter.groupIds.join(', ')}`);
    filteredDevices = filteredDevices.filter(device => 
      device.relationships?.device_group && 
      filter.groupIds.includes(device.relationships.device_group.data.id)
    );
  }
  
  return { data: filteredDevices };
}

// Function to execute a device update based on schedule type
async function executeDeviceAction(schedule) {
  if (!schedule.action_type) {
    log(`No action_type specified for schedule ${schedule.id}`);
    return { success: false, message: 'No action_type specified' };
  }
  
  try {
    switch (schedule.action_type) {
      case 'update_os':
        // Get devices in group
        const deviceGroupId = schedule.device_group_id;
        if (!deviceGroupId) {
          return { success: false, message: 'No device_group_id specified for update_os action' };
        }
        
        log(`Getting devices for group ${deviceGroupId}`);
        const groupResponse = await callSimpleMDM(`device_groups/${deviceGroupId}/devices`);
        
        if (!groupResponse.data || groupResponse.data.length === 0) {
          log(`No devices found in group ${deviceGroupId}`);
          return { success: true, message: 'No devices in group to update' };
        }
        
        log(`Found ${groupResponse.data.length} devices in group ${deviceGroupId}`);
        
        // Update each device
        for (const device of groupResponse.data) {
          log(`Sending update request to device ${device.id} (${device.name})`);
          await callSimpleMDM(`devices/${device.id}/update_os`, 'POST');
        }
        
        return { 
          success: true, 
          message: `OS update initiated for ${groupResponse.data.length} devices in group ${deviceGroupId}`,
          devices: groupResponse.data.map(d => ({ id: d.id, name: d.name }))
        };
        
      case 'push_apps':
        // Similar implementation for pushing apps
        const groupId = schedule.device_group_id;
        if (!groupId) {
          return { success: false, message: 'No device_group_id specified for push_apps action' };
        }
        
        log(`Pushing apps to devices in group ${groupId}`);
        await callSimpleMDM(`device_groups/${groupId}/push_apps`, 'POST');
        
        return { success: true, message: `Apps push initiated for device group ${groupId}` };
        
      case 'push_profile':
        // Implementation for pushing a profile to devices
        const assignmentGroupId = schedule.assignment_group_id;
        const profileId = schedule.profile_id;
        const deviceFilter = schedule.device_filter;
        
        if (!profileId) {
          return { success: false, message: 'No profile_id specified for push_profile action' };
        }
        
        // Check if we're pushing via assignment group
        if (assignmentGroupId) {
          log(`Pushing profile ${profileId} to assignment group ${assignmentGroupId}`);
          await callSimpleMDM(`assignment_groups/${assignmentGroupId}/profiles/${profileId}`, 'POST');
          return { success: true, message: `Profile ${profileId} pushed to assignment group ${assignmentGroupId}` };
        }
        
        // Otherwise, we need to find the target devices and push directly
        try {
          // If device_filter is specified, find matching devices
          let targetDevices = [];
          if (deviceFilter) {
            log(`Finding devices matching filter: ${JSON.stringify(deviceFilter)}`);
            const devices = await fetchFilteredDevices(deviceFilter, supabase);
            targetDevices = devices.data || [];
            log(`Found ${targetDevices.length} matching devices`);
          } else if (schedule.device_group_id) {
            // If device_group_id is specified, get devices from that group
            log(`Getting devices from group ${schedule.device_group_id}`);
            const response = await callSimpleMDM(`device_groups/${schedule.device_group_id}/devices`);
            targetDevices = response.data || [];
            log(`Found ${targetDevices.length} devices in group ${schedule.device_group_id}`);
          } else {
            return { success: false, message: 'No assignment_group_id, device_group_id, or device_filter specified for push_profile action' };
          }
          
          if (targetDevices.length === 0) {
            return { success: false, message: 'No matching devices found for the profile push' };
          }
          
          // Push the profile to each device
          log(`Pushing profile ${profileId} to ${targetDevices.length} devices`);
          const results = await Promise.all(
            targetDevices.map(device => 
              pushProfileToDevice(profileId, device.id, schedule.id, supabase)
            )
          );
          
          const successCount = results.filter(r => r.success).length;
          return { 
            success: successCount > 0, 
            message: `Profile ${profileId} pushed to ${successCount}/${targetDevices.length} devices`,
            details: { deviceResults: results }
          };
        } catch (error) {
          log(`Error pushing profile: ${error.message}`);
          return { success: false, message: `Error pushing profile: ${error.message}` };
        }
        
        return { 
          success: true, 
          message: `Profile ${profileId} assigned to assignment group ${assignmentGroupId}` 
        };
        
      case 'custom_command':
        // Execute custom command
        if (!schedule.command_data) {
          return { success: false, message: 'No command_data specified for custom_command action' };
        }
        
        const targetGroupId = schedule.device_group_id;
        if (!targetGroupId) {
          return { success: false, message: 'No device_group_id specified for custom_command action' };
        }
        
        log(`Executing custom command for group ${targetGroupId}: ${schedule.command_data.substring(0, 50)}...`);
        await callSimpleMDM(`device_groups/${targetGroupId}/custom_commands`, 'POST', {
          command: schedule.command_data
        });
        
        return { success: true, message: `Custom command executed for device group ${targetGroupId}` };
        
      default:
        log(`Unknown action_type: ${schedule.action_type}`);
        return { success: false, message: `Unknown action_type: ${schedule.action_type}` };
    }
  } catch (error) {
    log(`Error executing action ${schedule.action_type}: ${error.message}`);
    return { success: false, message: `Error: ${error.message}` };
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
      .select('id')
      .limit(1);
    
    if (error) {
      log(`Database error: ${error.message}`);
      return { error: error.message };
    }
    
    log(`Database connection successful. Ready to check for schedules.`);
    
    // Find schedules due for execution
    const now = new Date();
    // Look for schedules that should have run in the last 15 minutes
    const pastWindow = new Date(now.getTime() - 15 * 60 * 1000);
    // Also look for schedules coming up in the next 5 minutes
    const futureWindow = new Date(now.getTime() + 5 * 60 * 1000);
    
    log(`Looking for schedules due between ${pastWindow.toISOString()} and ${futureWindow.toISOString()}`);
    
    const { data: schedulesToExecute, error: schedulesError } = await supabase
      .from('schedules')
      .select('*')
      .eq('enabled', true)
      .lte('start_time', futureWindow.toISOString())
      .gt('start_time', pastWindow.toISOString())
      .is('last_executed_at', null)
      .order('start_time', { ascending: true});
    
    if (schedulesError) {
      log(`Error fetching schedules: ${schedulesError.message}`);
      return { error: `Error fetching schedules: ${schedulesError.message}` };
    }
    
    // If no schedules to execute, return success
    if (!schedulesToExecute || schedulesToExecute.length === 0) {
      log('No schedules to execute');
      return { message: 'No schedules to execute' };
    }
    
    // Filter out invalid schedules (those without an action_type)
    const validSchedules = schedulesToExecute.filter(schedule => schedule.action_type);
    const invalidSchedules = schedulesToExecute.filter(schedule => !schedule.action_type);
    
    // Mark invalid schedules as executed with an error
    if (invalidSchedules.length > 0) {
      log(`Found ${invalidSchedules.length} invalid schedules without action_type`);
      
      await Promise.all(invalidSchedules.map(async (schedule) => {
        try {
          const { error: updateError } = await supabase
            .from('schedules')
            .update({ 
              last_executed_at: now.toISOString()
              // Status and result columns commented out until they are added to the schema
              // last_execution_status: 'invalid',
              // last_execution_result: JSON.stringify({ error: 'No action_type specified' })
            })
            .eq('id', schedule.id);
          
          if (updateError) {
            log(`Failed to mark invalid schedule ${schedule.id}: ${updateError.message}`);
          } else {
            log(`Marked invalid schedule ${schedule.id} as executed with error`);
          }
        } catch (error) {
          log(`Error handling invalid schedule ${schedule.id}: ${error.message}`);
        }
      }));
    }
    
    log(`Found ${validSchedules.length} valid schedules to execute`);
    
    // Execute each schedule
    const results = await Promise.all(validSchedules.map(async (schedule) => {
      try {
        log(`Executing schedule ${schedule.id}`);
        
        // Execute the appropriate action based on schedule type
        const actionResult = await executeDeviceAction(schedule);
        
        // Update execution time in the database
        // Note: Only updating last_executed_at as other columns don't exist yet
        const { error: updateError } = await supabase
          .from('schedules')
          .update({ 
            last_executed_at: now.toISOString()
            // Status and result columns commented out until they are added to the schema
            // last_execution_status: actionResult.success ? 'success' : 'failed',
            // last_execution_result: JSON.stringify(actionResult)
          })
          .eq('id', schedule.id);
        
        if (updateError) {
          throw new Error(`Failed to update schedule: ${updateError.message}`);
        }
        
        log(`Successfully executed schedule ${schedule.id}: ${actionResult.message}`);
        
        return {
          scheduleId: schedule.id,
          success: actionResult.success,
          message: actionResult.message,
          details: actionResult
        };
      } catch (scheduleError) {
        log(`Error executing schedule ${schedule.id}: ${scheduleError.message}`);          // Try to update the schedule with error information
          // Note: Only updating last_executed_at as other columns don't exist yet
          try {
            await supabase
              .from('schedules')
              .update({ 
                last_executed_at: now.toISOString()
                // Status and result columns commented out until they are added to the schema
                // last_execution_status: 'error',
                // last_execution_result: JSON.stringify({ error: scheduleError.message })
              })
              .eq('id', schedule.id);
        } catch (dbError) {
          log(`Failed to update schedule with error status: ${dbError.message}`);
        }
        
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
