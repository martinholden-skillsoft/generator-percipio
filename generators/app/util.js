const _ = require('lodash');

/**
 * Return a string description for the parameter
 *
 * @param {object} parameter
 */
const parameterDescriptionString = parameter => {
  const description = [];
  description.push('/**');
  description.push(` * Name: ${parameter.name}`);

  if (parameter.description) {
    description.push(` * Description: ${parameter.description}`);
  }

  if (parameter.required) {
    description.push(` * Required: ${parameter.required}`);
  }

  if (parameter.schema) {
    if (parameter.schema.type === 'array') {
      description.push(` * Type: ${parameter.schema.items.type}[]`);
      if (parameter.schema.items.enum) {
        description.push(` * Enum: ${parameter.schema.items.enum}`);
      }
    } else {
      description.push(` * Type: ${parameter.schema.type}`);
    }

    if (parameter.schema.format) {
      description.push(` * Format: ${parameter.schema.format}`);
    }

    if (parameter.schema.minimum) {
      description.push(` * Minimum: ${parameter.schema.minimum}`);
    }

    if (parameter.schema.maximum) {
      description.push(` * Maximum: ${parameter.schema.maximum}`);
    }

    if (parameter.schema.default) {
      description.push(` * Default: ${parameter.schema.default}`);
    }
  }
  description.push(' */');

  const name = `config.request.${_.trim(parameter.in)}.${_.trim(parameter.name)}`;
  let val =
    parameter.in === 'path' && parameter.name === 'orgId'
      ? 'process.env.CUSTOMER_ORGID || null'
      : null;

  val = val === null && parameter.schema.default ? parameter.schema.default : val;
  description.push(`${name} = ${val};`);
  description.push('');
  return description.join('\r\n');
};

module.exports = {
  parameterDescriptionString
};
