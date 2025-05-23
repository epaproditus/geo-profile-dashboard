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

// Log file settings
const LOG_FILE = process.env.LOG_FILE || './scheduler.log';
console.log(`Logs are being written to: ${path.resolve(LOG_FILE)}`);

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
  console.log(`Notification function types - installation: ${typeof notifyProfileInstallation}, removal: ${typeof notifyProfileRemoval}`);
  
  // Verify the functions
  if (typeof notifyProfileInstallation !== 'function') {
    console.error(`WARNING: notifyProfileInstallation is not a function, it's a ${typeof notifyProfileInstallation}`);
  }
  if (typeof notifyProfileRemoval !== 'function') {
    console.error(`WARNING: notifyProfileRemoval is not a function, it's a ${typeof notifyProfileRemoval}`);
  }
} catch (error) {
  console.error('Error importing notification functions:', error);
  console.error('Error stack:', error.stack);
  // Provide fallback implementations that just log
  notifyProfileInstallation = ({ profileName, deviceName, profileId, deviceId, isTemporary, temporaryDuration }) => {
    console.log(`[NOTIFICATION FALLBACK] Profile installed: ${profileName} on ${deviceName}`);
    return null;
  };
  notifyProfileRemoval = ({ profileName, deviceName, profileId, deviceId, wasTemporary }) => {
    console.log(`[NOTIFICATION FALLBACK] Profile removed: ${profileName} from ${deviceName}`);
    return null;
  };
}

