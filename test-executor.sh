#!/bin/bash
# This script runs the direct executor with debugging output

echo "=====================================================";
echo "Starting direct executor test - $(date)";
echo "=====================================================";

# Show versions
echo "Node.js version: $(node --version)";
echo "NPM version: $(npm --version)";

# Show dependencies
echo "Checking dependencies...";
npm list dotenv
npm list node-fetch

# Temporary debugging - show content of the executor script
echo "Checking script file...";
if [ -f "scripts/executor.js" ]; then
  echo "Script exists!";
  head -n 20 scripts/executor.js
else
  echo "Script not found!";
fi

# Ensure script is executable
chmod +x scripts/executor.js

# Run the executor
echo "Running script with --trace-warnings:";
NODE_OPTIONS="--trace-warnings" node scripts/executor.js

exit_code=$?
echo "=====================================================";
echo "Finished with exit code: $exit_code - $(date)";
echo "=====================================================";
exit $exit_code
