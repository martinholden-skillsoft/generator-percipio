const moment = require('moment');
const defer = require('config/defer').deferConfig;

const config = {};

config.customer = 'default';
config.startTimestamp = moment().utc().format('YYYYMMDD_HHmmss');

// DEBUG Options
config.debug = {};
// One of the supported default logging levels for winston - see https://github.com/winstonjs/winston#logging-levels
config.debug.loggingLevel = 'info';
config.debug.path = 'results/output';
config.debug.filename = defer((cfg) => {
  return `${cfg.startTimestamp}_results.log`;
});

// Default for for saving the output
config.output = {};
config.output.path = 'results/output';
config.output.filename = defer((cfg) => {
  return `${cfg.startTimestamp}_results.json`;
});

// Request
config.request = {};
// Timeout
<% if (options.percipioServiceIsPaged) { _%>
config.request.timeout = 20000;
<% } else { _%>
config.request.timeout = 2000;
<% } _%>

// Bearer Token
config.request.bearer = null;
// Base URI to Percipio API
config.request.baseURL = null;
// Request Path Parameters
config.request.path = {};
<%- options.pathStrings %>
// Request Query string Parameters
config.request.query = {};
<%- options.queryStrings %>
// Request Body
<%- options.payloadString %>
<%- options.payloadPropertyStrings %>
// Method
config.request.method = '<%= options.percipioServiceMethod %>';
// The Service Path
config.request.uritemplate = `<%= options.percipioServiceFullPath %>`;

// Global Web Retry Options for promise retry
// see https://github.com/IndigoUnited/node-promise-retry#readme
config.retry_options = {};
config.retry_options.retries = 3;
config.retry_options.minTimeout = 1000;
config.retry_options.maxTimeout = 2000;

module.exports = config;
