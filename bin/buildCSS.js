module.exports = function buildCSS(cssDir, cb) {
    let execFile = require('child_process').execFile;
    let child = execFile(
        'sass',
        [ 'nodegame.scss', 'nodegame.css' ],
        { cwd: cssDir },
        (error, stdout, stderr) => {
            if (error) {
                console.error(repo + ' ' + stderr.trim());
                console.error('Did you install SASS globally?');
            }
            else {
                console.log('nodegame.css built.');
            }
            if (cb) cb(error);
        });
};
