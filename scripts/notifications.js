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
  
  console.log(`Sending notification to ${ntfyServer}/${topic}`);
  console.log(`Title: ${title}`);
  console.log(`Message: ${message}`);
  console.log(`Tags: ${tags.join(',')}`);
  
  const headers = {
    'Content-Type': 'application/json'
  };
  
  // Add optional headers
  if (title) headers['Title'] = title;
  if (priority) headers['Priority'] = priority.toString();
  if (tags.length) headers['Tags'] = tags.join(',');
  if (click) headers['Click'] = click;
  
  const body = {
    topic,
    message,
    ...(actions.length ? { actions } : {})
  };
  
  console.log(`Request body: ${JSON.stringify(body)}`);
  console.log(`Request headers: ${JSON.stringify(headers)}`);
  
  try {
    // Make sure we have the correct URL format
    const url = `${ntfyServer}/${topic}`;
    console.log(`Full notification URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
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
    throw error;
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
      priority: 3
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
      priority: 3
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
