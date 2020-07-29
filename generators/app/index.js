const path = require('path');
const Generator = require('yeoman-generator');
const chalk = require('chalk');
const glob = require('glob');
const _ = require('lodash');
const Swagger = require('swagger-client');

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
    this.options.email =
      userName && userEmail ? `${userName} <${userEmail}>` : 'User <user@example.com>';

    // add option to skip install
    this.option('skip-install');

    this.slugify = _.kebabCase;
  }

  initializing() {
    this.options.prompts = {};
    this.options.prompts.percipiomain = {
      type: 'list',
      name: 'percipiomain',
      message: 'Select the Percipio API to use:',
      choices: [],
      store: true,
    };

    this.options.spec = {};

    this.options.servicePrompts = {};

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
          // We capture any errors so we dont fail, we will reject if we dont have ANY successes
          // Build the main list of services

          _.forEach(values, (value) => {
            if (value.spec) {
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
                store: true,
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

  dir() {
    if (this.options.createDirectory !== undefined) {
      return true;
    }

    const prompt = [
      {
        type: 'confirm',
        name: 'createDirectory',
        message: 'Would you like to create a new directory for your project?',
      },
    ];

    return this.prompt(prompt).then((response) => {
      this.options.createDirectory = response.createDirectory;
    });
  }

  dirname() {
    if (!this.options.createDirectory || this.options.dirname) {
      return true;
    }

    const prompt = [
      {
        type: 'input',
        name: 'dirname',
        message: 'Enter directory name',
      },
    ];

    return this.prompt(prompt).then((response) => {
      const dirName = path.dirname(response.dirname);
      const fileName = this.slugify(path.basename(response.dirname));

      this.options.dirname = path.join(dirName, fileName);
    });
  }

  percipioService() {
    if (this.options.percipioService) {
      return true;
    }

    return this.prompt(this.options.prompts.percipiomain).then((response) => {
      this.options.percipiomain = this.slugify(response.percipiomain.toLowerCase());
      this.options.percipiospec = this.options.spec[this.options.percipiomain];
    });
  }

  percipioServiceFeatures() {
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
    });
  }

  prompting() {
    // Have Yeoman greet the user.
    this.log(`Welcome to the fine ${chalk.red('generator-percipio')} generator!`);
  }

  writing() {
    // create directory
    if (this.options.createDirectory) {
      this.destinationRoot(this.options.dirname);
      this.appname = this.options.dirname;
    }

    this.options.percipioServiceFullPath = `${_.trimEnd(
      this.options.percipiospec.servers[0].url,
      `/`
    )}${_.replace(
      this.options.percipioServicePath,
      /{/g,
      // eslint-disable-next-line no-template-curly-in-string
      '${config.request.path.'
    )}`;

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

    // shared across all generators
    this.sourceRoot(path.join(__dirname, 'templates'));
    glob.sync('**', { cwd: this.sourceRoot() }).forEach((file) => {
      this.fs.copyTpl(
        this.templatePath(file),
        this.destinationPath(file.replace(/^_/, '')),
        { options: this.options, _ }
      );
    });
  }

  install() {
    if (!this.options['skip-install']) this.installDependencies({ bower: false });
  }
};
