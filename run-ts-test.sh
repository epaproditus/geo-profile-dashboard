#!/bin/bash
# Run TypeScript test scripts with proper configuration
npx ts-node -P tsconfig.node-script.json "$@"