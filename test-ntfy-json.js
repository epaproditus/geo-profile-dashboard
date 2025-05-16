#!/usr/bin/env node
// Test script to validate the JSON formatting of ntfy payloads

import { notifyProfileInstallation, notifyProfileRemoval } from './scripts/notifications.js';

// Test configuration
const test = {
  profileName: 'Test Profile with "quotes"',
  profileId: '12345',
  deviceName: 'Test iPhone with "quotes"',
  deviceId: '67890',
  isTemporary: true,
  temporaryDuration: 30
};

// Log function
const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

// Run tests
async function runTests() {
  log('Starting ntfy notification JSON format tests');
  
  try {
    // Test 1: Installation notification
    log('\n=== Test 1: Installation notification ===');
    const installResult = await notifyProfileInstallation({
      profileName: test.profileName,
      profileId: test.profileId,
      deviceName: test.deviceName,
      deviceId: test.deviceId,
      isTemporary: test.isTemporary,
      temporaryDuration: test.temporaryDuration
    });
    
    log(`Installation notification test result: ${installResult ? 'SUCCESS' : 'FAILED'}`);
    
    // Test 2: Removal notification
    log('\n=== Test 2: Removal notification ===');
    const removalResult = await notifyProfileRemoval({
      profileName: test.profileName,
      profileId: test.profileId, 
      deviceName: test.deviceName,
      deviceId: test.deviceId,
      wasTemporary: test.isTemporary
    });
    
    log(`Removal notification test result: ${removalResult ? 'SUCCESS' : 'FAILED'}`);
    
    log('\nTests completed');
  } catch (error) {
    log(`Test error: ${error.message}`);
    log(error.stack);
  }
}

// Run the tests
runTests();
