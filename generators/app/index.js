/* eslint-disable no-underscore-dangle */
const path = require('path');
const Generator = require('yeoman-generator');
const chalk = require('chalk');
const glob = require('glob');
const _ = require('lodash');
const Swagger = require('swagger-client');
const mkdirp = require('mkdirp');
const { accessSafe } = require('access-safe');

const { parameterDescriptionString, propertyDescriptionString } = require('./util');

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);

    let userName;
    let userEmail;

    if (typeof this.user.git.name === 'function') {
      userName = this.user.git.name();
    } else {
      userName = this.user.git.name;
    }

    if (typeof this.user.git.email === 'function') {
      userEmail = this.user.git.email();
    } else {
      userEmail = this.user.git.email;
    }

    this.options.name = userName || 'unknownuser';
    this.options.email = userEmail || 'user@example.com';
    this.options.author = `${this.options.name} <${this.options.email}>`;

    // Set currentfolder.
    this.destinationRoot(this.contextRoot);

    this.appname = 'percipioclient';

    // add option to skip install
    this.option('skip-install');

    this.slugify = _.kebabCase;
  }

  initializing() {
    this.log(`Initializing the ${chalk.red('generator-percipio')} generator!`);
    this.options.prompts = {};
    this.options.prompts.percipiomain = {
      type: 'list',
      name: 'percipiomain',
      message: 'Select the Percipio API to use:',
      choices: [],
      store: false,
    };

    this.options.spec = {};

    this.options.servicePrompts = {};

    this.log(`Downloading OpenAPI definitions for Percipio.`);

    return new Promise((resolve, reject) => {
      Promise.all([
        Swagger('https://api.percipio.com/common/swagger.json').catch((error) => {
          return error;
        }),
        Swagger('https://api.percipio.com/content-discovery/swagger.json').catch(
          (error) => {
            return error;
          }
        ),
        Swagger('https://api.percipio.com/reporting/swagger.json').catch((error) => {
          return error;
        }),
        Swagger('https://api.percipio.com/user-management/swagger.json').catch(
          (error) => {
            return error;
          }
        ),
      ])
        .then((values) => {
          this.log(`Downloaded all OpenAPI definitions.`);
          // We capture any errors so we dont fail, we will reject if we dont have ANY successes
          // Build the main list of services

          _.forEach(values, (value) => {
            if (value.spec) {
              this.log(`Processing ${chalk.green(value.spec.info.title)} Definition.`);
              this.options.prompts.percipiomain.choices.push(value.spec.info.title);
              this.options.spec[this.slugify(value.spec.info.title.toLowerCase())] =
                value.spec;

              const choices = [];
              _.forOwn(value.spec.paths, (pathvalue, pathkey) => {
                // key is the PATH
                _.forEach(_.keys(pathvalue), (methodvalue) => {
                  choices.push(`${methodvalue.toUpperCase()} ${pathkey}`);
                });
              });

              // Build my percipioservices prompt
              this.options.prompts[this.slugify(value.spec.info.title.toLowerCase())] = {
                type: 'list',
                name: 'percipioServiceFeatures',
                message: 'Select the Percipio Function:',
                choices,
                store: false,
              };
            }
          });

          // eslint-disable-next-line no-unused-expressions
          this.options.prompts.percipiomain.choices.length === 0 ? reject() : resolve();
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  _askForAppName() {
    const prompt = [
      {
        type: 'input',
        name: 'appname',
        message: 'Enter app name',
        default: this.appname,
      },
    ];

    return this.prompt(prompt).then((response) => {
      this.appname = this.slugify(response.appname);
      if (path.basename(this.destinationRoot()) !== this.appname) {
        this.log(
          `Your client must be inside a folder named ${this.appname}\nI'll automatically create this folder.`
        );
        mkdirp(this.appname);
        this.destinationRoot(this.appname);
      }
    });
  }

  _askForPercipioService() {
    if (this.options.percipioService) {
      return true;
    }

    return this.prompt(this.options.prompts.percipiomain).then((response) => {
      this.options.percipiomain = this.slugify(response.percipiomain.toLowerCase());
      this.options.percipiospec = this.options.spec[this.options.percipiomain];
    });
  }

  _askForPercipioServiceFeatures() {
    const myprompt = this.options.prompts[this.options.percipiomain];
    return this.prompt(myprompt).then((resp) => {
      const values = _.split(resp.percipioServiceFeatures, ' ');
      // eslint-disable-next-line prefer-destructuring
      this.options.percipioServiceMethod = values[0].toLowerCase();
      // eslint-disable-next-line prefer-destructuring
      this.options.percipioServicePath = values[1];
      // eslint-disable-next-line prefer-destructuring
      this.options.percipioServiceParameters = _.get(this.options.percipiospec.paths, [
        this.options.percipioServicePath,
        this.options.percipioServiceMethod,
        'parameters',
      ]);
      this.options.percipioServicePayload = _.get(this.options.percipiospec.paths, [
        this.options.percipioServicePath,
        this.options.percipioServiceMethod,
        'requestBody',
        'content',
        'application/json',
        'schema',
        'properties',
      ]);

      this.options.percipioService200ResponseSchema = _.get(
        this.options.percipiospec.paths,
        [
          this.options.percipioServicePath,
          this.options.percipioServiceMethod,
          'responses',
          '200',
          'content',
          'application/json',
          'schema',
        ]
      );

      // Check if this is pagable response.
      // We examine the query parameters for parameters named max or offset or pagingRequestId
      // If any of these exist we flag as a pagable API
      this.options.percipioServiceIsPaged =
        _.filter(this.options.percipioServiceParameters, (o) => {
          return (
            o.in === 'query' &&
            (o.name === 'max' || o.name === 'offset' || o.name === 'pagingRequestId')
          );
        }).length > 0;

      // Check if this is a generate/poll API.
      // We examine the response type to see if it ends with:
      // #/components/schemas/ReportRequest
      // #/components/schemas/BatchRequest

      this.options.percipioServiceIsReportPoll = accessSafe(
        () =>
          _.endsWith(
            this.options.percipioService200ResponseSchema.$$ref,
            '#/components/schemas/ReportRequest'
          ),
        false
      );

      this.options.percipioServiceIsUserBatchRequestPoll = accessSafe(
        () =>
          _.endsWith(
            this.options.percipioService200ResponseSchema.items.$$ref,
            '#/components/schemas/BatchRequest'
          ),
        false
      );

      this.options.percipioServiceSingleResponse = !(
        this.options.percipioServiceIsReportPoll ||
        this.options.percipioServiceIsUserBatchRequestPoll ||
        this.options.percipioServiceIsPaged
      );
    });
  }

  prompting() {
    // Have Yeoman greet the user.
    this.log(`Lets gets started with the ${chalk.red('generator-percipio')} generator!`);
    return this._askForAppName()
      .then(this._askForPercipioService.bind(this))
      .then(this._askForPercipioServiceFeatures.bind(this));
  }

  // configuring() {}

  default() {
    this.options.percipioServiceFullPath = `${_.trimEnd(
      this.options.percipiospec.servers[0].url,
      `/`
    )}${this.options.percipioServicePath}`;

    this.options.packagename = this.slugify(this.appname);

    // Build descripions

    this.options.pathStrings = _.map(
      _.filter(this.options.percipioServiceParameters, (o) => {
        return o.in === 'path';
      }),
      parameterDescriptionString
    ).join('');

    this.options.queryStrings = _.map(
      _.filter(this.options.percipioServiceParameters, (o) => {
        return o.in === 'query';
      }),
      parameterDescriptionString
    ).join('');

    this.options.payloadString = _.isNil(this.options.percipioServicePayload)
      ? 'config.request.body = null;'
      : 'config.request.body = {};';

    this.options.payloadPropertyStrings = _.map(
      this.options.percipioServicePayload,
      (currentValue, index) => {
        return propertyDescriptionString(
          currentValue,
          index,
          'config.request.body',
          null
        );
      }
    ).join('');

    // Percipio API Selected
    this.options.percipioServicename = this.options.percipiospec.info.description;

    // shared across all generators
    this.sourceRoot(path.join(__dirname, 'templates'));
  }

  writing() {
    glob.sync('**', { cwd: this.sourceRoot() }).forEach((file) => {
      this.fs.copyTpl(
        this.templatePath(file),
        this.destinationPath(file.replace(/^_/, '')),
        { options: this.options, _ }
      );
    });
  }

  // conflicts() {}

  install() {
    if (!this.options['skip-install']) this.installDependencies({ bower: false });
  }

  end() {
    this.log(`Thanks for using the ${chalk.red('generator-percipio')} generator`);
    this.log(`Your app is ready, in ${chalk.green(this.destinationRoot())}.`);
    this.log(`Don't forget to configure the ORGID, BEARER and BASEURL env values.`);
    this.log(`Then you can run the app using ${chalk.yellow('npm start')}`);
  }
};
