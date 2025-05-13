// Script to handle quick profile removals
import { createClient } from '@supabase/supabase-js';
import { simplemdmApi } from '../src/lib/api/simplemdm';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function processQuickProfileRemovals() {
  console.log('Processing quick profile removals...');

  // Initialize Supabase client
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Supabase credentials missing - cannot process profile removals');
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
      console.error('Error fetching assignments to remove:', error);
      return;
    }
    
    console.log(`Found ${assignmentsToRemove.length} assignments to remove`);
    
    // Process each assignment
    for (const assignment of assignmentsToRemove) {
      try {
        console.log(`Removing profile ${assignment.profile_id} from device ${assignment.device_id}`);
        
        // Remove the profile using SimpleMDM API
        await simplemdmApi.removeProfileFromDevice(assignment.profile_id, assignment.device_id);
        
        // Update the assignment status
        const { error: updateError } = await supabase
          .from('quick_profile_assignments')
          .update({ status: 'removed', updated_at: now })
          .eq('id', assignment.id);
        
        if (updateError) {
          console.error(`Error updating assignment ${assignment.id}:`, updateError);
        } else {
          console.log(`Successfully removed profile ${assignment.profile_id} from device ${assignment.device_id}`);
        }
      } catch (removeError) {
        console.error(`Error removing profile ${assignment.profile_id} from device ${assignment.device_id}:`, removeError);
        
        // Mark as failed
        const { error: updateError } = await supabase
          .from('quick_profile_assignments')
          .update({ status: 'failed', updated_at: now })
          .eq('id', assignment.id);
        
        if (updateError) {
          console.error(`Error updating assignment ${assignment.id} status to failed:`, updateError);
        }
      }
    }
    
    console.log('Profile removal processing completed');
  } catch (error) {
    console.error('Error processing quick profile removals:', error);
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  processQuickProfileRemovals()
    .then(() => {
      console.log('Quick profile removal process complete');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error in quick profile removal process:', error);
      process.exit(1);
    });
}

export default processQuickProfileRemovals;
