<div align="center">
  <img width="200" height="200"
    src="https://user-images.githubusercontent.com/1061012/59744932-38ff6980-92a6-11e9-8aff-3022488e6171.png">
  <a href="https://github.com/webpack/webpack">
    <img width="200" height="200"
      src="https://webpack.js.org/assets/icon-square-big.svg">
  </a>
</div>

[![npm][npm]][npm-url]
[![node][node]][node-url]
[![deps][deps]][deps-url]
[![tests][tests]][tests-url]
[![coverage][cover]][cover-url]
[![chat][chat]][chat-url]
[![size][size]][size-url]

# obfus-webpack-plugin

A plugin for webpack that obfuscate className and ids  as a hash String.

## Getting Started

To begin, you'll need to install `obfus-webpack-plugin`:

```console
$ npm install obfus-webpack-plugin --save-dev
```

Then add the plugin to your `webpack` config. For example:



**webpack.config.js**

```js
// webpack.config.js
const ObfusWebpackPlugin = require('obfus-webpack-plugin')
 
module.exports = {

  plugins: [
    new ObfusWebpackPlugin()
  ]
}
```



And run `webpack` via your preferred method.

## Examples




## License

[MIT](./LICENSE)

[npm]: https://img.shields.io/npm/v/obfus-webpack-plugin.svg
[npm-url]: https://npmjs.com/package/obfus-webpack-plugin
[node]: https://img.shields.io/node/v/obfus-webpack-plugin.svg
[node-url]: https://nodejs.org
[deps]: https://david-dm.org/icai/obfus-webpack-plugin.svg
[deps-url]: https://david-dm.org/icai/obfus-webpack-plugin
[tests]: https://dev.azure.com/icai/obfus-webpack-plugin/_apis/build/status/icai.obfus-webpack-plugin?branchName=master
[tests-url]: https://dev.azure.com/icai/obfus-webpack-plugin/_build/latest?definitionId=2&branchName=master
[cover]: https://codecov.io/gh/icai/obfus-webpack-plugin/branch/master/graph/badge.svg
[cover-url]: https://codecov.io/gh/icai/obfus-webpack-plugin
[chat]: https://img.shields.io/badge/gitter-webpack%2Fwebpack-brightgreen.svg
[chat-url]: https://gitter.im/webpack/webpack
[size]: https://packagephobia.now.sh/badge?p=obfus-webpack-plugin
[size-url]: https://packagephobia.now.sh/result?p=obfus-webpack-plugin
