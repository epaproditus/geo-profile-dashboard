import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('Environment variables:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_SERVICE_ROLE_KEY length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length);
console.log('SUPABASE_SERVICE_ROLE_KEY begins with:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20));
console.log('SUPABASE_SERVICE_ROLE_KEY contains "service_role":', process.env.SUPABASE_SERVICE_ROLE_KEY?.includes('service_role'));

async function testConnection() {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    console.log('\nTesting database connection...');
    const { data, error } = await supabase.from('schedules').select('id').limit(1);
    
    if (error) {
      console.error('Database error:', error.message);
    } else {
      console.log('Database connection successful!');
      console.log('Data:', data);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testConnection();
