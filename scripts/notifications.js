// Notification utilities for the executor script
import fetch from 'node-fetch';

// Default notification settings
const NTFY_DEFAULT_TOPIC = 'geo-profile-dashboard';
const NTFY_DEFAULT_SERVER = 'https://ntfy.sh';

// Check environment variables for ntfy configuration
console.log("Environment variables for ntfy:");
console.log(`NTFY_SERVER: ${process.env.NTFY_SERVER || '(using default)'}`);
console.log(`NTFY_TOPIC: ${process.env.NTFY_TOPIC || '(using default)'}`);

/**
 * Send a notification to ntfy.sh
 */
async function sendNtfyNotification({
  topic = NTFY_DEFAULT_TOPIC,
  title,
  message,
  priority = 3,
  tags = [],
  click,
  actions = []
}) {
  const ntfyServer = process.env.NTFY_SERVER || NTFY_DEFAULT_SERVER;
  const ntfyTopic = process.env.NTFY_TOPIC || topic;
  
  console.log(`Sending notification to ${ntfyServer}/${ntfyTopic}`);
  console.log(`Title: ${title}`);
  console.log(`Message: ${message}`);
  console.log(`Tags: ${tags.join(',')}`);
  
  try {
    // Use application/json content type and put everything in the body instead of headers
    // This should fix the JSON formatting issues
    const payload = {
      topic: ntfyTopic,
      title: title,
      message: message,
      priority: priority
    };
    
    if (tags && tags.length > 0) {
      payload.tags = tags;
    }
    
    if (click) {
      payload.click = click;
    }
    
    if (actions && actions.length > 0) {
      payload.actions = actions;
    }
    
    console.log(`Request payload: ${JSON.stringify(payload)}`);
    
    // Make sure we have the correct URL format
    const url = `${ntfyServer}/`;
    console.log(`Full notification URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload) // Send as JSON
    });

    if (!response.ok) {
      console.error(`Error sending ntfy notification: ${response.status} ${response.statusText}`);
      const responseText = await response.text();
      console.error(`Response body: ${responseText}`);
      return null;
    }
    
    const responseData = await response.text();
    console.log(`Notification sent successfully. Response: ${responseData}`);
    return response;
  } catch (error) {
    console.error('Error sending ntfy notification:', error);
    return null; // Don't throw so it doesn't crash executor
  }
}

/**
 * Send a notification for profile installation
 */
async function notifyProfileInstallation({
  profileName,
  profileId,
  deviceName,
  deviceId,
  isTemporary = false,
  temporaryDuration = 0
}) {
  try {
    const title = `Profile Installed: ${profileName}`;
    let message = `The profile "${profileName}" has been installed on device "${deviceName}".`;
    
    if (isTemporary) {
      message += ` It will be removed in ${temporaryDuration} minute${temporaryDuration !== 1 ? 's' : ''}.`;
    }
    
    return await sendNtfyNotification({
      title,
      message,
      tags: ['phone', 'check'],
      priority: 3,
      actions: [] // Empty array for no actions
    });
  } catch (error) {
    console.error('Failed to send profile installation notification:', error);
    return null;
  }
}

/**
 * Send a notification for profile removal
 */
async function notifyProfileRemoval({
  profileName,
  profileId,
  deviceName,
  deviceId,
  wasTemporary = false
}) {
  try {
    const title = `Profile Removed: ${profileName}`;
    let message = `The profile "${profileName}" has been removed from device "${deviceName}".`;
    
    if (wasTemporary) {
      message += ` This was a scheduled removal of a temporary profile.`;
    }
    
    return await sendNtfyNotification({
      title,
      message,
      tags: ['phone', 'x'],
      priority: 3,
      actions: [] // Empty array for no actions
    });
  } catch (error) {
    console.error('Failed to send profile removal notification:', error);
    return null;
  }
}

// Use ESM export syntax
export {
  notifyProfileInstallation,
  notifyProfileRemoval
};

// Also provide CommonJS exports for compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    notifyProfileInstallation,
    notifyProfileRemoval
  };
}
