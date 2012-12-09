var ometajs = require('ometajs'),
    xjst = require('xjst'),
    vm = require('vm'),
    bemc = require('./ometa/bemc'),
    BEMCParser = bemc.BEMCParser,
    BEMCToXJST = bemc.BEMCToXJST,
    BEMCLogLocal = bemc.BEMCLogLocal;

//
// Default cache implementation
//
exports.cache = require('./cache');

//
// ### function translate (source)
// #### @source {String} BEM Template Source code
// #### @options {Object} Compilation options **optional**
// Returns source translated to javascript
//
exports.translate = function translate(source, options) {
    options || (options = {});

    var ometaOptions = {
      trackOffset: options.sourcemap || false
    };

    var tree = BEMCParser.matchAll(source, 'topLevel', ometaOptions),
        xjstPre = BEMCToXJST.match(tree, 'topLevel', ometaOptions),
        vars = [];

    if (options.cache === true) {
      var xjstCached = BEMCLogLocal.match(xjstPre, 'topLevel', ometaOptions);
      vars = xjstCached[0];
      xjstPre = xjstCached[1];
    }

    var xjstTree = xjst.translate(xjstPre, { ometa: ometaOptions }),
        exportName = options.exportName || 'TEMPLATES',
        xjstOpts = options.devMode? {
          'no-opt': true,
          ometa: ometaOptions
        } : {
          engine: 'sort-group',
          ometa: ometaOptions
        };

    try {
        var xjstJS = xjst.compile(xjstTree, xjstOpts);
    } catch (e) {
        throw new Error("xjst to js compilation failed:\n" + e.stack);
    }

    return 'var ' + exportName + ' = function() {\n' +
           '  var cache,\n' +
           '      xjst = '  + xjstJS + ';\n' +
           '  return function(options) {\n' +
           '    if (!options) options = {};\n' +
           '    cache = options.cache;\n' +
           (vars.length > 0 ? '    var ' + vars.join(', ') + ';\n' : '') +
           '    return xjst.apply.call(\n' +
           (options.raw ? 'this' : '[this]') + '\n' +
           '    );\n' +
           '  };\n' +
           '}();\n' +
           'typeof exports === "undefined" || ' +
           '(exports.' + exportName + ' = ' + exportName + ');';
};

//
// ### function compile (source)
// #### @source {String} BEM Template Source code
// #### @options {Object} Compilation options **optional**
// Returns generator function
//
exports.compile = function compile(source, options) {
    options || (options = {});

    var body = exports.translate(source, options),
        context = { exports: {} };

    if (options.devMode) context.console = console;
    vm.runInNewContext(body, context);

    return context[options.exportName || 'TEMPLATES'];
};

//
// Jail grammar
//
exports.Jail = require('./ometa/jail').Jail;