// Function to log messages to file and console
function log(message) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}`;
  console.log(formattedMessage);
  
  // Try to log to file, but don't fail if it doesn't work
  try {
    const logFile = process.env.LOG_FILE || './scheduler.log';
    fs.appendFileSync(logFile, `${formattedMessage}\n`);
    
    // Debug - output where logs are being written to help find them
    if (message.includes('debug-log-location')) {
      console.log(`Logs are being written to: ${path.resolve(logFile)}`);
    }
  } catch (err) {
    console.error(`Could not write to log file: ${err.message}`);
  }
}

// Log the path to help find the log file
log('debug-log-location');

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
          // Get the schedule to check for metadata
          const { data: schedule, error: scheduleError } = await supabaseClient
            .from('schedules')
            .select('*')
            .eq('id', scheduleId)
            .single();
            
          if (!scheduleError && schedule) {
            const metadata = schedule.metadata || {};
            
            // Always send notification for profile installation
            log(`Sending installation notifications for schedule=${scheduleId}, ProfileID=${profileId}`);
            
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
            log(`Matching device found: DeviceID=${deviceId}, DeviceName=${deviceName}`);
            try {
              if (typeof notifyProfileInstallation !== 'function') {
                log(`ERROR: notifyProfileInstallation is not a function, type: ${typeof notifyProfileInstallation}`);
              } else {
                const notificationParams = {
                  profileId,
                  profileName,
                  deviceId,
                  deviceName,
                  isTemporary: metadata.is_temporary || false,
                  temporaryDuration: metadata.temporary_duration || 0
                };
                log(`Installation notification params: ${JSON.stringify(notificationParams)}`);
                
                const result = await notifyProfileInstallation(notificationParams);
                log(`Installation notification result: ${result ? 'Success' : 'Failed or null'}`);
              }
              log(`Notification sent result: ${result ? 'Success' : 'Failed'}`);
            } catch (notifyError) {
              log(`Error sending notification: ${notifyError.message}`);
            }
            
            log(`Completed notification process for profile installation: ${profileName} to ${deviceName}`);
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
  log(`Starting removeProfileFromDevice for profile ${profileId} from device ${deviceId}`);
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
        
        // Always send a notification for profile removal
        let profileName = `Profile ${profileId}`;
        let deviceName = `Device ${deviceId}`;
        let wasTemporary = false;
        
        // Get schedule details if available to enhance notification
        if (scheduleId) {
          try {
            // Get the schedule to check for metadata
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
              
              // Get profile and device names from metadata
              profileName = metadata.profile_name || parentMetadata.profile_name || profileName;
              deviceName = metadata.device_name || parentMetadata.device_name || deviceName;
              wasTemporary = metadata.was_temporary_installation || parentMetadata.is_temporary || false;
              
              log(`Found schedule metadata: Profile=${profileName}, Device=${deviceName}, WasTemporary=${wasTemporary}`);
            }
          } catch (scheduleError) {
            log(`Error getting schedule data: ${scheduleError.message}`);
          }
        }
        
        // If we don't have names from metadata, try to fetch them
        if (profileName === `Profile ${profileId}`) {
          try {
            const profileData = await callSimpleMDM(`profiles/${profileId}`);
            if (profileData && profileData.data && profileData.data.attributes) {
              profileName = profileData.data.attributes.name || profileName;
              log(`Fetched profile name: ${profileName}`);
            }
          } catch (e) {
            log(`Could not fetch profile name: ${e.message}`);
          }
        }
        
        if (deviceName === `Device ${deviceId}`) {
          try {
            const deviceData = await callSimpleMDM(`devices/${deviceId}`);
            if (deviceData && deviceData.data && deviceData.data.attributes) {
              deviceName = deviceData.data.attributes.name || deviceName;
              log(`Fetched device name: ${deviceName}`);
            }
          } catch (e) {
            log(`Could not fetch device name: ${e.message}`);
          }
        }
        
        // Send the notification
        log(`Ready to send notification for profile removal: ${profileName} from ${deviceName}`);
        try {
          if (typeof notifyProfileRemoval !== 'function') {
            log(`ERROR: notifyProfileRemoval is not a function, type: ${typeof notifyProfileRemoval}`);
          } else {
            const notificationParams = {
              profileId,
              profileName,
              deviceId, 
              deviceName,
              wasTemporary
            };
            log(`Notification params: ${JSON.stringify(notificationParams)}`);
            
            // Call the notification function
            const notifyResult = await notifyProfileRemoval(notificationParams);
            log(`Notification result: ${notifyResult ? 'Success' : 'Failed'}`);
          }
        } catch (notifyError) {
          log(`Error in notifyProfileRemoval: ${notifyError.message}`);
          log(`Error stack: ${notifyError.stack}`);
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
      
      // Send notification for profile removal even if already removed
      try {
        // Always send a notification for profile removal (even if already removed)
        let profileName = `Profile ${profileId}`;
        let deviceName = `Device ${deviceId}`;
        let wasTemporary = false;
        
        // Get schedule details if available
        if (supabaseClient && scheduleId) {
          try {
            const { data: schedule, error: scheduleError } = await supabaseClient
              .from('schedules')
              .select('*, parent_schedule:parent_schedule_id(*)')
              .eq('id', scheduleId)
              .single();
              
            if (!scheduleError && schedule) {
              const metadata = schedule.metadata || {};
              let parentMetadata = {};
              
              if (schedule.parent_schedule_id && schedule.parent_schedule) {
                parentMetadata = schedule.parent_schedule.metadata || {};
              }
              
              profileName = metadata.profile_name || parentMetadata.profile_name || profileName;
              deviceName = metadata.device_name || parentMetadata.device_name || deviceName;
              wasTemporary = metadata.was_temporary_installation || parentMetadata.is_temporary || false;
            }
          } catch (scheduleError) {
            log(`Error getting schedule data: ${scheduleError.message}`);
          }
        }
        
        // If we don't have names, try to fetch them
        if (profileName === `Profile ${profileId}`) {
          try {
            const profileData = await callSimpleMDM(`profiles/${profileId}`);
            if (profileData && profileData.data && profileData.data.attributes) {
              profileName = profileData.data.attributes.name || profileName;
            }
          } catch (e) {
            log(`Could not fetch profile name: ${e.message}`);
          }
        }
        
        if (deviceName === `Device ${deviceId}`) {
          try {
            const deviceData = await callSimpleMDM(`devices/${deviceId}`);
            if (deviceData && deviceData.data && deviceData.data.attributes) {
              deviceName = deviceData.data.attributes.name || deviceName;
            }
          } catch (e) {
            log(`Could not fetch device name: ${e.message}`);
          }
        }
        
        // Send notification
        log(`Ready to send notification for profile removal (already removed): ${profileName} from ${deviceName}`);
        if (typeof notifyProfileRemoval === 'function') {
          const notificationParams = {
            profileId,
            profileName,
            deviceId, 
            deviceName,
            wasTemporary
          };
          log(`Notification params (already removed): ${JSON.stringify(notificationParams)}`);
          
          const notifyResult = await notifyProfileRemoval(notificationParams);
          log(`Notification result (already removed): ${notifyResult ? 'Success' : 'Failed'}`);
        } else {
          log(`ERROR: notifyProfileRemoval is not a function, type: ${typeof notifyProfileRemoval}`);
        }
      } catch (notifyError) {
        log(`Failed to send notification (already removed case): ${notifyError.message}`);
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
let notificationSent = false;

const removalResults = await Promise.all(
    targetDevicesToRemove.map(async device => {
        const result = await removeProfileFromDevice(removeProfileId, device.id, schedule.id, supabaseClient);
        
        if (!notificationSent && result.success) {
            try {
                const notifyResult = await notifyProfileRemoval(notificationParams);
                log(`Notification sent result: ${notifyResult ? 'Success' : 'Failed'}`);
                notificationSent = true;
            } catch (e) {
                log(`Error in notification for removal: ${e.message}`);
            }
        }
        return result;
    })
);

const removalSuccessCount = removalResults.filter(r => r.success).length;
const alreadyRemovedCount = removalResults.filter(r => r.alreadyRemoved).length;

return {
    success: removalSuccessCount > 0,
    message: `Profile ${removeProfileId} removed from ${removalSuccessCount}/${targetDevicesToRemove.length} devices (${alreadyRemovedCount} already removed)`
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
      const timeUntilExecution = new Date(schedule.start_time) - new Date(); // Calculate delay in milliseconds
      if (timeUntilExecution > 0) {
        log(`Delaying execution of schedule ${schedule.id} for ${Math.ceil(timeUntilExecution / 1000)} seconds...`);
        await new Promise(resolve => setTimeout(resolve, timeUntilExecution)); // Wait until start_time
      }
      try {
        log(`Executing schedule ${schedule.id}`);
        
        // Execute the appropriate action based on schedule type
        const actionResult = await executeDeviceAction(schedule, supabase);
        
        // For recurring schedules, calculate the next execution time
        let updateData = { last_executed_at: now.toISOString() };
        
        if (schedule.schedule_type === 'recurring' && schedule.recurrence_pattern) {
          log(`Handling recurring schedule ${schedule.id} with pattern: ${schedule.recurrence_pattern}`);
          
          try {
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
            } else {
              log(`WARNING: calculateNextExecutionTime returned null for schedule ${schedule.id} with pattern: ${schedule.recurrence_pattern}`);
              
              // Fallback: just add one day to ensure the schedule continues
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              // Keep the same time of day as the original schedule
              const originalTime = new Date(schedule.start_time);
              tomorrow.setHours(originalTime.getHours());
              tomorrow.setMinutes(originalTime.getMinutes());
              tomorrow.setSeconds(originalTime.getSeconds());
              
              updateData.start_time = tomorrow.toISOString();
              updateData.last_executed_at = null;
              log(`FALLBACK: Using tomorrow at same time for schedule ${schedule.id}: ${tomorrow.toISOString()}`);
            }
          } catch (calcError) {
            log(`ERROR calculating next execution time for schedule ${schedule.id}: ${calcError.message}`);
            log(`Schedule details: ${JSON.stringify(schedule)}`);
            
            // Fallback to ensure schedule runs tomorrow
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            // Keep the same time of day
            const originalTime = new Date(schedule.start_time);
            tomorrow.setHours(originalTime.getHours());
            tomorrow.setMinutes(originalTime.getMinutes());
            tomorrow.setSeconds(originalTime.getSeconds());
            
            updateData.start_time = tomorrow.toISOString();
            updateData.last_executed_at = null;
            log(`FALLBACK: Using tomorrow at same time for schedule ${schedule.id} after error: ${tomorrow.toISOString()}`);
          }
        } else {
          log(`WARNING: Schedule ${schedule.id} is not properly configured for recurring execution`);
          log(`schedule_type: ${schedule.schedule_type}, recurrence_pattern: ${schedule.recurrence_pattern}`);
        }
        
        // Log what we're updating for debugging
        log(`Updating schedule ${schedule.id} with data: ${JSON.stringify(updateData)}`);
        
        // Update execution info in the database
        const { data: updateData_result, error: updateError } = await supabase
          .from('schedules')
          .update(updateData)
          .eq('id', schedule.id)
          .select();
        
        if (updateError) {
          log(`ERROR: Failed to update schedule ${schedule.id}: ${updateError.message}`);
          log(`Update data was: ${JSON.stringify(updateData)}`);
          throw new Error(`Failed to update schedule: ${updateError.message}`);
        } else {
          log(`Successfully updated schedule ${schedule.id} in database`);
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
