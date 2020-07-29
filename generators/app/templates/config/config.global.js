const moment = require('moment');

const config = {};

// Indicates a name for the configuration
config.customer = 'none';
config.startTimestamp = moment().utc().format('YYYYMMDD_HHmmss');

// DEBUG Options
config.debug = {};
// One of the supported default logging levels for winston - see https://github.com/winstonjs/winston#logging-levels
config.debug.loggingLevel = 'info';
config.debug.path = 'logs';
config.debug.filename = `app_${config.startTimestamp}.log`;

// Default for for saving the JSON output
config.output = {};
config.output.path = 'results';
config.output.filename = `response_${config.startTimestamp}.json`;

// Request
config.request = {};
// Bearer Token
config.request.bearer = null;
// Base URI to Percipio API
config.request.baseuri = 'https://api.percipio.com';
// Request Path Parameters
config.request.path = {};
/**
 * Name: orgId
 * Description: Organization UUID
 * Required: true
 * Type: string
 * Format: uuid
 */
config.request.path.orgId = null;
// Request Query string Parameters
config.request.query = {};
// Request Body
config.request.body = null;
// Method
config.request.method = '<%= options.percipioServiceMethod %>';
// The Service Path
config.request.uri = `${config.request.baseuri}<%= options.percipioServiceFullPath %>`;

// Global Web Retry Options for promise retry
// see https://github.com/IndigoUnited/node-promise-retry#readme
config.retry_options = {};
config.retry_options.retries = 3;
config.retry_options.minTimeout = 1000;
config.retry_options.maxTimeout = 2000;

module.exports = config;
