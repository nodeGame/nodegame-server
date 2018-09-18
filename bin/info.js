// # Exports data about nodegame modules.

const J = require('JSUS').JSUS;
const path = require('path');

let ngcDir = J.resolveModuleDir('nodegame-client', __dirname);
let JSUSDir = J.resolveModuleDir('JSUS', __dirname);
let NDDBDir = J.resolveModuleDir('NDDB', __dirname);
let shelfDir = J.resolveModuleDir('shelf.js', __dirname);
let ngwindowDir = J.resolveModuleDir('nodegame-window', __dirname);
let ngwidgetsDir = J.resolveModuleDir('nodegame-widgets', __dirname);

let buildClient = require(path.resolve(ngcDir, 'bin', 'build.js')).build;
let buildClientSup =
    require(path.resolve(ngcDir, 'bin', 'build.js')).build_support;
let buildJSUS = require(path.resolve(JSUSDir, 'bin', 'build.js')).build;
let buildNDDB = require(path.resolve(NDDBDir, 'bin', 'build.js')).build;
let buildShelf = require(path.resolve(shelfDir, 'bin', 'build.js')).build;
let buildNgWindow = require(path.resolve(ngwindowDir, 'bin', 'build.js')).build;
let buildNgWidgets =
    require(path.resolve(ngwidgetsDir, 'bin', 'build.js')).build;
let buildCSS = require('./buildCSS');

let rootDir = path.resolve(__dirname, '..');
let buildDir = path.resolve(rootDir, 'public', 'javascripts') + path.sep;
let cssDir = path.resolve(rootDir, 'public', 'stylesheets') + path.sep;
let libDir = path.resolve(rootDir, 'lib') + path.sep;
let confDir = path.resolve(rootDir, 'conf') + path.sep;

let { version } = require(path.resolve(rootDir, 'package.json'));

module.exports = {
    version: version,
    build: {
        client: buildClient,
        clientSupport: buildClientSup,
        JSUS: buildJSUS,
        NDDB: buildNDDB,
        shelf: buildShelf,
        window: buildNgWindow,
        widgets: buildNgWidgets,
        css: buildCSS
    },
    serverDir: {
        root: rootDir,
        build: buildDir,
        css: cssDir,
        lib: libDir,
        conf: confDir
    },
    modulesDir: {
        client: ngcDir,
        JSUS: JSUSDir,
        NDDB: NDDBDir,
        shelf: shelfDir,
        window: ngwindowDir,
        widgets: ngwidgetsDir
    }
};
