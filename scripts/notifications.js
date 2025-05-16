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
  console.log(`DEBUG: sendNtfyNotification called with title: ${title}`);
  const ntfyServer = process.env.NTFY_SERVER || NTFY_DEFAULT_SERVER;
  const ntfyTopic = process.env.NTFY_TOPIC || topic;
  
  console.log(`Sending notification to ${ntfyServer}/${ntfyTopic}`);
  console.log(`Title: ${title}`);
  console.log(`Message: ${message}`);
  console.log(`Tags: ${tags.join(',')}`);
  
  try {
    // Create a properly formatted payload for ntfy
    const payload = {
      topic: ntfyTopic,
      title: title,
      message: message,
      priority: priority,
      tags: tags || []
    };
    
    if (click) {
      payload.click = click;
    }
    
    if (actions && actions.length > 0) {
      payload.actions = actions;
    }
    
    console.log(`Request payload: ${JSON.stringify(payload, null, 2)}`);
    
    // Make sure we have the correct URL format - include the topic in the URL
    const url = `${ntfyServer}/${ntfyTopic}`;
    console.log(`Full notification URL: ${url}`);
    
    // Send the notification with proper JSON content-type
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload) // Send as JSON
    });

    if (!response.ok) {
      console.error(`Error sending ntfy notification: ${response.status} ${response.statusText}`);
      console.error(`Request URL: ${url}`);
      console.error(`Request body: ${JSON.stringify(payload, null, 2)}`);
      const responseText = await response.text();
      console.error(`Response body: ${responseText}`);
      return null;
    }
    
    const responseData = await response.text();
    console.log(`Notification sent successfully. Response: ${responseData}`);
    return true; // Return true on success instead of response object for easier checking
  } catch (error) {
    console.error('Error sending ntfy notification:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    return false; // Return false on error for easier checking
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
  console.log(`DEBUG: notifyProfileInstallation called for profile: ${profileName}, device: ${deviceName}`);
  try {
    const title = `Profile Installed: ${profileName}`;
    let message = `The profile "${profileName}" has been installed on device "${deviceName}".`;
    
    if (isTemporary) {
      message += ` It will be removed in ${temporaryDuration} minute${temporaryDuration !== 1 ? 's' : ''}.`;
    }
    
    console.log(`Sending installation notification for profile ${profileName} on device ${deviceName}`);
    const result = await sendNtfyNotification({
      title,
      message,
      tags: ['phone', 'check'],
      priority: 3,
      actions: [] // Empty array for no actions
    });
    
    console.log(`Installation notification sent: ${result ? 'Success' : 'Failed'}`);
    return result;
  } catch (error) {
    console.error('Failed to send profile installation notification:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    return false;
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
  console.log(`DEBUG: notifyProfileRemoval called for profile: ${profileName}, device: ${deviceName}`);
  try {
    const title = `Profile Removed: ${profileName}`;
    let message = `The profile "${profileName}" has been removed from device "${deviceName}".`;
    
    if (wasTemporary) {
      message += ` This was a scheduled removal of a temporary profile.`;
    }
    
    console.log(`Sending removal notification for profile ${profileName} on device ${deviceName}`);
    const result = await sendNtfyNotification({
      title,
      message,
      tags: ['phone', 'x'],
      priority: 3,
      actions: [] // Empty array for no actions
    });
    
    console.log(`Removal notification sent: ${result ? 'Success' : 'Failed'}`);
    return result;
  } catch (error) {
    console.error('Failed to send profile removal notification:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    return false;
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
