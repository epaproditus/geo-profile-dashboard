# Push Notifications for SimpleMDM Profile Events

This document explains how to use and configure the push notification system for SimpleMDM profile events in the geo-profile-dashboard.

## Overview

The dashboard integrates with [ntfy.sh](https://ntfy.sh/), an open-source notification service, to send push notifications to your devices when:

- Profiles are installed on devices
- Temporary profiles are about to expire
- Profiles are removed from devices

This feature is useful for administrators who want to monitor profile deployments in real-time.

## Setup Instructions

### 1. Environment Configuration

Make sure the following variables are set in your `.env` file:

```bash
# ntfy.sh configuration
NTFY_SERVER=https://ntfy.sh
NTFY_TOPIC=geo-profile-dashboard
NEXT_PUBLIC_NTFY_SERVER=https://ntfy.sh
NEXT_PUBLIC_NTFY_TOPIC=geo-profile-dashboard
```

You can customize the topic name to something unique to your organization. Using a custom topic enhances security by making it harder for unauthorized users to subscribe to your notifications.

### 2. Mobile App Setup

1. Install the ntfy app on your device:
   - iOS: [App Store](https://apps.apple.com/us/app/ntfy/id1625396347)
   - Android: [Google Play](https://play.google.com/store/apps/details?id=io.heckel.ntfy)

2. Open the app and add a new subscription with the following details:
   - Server: `https://ntfy.sh` (or your custom server if you're self-hosting)
   - Topic: `geo-profile-dashboard` (or your custom topic name from your env file)

3. Ensure notifications are enabled for the app in your device settings.

## Using the Feature

When deploying profiles through the dashboard, you'll now see a "Send push notifications" option in the deployment dialog. This is enabled by default.

Notifications will be sent automatically when:
- A profile is installed on a device
- A temporary profile is installed (includes expiration time)
- A profile is removed from a device (including scheduled removals)

## Self-Hosting ntfy (Optional)

For enhanced security, you can self-host the ntfy service. This gives you full control over your notification infrastructure and keeps your notifications private.

1. Follow the [ntfy self-hosting guide](https://docs.ntfy.sh/install/).
2. Update your `.env` file to point to your self-hosted instance.

## Customizing Notifications

The notification system is designed to provide clear, concise information about profile events. Each notification includes:

- Profile name
- Device name
- Action (installed or removed)
- For temporary profiles: duration before removal

## Troubleshooting

If you're not receiving notifications:

1. Check that the ntfy app is properly installed and configured with the correct topic
2. Verify your device's notification settings for the ntfy app
3. Make sure the environment variables are correctly set
4. Check the server logs for any errors related to sending notifications
5. On iOS, notifications must be explicitly allowed for the ntfy app in device settings

## Security Considerations

- The ntfy.sh public server is used by default, which means anyone who knows your topic name can subscribe to notifications
- For higher security, use a unique, hard-to-guess topic name or self-host ntfy
- No sensitive data is included in notifications, just the profile and device names
