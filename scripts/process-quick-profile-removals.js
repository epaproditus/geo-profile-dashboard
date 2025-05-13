// Script to handle quick profile removals
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
  const apiKey = process.env.SIMPLE_MDM_API_KEY || process.env.SIMPLEMDM_API_KEY;
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

async function processQuickProfileRemovals() {
  log('Processing quick profile removals...');

  // Initialize Supabase client
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    log('Supabase credentials missing - cannot process profile removals');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Get assignments that need to be removed (status is 'installed' and remove_at time has passed)
    const now = new Date().toISOString();
    
    const { data: assignmentsToRemove, error } = await supabase
      .from('quick_profile_assignments')
      .select('*')
      .eq('status', 'installed')
      .lt('remove_at', now);
    
    if (error) {
      log(`Error fetching assignments to remove: ${error.message}`);
      return;
    }
    
    log(`Found ${assignmentsToRemove.length} assignments to remove`);
    
    // Get SimpleMDM API key
    const simpleMdmApiKey = process.env.SIMPLE_MDM_API_KEY || process.env.SIMPLEMDM_API_KEY;
    if (!simpleMdmApiKey) {
      log('SimpleMDM API key missing - cannot process profile removals');
      return;
    }
    
    // Process each assignment
    for (const assignment of assignmentsToRemove) {
      try {
        log(`Removing profile ${assignment.profile_id} from device ${assignment.device_id}`);
        
        // Remove the profile using SimpleMDM API
        const endpoint = `devices/${assignment.device_id}/profiles/${assignment.profile_id}`;
        await callSimpleMDM(endpoint, 'DELETE');
        
        // Update the assignment status
        const { error: updateError } = await supabase
          .from('quick_profile_assignments')
          .update({ status: 'removed', updated_at: now })
          .eq('id', assignment.id);
        
        if (updateError) {
          log(`Error updating assignment ${assignment.id}: ${updateError.message}`);
        } else {
          log(`Successfully removed profile ${assignment.profile_id} from device ${assignment.device_id}`);
        }
      } catch (removeError) {
        log(`Error removing profile ${assignment.profile_id} from device ${assignment.device_id}: ${removeError.message}`);
        
        // Mark as failed
        const { error: updateError } = await supabase
          .from('quick_profile_assignments')
          .update({ status: 'failed', updated_at: now })
          .eq('id', assignment.id);
        
        if (updateError) {
          log(`Error updating assignment ${assignment.id} status to failed: ${updateError.message}`);
        }
      }
    }
    
    log('Profile removal processing completed');
  } catch (error) {
    log(`Error processing quick profile removals: ${error.message}`);
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  processQuickProfileRemovals()
    .then(() => {
      log('Quick profile removal process complete');
      process.exit(0);
    })
    .catch(error => {
      log(`Error in quick profile removal process: ${error.message}`);
      process.exit(1);
    });
}

export default processQuickProfileRemovals;
