/* eslint-disable
  no-param-reassign
*/
const path = require('path');
const fs = require('fs');
const { SourceMapConsumer } = require('source-map');
const { SourceMapSource, RawSource, ConcatSource, ReplaceSource } = require('webpack-sources');
const RequestShortener =  require('webpack/lib/RequestShortener');
const RuleSet = require('webpack/lib/RuleSet')
const ModuleFilenameHelpers = require('webpack/lib/ModuleFilenameHelpers');
const DependencyReference = require("webpack/lib/dependencies/DependencyReference")
const validateOptions = require('schema-utils');
const { hyphenate, createHash, globMatchToFile, escapeRegString } = require('./utils');
// const schema = require('./options.json');


const pluginName = 'ObfusWebpackPlugin';

const warningRegex = /\[.+:([0-9]+),([0-9]+)\]/;

class ObfusPlugin {
  constructor(options = {}) {
    // validateOptions(schema, options, 'Obfus Plugin');
    const {
      rules = {},
      globSeed = {}
    } = options;

    this.options = {
      rules: rules,
      globSeed: globSeed
    };
  }

  static isSourceMap(input) {
    // All required options for `new SourceMapConsumer(...options)`
    // https://github.com/mozilla/source-map#new-sourcemapconsumerrawsourcemap
    return Boolean(
      input &&
        input.version &&
        input.sources &&
        Array.isArray(input.sources) &&
        typeof input.mappings === 'string'
    );
  }

  static buildSourceMap(inputSourceMap) {
    if (!inputSourceMap || !ObfusPlugin.isSourceMap(inputSourceMap)) {
      return null;
    }
    return new SourceMapConsumer(inputSourceMap);
  }

  static buildError(err, file, sourceMap, requestShortener) {
    // Handling error which should have line, col, filename and message
    if (err.line) {
      const original =
        sourceMap &&
        sourceMap.originalPositionFor({
          line: err.line,
          column: err.col,
        });

      if (original && original.source && requestShortener) {
        return new Error(
          `${file} from Obfus\n${err.message} [${requestShortener.shorten(
            original.source
          )}:${original.line},${original.column}][${file}:${err.line},${
            err.col
          }]`
        );
      }

      return new Error(
        `${file} from Obfus\n${err.message} [${file}:${err.line},${err.col}]`
      );
    } else if (err.stack) {
      return new Error(`${file} from Obfus\n${err.stack}`);
    }

    return new Error(`${file} from Obfus\n${err.message}`);
  }

  static buildWarning(
    warning,
    file,
    sourceMap,
    requestShortener,
    warningsFilter
  ) {
    let warningMessage = warning;
    let locationMessage = '';
    let source = null;

    if (sourceMap) {
      const match = warningRegex.exec(warning);

      if (match) {
        const line = +match[1];
        const column = +match[2];
        const original = sourceMap.originalPositionFor({
          line,
          column,
        });

        if (
          original &&
          original.source &&
          original.source !== file &&
          requestShortener
        ) {
          ({ source } = original);
          warningMessage = `${warningMessage.replace(warningRegex, '')}`;

          locationMessage = `[${requestShortener.shorten(original.source)}:${
            original.line
          },${original.column}]`;
        }
      }
    }

    if (warningsFilter && !warningsFilter(warning, source)) {
      return null;
    }

    return `Obfus Plugin: ${warningMessage}${locationMessage}`;
  }

  getReplaceClassName(className) {
    className = ObfusPlugin.caseCovert(className);
    const cacheClazz = this._cacheClazz = this._cacheClazz || {};
    if (cacheClazz[className]) {
      return cacheClazz[className]
    }
    const cls =  ObfusPlugin.createHashName(className);
    cacheClazz[className] = cls;
    return cls;
  }

  static createHashName(text, len = 5, prefix = 'O') {
      var hash = createHash(text);
      if (len > 0) {
        hash = hash.substr(0, len);
      }
      return prefix + hash;
  }

  static caseCovert(str) {
    return hyphenate(str);
  }

