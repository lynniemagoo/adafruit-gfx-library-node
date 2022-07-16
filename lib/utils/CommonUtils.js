'use strict';

//===============================================================
// No Adafruit equivalent
//===============================================================
function extractOption(options, key) {
    return options.hasOwnProperty(key) ? options[key] : (arguments.length > 2 ? arguments[2] : null);
}

const sleepMs = ms => new Promise(r => setTimeout(r, ms));


module.exports = {extractOption, sleepMs};

