const axios = require('axios');
const fs = require('fs');
const Path = require('path');
const _ = require('lodash');
const mkdirp = require('mkdirp');
const promiseRetry = require('promise-retry');
// eslint-disable-next-line no-unused-vars
const pkginfo = require('pkginfo')(module);

const { transports } = require('winston');
const logger = require('./lib/logger');
const configuration = require('./config');

const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Call Percipio API
 *
 * @param {*} options
 * @returns
 */
const callPercipio = async (options) => {
  return promiseRetry(async (retry, numberOfRetries) => {
    const loggingOptions = {
      label: 'callPercipio',
    };

    const requestUri = options.request.uri;
    logger.debug(`Request URI: ${requestUri}`, loggingOptions);

    let requestParams = options.request.query || {};
    requestParams = _.omitBy(requestParams, _.isNil);
    logger.debug(
      `Request Querystring Parameters: ${JSON.stringify(requestParams)}`,
      loggingOptions
    );

    let requestBody = options.request.body || {};
    requestBody = _.omitBy(requestBody, _.isNil);
    logger.debug(`Request Body: ${JSON.stringify(requestBody)}`, loggingOptions);

    const axiosConfig = {
      url: requestUri,
      headers: {
        Authorization: `Bearer ${options.request.bearer}`,
      },
      method: options.request.method,
    };

    if (!_.isEmpty(requestBody)) {
      axiosConfig.data = requestBody;
    }

    if (!_.isEmpty(requestParams)) {
      axiosConfig.params = requestParams;
    }

    logger.debug(`Axios Config: ${JSON.stringify(axiosConfig)}`, loggingOptions);

    try {
      const response = await axios.request(axiosConfig);
      logger.debug(`Response Headers: ${JSON.stringify(response.headers)}`, loggingOptions);
      logger.debug(`Response Body: ${JSON.stringify(response.data)}`, loggingOptions);

      return response;
    } catch (err) {
      logger.warn(
        `Trying to get report. Got Error after Attempt# ${numberOfRetries} : ${err}`,
        loggingOptions
      );
      if (err.response) {
        logger.debug(`Response Headers: ${JSON.stringify(err.response.headers)}`, loggingOptions);
        logger.debug(`Response Body: ${JSON.stringify(err.response.data)}`, loggingOptions);
      } else {
        logger.debug('No Response Object available', loggingOptions);
      }
      if (numberOfRetries < options.retry_options.retries + 1) {
        retry(err);
      } else {
        logger.error('Failed to call Percipio', loggingOptions);
      }
      throw err;
    }
  }, options.retry_options);
};

/**
 * Process the Percipio call
 *
 * @param {*} options
 * @returns
 */
const main = async (configOptions) => {
  const loggingOptions = {
    label: 'main',
  };

  const options = configOptions || null;

  if (_.isNull(options)) {
    logger.error('Invalid configuration', loggingOptions);
    return false;
  }

  // Set logging to silly level for dev
  if (NODE_ENV.toUpperCase() === 'DEVELOPMENT') {
    logger.level = 'silly';
  } else {
    logger.level = options.debug.loggingLevel;
  }

  // Create logging folder if one does not exist
  if (!_.isNull(options.debug.logpath)) {
    if (!fs.existsSync(options.debug.logpath)) {
      mkdirp.sync(options.debug.logpath);
    }
  }

  // Add logging to a file
  logger.add(
    new transports.File({
      filename: Path.join(options.debug.logpath, options.debug.logFile),
      options: {
        flags: 'w',
      },
    })
  );

  logger.info(`Start ${module.exports.name}`, loggingOptions);

  logger.debug(`Options: ${JSON.stringify(options)}`, loggingOptions);

  if (_.isNull(options.request.orgId)) {
    logger.error(
      'Invalid configuration - no orgid in config file or set env ORGID',
      loggingOptions
    );
    return false;
  }

  if (_.isNull(options.request.bearer)) {
    logger.error('Invalid configuration - no bearer or set env BEARER', loggingOptions);
    return false;
  }

  logger.info('Calling Percipio', loggingOptions);
  await callPercipio(options)
    .then((response) => {
      logger.info(`Response: ${JSON.stringify(response.data)}`, loggingOptions);
    })
    .catch((err) => {
      logger.error(`Error:  ${err}`, loggingOptions);
    });
  logger.info(`End ${module.exports.name}`, loggingOptions);
  return true;
};

main(configuration);
