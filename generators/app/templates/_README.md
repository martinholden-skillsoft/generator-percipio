# <%= options.packagename %>
Call <%= options.percipioServicename %> API using Axios.

Function: <%= options.percipioServicePath %>

<% if (options.percipioServiceIsPaged) { -%>
This function returns paged data, and so all available pages of data will be retrieved.
<% } -%>

## Requirements
1. A Skillsoft [Percipio](https://www.skillsoft.com/platform-solution/percipio/) Site
1. A [Percipio Service Account](https://documentation.skillsoft.com/en_us/pes/3_services/service_accounts/pes_service_accounts.htm) with permission for accessing the API.

## Environment Configuration
Once you have copied this repository set the following NODE ENV variables, or config the [.env](.env) file

| ENV | Required | Description |
| --- | --- | --- |
| ORGID | Required | This is the Percipio Organiation UUID for your Percipio Site. |
| BEARER | Required | This is the Percipio Bearer token for the Service Account. |
| BASEURL | Required | This is set to the base URL for the Percipio data center. For US hosted use: https://api.percipio.com For EU hosted use: https://dew1-api.percipio.com |

## Configuring the API call
Make the config changes in [config/default.js](config/default.js) file, to specify the request criteria for the API.

### Available Request Path Parameters

```javascript
<%- options.pathStrings %>
```

### Available Query string Parameters
```javascript
<%- options.queryStrings %>
```

### Available Payload Parameters
```javascript
<%- options.payloadString %>
<%- options.payloadPropertyStrings %>
```

## Run theapp

```bash
npm start
```

## Changelog
Please see [CHANGELOG](CHANGELOG.md) for more information what has changed recently.

## License
MIT © [<%= options.name %>](<%= options.email %>)