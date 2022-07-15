'use strict';
const CORE_LOCATION = "../core/";
const Adafruit_GFX = require(CORE_LOCATION + "Adafruit_GFX.js");

class Display_Base extends Adafruit_GFX {

    constructor(options) {
        super(options);
    }


    startup() {
        const self = this;
        self._preStartup();
        self.begin();
        self._postStartup();
        return self;
    }


    // destructor
    shutdown() {
        const self = this;
        self._preShutdown();
        self._postShutdown();
        return self;
    }
}

module.exports = Display_Base;