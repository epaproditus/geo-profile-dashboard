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

curl https://a.simplemdm.com/api/v1/devices \
  -u ${API_KEY}:
{
  "data": [
    {
      "type": "device",
      "id": 121,
      "attributes": {
        "name": "Mike's iPhone",
        "last_seen_at": "2022-07-13T16:00:54.000-07:00",
        "last_seen_ip": "203.0.113.0",
        "enrolled_at": "2022-11-14T21:37:37.000-08:00",
        "status": "enrolled",
        "enrollment_channels": [
          "device"
        ],
        "device_name": "Mike's iPhone",
        "os_version": "14.7",
        "build_version": "18G5042c",
        "model_name": "iPhone 7",
        "model": "NG4W2LL",
        "product_name": "iPhone9,1",
        "unique_identifier": "4A08359C-1D3A-5D3E-939E-FFA6A561321D",
        "serial_number": "DNFJE9DNG5MG",
        "processor_architecture": null,
        "imei": "35 445506 652132 5",
        "meid": "35404596608032",
        "device_capacity": 128.0,
        "available_device_capacity": 119.07,
        "battery_level": "100%",
        "modem_firmware_version": "8.80.00",
        "iccid": "8914 8110 0002 8094 4264",
        "bluetooth_mac": "f0:db:e2:df:e9:11",
        "ethernet_macs": [],
        "wifi_mac": "f0:db:e2:df:e9:2f",
        "current_carrier_network": "Verizon",
        "sim_carrier_network": null,
        "subscriber_carrier_network": "Verizon",
        "carrier_settings_version": "46.0.1",
        "phone_number": "+15555555555",
        "voice_roaming_enabled": true,
        "data_roaming_enabled": false,
        "is_roaming": false,
        "subscriber_mcc": "311",
        "subscriber_mnc": "480",
        "simmnc": null,
        "current_mcc": "310",
        "current_mnc": "00",
        "hardware_encryption_caps": 3,
        "passcode_present": false,
        "passcode_compliant": true,
        "passcode_compliant_with_profiles": true,
        "is_supervised": true,
        "is_dep_enrollment": false,
        "is_user_approved_enrollment": null,
        "is_device_locator_service_enabled": false,
        "is_do_not_disturb_in_effect": false,
        "personal_hotspot_enabled": false,
        "itunes_store_account_is_active": false,
        "cellular_technology": 3,
        "last_cloud_backup_date": null,
        "is_activation_lock_enabled": false,
        "is_cloud_backup_enabled": false,
        "filevault_enabled": false,
        "filevault_recovery_key": null,
        "firmware_password_enabled": false,
        "recovery_lock_password_enabled": false,
        "remote_desktop_enabled": false,
        "firmware_password": null,
        "recovery_lock_password": null,
        "managed_apple_id": testing@simplemdm.com,
        "firewall": {
          "enabled": null,
          "block_all_incoming": null,
          "stealth_mode": null
        },
        "system_integrity_protection_enabled": null,
        "os_update": {
          "automatic_os_installation_enabled": null,
          "automatic_app_installation_enabled": null,
          "automatic_check_enabled": null,
          "automatic_security_updates_enabled": null,
          "background_download_enabled": null,
          "catalog_url": null,
          "default_catalog": null,
          "perform_periodic_check": null,
          "previous_scan_date": null,
          "previous_scan_result": null
        },
        "location_latitude": null,
        "location_longitude": null,
        "location_accuracy": null,
        "location_updated_at": null
      },
      "relationships": {
        "device_group": {
          "data": {
            "type": "device_group",
            "id": 1
          }
        },
        "custom_attribute_values" {
          "data": [
            {
              "type": "custom_attribute_value",
              "id": "custom_attribute_name",
              "attributes": {
                "secret": false,
                "value": "custom attribute value"
              }
            }
          ]
        }
      }
    },

    ...

  ],
  "has_more": false
}
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


Assign profile
Assign profile to an assignment group. You must have permission to modify both the assignment group and the profile.

curl https://a.simplemdm.com/api/v1/assignment_groups/43/profiles/83 \
  -u ${API_KEY}: \
  -X POST

HTTP/1.1 204 No Content
HTTP Request
POST https://a.simplemdm.com/api/v1/assignment_groups/{ASSIGNMENT_GROUP_ID}/profiles/{PROFILE_ID}

Unassign profile
Unassign profile from an assignment group. You must have permission to modify both the assignment group and the profile.

curl https://a.simplemdm.com/api/v1/assignment_groups/43/profiles/83 \
  -u ${API_KEY}: \
  -X DELETE

HTTP/1.1 204 No Content
HTTP Request
DELETE https://a.simplemdm.com/api/v1/assignment_groups/{ASSIGNMENT_GROUP_ID}/profiles/{PROFILE_ID}

