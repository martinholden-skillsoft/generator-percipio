const config = require('./config.global');

config.customer = 'default';

// Debug logging
// One of the supported default logging levels for winston - see https://github.com/winstonjs/winston#logging-levels
// config.debug.loggingLevel = 'debug';
config.debug.path = 'results/output';
config.debug.filename = `${config.customer}.log`;

// Default for for saving the JSON output
config.output.path = 'results/output';
config.output.filename = `response_${config.startTimestamp}.json`;

// Request
config.request = {};
// Bearer Token
config.request.bearer = process.env.BEARER || null;
// Base URI to Percipio API
config.request.baseuri = 'https://api.percipio.com';
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
config.request.uri = `${config.request.baseuri}<%= options.percipioServiceFullPath %>`;

module.exports = config;
