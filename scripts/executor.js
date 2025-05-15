#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Determine the current directory 
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables first
dotenv.config();

// Debug environment variables
console.log('Checking ntfy environment variables:');
console.log(`NTFY_SERVER: ${process.env.NTFY_SERVER || '(using default)'}`);
console.log(`NTFY_TOPIC: ${process.env.NTFY_TOPIC || '(using default)'}`);

// Import notification functions
let notifyProfileInstallation, notifyProfileRemoval;

try {
  // Import notifications.js from the same directory as executor.js
  const notificationsModule = await import(path.join(__dirname, 'notifications.js'));
  notifyProfileInstallation = notificationsModule.notifyProfileInstallation;
  notifyProfileRemoval = notificationsModule.notifyProfileRemoval;
  console.log('Successfully imported notification functions');
} catch (error) {
  console.error('Error importing notification functions:', error);
  // Provide fallback implementations that just log
  notifyProfileInstallation = ({ profileName, deviceName }) => {
    console.log(`[NOTIFICATION FALLBACK] Profile installed: ${profileName} on ${deviceName}`);
    return null;
  };
  notifyProfileRemoval = ({ profileName, deviceName }) => {
    console.log(`[NOTIFICATION FALLBACK] Profile removed: ${profileName} from ${deviceName}`);
    return null;
  };
}

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
        
        // Check if we should send a notification
        if (scheduleId) {
          // Get the schedule to check for notification preferences and metadata
          const { data: schedule, error: scheduleError } = await supabaseClient
            .from('schedules')
            .select('*')
            .eq('id', scheduleId)
            .single();
            
          if (!scheduleError && schedule && schedule.metadata) {
            const metadata = schedule.metadata;
            
            // If notifications are enabled in the metadata, send one
            if (metadata.notify) {
              log(`Notification is enabled for this profile installation. Metadata: ${JSON.stringify(metadata)}`);
              
              // Get profile and device names from metadata or fetch them
              let profileName = metadata.profile_name;
              let deviceName = metadata.device_name;
              
              // If names are not in metadata, try to fetch them
              if (!profileName) {
                try {
                  const profileData = await callSimpleMDM(`profiles/${profileId}`);
                  profileName = profileData.data.attributes.name || `Profile ${profileId}`;
                  log(`Fetched profile name: ${profileName}`);
                } catch (e) {
                  profileName = `Profile ${profileId}`;
                  log(`Could not fetch profile name: ${e.message}`);
                }
              }
              
              if (!deviceName) {
                try {
                  const deviceData = await callSimpleMDM(`devices/${deviceId}`);
                  deviceName = deviceData.data.attributes.name || `Device ${deviceId}`;
                  log(`Fetched device name: ${deviceName}`);
                } catch (e) {
                  deviceName = `Device ${deviceId}`;
                  log(`Could not fetch device name: ${e.message}`);
                }
              }
              
              // Send the notification
              log(`Attempting to send notification for profile ${profileName} to ${deviceName}`);
              try {
                const result = await notifyProfileInstallation({
                  profileId,
                  profileName,
                  deviceId,
                  deviceName,
                  isTemporary: metadata.is_temporary || false,
                  temporaryDuration: metadata.temporary_duration || 0
                });
                log(`Notification sent result: ${result ? 'Success' : 'Failed'}`);
              } catch (notifyError) {
                log(`Error sending notification: ${notifyError.message}`);
              }
              
              log(`Completed notification process for profile installation: ${profileName} to ${deviceName}`);
            } else {
              log('Notifications not enabled for this profile installation');
            }
          } else {
            log(`Could not find schedule metadata for notifications. Error: ${scheduleError}`);
          }
        }
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

