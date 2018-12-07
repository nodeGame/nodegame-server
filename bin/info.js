// # Exports data about nodegame modules.

const J = require('JSUS').JSUS;
const path = require('path');

// Directories.

let ngcDir = J.resolveModuleDir('nodegame-client', __dirname);
let JSUSDir = J.resolveModuleDir('JSUS', __dirname);
let NDDBDir = J.resolveModuleDir('NDDB', __dirname);
let shelfDir = J.resolveModuleDir('shelf.js', __dirname);
let ngwindowDir = J.resolveModuleDir('nodegame-window', __dirname);
let ngwidgetsDir = J.resolveModuleDir('nodegame-widgets', __dirname);
let monitorDir = J.resolveModuleDir('nodegame-monitor', __dirname);
let requirementsDir = J.resolveModuleDir('nodegame-requirements', __dirname);
let mturkDir = J.resolveModuleDir('nodegame-mturk', __dirname);
let gametemplateDir = J.resolveModuleDir('nodegame-game-template', __dirname);
let generatorDir = J.resolveModuleDir('nodegame-generator', __dirname);
let expressDir = J.resolveModuleDir('express', __dirname);
let socketioDir = J.resolveModuleDir('socket.io', __dirname);

// Build Scripts.

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

// Express and Socket.io

let pkgExpress = require(path.resolve(expressDir, 'package.json'));
let pkgSocketio = require(path.resolve(socketioDir, 'package.json'));

// Packages.

let pkgClient = require(path.resolve(ngcDir, 'package.json'));
let pkgJSUS = require(path.resolve(JSUSDir, 'package.json'));
let pkgNDDB = require(path.resolve(NDDBDir, 'package.json'));
// let pkgShelf = require(path.resolve(shelfDir, 'package.json'));
let pkgNgWindow = require(path.resolve(ngwindowDir, 'package.json'));
let pkgNgWidgets = require(path.resolve(ngwidgetsDir, 'package.json'));
let pkgMonitor = require(path.resolve(monitorDir, 'package.json'));
let pkgRequirements = require(path.resolve(requirementsDir, 'package.json'));
let pkgMturk = require(path.resolve(mturkDir, 'package.json'));
let pkgGameTemplate = require(path.resolve(gametemplateDir, 'package.json'));
let pkgGenerator = require(path.resolve(generatorDir, 'package.json'));


// Server Folders.

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
    modulesVersion: {
        client: pkgClient.version,
        JSUS: pkgJSUS.version,
        NDDB: pkgNDDB.version,
        //shelf: ...,
        window: pkgNgWindow.version,
        widgets: pkgNgWidgets.version,
        monitor: pkgMonitor.version,
        requirements: pkgRequirements.version,
        mturk: pkgMturk.version,
        gameTemplate: pkgGameTemplate.version,
        generator: pkgGenerator.version,
        // Express and Socket.io
        express: pkgExpress.version,
        socketio: pkgSocketio.version
    },
    modulesDir: {
        client: ngcDir,
        JSUS: JSUSDir,
        NDDB: NDDBDir,
        shelf: shelfDir,
        window: ngwindowDir,
        widgets: ngwidgetsDir,
        monitor: monitorDir,
        requirements: requirementsDir,
        mturk: mturkDir,
        gameTemplate: gametemplateDir,
        generator: generatorDir
    }
};
