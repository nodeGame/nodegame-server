/**
 * # generateCodes
 * Copyright(c) 2023 Stefano Balietti
 * MIT Licensed
 *
 * Loads/Generates/Fetches sync/async the authorization codes for a channel
 *
 * Depending on settings.mode, different operations are performed:
 *
 *   - 'dummy': creates dummy ids and passwords in sequential order.
 *   - 'auto': creates random 8-digit alphanumeric ids and passwords.
 *   - 'local': reads the authorization codes from a file. Defaults:
 *              codes.json, code.csv. A custom file can be specified
 *              in settings.file (available formats: json and csv).
 *   - 'custom': The 'getCodesCb' property of the settings object
 *               will be executed with settings and done callback
 *               as parameters.
 *   - 'remote': fetches the authorization codes from a remote URI.
 *               Available protocol: DeSciL protocol. **DISABLED**
 *
 * Client objects are used for authentication. They should be formatted
 * as follows:
 *
 *     {
 *        id:    '123XYZ', // The client id (must be unique).
 *        pwd:   'pwd',   // The authentication password (optional)
 *     }
 *
 * Additional properties can be added and will be stored in the registry.
 *
 * http://www.nodegame.org
 * ---
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const J = require('JSUS').JSUS;
const NDDB = require('NDDB').NDDB;


module.exports = function(settings) {

    const mode = settings.mode;
    const E = '"mode=' + mode + '", ';

    return new Promise( (resolve, reject) => {

        // Synchronous.

        if (mode === 'dummy') {

            let nCodes = validateNCodes(settings.nCodes);
            let codes = new Array(nCodes);

            for (let i = 0 ; i < nCodes; i ++) {
                let D = '' + i;
                codes[i] = {
                    id: D,
                    AccessCode: D,
                    ExitCode: i + 'exit'
                };
                // Optionally add a password field.
                if (settings.addPwd) code[i].pwd = D;
            }

            resolve(codes);
        }

        else if (mode === 'auto') {

            let idLen = 8;
            let pwdLen = 8;
            let accessLen = 6;
            let exitLen = 6;

            if (settings.codesLength) {
                idLen = settings.codesLength.idLen ?? idLen;
                pwdLen = settings.codesLength.pwdLen ?? pwdLen;
                accessLen = settings.codesLength.accessLen ?? accessLen;
                exitLen = settings.codesLength.exitLen ?? exitLen;
            }

            let keys = {};
            let nCodes = validateNCodes(settings.nCodes);
            let codes = new Array(nCodes);

            for (let i = 0 ; i < nCodes; i ++) {
                codes[i] = {
                    id: genCode(idLen, keys),
                    AccessCode: genCode(accessLen, keys),
                    ExitCode: genCode(exitLen, keys)
                };
                // Optionally add a password field.
                if (settings.addPwd) {
                    codes[i].pwd = genCode(pwdLen, keys);
                }
            }

            resolve(codes);
            return;
        }

        else if (mode === 'local') {

            let inFile = settings.inFile;

            // Default paths.
            if ('undefined' === typeof inFile) {
                inFile = path.join(settings.authDir, 'codes.json');
                if (!fs.existsSync(inFile)) {
                    inFile = path.join(settings.authDir, 'codes.js');
                    if (!fs.existsSync(inFile)) {
                        inFile = path.join(settings.authDir, 'codes.csv');
                        if (!fs.existsSync(inFile)) {

                            done(E + 'inFile not set, ' +
                                'codes.[json|js|csv] not found.');
                            return;
                        }
                    }
                }
            }
            // Custom paths.
            else if ('string' === typeof inFile && inFile.trim() !== '') {

                // Convert to absolute path.
                if (!path.isAbsolute(inFile)) {
                    inFile = path.join(settings.authDir, inFile);
                }

                if (!fs.existsSync(inFile)) {
                    reject(E + 'inFile node existing ' + inFile);
                    return;
                }
            }
            else {
                throw new TypeError(E + 'inFile must be a non-empty string' +
                                    ' or undefined. Found: ' + inFile);
            }

            // Get format, default JSON.
            let format = getFormat(inFile);

            if (format !== 'json' && format !== 'ndjson' && format !== 'csv') {
                throw new Error(E + 'unknown format: ' + inFile);
            }

            // CSV.
            let db = new NDDB();
            db.loadSync(inFile);
            let codes = db.fetch();

            if (!codes.length) reject(E + 'no codes found in file.');
            else resolve(codes);

            return;
        }


        else if (mode === 'external') {
            // It will be added by query URL.

            resolve([]);
            return;
        }

        // Asynchronous.
        else if (mode === 'custom') {
            if ('function' !== typeof settings.customCb) {
                throw new Error(E + 'customCb is not a function. Found: ' +
                                settings.customCb);
            }

            settings.customCb(settings, resolve, reject);
            return;
        }

        // Asynchronous.
        else if (mode !== 'monitor') {

            // Unknown mode.
            throw new Error(E + 'unknown mode. Valid modes: ' +
                            '[auto,dummy,local,external,monitor,custom]');
        }


    });

};

// ## Helper functions.

const getFormat = file => {
    let format = file.lastIndexOf('.');
    // If not specified format is JSON.
    return format < 0 ? 'json' : file.substr(format+1);
}

const validateNCodes = (nCodes, mode) => {
    if ('undefined' !== typeof nCodes) {
        if ('number' !== typeof nCodes || nCodes < 1) {
            throw new Error('auth.codes: settings.nCodes must be a ' +
                            'number > 0 or undefined when mode is "' +
                            mode + '". Found: ' + nCodes);
        }
    }
    return nCodes || 100;
}

const genCode = (len, keys, limit = 500) => {
    let nBytes = len / 2;
    let code = crypto.randomBytes(nBytes).toString("hex");
    if (keys[code]) {
        let counter = 0;
        while(keys[code]) {
            code = crypto.randomBytes(nBytes).toString("hex");
            if (++counter < limit) {
                throw new Error('Error generating codes: max iter ' +
                                'reached. Please check your parameters ' +
                                'and retry.');
            }
        }
    }
    return code;
};
