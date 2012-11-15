var ometajs = require('ometajs'),
    xjst = require('xjst'),
    vm = require('vm'),
    bemc = require('./ometa/bemc'),
    BEMCParser = bemc.BEMCParser,
    BEMCToXJST = bemc.BEMCToXJST;

//
// ### function translate (source)
// #### @source {String} BEM Template Source code
// #### @options {Object} Compilation options **optional**
// Returns source translated to javascript
//
exports.translate = function translate(source, options) {
  var tree = BEMCParser.matchAll(source, 'topLevel'),
      xjstTree = xjst.translate(BEMCToXJST.match(tree, 'topLevel'));

  options || (options = {});

  try {
    var xjstJS = options.devMode ?
                   xjst.compile(xjstTree, '', { 'no-opt': true })
                   :
                   xjst.compile(xjstTree, { engine: 'sort-group' });
  } catch (e) {
      throw new Error("xjst to js compilation failed:\n" + e.stack);
  }

  return 'var BEMC = ' + xjstJS + ';\n' +
         'BEMC = (function(xjst) {\n' +
         '  return function() {\n' +
         '    return xjst.apply.call(\n' +
         (options.raw ? 'this' : '[this]') + '\n' +
         '    ); };\n' +
         '}(BEMC));\n' +
         'typeof exports === "undefined" || (exports.BEMC = BEMC);';
};

//
// ### function compile (source)
// #### @source {String} BEM Template Source code
// #### @options {Object} Compilation options **optional**
// Returns generator function
//
exports.compile = function compile(source, options) {
  var body = exports.translate(source, options),
      context = { exports: {} };

  if (options && options.devMode) context.console = console;
  vm.runInNewContext(body, context);

  return context.BEMC;
};

//
// Jail grammar
//
exports.Jail = require('./ometa/jail').Jail;
