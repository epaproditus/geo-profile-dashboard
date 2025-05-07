// Script to create a new migration file with a timestamp
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the name of the migration from command line arguments
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Please provide a name for the migration. Example: npm run supabase:migration:new add_users_table');
  process.exit(1);
}

// Create the migration name with timestamp
const migrationName = args.join('_').toLowerCase();
const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
const fileName = `${timestamp}_${migrationName}.sql`;

// Get the directory where this script is located
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the migrations directory
const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');

// Ensure migrations directory exists
if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir, { recursive: true });
}

// Path to the new migration file
const filePath = path.join(migrationsDir, fileName);

// Create the migration file with a template
const migrationTemplate = `-- Migration: ${migrationName} created at ${new Date().toISOString()}
-- Write your SQL migration here

`;

fs.writeFileSync(filePath, migrationTemplate);

console.log(`✅ Migration file created: ${fileName}`);
console.log(`📄 Path: ${filePath}`);
console.log('');
console.log('Next steps:');
console.log('1. Edit the migration file to add your SQL');
console.log('2. Apply the migration with: npm run supabase:migration:apply');