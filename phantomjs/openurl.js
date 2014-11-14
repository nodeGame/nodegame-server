var webpage = require('webpage');
var system = require('system');

var url;

if (system.args.length < 2) {
    console.log('Need URL!');
    phantom.exit();
}

url = system.args[1];

var page = webpage.create();
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
