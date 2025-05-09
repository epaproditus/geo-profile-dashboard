#!/bin/bash
# Simple log rotation script for scheduler.log

LOG_FILE="scheduler.log"
LOG_DIR="/Users/abe/Documents/VSCode/geo-profile-dashboard"
MAX_SIZE_KB=5000  # 5MB
MAX_BACKUPS=5     # Keep 5 rotated logs

# Change to the log directory
cd "$LOG_DIR" || exit 1

# Check if log file exists
if [ ! -f "$LOG_FILE" ]; then
    echo "Log file $LOG_FILE does not exist. Nothing to rotate."
    exit 0
fi

# Get size of the log file in KB
size_kb=$(du -k "$LOG_FILE" | cut -f1)

# Rotate if size exceeds maximum
if [ "$size_kb" -gt "$MAX_SIZE_KB" ]; then
    echo "Log file exceeds maximum size. Rotating..."
    
    # Remove oldest backup if max backups reached
    if [ -f "${LOG_FILE}.${MAX_BACKUPS}" ]; then
        rm "${LOG_FILE}.${MAX_BACKUPS}"
    fi
    
    # Shift all other backups
    for (( i=MAX_BACKUPS-1; i>=1; i-- )); do
        j=$((i+1))
        if [ -f "${LOG_FILE}.${i}" ]; then
            mv "${LOG_FILE}.${i}" "${LOG_FILE}.${j}"
        fi
    done
    
    # Backup current log
    mv "$LOG_FILE" "${LOG_FILE}.1"
    
    # Create new empty log file
    touch "$LOG_FILE"
    
    echo "Log rotation complete."
else
    echo "Log size is ${size_kb}KB, below threshold of ${MAX_SIZE_KB}KB. No rotation needed."
fi
