# generator-percipio
Generator for creating Node application to call a selected Percipio API using Axios.

If the API returns a paged data set, the application will download all available pages of data.

The JSON response of the API call will be logged to file.

## Installation

First, install [Yeoman](http://yeoman.io) using [npm](https://www.npmjs.com/) (we assume you have pre-installed [node.js](https://nodejs.org/)).

```bash
npm install -g yo
```

Next, from the the folder containing this generator code create a symbolic link
```bash
npm link
```

## Generate your new project
Make sure you have an internet connection, as the generator will need to download the current Percipio [OpenAPI](https://swagger.io/docs/specification/about/) definitions from Percipio.

Then generate your new project:

```bash
yo percipio
```

You will be prompted to:

1. Create a new folder, or generate in the current working directory.
1. Select the Percipio API
1. Select the Operation

One the generator has completed running you will need to configure the parameters for the API call in the ```config/config.default.js``` file.

The config file will list all the configurable parameters and include derscriptions from the OpeanAPI definition.

## Getting To Know Yeoman

 * Yeoman has a heart of gold.
 * Yeoman is a person with feelings and opinions, but is very easy to work with.
 * Yeoman can be too opinionated at times but is easily convinced not to be.
 * Feel free to [learn more about Yeoman](http://yeoman.io/).

## License

MIT © Martin Holden 2019-2020
