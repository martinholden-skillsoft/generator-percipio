const _ = require('lodash');
const wrap = require('word-wrap');

const wrapOptions = {
  width: 90,
  indent: ' * ',
  trim: true,
};

/**
 * Return a string description for the parameter
 *
 * @param {object} parameter
 */
const parameterDescriptionString = (parameter) => {
  const description = [];
  description.push('/**');
  description.push(` * Name: ${parameter.name}`);

  if (parameter.description) {
    description.push(`${wrap(`Description : ${parameter.description}`, wrapOptions)}`);
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

const propertyDescriptionString = (property, propertyName, basepath, path) => {
  const description = [];
  const pathString = path ? `${_.trimEnd(path, '.')}.` : '';
  const basepathString = basepath ? `${_.trimEnd(basepath, '.')}.` : '';
  description.push('/**');
  description.push(` * Name: ${propertyName}`);
  if (property.description) {
    description.push(`${wrap(`Description : ${property.description}`, wrapOptions)}`);
  }
  description.push(` * Type: ${property.type}`);
  if (property.format) {
    description.push(` * Format: ${property.format}`);
  }
  if (property.enum) {
    description.push(` * Enum: ${property.enum}`);
  }
  if (property.example) {
    description.push(` * Example: ${property.example}`);
  }

  description.push(' */');

  const name = `${basepathString}${pathString}${_.trim(propertyName)}`;
  let val = property.default ? property.default : null;
  if (property.type === 'string') {
    val = val ? `'${val}'` : null;
  }
  if (property.type === 'object') {
    val = '{}';
  }

  description.push(`${name} = ${val};`);
  description.push('');
  // Process recursive
  if (property.type === 'object') {
    const objProperties = _.map(property.properties, (currentValue, index) => {
      return propertyDescriptionString(currentValue, index, basepathString, propertyName);
    }).join('');
    description.push(objProperties);
  }
  return description.join('\r\n');
};

module.exports = {
  parameterDescriptionString,
  propertyDescriptionString,
};
