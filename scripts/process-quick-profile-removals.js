/**
 * Process Quick Profile Removals
 * 
 * This script checks for quick profile assignments that need to be removed
 * and removes them from devices. It should be run via a cron job.
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { simplemdmApi } from '../api/simplemdm/api.js';
import { notifyProfileRemoval } from '../lib/ntfy.js';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function processQuickProfileRemovals() {
  try {
    console.log('Starting quick profile removal process...');
    
    // Get assignments that need to be removed
    const { data: assignmentsToRemove, error } = await supabase.rpc('process_quick_profile_removals');
    
    if (error) {
      throw new Error(`Failed to fetch assignments for removal: ${error.message}`);
    }
    
    console.log(`Found ${assignmentsToRemove.length} assignments to remove`);
    
    if (assignmentsToRemove.length === 0) {
      console.log('No profiles to remove. Exiting.');
      return;
    }
    
    // Process each assignment
    for (const assignment of assignmentsToRemove) {
      try {
        console.log(`Removing profile ${assignment.profile_id} from device ${assignment.device_id}`);
        
        // Remove profile from device
        await simplemdmApi.removeProfile(assignment.profile_id, assignment.device_id);
        
        // Update status in database
        await supabase
          .from('quick_profile_assignments')
          .update({
            status: 'removed',
            updated_at: new Date().toISOString()
          })
          .eq('id', assignment.id);
        
        console.log(`Successfully removed profile ${assignment.profile_id} from device ${assignment.device_id}`);
        
        // Send notification
        try {
          // Get profile and device names
          const [profileResponse, deviceResponse] = await Promise.all([
            simplemdmApi.getProfile(assignment.profile_id),
            simplemdmApi.getDevice(assignment.device_id)
          ]);
          
          const profileName = profileResponse?.data?.attributes?.name || `Profile ${assignment.profile_id}`;
          const deviceName = deviceResponse?.data?.attributes?.name || `Device ${assignment.device_id}`;
          
          // Send notification
          await notifyProfileRemoval({
            profileName,
            profileId: assignment.profile_id,
            deviceName,
            deviceId: assignment.device_id,
            wasTemporary: true
          });
        } catch (notifyError) {
          console.error(`Failed to send notification: ${notifyError.message}`);
          // Continue processing other assignments
        }
      } catch (removeError) {
        console.error(`Failed to remove profile ${assignment.profile_id} from device ${assignment.device_id}: ${removeError.message}`);
        
        // Update status to failed
        await supabase
          .from('quick_profile_assignments')
          .update({
            status: 'failed',
            error_message: `Failed to remove: ${removeError.message}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', assignment.id);
      }
    }
    
    console.log('Quick profile removal process completed');
  } catch (error) {
    console.error(`Error processing quick profile removals: ${error.message}`);
    process.exit(1);
  }
}

// Execute the function
processQuickProfileRemovals();