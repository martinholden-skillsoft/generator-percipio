const moment = require('moment');
const defer = require('config/defer').deferConfig;

const config = {};

config.customer = 'default';
config.startTimestamp = moment().utc().format('YYYYMMDD_HHmmss');

// DEBUG Options
config.debug = {};
config.debug.path = 'results';
config.debug.filename = defer((cfg) => {
  return `${cfg.startTimestamp}_results.log`;
});

// Default for for saving the output
config.output = {};
config.output.path = 'results';
config.output.filename = defer((cfg) => {
  return `${cfg.startTimestamp}_results.json`;
});

// Request
config.request = {};
// Timeout in ms
<% if (options.percipioServiceIsPaged) { _%>
config.request.timeout = 60 * 1000;
<% } else { _%>
config.request.timeout = 2 * 1000;
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

// Global Axios Retry Settings
// see https://github.com/JustinBeckwith/retry-axios
config.rax = {};
// Retry 3 times on requests that return a response (500, etc) before giving up.
config.rax.retry = 3;
// Retry 2 times on errors that don't return a response (ENOTFOUND, ETIMEDOUT, etc).
config.rax.noResponseRetries = 2;
// You can set the backoff type.
// options are 'exponential' (default), 'static' or 'linear'
config.rax.backoffType = 'exponential';

// Global Axios Rate Limiting#
// see https://github.com/aishek/axios-rate-limit
config.ratelimit = {};
config.ratelimit.maxRequests = 1;
config.ratelimit.perMilliseconds = 2000;

module.exports = config;
