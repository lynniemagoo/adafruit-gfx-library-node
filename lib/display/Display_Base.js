'use strict';
//===============================================================
// No Adafruit equivalent
//===============================================================
const CORE_LOCATION = "../core/";
const Adafruit_GFX = require(CORE_LOCATION + "Adafruit_GFX.js");

const _debug = false;

class Display_Base extends Adafruit_GFX {

    constructor(options) {
        super(options);
    }

    //===============================================================
    // <BEGIN> NON - Adafruit exact implementations
    //===============================================================
    async startup() {
        const self = this;
        _debug && console.log("Display_Base::startup begin.");
        // We have _pre/_postStartup to allow mixins to do hardare setup/cleanup as needed.
        await self._preStartup();
        // Here we call a begin function with no options.
        // It is expected that options are set in the constructor
        // to the display.
        await self.begin();
        await self._postStartup();
        _debug && console.log("Display_Base::startup completed.");
    }


    // destructor
    async shutdown() {
        const self = this;
        _debug && console.log("Display_Base::shutdown begin.");
        // We have _pre/_postShutdown to allow mixins to do hardare setup/cleanup as needed.
        await self._preShutdown();
        // There is no current equivalent end() in the Adafruit library.
        await self._postShutdown();
        _debug && console.log("Display_Base::shutdown completed.");
    }
    //===============================================================
    // <END> NON - Adafruit exact implementations
    //===============================================================
}

module.exports = Display_Base;