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
    options || (options = {});

    var tree = BEMCParser.matchAll(source, 'topLevel'),
        xjstTree = xjst.translate(BEMCToXJST.match(tree, 'topLevel')),
        exportName = options.exportName || 'TEMPLATES',
        xjstOpts = options.devMode? { 'no-opt': true } : { engine: 'sort-group' };

    try {
        var xjstJS = xjst.compile(xjstTree, xjstOpts);
    } catch (e) {
        throw new Error("xjst to js compilation failed:\n" + e.stack);
    }

    return 'var ' + exportName + ' = ' + xjstJS + ';\n' +
        exportName + ' = (function(xjst) {\n' +
        '  return function() {\n' +
        '    return xjst.apply.call(\n' +
        (options.raw ? 'this' : '[this]') + '\n' +
        '    ); };\n' +
        '}(' + exportName + '));\n' +
        'typeof exports === "undefined" || (exports.' + exportName + ' = ' + exportName + ');';
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