  apply(compiler) {
    let me = this;
    const globSeed = this.options.globSeed;
    if(globSeed && globSeed.patterns && globSeed.rules) {
      globMatchToFile(globSeed.patterns, { root: compiler.options.context }, globSeed.rules);
      if(this.options.onlySeed) {
        return;
      }
    }

    const buildModuleFn = (moduleArg, ...args) => {
      // to get detailed location info about errors
      moduleArg.useSourceMap = true;
    };

    const succeedModuleFn = (module, ...args) => {

    }

    const rules = this.options.rules;

    // let seeds = fs.readFileSync(path.join(process.cwd(), 'obfus-seed.txt')).toString();
    // // @ts-ignore
    // seeds = seeds.split('\n');
    // seeds = seeds.map((item) => {
    //   return escapeRegString(item)
    // }).join('|');
    // rules.push({
    //   exec: new RegExp('\\\.?(' + seeds + ')', 'g'),
    //   match: (a, name) => {
    //     return name;
    //   }
    // })


    const optimize = (file, compilation, rule) => {
      let classnameRegex;
      classnameRegex = rule.exec;
      if (!classnameRegex) {
        return;
      }
      const originalSource = compilation.assets[file];
      const rawSource = originalSource.source();
      let source;
      let match;
      while (match = classnameRegex.exec(rawSource)) {
        let matchs = rule.match.apply(me, match);
        if(typeof matchs == 'string') {
          matchs = [matchs];
        }
        let matchstr = rawSource.slice(match.index, match.index + match[0].length);
        matchs.forEach((matched)=> {
          const newClass = this.getReplaceClassName(matched);
          matchstr = matchstr.replace(matched, newClass);
        })
        if (!source) source = new ReplaceSource(originalSource);
        source.replace(match.index, match.index + match[0].length - 1, matchstr);
      }
      if (!source) {
        return;
      }
      compilation.assets[file] = source;
    }

    const optimizeFn = (compilation, chunks, callback) => {
      Array.from(chunks)
        .reduce((acc, chunk) => acc.concat(chunk.files || []), [])
        .concat(compilation.additionalChunkAssets || [])
        .filter(ModuleFilenameHelpers.matchObject.bind(null, this.options))
        .forEach((file) => {
          let inputSourceMap;
          const asset = compilation.assets[file];
          try {
            let input;
            if (this.options.sourceMap && asset.sourceAndMap) {
              const { source, map } = asset.sourceAndMap();
              input = source;

              if (ObfusPlugin.isSourceMap(map)) {
                inputSourceMap = map;
              } else {
                inputSourceMap = map;
                compilation.warnings.push(
                  new Error(`${file} contains invalid source map`)
                );
              }
            } else {
              input = asset.source();
              inputSourceMap = null;
            }
            rules.forEach(rule => {
              optimize(file, compilation, rule);
            });
          } catch (error) {
            compilation.errors.push(
              ObfusPlugin.buildError(
                error,
                file,
                ObfusPlugin.buildSourceMap(inputSourceMap),
                new RequestShortener(compiler.context)
              )
            );
          }
        });

        const clazz = JSON.stringify(this._cacheClazz || '');
        compilation.assets['obfus-results.json'] = {
          source: function() {
            return clazz;
          },
          size: function() {
            return clazz.length;
          }
        };
        callback();

    };

    compiler.hooks.compilation.tap(pluginName, (compilation) => {
      if (this.options.sourceMap) {
        compilation.hooks.buildModule.tap(pluginName, buildModuleFn);
      }

      compilation.hooks.succeedModule.tap(pluginName, succeedModuleFn);

      const { mainTemplate, chunkTemplate } = compilation;

      // Regenerate `contenthash` for minified assets
      for (const template of [mainTemplate, chunkTemplate]) {
        template.hooks.hashForChunk.tap(pluginName, (hash) => {
          hash.update('ObfusPlugin');
          hash.update('1');
        });
      }

      compilation.hooks.optimizeChunkAssets.tapAsync(
        pluginName,
        optimizeFn.bind(this, compilation)
      );
    });    
  }
}

module.exports = ObfusPlugin;