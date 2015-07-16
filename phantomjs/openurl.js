/**
 * # openurl
 * Copyright(c) 2015 Stefano Balietti
 * MIT Licensed
 *
 * Open a phantomjs instance to the specified url
 *
 * This file is executed via `#ServerChannel.connectPhantom()`.
 *
 * http://www.nodegame.org
 */

"use strict";

var webpage = require('webpage');
var system = require('system');

var url, page;

if (system.args.length < 2) {
    console.log('Need URL!');
    phantom.exit();
}
url = system.args[1];

page = webpage.create();

page.onConsoleMessage = function(msg) {
    if (msg === 'PHANTOMJS EXITING') phantom.exit();
    console.log(msg);
};

page.open(url, function() {
    setTimeout(function() {
        page.evaluate(function() {
            node.events.ee.ng.on(
                'GAME_OVER', function() { console.log('PHANTOMJS EXITING'); });
        });
    }, 1000);
});
