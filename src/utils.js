const crypto =  require('crypto');
const glob = require('glob');
const fs = require('fs');
const path = require('path');

function cached (fn) {
  const cache = Object.create(null)
  return (function cachedFn (str) {
    const hit = cache[str]
    return hit || (cache[str] = fn(str))
  })
}

const hyphenateRE = /\B([A-Z])/g
const hyphenate = cached((str) => {
  return str.replace(hyphenateRE, '-$1').toLowerCase()
})

exports.hyphenate = hyphenate;


exports.createHash = (text) => {
  return crypto.createHash('sha1').update(text).digest('hex');
}

exports.globMatch = (pattern, options, rules) => {
  return new Promise((resolve, reject) => {
    let allmatchs = [];
    glob(pattern, options, function (er, files) {
      files.forEach((file)=> {
        const fileContet = fs.readFileSync(file).toString('utf8');
        rules.forEach((rule)=> {
          let classnameRegex;
          classnameRegex = rule.exec;
          if (!classnameRegex) {
            return;
          }
          let match;
          while (match = classnameRegex.exec(fileContet)) {
            let matchs = rule.match.apply(null, match);
            if(typeof matchs == 'string') {
              matchs = [matchs];
            }
            if(matchs.length == 0) {
              continue;
            }
            allmatchs = allmatchs.concat(matchs);
          }
        })
      })
      resolve(allmatchs);
    })
  })
}


exports.flatten = (arr, res = []) => {
  var i = 0, cur;
  var len = arr.length;
  for (; i < len; i++) {
    cur = arr[i];
    Array.isArray(cur) ? exports.flatten(cur, res) : res.push(cur);
  }
  return res;
}

exports.uniq = (array) => {
   return [...new Set(array)]
}

exports.globMatchAll = (patterns, options, rules) => {
  if(typeof patterns == 'string') {
    patterns = [patterns];
  }
  return Promise.all(patterns.map((pattern)=> {
    return exports.globMatch(pattern, options, rules);
  })).then((values)=> {
    let vals = exports.uniq(exports.flatten(values));
    return vals;
  });
}

exports.globMatchToFile = (patterns, options, rules) => {
  exports.globMatchAll(patterns, Object.assign(options, { }), rules)
  .then((values)=> {
    values = values.filter(item => ~item.indexOf('-'));
    fs.writeFileSync(path.join(process.cwd(), 'obfus-seed.txt'), values.sort().join('\n'))
  });
}

var matchOperatorsRe = /[|\\{}()\[\]^$+*?\.]/g;
var escapeRegString = function (str) {
  if (typeof str !== 'string') {
    throw new TypeError('Expected a string');
  }

  return str.replace(matchOperatorsRe, '\\$&');
}
exports.escapeRegString = escapeRegString;