# Introduction
The SimpleMDM API exists as a

RESTful

JSON implementation. It is designed to
work over authenticated,

HTTPS secured channels. This reference
describes the extent of the API functionality available to you.
Since the API is based upon the HTTP protocol, you can directly interact
with it using any HTTP client library.
# Authentication
# To authenticate with curl, use the "-u" flag with each request.
# Be sure to include a trailing ":"
curl https://a.simplemdm.com/api/v1/account \
-u ${API_KEY}:
You authenticate with the SimpleMDM API by providing your secret API key
with each request. The API uses

HTTP Basic Authentication
o receive your API key. It will look for your API key in the username
field. The password field should be left blank.
You can retrieve your API key by signing into your SimpleMDM account,
visiting "Settings" and then selecting the "API" tab.
SimpleMDM operates exclusively over HTTPS. Requests that are received
over HTTP without encryption will fail.
# Errors
 Example response body
{
"errors": [
{
"title": "object not found"
}
]
}
When the API encounters an error with your request, it will respond with
an HTTP status code and a JSON-formatted body with additional details.
# Pagination
curl https://a.simplemdm.com/api/v1/apps?limit=3&starting_after=33 \
-u ${API_KEY}:{
"data": [
{
"type": "app",
"id": 34,
"attributes": {
"name": "Afterlight",
"bundle_identifier": "com.simonfilip.AfterGlow",
"app_type": "app store",
"itunes_store_id": 573116090
}
},
{
"type": "app",
"id": 63,
"attributes": {
"name": "Surf Report",
"bundle_identifier": "com.portlandsurfclub.ent.surfreport2.2",
"app_type": "enterprise",
"version": "2.2"
}
},
{
"type": "app",
"id": 67,
"attributes": {
"name": "Scanner Pro",
"app_type": "custom b2b",
"itunes_store_id": 44827291
}
}
],
"has_more": true
}
Many of the "list" API methods utilize cursor-based pagination using the
`limit` and `starting_after` parameters. These methods also support
ordering the result set by specifying the `direction` parameter.
### Request
Argument
Description
limit
Optional. A limit on the number of objects to be returned, between 1
and 100. Defaults to 10.
starting_after
Optional. A cursor in the form of an object ID. It is typically set
o the id of the last object of the previous response. If unspecified,
he API will start at the beginning of the object list.
direction
Optional. The direction to sort the result set. Possible values are
asc or desc. Defaults to
asc.
### Response
The response from the API will indicate whether additional objects are
available with the `has_more` key.
Argument
Description
has_more
A boolean true or false, based on if
additional records exist beyond the specified cursor and limit.
# Account
## Show
curl https://a.simplemdm.com/api/v1/account \
-u ${API_KEY}:{
"data": {
"type": "account",
"attributes": {
"name": "SimpleMDM",
"apple_store_country_code": "US",
"subscription": {
"licenses": {
"total": 500,
"available": 123
}
}
}
}
}
Retrieve information about your account. Subscription information is
only available for accounts on a manual billing plan.
### HTTP Request
`GET https://a.simplemdm.com/api/v1/account`
## Update
curl https://a.simplemdm.com/api/v1/account \
-F _method=PATCH \
-d apple_store_country_code=AU \
-u ${API_KEY}:{
"data": {
"type": "account",
"attributes": {
"name": "SimpleMDM",
"apple_store_country_code": "AU"
}
}
}
Argument
Description
name
The name of the account.
apple_store_country_code
The app store country that SimpleMDM uses for the account.
### HTTP Request
`PATCH https://a.simplemdm.com/api/v1/account`
# Apps
An app represents an app in your app catalog. You can manage your app
catalog via the API and use *assignment groups* to install apps to your
devices.
## List all
curl https://a.simplemdm.com/api/v1/apps \
-u ${API_KEY}:{
"data": [
{
"type": "app",
"id": 34,
"attributes": {
"name": "Afterlight",
"bundle_identifier": "com.simonfilip.AfterGlow",
"app_type": "app store",
"itunes_store_id": 573116090,
"installation_channels": [
"standard"
],
"platform_support": "iOS",
"processing_status": "processed"
}
},
{
"type": "app",
"id": 63,
"attributes": {
"name": "Surf Report",
"bundle_identifier": "com.portlandsurfclub.ent.surfreport2.2",
"app_type": "enterprise",
"version": "2.2",
"installation_channels": [
"standard"
],
"platform_support": "iOS",
"processing_status": "processed"
}
},
{
"type": "app",
"id": 67,
"attributes": {
"name": "Scanner Pro",
"app_type": "custom b2b",
"itunes_store_id": 44827291,
"installation_channels": [
"standard"
],
"platform_support": "iOS",
"processing_status": "processed"
}
}
],
"has_more": false
}
Supports [pagination](#pagination).
### HTTP Request
`GET https://a.simplemdm.com/api/v1/apps`
Argument
Description
include_shared
If true, includes assigned apps from the shared catalog. Defaults to
false.
## Retrieve one
curl https://a.simplemdm.com/api/v1/apps/34 \
-u ${API_KEY}:{
"data": {
"type": "app",
"id": 34,
"attributes": {
"name": "Afterlight",
"bundle_identifier": "com.simonfilip.AfterGlow",
"app_type": "app store",
"itunes_store_id": 573116090
}
}
}
### HTTP Request
`GET https://a.simplemdm.com/api/v1/apps/{APP_ID}`
## Create
curl https://a.simplemdm.com/api/v1/apps \
-F binary=@SurfReport.ipa \
-u ${API_KEY}:{
"data": {
"type": "app",
"id": 63,
"attributes": {
"name": "Surf Report",
"app_type": "enterprise",
"version": "2.2",
"bundle_identifier": "com.portlandsurfclub.ent.surfreport2.2"
}
}
}
You can use this method to add an App Store app, upload an enterprise
iOS app, or upload macOS package to your app catalog.
### HTTP Request
`POST https://a.simplemdm.com/api/v1/apps`
One and only one of of app\_store\_id, bundle\_id, or binary must be
specified. Name can optionally be specified if binary is specified.
Argument
Description
app_store_id
The Apple App Store ID of the app to be added. Example:
1090161858.
bundle_id
The bundle identifier of the Apple App Store app to be added.
Example: com.myCompany.MyApp1
binary
The binary file with an ipa or pkg
extension. File should be provided as multipart/form-data.
name
The name that SimpleMDM will use to reference this app. If left
blank, SimpleMDM will automatically set this to the app name specified
by the binary.
## Update
curl https://a.simplemdm.com/api/v1/apps/63 \
-F binary=@SurfReportUpdated.ipa \
-F deploy_to=outdated \
-X PATCH \
-u ${API_KEY}:{
"data": {
"type": "app",
"id": 63,
"attributes": {
"name": "Surf Report (Updated)",
"app_type": "enterprise",
"version": "2.3",
"bundle_identifier": "com.portlandsurfclub.ent.surfreport2.3"
}
}
}
You can use this method to update the binary or name of an existing app.
Does not work for shared apps.
### HTTP Request
`PATCH https://a.simplemdm.com/api/v1/apps/{APP_ID}`
Argument
Description
binary
The binary file with an ipa or pkg
extension. File should be provided as multipart/form-data.
name
The name that SimpleMDM will use to reference this app. If left
blank, SimpleMDM will automatically set this to the app name specified
by the binary.
deploy_to
Deploy the app to associated devices immediately after the app has
been uploaded and processed. Possible values are none,
outdated or all. When set to
outdated, and a newer version of an app has been uploaded,
SimpleMDM will deploy the app to all associated devices with an outdated
version of the app installed. When set to all, SimpleMDM
will deploy to all associated devices regardless of the version of the
app currently installed. If set to none then the app will
not be immediately deployed to any devices as a result of this API call.
Defaults to none
## Delete
curl https://a.simplemdm.com/api/v1/apps/63 \
-u ${API_KEY}: \
-X DELETE
HTTP/1.1 204 No Content
### HTTP Request
`DELETE https://a.simplemdm.com/api/v1/apps/{APP_ID}`
Deleting an app from the catalog will not remove it from any devices it
may be install on. Does not work for shared apps.
## List installs
curl https://a.simplemdm.com/api/v1/apps/{APP_ID}/installs \
-u ${API_KEY}:{
"data": [
{
"type": "installed_app",
"id": 26409,
"attributes": {
"name": "Deliveries",
"identifier": "com.junecloud.Deliveries",
"version": "9.2.1",
"short_version": "9.2.1",
"bundle_size": 56163003,
"dynamic_size": null,
"managed": false,
"discovered_at": "2021-11-08T09:02:07.000-08:00",
"last_seen_at": "2021-12-22T13:01:58.000-08:00"
},
"relationships": {
"device": {
"data": {
"type": "device",
"id": 7
}
}
}
},
{
"type": "installed_app",
"id": 34943,
"attributes": {
"name": "Deliveries",
"identifier": "com.junecloud.Deliveries",
"version": "1311",
"short_version": "9.2.1",
"bundle_size": 21204992,
"dynamic_size": 139264,
"managed": true,
"discovered_at": "2021-12-16T14:25:54.000-08:00",
"last_seen_at": "2021-12-22T13:00:57.000-08:00"
},
"relationships": {
"device": {
"data": {
"type": "device",
"id": 3
}
}
}
}
],
"has_more": false
}
Returns a listing of the devices that an app is installed on. Supports
[pagination](#pagination).
### HTTP Request
`GET https://a.simplemdm.com/api/v1/apps/{APP_ID}/installs`
## Update Munki Pkg Info
Upload a new XML or PLIST file for a Munki App.
### HTTP Request
`POST https://a.simplemdm.com/api/v1/apps/{APP_ID}/munki_pkginfo`
Argument
Description
file
Required. XML or PLIST file to replace any preexisting file. Send as
multipart/form-data.
curl https://a.simplemdm.com/api/v1/apps/{APP_ID}/munki_pkginfo \
-X POST \
-F file@munkipkg.plist \
-u ${API_KEY}:
HTTP/1.1 202 Accepted
## Delete Munki Pkg Info
Delete Munki information.
### HTTP Request
`DELETE https://a.simplemdm.com/api/v1/apps/{APP_ID}/munki_pkginfo`
curl https://a.simplemdm.com/api/v1/apps/{APP_ID}/munki_pkginfo \
-u ${API_KEY}: \
-X DELETE
HTTP/1.1 204 No Content
# Assignment Groups
An assignment group is an object that pairs *apps* with *device groups*
and *devices* for the purpose of pushing apps and media to devices.
Supports [pagination](#pagination).
## List all
curl https://a.simplemdm.com/api/v1/assignment_groups \
-u ${API_KEY}:{
"data": [
{
"type": "assignment_group",
"id": 26,
"attributes": {
"name": "SimpleMDM",
"auto_deploy": true
},
"relationships": {
"apps": {
"data": [
{
"type": "app",
"id": 49
}
]
},
"device_groups": {
"data": [
{
"type": "device_group",
"id": 37
}
]
},
"devices": {
"data": [
{
"type": "device",
"id": 56
}
]
}
}
},
{
"type": "assignment_group",
"id": 38,
"attributes": {
"name": "Productivity Apps",
"auto_deploy": false
},
"relationships": {
"apps": {
"data": [
{
"type": "app",
"id": 63
},
{
"type": "app",
"id": 67
}
]
},
"device_groups": {
"data": [
{
"type": "device_group",
"id": 37
},
{
"type": "device_group",
"id": 38
}
]
},
"devices": {
"data": [
{
"type": "device",
"id": 54
}
]
}
}
},
...
],
"has_more": false
}
### HTTP Request
`GET https://a.simplemdm.com/api/v1/assignment_groups`
## Retrieve one
curl https://a.simplemdm.com/api/v1/assignment_groups/26 \
-u ${API_KEY}:{
"data": {
"type": "assignment_group",
"id": 26,
"attributes": {
"name": "SimpleMDM",
"auto_deploy": true
},
"relationships": {
"apps": {
"data": [
{
"type": "app",
"id": 49
},
{
"type": "app",
"id": 67
}
]
},
"device_groups": {
"data": [
{
"type": "device_group",
"id": 37
},
{
"type": "device_group",
"id": 38
}
]
},
"devices": {
"data": [
{
"type": "device",
"id": 54
}
]
}
}
}
}
### HTTP Request
`GET https://a.simplemdm.com/api/v1/assignment_groups/{ASSIGNMENT_GROUP_ID}`
## Create
curl https://a.simplemdm.com/api/v1/assignment_groups \
-d 
-u ${API_KEY}: \
-X POST
{
"data": {
"type": "assignment_group",
"id": 43,
"priority": 3,
"attributes": {
"name": "Communication Apps",
"auto_deploy": true
},
"relationships": {
"apps": {
"data": []
},
"device_groups": {
"data": []
},
"devices": {
"data": []
}
}
}
}
### HTTP Request
`POST https://a.simplemdm.com/api/v1/assignment_groups`
Argument
Description
name
The name of the assignment group.
priority
Optional. The priority of the assignment group.
auto_deploy
Optional. Whether the apps should be automatically pushed to devices
when they join any of the related device groups. Defaults to
rue.
ype
Optional. Type of assignment group. Must be one of
standard (for MDM app/media deployments) or
munki for Munki app deployments. Defaults to
standard.
install_type
Optional. The install type for munki assignment groups. Must be one
of managed, self_serve,
default_installs or managed_updates. This
setting has no effect for non-munki (standard) assignment
groups. Defaults to managed.
app_track_location
Optional. If true, it tracks the location of IOS device when the
SimpleMDM mobile app is installed. Defaults to true.
## Update
curl https://a.simplemdm.com/api/v1/assignment_groups/43 \
-d auto_deploy=false
-u ${API_KEY}: \
--request PATCH
HTTP/1.1 204 No Content
### HTTP Request
`PATCH https://a.simplemdm.com/api/v1/assignment_groups/{ASSIGNMENT_GROUP_ID}`
Argument
Description
name
The name of the assignment group.
priority
Optional. The priority of the assignment group.
auto_deploy
Optional. Whether the apps should be automatically pushed to devices
when they join any of the related device groups. Defaults to
rue.
## Delete
curl https://a.simplemdm.com/api/v1/assignment_groups/{ASSIGNMENT_GROUP_ID} \
-u ${API_KEY}: \
-X DELETE
HTTP/1.1 204 No Content
### HTTP Request
`DELETE https://a.simplemdm.com/api/v1/assignment_groups/{ASSIGNMENT_GROUP_ID}`
## Assign app
curl https://a.simplemdm.com/api/v1/assignment_groups/43/apps/21 \
-u ${API_KEY}: \
-X POST
HTTP/1.1 204 No Content
### HTTP Request
`POST https://a.simplemdm.com/api/v1/assignment_groups/{ASSIGNMENT_GROUP_ID}/apps/{APP_ID}`
## Unassign app
curl https://a.simplemdm.com/api/v1/assignment_groups/43/apps/21 \
-u ${API_KEY}: \
-X DELETE
HTTP/1.1 204 No Content
### HTTP Request
`DELETE https://a.simplemdm.com/api/v1/assignment_groups/{ASSIGNMENT_GROUP_ID}/apps/{APP_ID}`
## Assign device group
curl https://a.simplemdm.com/api/v1/assignment_groups/43/device_groups/87 \
-u ${API_KEY}: \
-X POST
HTTP/1.1 204 No Content
### HTTP Request
`POST https://a.simplemdm.com/api/v1/assignment_groups/{ASSIGNMENT_GROUP_ID}/device_groups/{DEVICE_GROUP_ID}`
## Unassign device group
curl https://a.simplemdm.com/api/v1/assignment_groups/43/device_groups/87 \
-u ${API_KEY}: \
-X DELETE
HTTP/1.1 204 No Content
### HTTP Request
`DELETE https://a.simplemdm.com/api/v1/assignment_groups/{ASSIGNMENT_GROUP_ID}/device_groups/{DEVICE_GROUP_ID}`
## Assign device
curl https://a.simplemdm.com/api/v1/assignment_groups/43/devices/87 \
-u ${API_KEY}: \
-X POST
HTTP/1.1 204 No Content
### HTTP Request
`POST https://a.simplemdm.com/api/v1/assignment_groups/{ASSIGNMENT_GROUP_ID}/devices/{DEVICE_ID}`
## Unassign device
curl https://a.simplemdm.com/api/v1/assignment_groups/43/device/87 \
-u ${API_KEY}: \
-X DELETE
HTTP/1.1 204 No Content
### HTTP Request
`DELETE https://a.simplemdm.com/api/v1/assignment_groups/{ASSIGNMENT_GROUP_ID}/devices/{DEVICE_ID}`
## Push apps
Installs associated apps to associated devices. A munki catalog refresh
or MDM install command will be sent to all associated devices depending
on the assignment group type.
curl https://a.simplemdm.com/api/v1/assignment_groups/43/push_apps \
-u ${API_KEY}: \
-X POST
HTTP/1.1 202 Accepted
### HTTP Request
`POST https://a.simplemdm.com/api/v1/assignment_groups/{ASSIGNMENT_GROUP_ID}/push_apps`
## Update apps
Updates associated apps on associated devices. A munki catalog refresh
or MDM install command will be sent to all associated devices depending
on the assignment group type.
curl https://a.simplemdm.com/api/v1/assignment_groups/43/update_apps \
-u ${API_KEY}: \
-X POST
HTTP/1.1 202 Accepted
### HTTP Request
`POST https://a.simplemdm.com/api/v1/assignment_groups/{ASSIGNMENT_GROUP_ID}/update_apps`
## Assign profile
Assign profile to an assignment group. You must have permission to
modify both the assignment group and the profile.
curl https://a.simplemdm.com/api/v1/assignment_groups/43/profiles/83 \
-u ${API_KEY}: \
-X POST
HTTP/1.1 204 No Content
### HTTP Request
`POST https://a.simplemdm.com/api/v1/assignment_groups/{ASSIGNMENT_GROUP_ID}/profiles/{PROFILE_ID}`
## Unassign profile
Unassign profile from an assignment group. You must have permission to
modify both the assignment group and the profile.
curl https://a.simplemdm.com/api/v1/assignment_groups/43/profiles/83 \
-u ${API_KEY}: \
-X DELETE
HTTP/1.1 204 No Content
### HTTP Request
`DELETE https://a.simplemdm.com/api/v1/assignment_groups/{ASSIGNMENT_GROUP_ID}/profiles/{PROFILE_ID}`
## Sync profiles
Sync profiles with an assignment group after assigning or unassigning
hem. This endpoint has a rate limit of 1 request every 30 seconds. When
he limit is reached, it will return a status code of '429'. You can
check the 'X-RateLimit-Reset' header to see when the limit will be
reset.
curl https://a.simplemdm.com/api/v1/assignment_groups/43/sync_profiles \
-u ${API_KEY}: \
-X POST
HTTP/1.1 204 No Content
### HTTP Request
`POST https://a.simplemdm.com/api/v1/assignment_groups/{ASSIGNMENT_GROUP_ID}/sync_profiles`
## Clone
Clone an assignment group. The cloned assignment group will have the
same apps, profiles, and devices as the original assignment group.
This endpoint requires that your account be opted in to the New Groups
Experience. It will only clone Static and Dynamic groups.
curl https://a.simplemdm.com/api/v1/assignment_groups/43/clone \
-u ${API_KEY}: \
--request POST
HTTP/1.1 204 No Content
### HTTP Request
`POST https://a.simplemdm.com/api/v1/assignment_groups/{ASSIGNMENT_GROUP_ID}/clone`
# Custom Attributes
## List all
curl https://a.simplemdm.com/api/v1/custom_attributes \
-u ${API_KEY}:{
"data": [
{
"type": "custom_attribute",
"id": "email_address",
"attributes": {
"name": "email_address",
"default_value": "user@example.org"
}
},
{
"type": "custom_attribute",
"id": "full_name",
"attributes": {
"name": "full_name",
"default_value": "not provided"
}
}
],
"has_more": false
}
Show all custom attributes active in the account.
### HTTP Request
`GET https://a.simplemdm.com/api/v1/custom_attributes`
## Retrieve one
curl https://a.simplemdm.com/api/v1/custom_attributes/email_address \
-u ${API_KEY}:{
"data": {
"type": "custom_attribute",
"id": "email_address",
"attributes": {
"name": "email_address",
"default_value": "user@example.org"
}
}
}
### HTTP Request
`GET https://a.simplemdm.com/api/v1/custom_attributes/{CUSTOM_ATTRIBUTE_ID}`
## Create
Define a new custom attribute for the account.
Argument
Description
name
Required. The name of the custom attribute. This name will be used
when referencing the custom attribute throughout the app. Alphanumeric
characters and underscores only. Case insensitive.
default_value
Optional. The value that will be used if a value is not provided
elsewhere.
### HTTP Request
`POST https://a.simplemdm.com/api/v1/custom_attributes`
## Update
Update a custom attribute for the account.
Argument
Description
default_value
The value that will be used if a value is not provided
elsewhere.
### HTTP Request
`PATCH https://a.simplemdm.com/api/v1/custom_attributes/{CUSTOM_ATTRIBUTE_ID}`
## Delete
Remove a custom attribute from the account. This will also remove all
custom attribute values related to the custom attribute.
### HTTP Request
`DELETE https://a.simplemdm.com/api/v1/custom_attributes/{CUSTOM_ATTRIBUTE_ID}`
## Get values for device
Show all custom attribute values assigned to a device.
curl https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/custom_attribute_values \
-u ${API_KEY}:{
"data": [
{
"type": "custom_attribute_value",
"id": "my_first_custom_attribute",
"attributes": {
"value": "hello",
"secret": false,
"source": "account"
}
},
{
"type": "custom_attribute_value",
"id": "my_other_custom_attribute",
"attributes": {
"value": "",
"secret": true,
"source": "device"
}
}
]
}
### HTTP Request
`GET https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/custom_attribute_values`
## Set value for device
Set the value of a custom attribute for a device.
Argument
Description
value
Required. The value to be assigned for the provided device and
custom attribute.
curl "https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/custom_attribute_values/my_other_custom_attribute" \
-u ${API_KEY}: \
-d  \
-X "PUT"
{
"data": {
"type": "custom_attribute_value",
"id": "my_other_custom_attribute",
"attributes": {
"value": "test"
}
}
}
### HTTP Request
`PUT https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/custom_attribute_values/{CUSTOM_ATTRIBUTE_NAME}`
## Set multiple values for a device
Set multiple custom attribute values for a device.
Argument
Description
[{"name": "my_custom_attribute_1", "value": "test1"}]
Required. An array of json objects where each object contains a
'name' and 'value' key
curl "https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/custom_attribute_values" \
-u "${API_KEY}:" \
-X "PUT" \
-H 'Content-Type: application/json' \
-d '{
"data": [
{
"name": "my_custom_attribute_1",
"value": "test1"
},
{
"name": "my_custom_attribute_2",
"value": "test2"
}
]
}'
### HTTP Request
`PUT https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/custom_attribute_values`
## Set custom attribute value for multiple devices
Set the value for a custom attribute on multiple devices
Argument
Description
[{"device_id": "123", "value": "test1"}]
Required. An array of json objects where each object contains a
'device_id' and 'value' key
curl "https://a.simplemdm.com/api/v1/custom_attribute_values/my_custom_attribute" \
-u ${API_KEY}: \
-X "PUT" \
-H 'Content-Type: application/json' \
-d '{
"data": [
{
"device_id": "123",
"value": "test1"
},
{
"device_id": "321",
"value": "test2"
}
]
}'
### HTTP Request
`PUT https://a.simplemdm.com/api/v1/custom_attribute_values/my_custom_attribute`
## Get values for group
Show all custom attribute values assigned to a device group.
curl https://a.simplemdm.com/api/v1/device_groups/1/custom_attribute_values \
-u ${API_KEY}:{
"data": [
{
"type": "custom_attribute_value",
"id": "my_first_custom_attribute",
"attributes": {
"value": "hello",
"secret": false,
"source": "group"
}
},
{
"type": "custom_attribute_value",
"id": "my_other_custom_attribute",
"attributes": {
"value": "",
"secret": true,
"source": "account"
}
}
]
}
### HTTP Request
`GET https://a.simplemdm.com/api/v1/device_groups/{DEVICE_GROUP_ID}/custom_attribute_values`
## Set value for group
Set the value of a custom attribute for a device group.
Argument
Description
value
Required. The value to be assigned for the provided group and custom
attribute.
curl "https://a.simplemdm.com/api/v1/device_groups/1/custom_attribute_values/my_other_custom_attribute" \
-u ${API_KEY}: \
-d  \
-X "PUT"
{
"data": {
"type": "custom_attribute_value",
"id": "my_other_custom_attribute",
"attributes": {
"value": "test"
}
}
}
### HTTP Request
`PUT https://a.simplemdm.com/api/v1/device_groups/{DEVICE_GROUP_ID}/custom_attribute_values/{CUSTOM_ATTRIBUTE_NAME}`
# Custom Configuration Profiles
## List all
Argument
Description
search
Limit response to profiles with matching profile name
curl https://a.simplemdm.com/api/v1/custom_configuration_profiles \
-u ${API_KEY}:{
"data": [
{
"type": "custom_configuration_profile",
"id": 293814,
"attributes": {
"name": "Munki Configuration",
"reinstall_after_os_update": false,
"profile_identifier": "com.unwiredmdm.aabc717175a3467b93af177aa5f1992d"
"user_scope": true,
"attribute_support": false,
"escape_attributes": false,
"group_count": 2,
"device_count": 4
},
"relationships": {
"device_groups": {
"data": [
{
"type": "device group",
"id": 732444
}
]
}
}
}
],
"has_more": false
}
Supports [pagination](#pagination).
### HTTP Request
`GET https://a.simplemdm.com/api/v1/custom_configuration_profiles`
## Create
Argument
Description
name
Required. A name for the profile.
mobileconfig
Required. The mobileconfig file. Send as multipart/form-data.
user_scope
Optional. A boolean true or false. If false, deploy as a device
profile instead of a user profile for macOS devices. Defaults to
rue.
attribute_support
Optional. A boolean true or false. When enabled, SimpleMDM will
process variables in the uploaded profile. Defaults to false.
escape_attributes
Optional. A boolean true or false. When enabled, SimpleMDM escape
he values of the custom variables in the uploaded profile.
reinstall_after_os_update
Optional. A boolean true or false. When enabled, SimpleMDM will
re-install the profile automatically after macOS software updates are
detected.
### HTTP Request
`POST https://a.simplemdm.com/api/v1/custom_configuration_profiles/`
## Update
Argument
Description
name
Optional. Change the name of the profile.
mobileconfig
Optional. Update the mobileconfig file. Send as
multipart/form-data.
user_scope
Optional. A boolean true or false. If false, deploy as a device
profile instead of a user profile for macOS devices.
attribute_support
Optional. A boolean true or false. When enabled, SimpleMDM will
process variables in the uploaded profile.
escape_attributes
Optional. A boolean true or false. When enabled, SimpleMDM escape
he values of the custom variables in the uploaded profile.
reinstall_after_os_update
Optional. A boolean true or false. When enabled, SimpleMDM will
re-install the profile automatically after macOS software updates are
detected.
### HTTP Request
`PATCH https://a.simplemdm.com/api/v1/custom_configuration_profiles/{PROFILE_ID}`
## Download
Download the contents of the custom configuration profile.
### HTTP Request
`GET https://a.simplemdm.com/api/v1/custom_configuration_profiles/{PROFILE_ID}/download`
## Delete
### HTTP Request
`DELETE https://a.simplemdm.com/api/v1/custom_configuration_profiles/{PROFILE_ID}`
## Assign to device group
This action will cause the profile to push to all devices in the
assigned device group.
### HTTP Request
`POST https://a.simplemdm.com/api/v1/custom_configuration_profiles/{PROFILE_ID}/device_groups/{DEVICE_GROUP_ID}`
## Unassign from device group
This action will cause the profile to be removed from all devices in the
assigned device group.
### HTTP Request
`DELETE https://a.simplemdm.com/api/v1/custom_configuration_profiles/{PROFILE_ID}/device_groups/{DEVICE_GROUP_ID}`
## Assign to device
This action will cause the profile to push to the specified device.
### HTTP Request
`POST https://a.simplemdm.com/api/v1/custom_configuration_profiles/{PROFILE_ID}/devices/{DEVICE_ID}`
## Unassign from device
This action will cause the profile to be removed from the specified
device.
### HTTP Request
`DELETE https://a.simplemdm.com/api/v1/custom_configuration_profiles/{PROFILE_ID}/devices/{DEVICE_ID}`
# DEP Servers
## List all
Returns a list of Apple Business Manager server associations, which are
used for the purposes of Automated Enrollment ( formerly Apple DEP or
Device Enrollment Program). These associations exist as "Enrollments"
within the SimpleMDM admin interface. Supports
[pagination](#pagination).
curl "https://a.simplemdm.com/api/v1/dep_servers" \
-u ${API_KEY}:{
"data": [
{
"type": "dep_server",
"id": 1,
"attributes": {
"server_name": "My DEP MDM Server",
"organization_name": "SimpleMDM",
"token_expires_at": "2023-02-03T10:57:07.000-08:00",
"last_synced_at": "2022-02-05T06:00:05.000-08:00"
}
},
{
"type": "dep_server",
"id": 2,
"attributes": {
"server_name": "Another MDM Server",
"organization_name": "Acme Corp",
"token_expires_at": "2023-02-03T10:57:07.000-08:00",
"last_synced_at": "2022-02-05T06:00:05.000-08:00"
}
}
],
"has_more": false
}
### HTTP Request
`GET https://a.simplemdm.com/api/v1/dep_servers`
## Retrieve one
### HTTP Request
`GET https://a.simplemdm.com/api/v1/dep_servers/{DEP_SERVER_ID}`
## Sync with Apple
DEP server records are automatically synchronized with Apple every
couple of hours. This provokes a manual sync.
### HTTP Request
`POST https://a.simplemdm.com/api/v1/dep_servers/{DEP_SERVER_ID}/sync`
## List DEP devices
Returns a listing of device records associated with the DEP server, as
provided by Apple. These DEP devices do not necessarily have
corresponding SimpleMDM device records. Supports
[pagination](#pagination).
### HTTP Request
`GET https://a.simplemdm.com/api/v1/dep_servers/{DEP_SERVER_ID}/dep_devices`
## Retrieve one DEP device
### HTTP Request
`GET https://a.simplemdm.com/api/v1/dep_servers/{DEP_SERVER_ID}/dep_devices/{DEP_DEVICE_ID}`
# Devices
## List all
Returns a listing of all devices in the account. Supports
[pagination](#pagination).
Argument
Description
search
Limit response to devices with matching name, UDID, serial number,
IMEI, MAC address, or phone number.
include_awaiting_enrollment
When true, returns all devices including those in the
awaiting_enrollment state. When false, does not return devices in the
awaiting_enrollment state. Defaults to false.
include_secret_custom_attributes
When true, returns all custom attribute values including those
marked as secret. Defaults to false.
curl https://a.simplemdm.com/api/v1/devices \
-u ${API_KEY}:{
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
### HTTP Request
`GET https://a.simplemdm.com/api/v1/devices`
## Retrieve one
Argument
Description
include_secret_custom_attributes
When true, returns all custom attribute values including those
marked as secret. Defaults to false.
curl https://a.simplemdm.com/api/v1/devices/{DEVICE_ID} \
-u ${API_KEY}:{
"data": {
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
"dep_enrolled": false,
"dep_assigned": false,
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
}
}
}
### HTTP Request
`GET https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}`
## Create
curl https://a.simplemdm.com/api/v1/devices/ \
-d  \
-d  \
-u ${API_KEY}:{
"data": {
"type": "device",
"id": 980190963,
"attributes": {
"name": "Sara's iPad",
"last_seen_at": null,
"last_seen_ip": null,
"status": "awaiting enrollment",
"enrollment_url": "https://a.simplemdm.com/e/?c=63154796",
"device_name": null,
"os_version": null,
"build_version": null,
"model_name": "Unknown",
"model": null,
"product_name": null,
"unique_identifier": null,
"serial_number": null,
"imei": null,
"meid": null,
"device_capacity": null,
"available_device_capacity": null,
"battery_level": null,
"modem_firmware_version": null,
"iccid": null,
"bluetooth_mac": null,
"wifi_mac": null,
"current_carrier_network": null,
"sim_carrier_network": null,
"subscriber_carrier_network": null,
"carrier_settings_version": null,
"phone_number": null,
"voice_roaming_enabled": null,
"data_roaming_enabled": null,
"is_roaming": null,
"subscriber_mcc": null,
"simmnc": null,
"current_mcc": null,
"current_mnc": null,
"hardware_encryption_caps": null,
"passcode_present": null,
"passcode_compliant": null,
"passcode_compliant_with_profiles": null,
"is_supervised": null,
"is_device_locator_service_enabled": null,
"is_do_not_disturb_in_effect": null,
"personal_hotspot_enabled": null,
"itunes_store_account_is_active": null,
"cellular_technology": null,
"last_cloud_backup_date": null,
"is_activation_lock_enabled": null,
"is_cloud_backup_enabled": null,
"location_latitude": null,
"location_longitude": null,
"location_accuracy": null,
"location_updated_at": null
},
"relationships": {
"device_group": {
"data": {
"type": "device_group",
"id": 41
}
}
}
}
}
Creates a new device object in SimpleMDM. The response body includes an
enrollment URL that can be used once to enroll a physical device.
### HTTP Request
`POST https://a.simplemdm.com/api/v1/devices`
Argument
Description
name
The name the device will show within SimpleMDM.
group_id
The device group to assign the device to initially.
## Update
curl https://a.simplemdm.com/api/v1/devices/{DEVICE_ID} \
-X PATCH \
-d  \
-u ${API_KEY}:{
"data": {
"type": "device",
"id": 121,
"attributes": {
"name": "Ashley's iPad",
"last_seen_at": "2015-10-01T18:38:47.277-07:00",
"last_seen_ip": "203.0.113.0",
"status": "enrolled",
"device_name": "iPhone",
"os_version": "9.3.2",
"build_version": "13A452",
"model_name": "iPhone 6",
"model": "NG4W2LL",
"product_name": "iPhone7,2",
"serial_number": "DNFJE9DNG5MG",
"imei": "35 445506 652132 5",
"meid": "35404596608032",
"device_capacity": 55.62955093383789,
"available_device_capacity": 15.19466781616211,
"battery_level": "93%",
"modem_firmware_version": "4.02.00",
"iccid": "8914 8110 0002 8094 4264",
"bluetooth_mac": "f0:db:e2:df:e9:11",
"wifi_mac": "f0:db:e2:df:e9:2f",
"current_carrier_network": "Verizon",
"sim_carrier_network": "Verizon",
"subscriber_carrier_network": "Verizon",
"carrier_settings_version": "21.1",
"phone_number": "5035551234",
"voice_roaming_enabled": true,
"data_roaming_enabled": false,
"is_roaming": false,
"subscriber_mcc": "311",
"simmnc": "480",
"current_mcc": "311",
"current_mnc": "480",
"hardware_encryption_caps": 3,
"passcode_present": true,
"passcode_compliant": true,
"passcode_compliant_with_profiles": true,
"subscriber_mnc": "480",
"simmcc": "311",
"is_supervised": false,
"is_device_locator_service_enabled": true,
"is_do_not_disturb_in_effect": false,
"personal_hotspot_enabled": true,
"itunes_store_account_is_active": true,
"cellular_technology": 3,
"last_cloud_backup_date": "2015-10-01T15:09:12.000-07:00",
"is_activation_lock_enabled": true,
"is_cloud_backup_enabled": true,
"location_latitude": "75.13421212355",
"location_longitude": "-14.313565422",
"location_accuracy": "60",
"location_updated_at": "2015-10-01T15:09:12.000-07:00"
},
"relationships": {
"device_group": {
"data": {
"type": "device_group",
"id": 37
}
}
}
}
}
Update the SimpleMDM name or device name of a device object.
### HTTP Request
`PATCH https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}`
Argument
Description
name
The name of the device within SimpleMDM.
device_name
The name that appears on the device itself. Requires supervision.
This operation is asynchronous and occurs when the device is
online.
## Delete
Unenroll a device and remove it from the account.
curl https://a.simplemdm.com/api/v1/devices/{DEVICE_ID} \
-u ${API_KEY}: \
-X DELETE
HTTP/1.1 204
### HTTP Request
`DELETE https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}`
## List profiles
curl https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/profiles \
-u ${API_KEY}:{
"data": [
{
"type": "custom_configuration_profile",
"id": 13,
"attributes": {
"name": "Disable AFP",
"profile_identifier": "com.unwiredmdm.aabc717175a3467b93af177aa5f1992b",
"user_scope": false,
"attribute_support": false
}
}
],
"has_more": false
}
Returns a listing of profiles that are directly assigned to the device.
Profiles assigned through groups are not shown. Per-device profiles
created through the "Accounts" tab of the UI are not shown. Supports
[pagination](#pagination).
### HTTP Request
`GET https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/profiles`
## List installed apps
curl https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/installed_apps \
-u ${API_KEY}:{
"data": [
{
"type": "installed_app",
"id": 578,
"attributes": {
"name": "1Password",
"identifier": "com.agilebits.onepassword-ios",
"version": "601004",
"short_version": "6.0.1",
"bundle_size": 93097984,
"dynamic_size": 1056768,
"managed": true,
"discovered_at": "2015-10-01T18:02:13.611-07:00",
"last_seen_at": "2021-12-22T13:00:57.000-08:00"
}
},
{
"type": "installed_app",
"id": 618,
"attributes": {
"name": "Airbnb",
"identifier": "com.airbnb.app",
"version": "485",
"short_version": "15.39",
"bundle_size": 120823808,
"dynamic_size": 27934720,
"managed": false,
"discovered_at": "2015-10-01T18:02:13.858-07:00",
"last_seen_at": "2021-12-22T13:00:57.000-08:00"
}
},
{
"type": "installed_app",
"id": 587,
"attributes": {
"name": "Bandsintown",
"identifier": "com.bandsintown.bit",
"version": "160",
"short_version": "4.13.1",
"bundle_size": 24756224,
"dynamic_size": 18677760,
"managed": false,
"discovered_at": "2015-10-01T18:02:13.659-07:00",
"last_seen_at": "2021-12-22T13:00:57.000-08:00"
}
},
...
],
"has_more": false
}
Returns a listing of the apps installed on a device. Supports
[pagination](#pagination).
### HTTP Request
`GET https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/installed_apps`
## List Users
`GET https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/users`
Returns a listing of the user accounts on a device. Supports
[pagination](#pagination).
Available for macOS devices only.
curl https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/users \
-u ${API_KEY}:{
"data": [
{
"type": "device_user",
"id": 5,
"attributes": {
"username": "userone",
"full_name": "User One",
"uid": 501,
"user_guid": "2DEE464E-0C21-4D0C-8B5B-0F74655ED54E",
"data_quota": null,
"data_used": null,
"data_to_sync": false,
"secure_token": true,
"logged_in": true,
"mobile_account": false
}
},
{
"type": "device_user",
"id": 6,
"attributes": {
"username": "usertwo",
"full_name": "User Two",
"uid": 502,
"user_guid": "AABBA42B-8078-48BA-9DA7-2CB6B0BC7272",
"data_quota": null,
"data_used": null,
"data_to_sync": false,
"secure_token": true,
"logged_in": false,
"mobile_account": false
}
}
],
"has_more": false
}
## Delete User
`DELETE https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/users/{USER_ID}`
Deletes a user from the device.
Available for supervised macOS devices only. This command will return
`HTTP 422 Unprocessable Entity` for unsupported devices.
curl https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/users/5 \
-u ${API_KEY}:
-X "DELETE"
HTTP/1.1 202 Accepted
## Push assigned apps
curl https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/push_apps \
-u ${API_KEY}: \
-X POST
HTTP/1.1 202 Accepted
You can use this method to push all assigned apps to a device that are
not already installed.
### HTTP Request
`POST https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/push_apps`
## Refresh
Request a refresh of the device information and app inventory. SimpleMDM
will update the inventory information when the device responds to the
request.
This command may return an `HTTP 429 Too Many Requests` if the API deems
he frequency of requests to be excessive.
curl https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/refresh \
-u ${API_KEY}: \
-X POST
HTTP/1.1 202
### HTTP Request
`POST https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/refresh`
## Restart
curl https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/restart \
-u ${API_KEY}: \
-X POST
HTTP/1.1 202 Accepted
This command sends a restart command to the device.
### HTTP Request
`POST https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/restart`
Argument
Description
rebuild_kernel_cache
Optional. Rebuild the kernel cache during restart. Requires macOS 11
or later. Defaults to false
notify_user
Optional. If a user is signed in, prompt them to optionally restart
he device. Requires macOS 11.3 or later. Defaults to false.
## Shut down
curl https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/shutdown \
-u ${API_KEY}: \
-X POST
HTTP/1.1 202 Accepted
This command sends a shutdown command to the device.
### HTTP Request
`POST https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/shutdown`
## Lock
curl https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/lock \
-d  \
-d  \
-u ${API_KEY}: \
-X POST
HTTP/1.1 202 Accepted
You can use this method to lock a device and optionally display a
message and phone number. The device can be unlocked with the existing
passcode of the device.
### HTTP Request
`POST https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/lock`
Argument
Description
message
Optional. The message to display on the lock screen. Supported on
iOS 7.0+ and macOS 10.14+.
phone_number
Optional. The phone number to display on the lock screen.
pin
Required for macOS devices. Not supported by iOS. A 6-digit number
hat the device will require to be unlocked.
## Lost mode actions
Refer to [Lost Mode](#lost-mode).
## Clear passcode
curl https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/clear_passcode \
-u ${API_KEY}: \
-X POST
HTTP/1.1 202 Accepted
You can use this method to unlock and remove the passcode of a device.
### HTTP Request
`POST https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/clear_passcode`
## Clear firmware password
curl https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/clear_firmware_password \
-u ${API_KEY}: \
-X POST
HTTP/1.1 202 Accepted
You can use this method to remove the firmware password from a device.
The firmware password must have been originally set using SimpleMDM for
his to complete successfully.
### HTTP Request
`POST https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/clear_firmware_password`
## Rotate firmware password
curl https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/rotate_firmware_password \
-u ${API_KEY}: \
-X POST
HTTP/1.1 202 Accepted
You can use this method to rotate the firmware password for a device.
The firmware password must have been originally set using SimpleMDM for
his to complete successfully.
### HTTP Request
`POST https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/rotate_firmware_password`
## Clear recovery lock password
curl https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/clear_recovery_lock_password \
-u ${API_KEY}: \
-X POST
HTTP/1.1 202 Accepted
You can use this method to remove the recovery lock password from a
device. The recovery lock password must have been originally set using
SimpleMDM for this to complete successfully.
### HTTP Request
`POST https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/clear_recovery_lock_password`
## Clear the Restrictions Password
curl https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/clear_restrictions_password \
-u ${API_KEY}: \
-X POST
HTTP/1.1 202 Accepted
This command clears the restrictions password and the restrictions on a
device (iOS and iPad only).
### HTTP Request
`POST https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/clear_restrictions_password`
## Rotate recovery lock password
curl https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/rotate_recovery_lock_password \
-u ${API_KEY}: \
-X POST
HTTP/1.1 202 Accepted
You can use this method to rotate the recovery lock password for a
device. The recovery lock password must have been originally set using
SimpleMDM for this to complete successfully.
### HTTP Request
`POST https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/rotate_recovery_lock_password`
## Rotate FileVault recovery key
curl https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/rotate_filevault_key \
-u ${API_KEY}: \
-X POST
HTTP/1.1 202 Accepted
You can use this method to rotate the filevault recovery key for a
device. SimpleMDM must be aware of the current recovery key or this
command will fail.
### HTTP Request
`POST https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/rotate_filevault_key`
## Set Admin Password
curl https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/set_admin_password \
-u ${API_KEY}: \
-d new_password=AReallyL0ngPasswordW1thNumberzAndSymbols \
-X POST
HTTP/1.1 202 Accepted
You can use this method to set the macOS Auto Admin password for a mac
device
### HTTP Request
`POST https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/set_admin_password`
Argument
Description
new_password
Required
## Rotate Admin Password
curl https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/rotate_admin_password \
-u ${API_KEY}: \
-X POST
HTTP/1.1 202 Accepted
You can use this method to rotate the macOS Auto Admin password for a
macOS device.
### HTTP Request
`POST https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/rotate_admin_password`
## Wipe
curl https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/wipe \
-u ${API_KEY}:
-X POST
HTTP/1.1 202 Accepted
You can use this method to erase all content and settings stored on a
device. The device will be unenrolled from SimpleMDM and returned to a
factory default configuration.
### HTTP Request
`POST https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/wipe`
Argument
Description
pin
Required for macOS devices that do not have the T2 chip. Not
supported by iOS or macOS devices with a T2 chip. A 6-digit number that
he device will require to be unlocked.
## Update OS
curl https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/update_os \
-u ${API_KEY}: \
-X POST
HTTP/1.1 202 Accepted
You can use this method to update a device to the latest OS version.
Currently supported by tvOS, iOS and macOS devices.
### HTTP Request
`POST https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/update_os`
Argument
Description
os_update_mode
Required for macOS devices and disregarded for iOS. Possible values
are 'smart_update', 'download_only', 'notify_only', 'install_asap', or
'force_update'.
version_type
Possible values are 'latest_minor_version', 'latest_major_version'.
Defaults to 'latest_major_version'.
## Enable Remote Desktop
curl https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/remote_desktop \
-u ${API_KEY}: \
-X POST
HTTP/1.1 202 Accepted
You can use this method to enable remote desktop. Supported by macOS
10.14.4+ devices only.
### HTTP Request
`POST https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/remote_desktop`
## Disable Remote Desktop
curl https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/remote_desktop \
-u ${API_KEY}: \
-X DELETE
HTTP/1.1 202 Accepted
You can use this method to disable remote desktop. Supported by macOS
10.14.4+ devices only.
### HTTP Request
`DELETE https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/remote_desktop`
## Enable Bluetooth
curl https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/bluetooth \
-u ${API_KEY}: \
-X POST
HTTP/1.1 202 Accepted
You can use this method to enable bluetooth on a device. Available in
iOS 11.3 and later for supervised devices and in macOS 10.13.4 and
later.
### HTTP Request
`POST https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/bluetooth`
## Disable Bluetooth
curl https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/bluetooth \
-u ${API_KEY}: \
-X DELETE
HTTP/1.1 202 Accepted
You can use this method to disable bluetooth on a device. Available in
iOS 11.3 and later for supervised devices and in macOS 10.13.4 and
later.
### HTTP Request
`DELETE https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/bluetooth`
## Set Time Zone
You can use this method to configure the local time zone setting on
devices. Supported by iOS 14.0+ and tvOS 14.0+ devices only.
Argument
Description
ime_zone
Required. a
TZ
Identifier to be set on the device.
curl https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/set_time_zone \
-d  \
-u ${API_KEY}: \
-X POST
HTTP/1.1 204 No Content
### HTTP Request
`POST https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/set_time_zone`
## Unenroll
You can use this method to unenroll your device.
curl https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/unenroll \
-u ${API_KEY}: \
-X POST
HTTP/1.1 202 Accepted
### HTTP Request
`POST https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/unenroll`
# Device Groups
A device group represents a collection of devices.
## List all
curl https://a.simplemdm.com/api/v1/device_groups \
-u ${API_KEY}:{
"data": [
{
"type": "device_group",
"id": 37,
"attributes": {
"name": "Remote Employees"
}
},
{
"type": "device_group",
"id": 38,
"attributes": {
"name": "Executives"
}
}
],
"has_more": false
}
Supports [pagination](#pagination).
### HTTP Request
`GET https://a.simplemdm.com/api/v1/device_groups`
## Retrieve one
curl https://a.simplemdm.com/api/v1/device_groups/37 \
-u ${API_KEY}:{
"data": {
"type": "device_group",
"id": 37,
"attributes": {
"name": "Remote Employees"
}
}
}
### HTTP Request
`GET https://a.simplemdm.com/api/v1/device_groups/{DEVICE_GROUP_ID}`
## Assign device
curl https://a.simplemdm.com/api/v1/device_groups/37/devices/121 \
-u ${API_KEY}: \
-X POST
HTTP/1.1 202 No Content
### HTTP Request
`POST https://a.simplemdm.com/api/v1/device_groups/{DEVICE_GROUP_ID}/devices/{DEVICE_ID}`
## Clone
Create a copy of a device group with the same configurations as the
original. The new device group will not have any devices assigned to it
initially.
curl https://a.simplemdm.com/api/v1/device_groups/37/clone \
-u ${API_KEY}: \
-X POST
{
"data": {
"type": "device_group",
"id": 38,
"attributes": {
"name": "Remote Employees (1)"
},
"relationships": {
"devices": {
"data": []
}
}
}
}
### HTTP Request
`POST https://a.simplemdm.com/api/v1/device_groups/{DEVICE_GROUP_ID}/clone`
# Enrollments
## List All
Enrollments provide a means of adding devices to your SimpleMDM account.
This endpoint excludes enrollments that use automated methods such as
hose connected to Apple Business Manager, Apple School Manager.
Enrollments with a `device` relationship represent One-time Enrollments.
Account Driven enrollments have a `null` `URL` attribute.
curl https://a.simplemdm.com/api/v1/enrollments \
-u ${API_KEY}:{
"data": [
{
"type": "enrollment",
"id": 2,
"attributes": {
"url": "https://a.simplemdm.com/enroll/?c=12345678",
"user_enrollment": false,
"welcome_screen": true,
"authentication": false
},
"relationships": {
"device_group": {
"data": {
"type": "device_group",
"id": 1
}
}
}
},
{
"type": "enrollment",
"id": 3,
"attributes": {
"url": null,
"user_enrollment": false,
"welcome_screen": true,
"authentication": false
},
"relationships": {
"device_group": {
"data": {
"type": "device_group",
"id": 1
}
}
}
},
{
"type": "enrollment",
"id": 4,
"attributes": {
"url": "https://a.simplemdm.com/enroll/?c=87654321",
"user_enrollment": false,
"welcome_screen": false,
"authentication": true
},
"relationships": {
"device_group": {
"data": {
"type": "device_group",
"id": 1
}
},
"device": {
"data": {
"type": "device",
"id": 2
}
}
}
},
{
"type": "enrollment",
"id": 7,
"attributes": {
"url": "https://a.simplemdm.com/enroll/?c=09876543",
"user_enrollment": false,
"welcome_screen": false,
"authentication": false
},
"relationships": {
"device_group": {
"data": {
"type": "device_group",
"id": 1
}
},
"device": {
"data": {
"type": "device",
"id": 4
}
}
}
}
],
"has_more": true
}
Supports [pagination](#pagination).
### HTTP Request
`GET https://a.simplemdm.com/api/v1/enrollments`
## Retrieve One
curl https://a.simplemdm.com/api/v1/enrollments/2 \
-u ${API_KEY}:{
"type": "enrollment",
"id": 2,
"attributes": {
"url": "https://a.simplemdm.com/enroll/?c=12345678",
"user_enrollment": false,
"welcome_screen": true,
"authentication": false
},
"relationships": {
"device_group": {
"data": {
"type": "device_group",
"id": 1
}
}
}
}
### HTTP Request
`GET https://a.simplemdm.com/api/v1/enrollments/{ENROLLMENT_ID}`
## Send Invitation
Send an enrollment invitation to an email address or phone number. The
invitation will contain a link to enroll the device. This endpoint does
not support Account Driven enrollments.
Argument
Description
contact
Required. An email address or phone number. Prefix international
numbers with a +.
### HTTP Request
`POST https://a.simplemdm.com/api/v1/enrollments/{ENROLLMENT_ID}/invitations`
curl https://a.simplemdm.com/api/v1/enrollments/2/invitiations \
-u ${API_KEY}: \
-X POST \
-d "contact=user@example.com"
HTTP/1.1 200 Success
## Delete
Delete an enrollment from your account.
curl https://a.simplemdm.com/api/v1/enrollments/2 \
-u ${API_KEY}: \
-X DELETE
HTTP/1.1 204 No Content
### HTTP Request
`DELETE https://a.simplemdm.com/api/v1/enrollments/{ENROLLMENT_ID}`
# Installed Apps
Installed apps represent apps that are installed and exist on *devices*.
## List for device
Refer to [Device - List installed apps](#list-installed-apps).
## Retrieve one
curl https://a.simplemdm.com/api/v1/installed_apps/6632 \
-u ${API_KEY}:{
"data": {
"type": "installed_app",
"id": 6632,
"attributes": {
"name": "Sunset Run",
"identifier": "com.fuilana.SunsetRun",
"version": "2.2.1.1",
"short_version": "2.2.1",
"bundle_size": 15720448,
"dynamic_size": 16384,
"managed": true,
"discovered_at": "2016-10-12T15:54:16.116-07:00",
"last_seen_at": "2021-12-22T13:00:57.000-08:00"
}
}
}
### HTTP Request
`GET https://a.simplemdm.com/api/v1/installed_apps/{INSTALLED_APP_ID}`
## Request management of app
curl https://a.simplemdm.com/api/v1/installed_apps/6632/request_management \
-u ${API_KEY}:
-X "POST"
HTTP/1.1 202 Accepted
Requests management of an unmanaged app installed on a device.
Available for iOS, tvOS, and macOS (11+) devices.
### HTTP Request
`POST https://a.simplemdm.com/api/v1/installed_apps/{INSTALLED_APP_ID}/request_management`
## Install update
curl https://a.simplemdm.com/api/v1/installed_apps/{INSTALLED_APP_ID}/update \
-u ${API_KEY}: \
-X POST
HTTP/1.1 202 Accepted
This submits a request to the device to update the specified app to the
latest version. The app must be managed for this request to succeed.
### HTTP Request
`POST https://a.simplemdm.com/api/v1/installed_apps/{INSTALLED_APP_ID}/update`
## Uninstall
curl https://a.simplemdm.com/api/v1/installed_apps/{INSTALLED_APP_ID} \
-u ${API_KEY}: \
-X DELETE
HTTP/1.1 202 Accepted
This submits a request to the device to uninstall the specified app. The
app must be managed for this request to succeed.
### HTTP Request
`DELETE https://a.simplemdm.com/api/v1/installed_apps/{INSTALLED_APP_ID}`
# Logs
View Logged events for device and admin interactions.
Argument
Description
serial_number
Limit response to the logs of a single device. An empty argument
defaults to returning all logs
## List All
Retrieve the logs. Supports [pagination](#pagination).
curl https://a.simplemdm.com/api/v1/logs \
-u ${API_KEY}:{
"data": [
{
"type": "log",
"id": "abcde123456",
"attributes": {
"namespace": "admin",
"event_type": "user.signed_in",
"level": 0,
"source": "admin ui",
"at": "11/06/19 18:27:41",
"metadata": {},
"relationships": {
"account": {
"data": {
"type": "account",
"id": 123456
}
},
"user": {
"data": {
"type": "user",
"id": 123456,
"email": "support@simplemdm.com"
}
}
}
}
}
],
"has_more": true
}
### HTTP Request
`GET https://a.simplemdm.com/api/v1/logs`
## Retrieve one
Retrieve a specific log entry.
curl https://a.simplemdm.com/api/v1/logs/964595dfd5be464a82cbb9019f55d82b \
-u ${API_KEY}:{
"data": {
"type": "log",
"id": "964595dfd5be464a82cbb9019f55d82b",
"attributes": {
"namespace": "device",
"event_type": "script.ran",
"level": "info",
"source": "device",
"at": "06/01/22 11:26:19",
"metadata": {
"name": "My Script",
"job_status": "0",
"job_response": "Hello World!\n"
},
"relationships": {
"account": {
"data": {
"type": "account",
"id": 1,
"api_key": "Test API"
}
},
"device": {
"data": {
"type": "device",
"serial_number": "ZP9XH0X52C",
"udid": "868F7125-B1AF-5139-B71F-99D68768AABB"
}
}
}
}
}
}
### HTTP Request
`GET https://a.simplemdm.com/api/v1/logs/{LOG_ID}`
# Lost Mode
## Enable
Activate lost mode on a device.
### HTTP Request
`POST https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/lost_mode`
Argument
Description
message
A message to be delivered to the user of the device.
phone_number
A contact number to reach the device's administrator.
footnote
An additional message to be displayed at the bottom of the
device.
A message or phone number must be added to the request in order to
enable lost mode for a device.
## Disable
Disable lost mode on a device.
### HTTP Request
`DELETE https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/lost_mode`
## Play a sound
Request that the device play a sound to assist with locating it.
### HTTP Request
`POST https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/lost_mode/play_sound`
## Update location
Request that the device provide its current, up-to-date location.
Location data can be viewed using the *devices* endpoint.
### HTTP Request
`POST https://a.simplemdm.com/api/v1/devices/{DEVICE_ID}/lost_mode/update_location`
# Managed App Configs
Create, modify, and remove the managed app configuration associated with
an app.
## Get
Retrieve the managed configs for an app.
curl https://a.simplemdm.com/api/v1/apps/{APP_ID}/managed_configs \
-u ${API_KEY}:{
"data": [
{
"type": "managed_config",
"id": 14,
"attributes": {
"key": "customer_name",
"value": "ACME Inc.",
"value_type": "string"
}
},
{
"type": "managed_config",
"id": 32,
"attributes": {
"key": "User IDs",
"value": "1,53,3",
"value_type": "integer array"
}
},
{
"type": "managed_config",
"id": 13,
"attributes": {
"key": "Device values",
"value": "\"$imei\",\"$udid\"",
"value_type": "string array"
}
}
],
"has_more": false
}
### HTTP Request
`GET https://a.simplemdm.com/api/v1/apps/{APP_ID}/managed_configs`
## Create
### HTTP Request
`POST https://a.simplemdm.com/api/v1/apps/{APP_ID}/managed_configs`
Argument
Description
key
Required.
value
Valid values are based on the value_type specified. See table
below.
value_type
The type of the value. See valid options below.
### Value Types and Value Formats
Value Type
Value Format
boolean
0 or 1
date
Timestamp format with timezone. Most standards should parse
correctly. Example: 2017-01-01T12:31:15-07:00
float
Float value. Example: 0.123
float array
Floats separated by commas. Example: 0.123,923.1,42
integer
Integer value. Example: 32
integer array
Integers separated by commas. Example 1,452,-129
string
Example: This is a string
string array
Strings in quotes an dseparated by commas. Example: "First
string","Second string"
curl "https://a.simplemdm.com/api/v1/apps/10042/managed_configs" \
-X POST \
-u ${API_KEY}: \
-F  \
-F  \
-F 
{
"data": {
"type": "managed_config",
"id": 2,
"attributes": {
"key": "serverURL",
"value": "http://example.com",
"value_type": "string"
}
}
}
## Delete
`DELETE https://a.simplemdm.com/api/v1/apps/{APP_ID}/managed_configs/{MANAGED_CONFIG_ID}`
## Push Updates
Push any updates to the managed configurations for an app to all
devices. This is not necessary when making managed config changes
hrough the UI. This is necessary after making changes through the API.
`POST https://a.simplemdm.com/api/v1/apps/{APP_ID}/managed_configs/push`
# Profiles
## List all
Returns a listing of all profiles in the account. Supports
[pagination](#pagination).
Argument
Description
search
Limit response to profiles with matching profile name or type
curl https://a.simplemdm.com/api/v1/profiles \
-u ${API_KEY}:{
"data": [
{
"type": "apn",
"id": 145593,
"attributes": {
"name": "APN",
"profile_identifier": "com.unwiredmdm.5d91d2df438d4e51b4e1efa9a6f18bdb",
"user_scope": true,
"group_count": 0,
"reinstall_after_os_update": false,
"device_count": 1
}
},
{
"type": "app_restrictions",
"id": 145594,
"attributes": {
"name": "App Restriction",
"profile_identifier": "com.unwiredmdm.c87dce2487464c19a683263907978cf7",
"user_scope": false,
"group_count": 1,
"device_count": 1
}
}
],
"has_more": false
}
### HTTP Request
`GET https://a.simplemdm.com/api/v1/profiles`
## Retrieve one
curl https://a.simplemdm.com/api/v1/profiles/145693 \
-u ${API_KEY}:{
"data": {
"type": "email",
"id": 145693,
"attributes": {
"name": "Email Account",
"profile_identifier": "com.unwiredmdm.f3d2b23b577141eca55d813858daca3d",
"user_scope": false,
"group_count": 0,
"reinstall_after_os_update": false,
"device_count": 0
},
"relationships": {
"device_groups": {
"data": []
}
}
}
}
### HTTP Request
`GET https://a.simplemdm.com/api/v1/profiles/{PROFILE_ID}`
## Assign to device group
This action will cause the profile to push to all devices in the
assigned device group.
### HTTP Request
`POST https://a.simplemdm.com/api/v1/profiles/{PROFILE_ID}/device_groups/{DEVICE_GROUP_ID}`
## Unassign from device group
This action will cause the profile to be removed from all devices in the
assigned device group.
### HTTP Request
`DELETE https://a.simplemdm.com/api/v1/profiles/{PROFILE_ID}/device_groups/{DEVICE_GROUP_ID}`
## Assign to device
This action will cause the profile to push to the specified device.
### HTTP Request
`POST https://a.simplemdm.com/api/v1/profiles/{PROFILE_ID}/devices/{DEVICE_ID}`
## Unassign from device
This action will cause the profile to be removed from the specified
device.
### HTTP Request
`DELETE https://a.simplemdm.com/api/v1/profiles/{PROFILE_ID}/devices/{DEVICE_ID}`
# Push Certificate
Methods related to the Apple Push Notification Certificate utilized by
he account.
## Show
Show details related to the current push certificate being used.
### HTTP Request
`GET https://a.simplemdm.com/api/v1/push_certificate`
curl https://a.simplemdm.com/api/v1/push_certificate \
-u ${API_KEY}:{
"data": {
"type": "push_certificate",
"attributes": {
"apple_id": "devops@example.org",
"expires_at": "2017-09-21T15:28:34.000+00:00"
}
}
}
## Update
Upload a new certificate and replace the existing certificate for your
account.
### HTTP Request
`PUT https://a.simplemdm.com/api/v1/push_certificate`
Argument
Description
file
Required. The push certificate as provided by Apple. Send as
multipart/form-data.
apple_id
Optional. The email address of the apple ID the push certificate was
generated with.
curl https://a.simplemdm.com/api/v1/push_certificate/scsr \
-F file@apns.cert \
-F apple_id=admin@example.org \
-u ${API_KEY}:{
"data": {
"type": "push_certificate",
"attributes": {
"apple_id": "admin@example.org",
"expires_at": "2020-09-21T15:28:34.000+00:00"
}
}
}
## Get Signed CSR
Download a signed CSR file. This file is provided to Apple when creating
and renewing a push certificate. The API returns a base64 encoded plist
for upload to the Apple Push Certificates Portal. The value of the
"data" key can be uploaded to Apple as-is.
### HTTP Request
`GET https://a.simplemdm.com/api/v1/push_certificate/scsr`
curl https://a.simplemdm.com/api/v1/push_certificate/scsr \
-u ${API_KEY}:{
"data": "VUVRVZ5HSlhkMmRrYlZaNVl6SnNkbUpxTUdsTlV6UjNTV2xDYkdKdFRuWmFS\nMngxV25vd2FWWldVa2RNClZHZHBVSG8wUzFCRFJrVlVNRTVWQ2xkV1FrWkpT\nRUp6WVZoT01FbEdRbFpSYTNoS1VYbEJhVXhUT0haUgpXRUozWWtkVloxRXlP\nWFJaU0ZZd1dsaEpka3d3QmtSa3BwVGxWb2VWWkgKYkRKa01V\nSkVXakJzYjFWclJYWmlhMFpUVGxWNFdWSkdVWGRsYkUxTFdsVTRjbU5FU1RB\nSUlRSM1VWVTFid3BSCmFscDBUVVpz\nUWsxWGFGUlRWMWw2VFcweFlXTlZkRVpVUjFaSlZuazVlVmx0VW5WT01VVTVV\nRkZ2T0V3egpUakJqYld4MVdubzBTMUJET1dzS1lWZE9NRkJuYnpoTU0wSnpZ\nVmhPTUZCbmJ6MEsT\n"
}
# Scripts
Scripts functionality is not currently available for some subscriptions.
For further assistance, please [contact
support](https://simplemdm.com/contact/).
## List all
Returns a listing of all scripts in the account. Supports
[pagination](#pagination).
### HTTP Request
`GET https://a.simplemdm.com/api/v1/scripts`
curl https://a.simplemdm.com/api/v1/scripts \
-u ${API_KEY}:{
"data": [
{
"type": "script",
"id": 31,
"attributes": {
"name": "Say hi",
"content": "#!/bin/bash\r\ncurrentUser=$( echo \"show State:/Users/ConsoleUser\" | scutil | awk '/Name :/ { print $3 }' )\r\nuid=$(id -u \"$currentUser\")\r\nlaunchctl asuser $uid say hi",
"variable_support": false,
"created_at": "2022-01-05T11:33:33.600-08:00",
"updated_at": "2022-01-05T11:33:33.600-08:00"
}
},
{
"type": "script",
"id": 32,
"attributes": {
"name": "script-8ilpJ",
"content": "#!/bin/bash\necho \"Hello!\"",
"variable_support": true,
"created_at": "2022-05-31T10:56:50.232-07:00",
"updated_at": "2022-05-31T10:56:50.232-07:00"
}
}
],
"has_more": false
}
## Retrieve one
### HTTP Request
`GET https://a.simplemdm.com/api/v1/scripts/{SCRIPT_ID}`
curl https://a.simplemdm.com/api/v1/scripts/32 \
-u ${API_KEY}:{
"data": {
"type": "script",
"id": 32,
"attributes": {
"name": "script-8ilpJ",
"content": "#!/bin/bash\necho \"Hello!\"",
"variable_support": true,
"created_at": "2022-05-31T10:56:50.232-07:00",
"updated_at": "2022-05-31T10:56:50.232-07:00"
}
}
}
## Create
You can use this method to upload a new script to your account.
### HTTP Request
`POST https://a.simplemdm.com/api/v1/scripts`
Argument
Description
name
Required. The name for the script. This is how it will appear in the
Admin UI.
variable_support
Whether or not to enable variable support in this script. Pass
1 to enable, 0 to disable. Defaults to
false
file
Required. A file containing the script content. All scripts must
begin with a valid shebang such as #!/bin/sh to be
processed. File should be provided as a string or
multipart/form-data.
curl "https://a.simplemdm.com/api/v1/scripts" \
-X POST \
-u ${API_KEY}: \
-F  \
-F variable_support=1 \
-F file=@my_new_script.sh
{
"data": {
"type": "script",
"id": 35,
"attributes": {
"name": "My New Script",
"content": "#!/bin/bash\necho \"Hello!\"",
"variable_support": true,
"created_at": "2022-06-01T12:30:01.590-07:00",
"updated_at": "2022-06-01T12:30:01.590-07:00"
}
}
}
## Update
You can use this method to update an existing script in your account.
Any existing Script Jobs will not be changed.
### HTTP Request
`PATCH https://a.simplemdm.com/api/v1/scripts/{SCRIPT_ID}`
Argument
Description
name
The name for the script. This is how it will appear in the Admin
UI.
variable_support
Whether or not to enable variable support in this script. Pass
1 to enable, 0 to disable. Defaults to
false
file
A file containing the script content. All scripts must begin with a
valid shebang such as #!/bin/sh to be processed. File
should be provided as string or multipart/form-data.
curl "https://a.simplemdm.com/api/v1/scripts/35" \
-X PATCH \
-u ${API_KEY}: \
-F  \
-F variable_support=0 \
-F file=@my_updated_script.sh
{
"data": {
"type": "script",
"id": 35,
"attributes": {
"name": "My Renamed Script",
"content": "#!/bin/bash\necho \"Goodbye!\"",
"variable_support": false,
"created_at": "2022-06-01T12:30:01.590-07:00",
"updated_at": "2022-06-01T12:30:01.590-07:00"
}
}
}
## Delete
You can use this method to delete a script from your account. Any
existing Script Jobs will not be changed.
### HTTP Request
`DELETE https://a.simplemdm.com/api/v1/scripts/{SCRIPT_ID}`
curl "https://a.simplemdm.com/api/v1/scripts/35" \
-X DELETE \
HTTP/1.1 204 No Content
# Script Jobs
Scripts functionality is not currently available for some subscriptions.
For further assistance, please [contact
support](https://simplemdm.com/contact/).
## List all
Jobs represent scripts that have been set to run on a collection of
devices. Jobs remain listed for one month. Supports
[pagination](#pagination).
### HTTP Request
`GET https://a.simplemdm.com/api/v1/script_jobs`
curl https://a.simplemdm.com/api/v1/script_jobs \
-u ${API_KEY}:{
"data": [
{
"type": "script_job",
"id": 663,
"attributes": {
"script_name": "Touch files",
"job_name": "API Job",
"content": "#!/bin/bash \r\n\r\necho \"Hello!\"\r\n",
"job_id": "9ca35",
"variable_support": false,
"status": "pending",
"pending_count": 1,
"success_count": 0,
"errored_count": 0,
"custom_attribute_regex": "\n",
"created_by": "API (Test API)",
"created_at": "2023-06-22T15:06:21.910-07:00",
"updated_at": "2023-06-22T15:06:21.910-07:00"
},
"relationships": {
"device": {
"data": [
{
"type": "device",
"id": 17,
"status": "pending"
}
]
},
"custom_attribute": {
"data": {
"type": "custom_attribute",
"id": "greeting_attribute"
}
}
}
}
],
"has_more": true
}
## Retrieve one
Retrieve details about a specific Script Job, including any results from
he associated devices.
Possible values for the *Script Job status* are: `pending`,
`completed-with-errors`, `completed`, and `cancelled`.
Possible values for the *Device status* are: `completed`, `pending`,
`error`, and `cancelled`.
### HTTP Request
`GET https://a.simplemdm.com/api/v1/script_jobs/{SCRIPT_JOB_ID}`
curl https://a.simplemdm.com/api/v1/script_jobs/331 \
-u ${API_KEY}:{
"data": {
"type": "script_job",
"id": 331,
"attributes": {
"script_name": "Say Hi",
"content": "#!/bin/bash \r\n\r\necho \"Hello!\"\r\n",
"job_id": "826f0",
"variable_support": false,
"status": "pending",
"pending_count": 2,
"success_count": 1,
"errored_count": 0,
"custom_attribute_regex": "\n",
"created_by": "API (My API Key)",
"created_at": "2022-05-31T11:56:05.043-07:00",
"updated_at": "2022-06-01T10:19:38.816-07:00"
},
"relationships": {
"device": {
"data": [
{
"type": "device",
"id": 33,
"status": "pending",
"status_code": null,
"response": null
},
{
"type": "device",
"id": 28,
"status": "completed",
"status_code": "0",
"response": "Hello!\n"
},
{
"type": "device",
"id": 17,
"status": "pending",
"status_code": null,
"response": null
}
]
},
"custom_attribute": {
"data": {
"type": "custom_attribute",
"id": "greeting_attribute"
}
}
}
}
}
## Create
Run a script on a collection of devices. Scripts are supported on macOS
only.
### HTTP Request
`POST https://a.simplemdm.com/api/v1/script_jobs`
Argument
Description
script_id
Required. The ID of the script to be run on the devices
device_ids
A comma separated list of device IDs to run the script
on
group_ids
A comma separated list of group IDs to run the script on.
All macOS devices from these groups will be
included.
assignment_group_ids
A comma separated list of assignment group IDs to run the
script on. All macOS devices from these assignment
groups will be included.
custom_attribute
Optional. If provided the output from the script will be stored in
his custom attribute on each device.
custom_attribute_regex
Optional. Used to sanitize the output from the script before storing
it in the custom attribute. Can be left empty but \n is
recommended.
At least one of `device_ids`, `group_ids`, or `assignment_group_ids`
must be provided.
Refer to [Retrieve one](#retrieve-one-10) for monitoring progress.
curl "https://a.simplemdm.com/api/v1/script_jobs" \
-X POST \
-u ${API_KEY}: \
-F script_id=35 \
-F device_ids=1,2,3 \
-F group_ids=4,5 \
-F assignment_group_ids=6,7 \
-F custom_attribute=greeting_attribute \
-F "custom_attribute_regex=\\n"
{
"data": {
"type": "script_job",
"id": 341,
"attributes": {
"script_name": "My Script",
"content": "#!/bin/bash\necho \"Hello World!\"",
"job_id": "87135",
"variable_support": true,
"status": "pending",
"pending_count": 1,
"success_count": 0,
"errored_count": 0,
"custom_attribute_regex": "\n",
"created_by": "API (Test API)",
"created_at": "2022-06-01T11:26:10.505-07:00",
"updated_at": "2022-06-01T11:26:10.505-07:00"
},
"relationships": {
"device": {
"data": [
{
"type": "device",
"id": 33,
"status": "pending",
"status_code": null,
"response": null
}
]
},
"custom_attribute": {
"data": {
"type": "custom_attribute",
"id": "greeting_attribute"
}
}
}
}
}
## Cancel Job
You can use this method delete cancel a job. Jobs can only be canceled
before the device has received the command.
### HTTP Request
`DELETE https://a.simplemdm.com/api/v1/script_jobs/{SCRIPT_ID}`
curl "https://a.simplemdm.com/api/v1/script_jobs/341" \
-X DELETE \
HTTP/1.1 204 No Content
# Webhooks
Webhooks allow you to receive an HTTP POST to the URL(s) of your
choosing when certain events occur in your SimpleMDM account. All of our
webhook events contain data serialized as JSON. If you'd like to be
notified (with data) every time a device is enrolled, for instance,
you'll want to use webhooks.
{
"type": "event.type",
"at": "2000-01-01T12:00:00.000-07:00",
"data": {}
}
Webhook requests include a JSON body which describes the event type, the
ime of occurrence, and may include additional metadata in the "data"
field. This metadata varies depending upon the event type.
The metadata included with webhook events is purposefully minimal. If
additional information in required about related objects, the SimpleMDM
API may be queried for additional information.
## Events
The current events are currently available:
- device.changed\_group
- device.enrolled
- device.unenrolled
- device.lock.enabled
- abm.device.added
