// This module handles sending push notifications via ntfy.sh
// for SimpleMDM profile events in the geo-profile-dashboard

import { SimpleMDMProfile } from '@/lib/api/simplemdm';

interface NtfyMessage {
  topic: string;
  title: string;
  message: string;
  priority?: 1 | 2 | 3 | 4 | 5; // 1=min, 3=default, 5=max
  tags?: string[];
  click?: string;
  actions?: NtfyAction[];
}

interface NtfyAction {
  action: string;
  label: string;
  url?: string;
  clear?: boolean;
}

// Default notification settings
const NTFY_DEFAULT_TOPIC = 'geo-profile-dashboard';
const NTFY_DEFAULT_SERVER = 'https://ntfy.sh';

/**
 * Send a notification to ntfy.sh
 */
export async function sendNtfyNotification({
  topic = NTFY_DEFAULT_TOPIC,
  title,
  message,
  priority = 3,
  tags = [],
  click,
  actions = []
}: NtfyMessage): Promise<Response> {
  const ntfyServer = process.env.NEXT_PUBLIC_NTFY_SERVER || NTFY_DEFAULT_SERVER;
  
  const headers: Record<string, string> = {
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
  
  try {
    const response = await fetch(`${ntfyServer}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      console.error(`Error sending ntfy notification: ${response.status} ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    console.error('Error sending ntfy notification:', error);
    throw error;
  }
}

/**
 * Send a notification for profile installation
 */
export async function notifyProfileInstallation({
  profileName,
  profileId,
  deviceName,
  deviceId,
  isTemporary = false,
  temporaryDuration = 0
}: {
  profileName: string;
  profileId: string | number;
  deviceName: string;
  deviceId: string | number;
  isTemporary?: boolean;
  temporaryDuration?: number;
}): Promise<Response | null> {
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
export async function notifyProfileRemoval({
  profileName,
  profileId,
  deviceName,
  deviceId,
  wasTemporary = false
}: {
  profileName: string;
  profileId: string | number;
  deviceName: string;
  deviceId: string | number;
  wasTemporary?: boolean;
}): Promise<Response | null> {
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

/**
 * Generate a subscription guide for users
 */
export function getNtfySubscriptionGuide(): string {
  const ntfyServer = process.env.NEXT_PUBLIC_NTFY_SERVER || NTFY_DEFAULT_SERVER;
  const ntfyTopic = process.env.NEXT_PUBLIC_NTFY_TOPIC || NTFY_DEFAULT_TOPIC;
  
  return `
# How to Receive Profile Notifications

Follow these steps to receive push notifications for profile installations and removals:

1. Install the ntfy app on your device:
   - iOS: [App Store](https://apps.apple.com/us/app/ntfy/id1625396347)
   - Android: [Google Play](https://play.google.com/store/apps/details?id=io.heckel.ntfy)

2. Open the ntfy app and add a new subscription with these details:
   - Server: ${ntfyServer}
   - Topic: ${ntfyTopic}

3. Enable notifications for this subscription in the app.

You will now receive push notifications when profiles are installed or removed from devices.
  `;
}
