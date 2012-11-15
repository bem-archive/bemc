var PATH = require('path'),
    Q = require('q'),
    QFS = require('q-fs'),
    bemc = require('./bemc');

module.exports = require('coa').Cmd()
    .name(PATH.basename(process.argv[1]))
    .title('BEM Templates Compiler')
    .helpful()
    .opt()
        .title('Development mode')
        .name('devMode')
        .long('dev')
        .flag()
        .end()
    .opt()
        .title('Output file (stdout by default)')
        .name('output')
        .output()
        .end()
    .opt()
        .title('Show version')
        .name('version')
        .short('v')
        .long('version')
        .flag()
        .only()
        .act(function() {
            var p = require('../package.json');
            return p.name + ' ' + p.version;
        })
        .end()
    .arg()
        .name('templates')
        .title('Template files')
        .arr()
        .req()
        .end()
    .completable()
    .act(function(opts, args) {

        return Q.all(args.templates.map(function(tpl) {
                return QFS.read(tpl, { charset: 'utf8' });
            }))
            .invoke('join', '\n')
            .then(function(src) {

                var res = bemc.translate(src, { devMode: opts.devMode }),
                    output = opts.output;

                // save res to file
                if (typeof output === 'string') {
                    return QFS.write(output, res);
                }

                // output res to stdout
                if (output === process.stdout) {
                    output.write(res);
                    return Q.resolve();
                }

                // write res to writable stream of opened file
                var defer = Q.defer();

                output.on('error', function(err) {
                    defer.reject(err);
                });

                output.once('close', function() {
                    defer.resolve();
                });

                output.once('end', function() {
                    defer.resolve();
                });

                output.write(res);
                output.end();

                return defer.promise;

            });

    });
