require('dotenv-safe').config();

const config = require('config');
const Axios = require('axios');
const fs = require('fs');
const Path = require('path');
const _ = require('lodash');
const mkdirp = require('mkdirp');
const rateLimit = require('axios-rate-limit');
const rax = require('retry-axios');
const stringifySafe = require('json-stringify-safe');
const { v4: uuidv4 } = require('uuid');
<% if (options.percipioServiceIsPaged) { _%>
const { accessSafe } = require('access-safe');
const JSONStream = require('JSONStream');
const Combiner = require('stream-combiner');
<% } _%>
const { transports } = require('winston');
const logger = require('./lib/logger');
const pjson = require('./package.json');
const timingAdapter = require('./lib/timingAdapter');

/**
 * Process the URI Template strings
 *
 * @param {string} templateString
 * @param {object} templateVars
 * @return {string}
 */
const processTemplate = (templateString, templateVars) => {
  const compiled = _.template(templateString.replace(/{/g, '${'));
  return compiled(templateVars);
};

/**
 * Call Percipio API
 *
 * @param {*} options
 * @param {Axios} [axiosInstance=Axios] HTTP request client that provides an Axios like interface
 * @returns {Promise}
 */
const callPercipio = (options, axiosInstance = Axios) => {
  return new Promise((resolve, reject) => {
    const opts = _.cloneDeep(options);
    const requestUri = processTemplate(opts.request.uritemplate, opts.request.path);

    let requestParams = opts.request.query || {};
    requestParams = _.omitBy(requestParams, _.isNil);

    let requestBody = opts.request.body || {};
    requestBody = _.omitBy(requestBody, _.isNil);

    const axiosConfig = {
      baseURL: opts.request.baseURL,
      url: requestUri,
      headers: {
        Authorization: `Bearer ${opts.request.bearer}`,
      },
      method: opts.request.method,
      timeout: opts.request.timeout || 2000,
      correlationid: uuidv4(),
      logger,
    };

    if (!_.isEmpty(requestBody)) {
      axiosConfig.data = requestBody;
    }

    if (!_.isEmpty(requestParams)) {
      axiosConfig.params = requestParams;
    }

    axiosInstance
      .request(axiosConfig)
      .then((response) => {
        resolve(response);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

<% if (options.percipioServiceIsPaged) { _%>
/**
 * Request one item so we can get count
 *
 * @param {*} options
 * @param {Axios} [axiosInstance=Axios] HTTP request client that provides an Axios like interface
 * @returns {Promise} Promise object resolves to obect with total and pagingRequestId.
 */
const getRecordCount = (options, axiosInstance = Axios) => {
  return new Promise((resolve, reject) => {
    const loggingOptions = {
      label: 'getRecordCount',
    };

    const opts = _.cloneDeep(options);
    opts.request.query.max = 1;

    const results = {
      total: null,
      pagingRequestId: null,
    };

    callPercipio(opts, axiosInstance)
      .then((response) => {
        results.total = parseInt(response.headers['x-total-count'], 10);
        results.pagingRequestId = response.headers['x-paging-request-id'] || null;

        const message = [];
        message.push(`Total Records ['x-total-count']: ${results.total.toLocaleString()}`);

        if (results.pagingRequestId !== null) {
          message.push(`Paging request id ['x-paging-request-id']: ${results.pagingRequestId}`);
        }
        logger.info(`${message.join(' ')}`, loggingOptions);
        resolve(results);
      })
      .catch((err) => {
        logger.error(err, loggingOptions);
        reject(err);
      });
  });
};

/**
 * Calling the API to retrieve and process page.
 *
 * @param {*} options
 * @param {Number} offset the offset position of the page
 * @param {Combiner} [processChain=new Combiner([])] the processing stream for the results
 * @param {Axios} [axiosInstance=Axios] HTTP request client that provides an Axios like interface
 * @returns {Promise} Resolves to number of records processed
 */
const getPage = (options, offset, processChain = new Combiner([]), axiosInstance = Axios) => {
  return new Promise((resolve, reject) => {
    const loggingOptions = {
      label: 'getPage',
    };

    const opts = _.cloneDeep(options);
    opts.request.query.offset = offset;

    callPercipio(opts, axiosInstance)
      .then((response) => {
        const result = {
          count: accessSafe(() => response.data.length, 0),
          start: accessSafe(() => response.config.params.offset, 0),
          end:
            accessSafe(() => response.config.params.offset, 0) +
            accessSafe(() => response.config.params.max, 0),
          durationms: accessSafe(() => response.timings.durationms, null),
          sent: accessSafe(() => response.timings.sent.toISOString(), null),
          correlationid: accessSafe(() => response.config.correlationid, null),
        };

        const message = [];
        message.push(`CorrelationId: ${result.correlationid}.`);
        message.push(
          `Records Requested: ${result.start.toLocaleString()} to ${result.end.toLocaleString()}.`
        );
        message.push(`Duration ms: ${result.durationms}.`);
        message.push(`Records Returned: ${result.count.toLocaleString()}.`);
        logger.info(`${message.join(' ')}`, loggingOptions);

        if (result.count > 0) {
          response.data.forEach((record) => {
            processChain.write(record);
          });
          resolve(result);
        } else {
          resolve(result);
        }
      })
      .catch((err) => {
        logger.error(err, loggingOptions);
        reject(err);
      });
  });
};

/**
 * Loop thru calling the API until all pages are delivered.
 *
 * @param {*} options
 * @param {int} maxrecords The total number of records to retrieve
 * @param {Axios} [axiosInstance=Axios] HTTP request client that provides an Axios like interface
 * @returns {Promise} resolves to boolean to indicate if results saved and the filename
 */
const getAllPages = (options, maxrecords, axiosInstance = Axios) => {
  return new Promise((resolve, reject) => {
    const loggingOptions = {
      label: 'getAllPages',
    };

    const opts = _.cloneDeep(options);
    const outputFile = Path.join(opts.output.path, opts.output.filename);

    let downloadedRecords = 0;

    const jsonStream = JSONStream.stringify('[', ',', ']');
    const outputStream = fs.createWriteStream(outputFile);

    if (opts.includeBOM) {
      outputStream.write(Buffer.from('\uFEFF'));
    }

    outputStream.on('error', (err) => {
      logger.error(err, loggingOptions);
      reject(err);
    });

    jsonStream.on('error', (err) => {
      logger.error(err, loggingOptions);
      reject(err);
    });

    outputStream.on('finish', () => {
      let saved = false;
      if (downloadedRecords === 0) {
        logger.info('No records downloaded', loggingOptions);
        fs.unlinkSync(outputFile);
      } else {
        logger.info(
          `Total Records Downloaded: ${downloadedRecords.toLocaleString()}`,
          loggingOptions
        );
        saved = true;
        logger.info(`Records Saved. Path: ${outputFile}`, loggingOptions);
      }

      resolve({ saved, outputFile });
    });

    const chain = new Combiner([jsonStream, outputStream]);
    chain.on('error', (err) => {
      logger.error(err, loggingOptions);
      reject(err);
    });

    const requests = [];
    for (let index = 0; index <= maxrecords; index += opts.request.query.max) {
      requests.push(getPage(opts, index, chain, axiosInstance));
    }

    Promise.allSettled(requests)
      .then((data) => {
        logger.debug(`Results. ${stringifySafe(data)}`, loggingOptions);
        downloadedRecords = data.reduce((total, currentValue) => {
          const count = accessSafe(() => currentValue.value.count, 0);
          return total + count;
        }, 0);

        // Once we've written each record in the record-set, we have to end the stream so that
        // the TRANSFORM stream knows to output the end of the array it is generating.
        chain.end();
      })
      .catch((err) => {
        logger.error(err, loggingOptions);
        reject(err);
      });
  });
};

<% } _%>
/**
 * Process the Percipio call
 *
 * @param {*} options
 * @returns
 */
const main = (configOptions) => {
  const loggingOptions = {
    label: 'main',
  };

  const options = configOptions || null;

  options.logger = logger;

  if (_.isNull(options)) {
    options.logger.error('Invalid configuration', loggingOptions);
    return false;
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
  options.logger.add(
    new transports.File({
      filename: Path.join(options.debug.path, options.debug.filename),
      options: {
        flags: 'w',
      },
    })
  );
  options.logger.info(`Start ${pjson.name} - v${pjson.version}`, loggingOptions);

  options.logger.debug(`Options: ${stringifySafe(options)}`, loggingOptions);

  options.logger.info('Calling Percipio', loggingOptions);

  // Create an axios instance that this will allow us to replace
  // with ratelimiting
  // see https://github.com/aishek/axios-rate-limit
  const axiosInstance = rateLimit(Axios.create({ adapter: timingAdapter }), options.ratelimit);

<% if (options.percipioServiceIsPaged) { _%>
<%- include('./../../common/templates/callpercipio/pagedresponse') %>
<% } _%>
<% if (options.percipioServiceIsReportPoll) { _%>
<%- include('./../../common/templates/callpercipio/jsonresponse') %>
<% } _%>
<% if (options.percipioServiceSingleResponse ) { _%>
<%- include('./../../common/templates/callpercipio/jsonresponse') %>
<% } _%>

  return true;
};

try {
  main(config);
} catch (error) {
  throw new Error(`A problem occurred during configuration. ${error.message}`);
}
