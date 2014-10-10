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
    console.log(msg);
};
page.open(url);