// Helper function to remove a profile from a device
async function removeProfileFromDevice(profileId, deviceId, scheduleId, supabaseClient) {
  try {
    log(`Removing profile ${profileId} from device ${deviceId}`);
    const result = await callSimpleMDM(`profiles/${profileId}/devices/${deviceId}`, 'DELETE');
    log(`Successfully removed profile ${profileId} from device ${deviceId}`);
    
    // Log to the API logs table if it exists
    try {
      if (supabaseClient) {
        await supabaseClient.from('simplemdm_api_logs').insert({
          schedule_id: scheduleId,
          action_type: 'remove_profile',
          profile_id: Number(profileId),
          device_id: String(deviceId),
          request_url: `/profiles/${profileId}/devices/${deviceId}`,
          request_method: 'DELETE',
          success: true
        });
        
        // Check if we should send a notification
        if (scheduleId) {
          // Get the schedule to check for notification preferences and metadata
          const { data: schedule, error: scheduleError } = await supabaseClient
            .from('schedules')
            .select('*, parent_schedule:parent_schedule_id(*)')
            .eq('id', scheduleId)
            .single();
            
          if (!scheduleError && schedule) {
            const metadata = schedule.metadata || {};
            let parentMetadata = {};
            
            // If this is a scheduled removal of a temporary profile, the parent schedule may have the metadata
            if (schedule.parent_schedule_id && schedule.parent_schedule) {
              parentMetadata = schedule.parent_schedule.metadata || {};
            }
            
            // If notifications are enabled in either this schedule or the parent schedule
            if (metadata.notify || parentMetadata.notify) {
              // Get profile and device names from metadata or fetch them
              let profileName = metadata.profile_name || parentMetadata.profile_name;
              let deviceName = metadata.device_name || parentMetadata.device_name;
              let wasTemporary = metadata.was_temporary_installation || parentMetadata.is_temporary || false;
              
              // If names are not in metadata, try to fetch them
              if (!profileName) {
                try {
                  const profileData = await callSimpleMDM(`profiles/${profileId}`);
                  profileName = profileData.data.attributes.name || `Profile ${profileId}`;
                } catch (e) {
                  profileName = `Profile ${profileId}`;
                  log(`Could not fetch profile name: ${e.message}`);
                }
              }
              
              if (!deviceName) {
                try {
                  const deviceData = await callSimpleMDM(`devices/${deviceId}`);
                  deviceName = deviceData.data.attributes.name || `Device ${deviceId}`;
                } catch (e) {
                  deviceName = `Device ${deviceId}`;
                  log(`Could not fetch device name: ${e.message}`);
                }
              }
              
              // Send the notification
              await notifyProfileRemoval({
                profileId,
                profileName,
                deviceId,
                deviceName,
                wasTemporary
              });
              
              log(`Sent notification for profile removal: ${profileName} from ${deviceName}`);
            }
          }
        }
      }
    } catch (logError) {
      // Don't fail if logging fails
      log(`Note: Failed to log API call to database: ${logError.message}`);
    }
    
    return { success: true, deviceId };
  } catch (error) {
    // Check if this is a 409 error (profile not found), which we treat as success
    // SimpleMDM returns 409 when the profile is not installed on the device
    const isProfileNotFound = error.message.includes('409');
    
    if (isProfileNotFound) {
      log(`Profile ${profileId} not found on device ${deviceId} (409) - treating as success`);
      
      // Log as a successful operation (the end result is what we want - profile not on device)
      try {
        if (supabaseClient) {
          await supabaseClient.from('simplemdm_api_logs').insert({
            schedule_id: scheduleId,
            action_type: 'remove_profile',
            profile_id: Number(profileId),
            device_id: String(deviceId),
            request_url: `/profiles/${profileId}/devices/${deviceId}`,
            request_method: 'DELETE',
            success: true,
            response_status: 409,
            error_message: 'Profile not found on device (already removed)'
          });
        }
      } catch (logError) {
        log(`Note: Failed to log API call to database: ${logError.message}`);
      }
      
      // Send notification for removal even if it was already removed
      if (supabaseClient && scheduleId) {
        try {
          // Get the schedule to check for notification preferences
          const { data: schedule, error: scheduleError } = await supabaseClient
            .from('schedules')
            .select('*, parent_schedule:parent_schedule_id(*)')
            .eq('id', scheduleId)
            .single();
            
          if (!scheduleError && schedule) {
            const metadata = schedule.metadata || {};
            let parentMetadata = {};
            
            // If this is a scheduled removal of a temporary profile
            if (schedule.parent_schedule_id && schedule.parent_schedule) {
              parentMetadata = schedule.parent_schedule.metadata || {};
            }
            
            // If notifications are enabled
            if (metadata.notify || parentMetadata.notify) {
              let profileName = metadata.profile_name || parentMetadata.profile_name;
              let deviceName = metadata.device_name || parentMetadata.device_name;
              let wasTemporary = metadata.was_temporary_installation || parentMetadata.is_temporary || false;
              
              // If names are not in metadata, try to fetch them
              if (!profileName) {
                try {
                  const profileData = await callSimpleMDM(`profiles/${profileId}`);
                  profileName = profileData.data.attributes.name || `Profile ${profileId}`;
                } catch (e) {
                  profileName = `Profile ${profileId}`;
                  log(`Could not fetch profile name: ${e.message}`);
                }
              }
              
              if (!deviceName) {
                try {
                  const deviceData = await callSimpleMDM(`devices/${deviceId}`);
                  deviceName = deviceData.data.attributes.name || `Device ${deviceId}`;
                } catch (e) {
                  deviceName = `Device ${deviceId}`;
                  log(`Could not fetch device name: ${e.message}`);
                }
              }
              
              // Send notification with a note that the profile was already removed
              await notifyProfileRemoval({
                profileId,
                profileName,
                deviceId,
                deviceName,
                wasTemporary
              });
              
              log(`Sent notification for profile removal (already removed): ${profileName} from ${deviceName}`);
            }
          }
        } catch (notifyError) {
          log(`Failed to send notification: ${notifyError.message}`);
        }
      }
      
      // Return success since the profile is already not on the device
      return { success: true, deviceId, alreadyRemoved: true };
    }
    
    log(`Error removing profile ${profileId} from device ${deviceId}: ${error.message}`);
    
    // Log failed API call
    try {
      if (supabaseClient) {
        await supabaseClient.from('simplemdm_api_logs').insert({
          schedule_id: scheduleId,
          action_type: 'remove_profile',
          profile_id: Number(profileId),
          device_id: String(deviceId),
          request_url: `/profiles/${profileId}/devices/${deviceId}`,
          request_method: 'DELETE',
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
async function executeDeviceAction(schedule, supabaseClient) {
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
            const devices = await fetchFilteredDevices(deviceFilter, supabaseClient);
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
              pushProfileToDevice(profileId, device.id, schedule.id, supabaseClient)
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

      case 'remove_profile':
        // Implementation for removing a profile from devices
        const removeProfileId = schedule.profile_id;
        const removeDeviceFilter = schedule.device_filter;
        
        if (!removeProfileId) {
          return { success: false, message: 'No profile_id specified for remove_profile action' };
        }
        
        try {
          // If device_filter is specified, find matching devices
          let targetDevicesToRemove = [];
          if (removeDeviceFilter) {
            log(`Finding devices matching filter for profile removal: ${JSON.stringify(removeDeviceFilter)}`);
            const devicesToRemove = await fetchFilteredDevices(removeDeviceFilter, supabaseClient);
            targetDevicesToRemove = devicesToRemove.data || [];
            log(`Found ${targetDevicesToRemove.length} matching devices for profile removal`);
          } else if (schedule.device_group_id) {
            // If device_group_id is specified, get devices from that group
            log(`Getting devices from group ${schedule.device_group_id} for profile removal`);
            const removeResponse = await callSimpleMDM(`device_groups/${schedule.device_group_id}/devices`);
            targetDevicesToRemove = removeResponse.data || [];
            log(`Found ${targetDevicesToRemove.length} devices in group ${schedule.device_group_id} for profile removal`);
          } else {
            return { success: false, message: 'No device_group_id or device_filter specified for remove_profile action' };
          }
          
          if (targetDevicesToRemove.length === 0) {
            return { success: false, message: 'No matching devices found for the profile removal' };
          }
          
          // Remove the profile from each device
          log(`Removing profile ${removeProfileId} from ${targetDevicesToRemove.length} devices`);
          const removalResults = await Promise.all(
            targetDevicesToRemove.map(device => 
              removeProfileFromDevice(removeProfileId, device.id, schedule.id, supabaseClient)
            )
          );
          
          const removalSuccessCount = removalResults.filter(r => r.success).length;
          const alreadyRemovedCount = removalResults.filter(r => r.alreadyRemoved).length;
          
          return { 
            success: removalSuccessCount > 0, 
            message: `Profile ${removeProfileId} removed from ${removalSuccessCount}/${targetDevicesToRemove.length} devices (${alreadyRemovedCount} already removed)`,
            details: { deviceResults: removalResults }
          };
        } catch (error) {
          log(`Error removing profile: ${error.message}`);
          return { success: false, message: `Error removing profile: ${error.message}` };
        }
        
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
        const actionResult = await executeDeviceAction(schedule, supabase);
        
        // For recurring schedules, calculate the next execution time
        let updateData = { last_executed_at: now.toISOString() };
        
        if (schedule.schedule_type === 'recurring' && schedule.recurrence_pattern) {
          log(`Handling recurring schedule ${schedule.id} with pattern: ${schedule.recurrence_pattern}`);
          
          // Calculate next execution time based on recurrence pattern
          const nextTime = calculateNextExecutionTime(
            new Date(schedule.start_time), 
            schedule.recurrence_pattern,
            schedule.recurrence_days
          );
          
          if (nextTime) {
            updateData.start_time = nextTime.toISOString();
            updateData.last_executed_at = null; // Reset so it can execute again
            log(`Calculated next execution time for schedule ${schedule.id}: ${nextTime.toISOString()}`);
          }
        }
        
        // Update execution info in the database
        const { error: updateError } = await supabase
          .from('schedules')
          .update(updateData)
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
        log(`Error executing schedule ${schedule.id}: ${scheduleError.message}`);
          
          // Try to update the schedule with error information
          // Handle recurring schedules specially
          let updateData = { last_executed_at: now.toISOString() };
          
          if (schedule.schedule_type === 'recurring' && schedule.recurrence_pattern) {
            // Even on error, calculate the next execution time
            const nextTime = calculateNextExecutionTime(
              new Date(schedule.start_time), 
              schedule.recurrence_pattern,
              schedule.recurrence_days
            );
            
            if (nextTime) {
              updateData.start_time = nextTime.toISOString();
              updateData.last_executed_at = null; // Reset so it can execute again
              log(`Set next execution time for failed schedule ${schedule.id}: ${nextTime.toISOString()}`);
            }
          }
          
          try {
            await supabase
              .from('schedules')
              .update(updateData)
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

// Calculate next execution time based on recurrence pattern
function calculateNextExecutionTime(currentTime, pattern, recurrenceDays) {
  // If no pattern provided, can't calculate
  if (!pattern) return null;
  
  // Create a new date to avoid modifying the input
  const nextTime = new Date(currentTime);
  
  // Handle different recurrence patterns
  switch (pattern) {
    case 'daily':
      // Add one day
      nextTime.setDate(nextTime.getDate() + 1);
      break;
    
    case 'weekly':
      // Add one week
      nextTime.setDate(nextTime.getDate() + 7);
      break;
    
    case 'monthly':
      // Add one month, keeping the same day of the month
      nextTime.setMonth(nextTime.getMonth() + 1);
      break;
    
    case 'weekdays':
      // If array of days is provided, use that to find the next occurrence
      if (Array.isArray(recurrenceDays) && recurrenceDays.length > 0) {
        // Days are stored as integers (0-6, where 0 is Sunday)
        const today = nextTime.getDay();
        let daysUntilNext = 7;
        
        // Find the next day in the sequence
        for (const day of recurrenceDays) {
          const dayNum = parseInt(day, 10);
          if (isNaN(dayNum)) continue;
          
          // Calculate days until next occurrence
          let daysToAdd = dayNum - today;
          if (daysToAdd <= 0) daysToAdd += 7; // Wrap around to next week
          
          // Keep the smallest positive number of days
          if (daysToAdd < daysUntilNext) {
            daysUntilNext = daysToAdd;
          }
        }
        
        // Add the calculated days
        nextTime.setDate(nextTime.getDate() + daysUntilNext);
      } else {
        // Default to next day if no days specified
        nextTime.setDate(nextTime.getDate() + 1);
      }
      break;
    
    default:
      // Unknown pattern, no change
      return null;
  }
  
  return nextTime;
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
