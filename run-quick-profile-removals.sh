#!/bin/bash

# Run the quick profile removals script
NODE_ENV=production node scripts/process-quick-profile-removals.js >> logs/quick-profile-removals.log 2>&1