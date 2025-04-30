# SimpleMDM API Documentation

## Introduction

The SimpleMDM API is a RESTful JSON implementation designed to work over authenticated HTTPS channels. This reference describes the extent of the API functionality available for managing your mobile device fleet.

## Base URL

```
https://a.simplemdm.com/api/v1
```

## Authentication

The API uses HTTP Basic Authentication with your secret API key. Include your API key in the username field and leave the password field blank.

```bash
# To authenticate with curl, use the "-u" flag with each request.
# Be sure to include a trailing ":"
curl https://a.simplemdm.com/api/v1/account \
  -u ${API_KEY}:
```

You can retrieve your API key by signing into your SimpleMDM account, visiting "Settings" and then selecting the "API" tab.

## Pagination

Many "list" API methods utilize cursor-based pagination using the `limit` and `starting_after` parameters:

| Parameter | Description |
|-----------|-------------|
| `limit` | Optional. A limit on the number of objects to be returned, between 1 and 100. Defaults to 10. |
| `starting_after` | Optional. A cursor for use in pagination. `starting_after` is an object ID that defines your place in the list. |
| `direction` | Optional. Sort direction. Accepts `asc` or `desc`. |

## Core Resources

### Account

Get account information:

```
GET https://a.simplemdm.com/api/v1/account
```

Update account:

```
PATCH https://a.simplemdm.com/api/v1/account
```

### Devices

List all devices (with pagination support):

```
GET https://a.simplemdm.com/api/v1/devices
```

Get a specific device:

```
GET https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}
```

Create a device:

```
POST https://a.simplemdm.com/api/v1/devices/
```

Example request:
```bash
curl https://a.simplemdm.com/api/v1/devices/ \
  -d name="Sara's iPad" \
  -d group_id="41" \
  -u ${API_KEY}:
```

Update a device:

```
PATCH https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}
```

Delete a device:

```
DELETE https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}
```

Device Location API:

```
# Get device location
GET https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}

# Request updated location
POST https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/lost_mode/update_location
```

### Device Groups

Device groups are collections of devices that can be managed together:

```
GET https://a.simplemdm.com/api/v1/device_groups
GET https://a.simplemdm.com/api/v1/device_groups/{DEVICE_GROUP_ID}
POST https://a.simplemdm.com/api/v1/device_groups
PATCH https://a.simplemdm.com/api/v1/device_groups/{DEVICE_GROUP_ID}
DELETE https://a.simplemdm.com/api/v1/device_groups/{DEVICE_GROUP_ID}
```

### Assignment Groups

Assignment groups associate apps with device groups and devices:

```
GET https://a.simplemdm.com/api/v1/assignment_groups
GET https://a.simplemdm.com/api/v1/assignment_groups/{ASSIGNMENT_GROUP_ID}
POST https://a.simplemdm.com/api/v1/assignment_groups
DELETE https://a.simplemdm.com/api/v1/assignment_groups/{ASSIGNMENT_GROUP_ID}
```

### Apps

Manage your app catalog:

```
GET https://a.simplemdm.com/api/v1/apps
GET https://a.simplemdm.com/api/v1/apps/{APP_ID}
DELETE https://a.simplemdm.com/api/v1/apps/{APP_ID}
```

### Custom Attributes

Create and manage custom device attributes:

```
GET https://a.simplemdm.com/api/v1/custom_attributes
GET https://a.simplemdm.com/api/v1/custom_attributes/{CUSTOM_ATTRIBUTE_ID}
POST https://a.simplemdm.com/api/v1/custom_attributes
PATCH https://a.simplemdm.com/api/v1/custom_attributes/{CUSTOM_ATTRIBUTE_ID}
DELETE https://a.simplemdm.com/api/v1/custom_attributes/{CUSTOM_ATTRIBUTE_ID}
```

### Lost Mode

Control lost mode functionality for devices:

```
# Enable lost mode
POST https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/lost_mode

# Disable lost mode
DELETE https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/lost_mode

# Play sound
POST https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/lost_mode/play_sound

# Update location
POST https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/lost_mode/update_location
```

## Error Handling

The API returns standard HTTP status codes to indicate success or failure:

- `200 OK` - Request succeeded
- `400 Bad Request` - Invalid request format
- `401 Unauthorized` - Invalid authentication
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded

Error response format:

```json
{
  "errors": [
    {
      "title": "object not found"
    }
  ]
}
```

## Webhooks

SimpleMDM can send webhook events to your application:

Available events:
- `device.changed_group`
- `device.enrolled`
- `device.unenrolled`
- `device.lock.enabled`
- `abm.device.added`

## API Version

This documentation covers API version 1.51.

*Note: SimpleMDM operates exclusively over HTTPS. Requests received over HTTP without encryption will fail.*