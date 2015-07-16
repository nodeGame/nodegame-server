console.log('0');

var webpage = require('webpage');
var system = require('system');

console.log('1');

var url;

if (system.args.length < 2) {
    console.log('Need URL!');
    phantom.exit();
}

url = system.args[1];

console.log('2');

var page = webpage.create();

console.log('3');

page.onConsoleMessage = function(msg) {

    console.log(msg);

    if (msg === 'PHANTOMJS EXITING') phantom.exit();
    console.log(msg);
};

console.log('4');

page.open(url, function() {

console.log('5');

    setTimeout(function() {

        console.log('6');

        page.evaluate(function() {

            console.log('7');

            node.events.ee.ng.on(
                'GAME_OVER', function() { console.log('PHANTOMJS EXITING'); });
        });
    }, 1000);
});
