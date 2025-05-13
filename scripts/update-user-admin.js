// Script to update admin status in user metadata
import { supabase } from '../src/lib/supabase.js';

const updateUserMetadata = async (email, adminStatus = true) => {
  try {
    // Get the user ID from email
    const { data: users, error: userError } = await supabase
      .from('auth.users')
      .select('id, raw_user_meta_data')
      .eq('email', email)
      .limit(1);
    
    if (userError || !users || users.length === 0) {
      console.error('Error finding user:', userError || 'User not found');
      return false;
    }
    
    const user = users[0];
    
    // Update the user's metadata to include is_admin
    const updatedMetadata = {
      ...user.raw_user_meta_data,
      is_admin: adminStatus
    };
    
    // Update the user record
    const { error: updateError } = await supabase
      .from('auth.users')
      .update({ raw_user_meta_data: updatedMetadata })
      .eq('id', user.id);
    
    if (updateError) {
      console.error('Error updating user metadata:', updateError);
      return false;
    }
    
    console.log(`✅ User ${email} admin status updated to ${adminStatus}`);
    return true;
  } catch (error) {
    console.error('Error in updateUserMetadata:', error);
    return false;
  }
};

// Usage example (uncomment and modify as needed)
// updateUserMetadata('user@example.com', true)
//   .then((success) => {
//     if (success) {
//       console.log('Operation successful');
//     } else {
//       console.log('Operation failed');
//     }
//     process.exit(0);
//   })
//   .catch((error) => {
//     console.error('Unexpected error:', error);
//     process.exit(1);
//   });

// If you run this script directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const email = args[0];
  const status = args[1] !== 'false'; // Any value other than 'false' will be treated as true
  
  if (!email) {
    console.error('Please provide an email address as the first argument');
    process.exit(1);
  }
  
  updateUserMetadata(email, status)
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}
