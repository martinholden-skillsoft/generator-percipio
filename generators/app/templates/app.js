const axios = require('axios');
const fs = require('fs');
const Path = require('path');
const _ = require('lodash');
const mkdirp = require('mkdirp');
const promiseRetry = require('promise-retry');
<% if (options.percipioServiceIsPaged) { _%>
const delve = require('dlv');
<% } _%>
// eslint-disable-next-line no-unused-vars
const pkginfo = require('pkginfo')(module);

const { transports } = require('winston');
const logger = require('./lib/logger');
const configuration = require('./config');

const NODE_ENV = process.env.NODE_ENV || 'production';

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
      timeout: options.request.timeout || 2000,
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
      // logger.debug(`Response Body: ${JSON.stringify(response.data)}`, loggingOptions);

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

<% if (options.percipioServiceIsPaged) { _%>
/**
 * Loop thru calling the API until all pages are delivered.
 *
 * @param {*} options
 * @returns {string} json file path
 */
const getAllPages = async (options) => {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    const loggingOptions = {
      label: 'getAllPages',
    };

    const opts = options;

    let records = [];

    let keepGoing = true;
    let reportCount = true;
    let totalRecords = 0;
    let downloadedRecords = 0;

    while (keepGoing) {
      let response = null;
      let recordsInResponse = 0;
      try {
        // eslint-disable-next-line no-await-in-loop
        response = await callPercipio(opts);
      } catch (err) {
        logger.error('ERROR: trying to download results', loggingOptions);
        keepGoing = false;
        reject(err);
        break;
      }

      if (reportCount) {
        totalRecords = parseInt(response.headers['x-total-count'], 10);
        opts.request.query.pagingRequestId = response.headers['x-paging-request-id'];

        logger.info(
          `Total Records to download as reported in header['x-total-count'] ${totalRecords.toLocaleString()}`,
          loggingOptions
        );

        logger.info(
          `Paging request id in header['x-paging-request-id'] ${opts.request.query.pagingRequestId}`,
          loggingOptions
        );
        reportCount = false;
      }

      recordsInResponse = delve(response, 'data.length', 0);

      if (recordsInResponse > 0) {
        downloadedRecords += recordsInResponse;

        logger.info(
          `Records Downloaded ${downloadedRecords.toLocaleString()} of ${totalRecords.toLocaleString()}`,
          loggingOptions
        );

        records = [...records, ...response.data];

        // Set offset - number of records in response
        opts.request.query.offset += opts.request.query.max;
      }

      if (opts.request.query.offset >= totalRecords) {
        keepGoing = false;
      }
    }
    resolve({ data: records });
  });
};
<% } _%>
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
  if (!_.isNull(options.debug.path)) {
    if (!fs.existsSync(options.debug.path)) {
      mkdirp.sync(options.debug.path);
    }
  }

  // Create output folder if one does not exist
  if (!_.isNull(options.output.path)) {
    if (!fs.existsSync(options.output.path)) {
      mkdirp.sync(options.output.path);
    }
  }

  // Add logging to a file
  logger.add(
    new transports.File({
      filename: Path.join(options.debug.path, options.debug.filename),
      options: {
        flags: 'w',
      },
    })
  );

  logger.info(`Start ${module.exports.name}`, loggingOptions);

  logger.debug(`Options: ${JSON.stringify(options)}`, loggingOptions);

  if (_.isNull(options.request.orgId)) {
    logger.error('Invalid configuration - no orgid in config file or env ORGID', loggingOptions);
    return false;
  }

  if (_.isNull(options.request.bearer)) {
    logger.error('Invalid configuration - no bearer in config file or env BEARER', loggingOptions);
    return false;
  }

  logger.info('Calling Percipio', loggingOptions);

<% if (options.percipioServiceIsPaged) { _%>
  // Percipio API returns a paged response, so retrieve all pages
  await getAllPages(options)
    .then((response) => {
<% } else { _%>
  await callPercipio(options)
    .then((response) => {
<% } _%>
      // Write the results to file.
      const outputFile = Path.join(options.output.path, options.output.filename);
      let outputData = response.data;
      // Check if the response is an Object and if so JSON.stringify the output
      if (_.isObject(outputData)) {
        outputData = JSON.stringify(response.data, null, '  ');
      }

      fs.writeFileSync(outputFile, outputData);

      logger.info(`Response saved to: ${outputFile}`, loggingOptions);
    })
    .catch((err) => {
      logger.error(`Error:  ${err}`, loggingOptions);
    });

  logger.info(`End ${module.exports.name}`, loggingOptions);
  return true;
};

main(configuration);
