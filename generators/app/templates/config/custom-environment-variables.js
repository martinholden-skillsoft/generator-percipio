const config = {};
config.request = {};
config.request.bearer = 'BEARER';
// Base URI to Percipio API
config.request.baseURL = 'BASEURL';
// Request Path Parameters
config.request.path = {};
/**
 * Name: orgId
 * Description: Organization UUID
 * Required: true
 * Type: string
 * Format: uuid
 */
config.request.path.orgId = 'ORGID';

module.exports = config;
