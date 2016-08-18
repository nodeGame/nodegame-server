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

page.viewportSize = {
  width: 1366,
  height: 768
};


page.onConsoleMessage = function(msg) {
    if (msg === 'PHANTOMJS EXITING') phantom.exit();
    console.log(msg);
};

page.open(url, function() {
    setTimeout(function() {
        page.evaluate(function() {

            // PhantomJS does not have the .click() method.
            if (!HTMLElement.prototype.click) {
                HTMLElement.prototype.click = function() {
                    var ev = document.createEvent('MouseEvent');
                    ev.initMouseEvent(
                        'click',
                        /*bubble*/true, /*cancelable*/true,
                        window, null,
                        0, 0, 0, 0, /*coordinates*/
                        false, false, false, false, /*modifier keys*/
                        0/*button=left*/, null
                    );
                    this.dispatchEvent(ev);
                };
            }

            node.events.ee.ng.on('GAME_OVER', function() {
                console.log('PHANTOMJS EXITING');
            });
        });
    }, 1000);
});
