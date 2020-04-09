const config = require('./config.global');

config.customer = 'default';

// Debug logging
// One of the supported default logging levels for winston - see https://github.com/winstonjs/winston#logging-levels
// config.debug.loggingLevel = 'debug';
// Check for fiddler
config.debug.checkFiddler = false;
// Fiddler IP address
config.debug.fiddlerAddress = '127.0.0.1';
// Fiddler Port
config.debug.fiddlerPort = '8888';
// Debug logging
// One of the supported default logging levels for winston - see https://github.com/winstonjs/winston#logging-levels
// config.debug.loggingLevel = 'debug';
config.debug.logpath = 'results/output';
config.debug.logFile = `${config.customer}.log`;

// Request
config.request = {};
// Bearer Token
config.request.bearer = process.env.CUSTOMER_BEARER || null;
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
