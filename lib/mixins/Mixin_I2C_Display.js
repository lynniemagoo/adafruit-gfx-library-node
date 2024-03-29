'use strict';
//===============================================================
// No Adafruit equivalent
//===============================================================
let i2c = require('i2c-bus');
const {Gpio} = require('onoff');
const GPIO_HIGH = Gpio.HIGH;
const GPIO_LOW = Gpio.LOW;

const UTILS_BASE = "../utils/";
const {sleepMs, extractOption}  = require (UTILS_BASE + "CommonUtils.js");

// Default is bus #1, address 0x3C.
const DEFAULT_I2C_BUS_NUMBER = 0x01;
const DEFAULT_I2C_ADDRESS = 0x3C;

const DEFAULT_RESET_GPIO = -1;

const BUS_NUMBER_DEFAULT = 0x01;
const I2C_BLOCK_SIZE_MAX = 8192;
const BLOCK_TYPE_CMD = 0x00;
const BLOCK_TYPE_DATA = 0x40;

const I2C_DEFAULTS = Object.freeze({
    "rstGpioNb":DEFAULT_RESET_GPIO,
    "i2cBusNumber":DEFAULT_I2C_BUS_NUMBER,
    "i2cAddress":DEFAULT_I2C_ADDRESS
});


const _debug = false;
const _debug_lifecycle = false;

const Mixin_I2C_Display = Base => class extends Base {

    constructor(options) {
        super(options);
        const self = this;
        _debug_lifecycle && console.log("I2C_Display_Mixin::constructor() begin");
        
        self._rstGpioId = extractOption(self._options, "rstGpioNb", DEFAULT_RESET_GPIO);
        self._rstGpio = undefined;
        self._i2cBusNumber = extractOption(self._options, "i2cBusNumber", DEFAULT_I2C_BUS_NUMBER);
        self._i2cAddress = extractOption(self._options, "i2cAddress", DEFAULT_I2C_ADDRESS);
        self._writeCount = 0;
        _debug_lifecycle && console.log("I2C_Display_Mixin::constructor() completed");
    }


    _hardwareStartup() {
        const self = this;
        const doWork = async _ => {
            _debug_lifecycle && console.log("I2C_Display_Mixin::_hardwareStartup() begin");
            if (!self._i2c_bus) {
                //console.log(self);
                const i2c_options = {};
                self._i2c_bus = i2c.openSync(self._i2cBusNumber, i2c_options);
            }
            if ((undefined === self._rstGpio) && (self._rstGpioId >= 0)) {
                // Initialize with high value.
                self._rstGpio = initGpioOut(self._rstGpioId);
                self._rstGpio.writeSync(GPIO_HIGH);
            }
            _debug_lifecycle && console.log("I2C_Display_Mixin::_hardwareStartup() completed");
        };
        self._chain(doWork);
        return self;
    }


    _hardwareReset() {
        const self = this;
        if (self._rstGpio) {
            const doWork = async _ => {
                _debug_lifecycle && console.log("I2C_Display_Mixin::_hardwareReset()");
                await gpioHardwareReset_101(self._rstGpio);
                _debug_lifecycle && console.log("I2C_Display_Mixin::_hardwareReset() completed");
            };
            self._chain(doWork);
        }
        return self;
    }


    _hardwareShutdown() {
        const self = this;
        const doWork = async _ => {
            _debug_lifecycle && console.log("I2C_Display_Mixin::_hardwareShutdown() begin");
            if (self._i2c_bus) {
                const i2c_bus = self._i2c_bus;
                i2c_bus.closeSync();
                self._i2c_bus = null;
            }
            //Disconnect Gpio pins
            if (self._rstGpio) {
                unexportGpio(self._rstGpio);
                self._rstGpio = undefined;
            }
            _debug_lifecycle && console.log("I2C_Display_Mixin::_hardwareShutdown() completed");
        };
        self._chain(doWork);
        
        return self;
    }


    _hardwareWriteCommand(command, data) {
        const self = this;
        const blockBytes = [];
        if (null != command && undefined != command) {
            blockBytes.push(command);
        }
        if (data && data.length) {
            blockBytes.push.apply(blockBytes, data);
        }
        blockBytes.length && self._hardwareWriteBlock(BLOCK_TYPE_CMD, blockBytes);
        return self;
    }


    _hardwareWriteData(arrBytes) {
        const self = this;
        return this._hardwareWriteBlock(BLOCK_TYPE_DATA, arrBytes);
    }


    _hardwareWriteBlock(blockType, blockBytes) {
        const self = this;
        const doWork = async _ => {
            const _i2c_bus = self._i2c_bus;
            const _i2cAddress = self._i2cAddress;
            const arrBlockBytes = blockBytes;//flattenArray(blockBytes);
            const l = arrBlockBytes.length;
            let bytesSent = 0;
            const blockSize = I2C_BLOCK_SIZE_MAX - 1; // subtract 1 to account for the blockType byte.
            for (let i = 0; i < l; i += blockSize) {
                const bufferData = Buffer.from(arrBlockBytes.slice(i, i + blockSize))
                const bufferToSend = Buffer.concat([Buffer.from([blockType & 0xFF]), bufferData]);
                await _hardwareWaitReady(_i2c_bus, _i2cAddress);
                _i2c_bus.i2cWriteSync(_i2cAddress, bufferToSend.length, bufferToSend);
                bytesSent += bufferData.length;
            }
        };
        self._chain(doWork);
        return self;
    }


    /**********************************************************************/
    /*!
        @brief  Call before issuing command(s) or data to display. Performs
                chip-select (if required) and starts an I2C transaction (if
                using hardware I2C and transactions are supported). Required
                for all display types; not an I2C-specific function.
    */
    /**********************************************************************/
    startWrite() {
        /* Should someone implement another mixin that requires transactions,
           this is how you should implement to guarantee that whatever task is
           required is chained.
           Note that we keep track of outstanding startWrite/endWrite pairs
           as in some circumstances, these can be nested calls (text display for example).
        */
        /*
        const self = this;
        const doWork = async _ => {
            if (self._writeCount === 0) {
                super.startWrite();
            }
            self._writeCount++;
        };
        self._chain(doWork);
        */
    }


    /**********************************************************************/
    /*!
        @brief  Call after issuing command(s) or data to display. Performs
                chip-deselect (if required) and ends an I2C transaction (if
                using hardware I2C and transactions are supported). Required
                for all display types; not an I2C-specific function.
    */
    /**********************************************************************/
    endWrite() {
        /* Should someone implement another mixin that requires transactions,
           this is how you should implement to guarantee that whatever task is
           required is chained.
           Note that we keep track of outstanding startWrite/endWrite pairs
           as in some circumstances, these can be nested calls (text display for example).
        */
        /*
        const self = this;
        const doWork = async _ => {
            self._writeCount--;
            if (self._writeCount === 0) {
                super.endWrite();
            } else if (self._writeCount < 0) {
                console.error("endWrite negative count:%o", self._writeCount);
                // There us an unexpected startWrite/endWrite mismatch that has occurred.
                // Use a stack trace to try and figure out where.
                //const stack = new Error().stack;
                //console.error(stack);
                self._writeCount = 0;
            }
        };
        self._chain(doWork);
        */
    }
}


function flattenArray(rawOrTypedArray) {
    const ret = [];
    if (rawOrTypedArray && rawOrTypedArray.length) {
        const l = rawOrTypedArray.length;
        for (let i=0; i < l; i++) {
            let v = rawOrTypedArray[i];
            if (Array.isArray(v) && v.length > 0) {
                ret.push.apply(ret, v);
            } else {
                ret.push(v);
            }
        }
    }
    return ret;
}


// sometimes the hardware gets a bit busy with lots of bytes.
// Read the response byte to see if this is the case
function _hardwareWaitReady(i2cBus, i2cAddress) {
    let data=[0];
    if (!i2cBus) {
        // bus closed?
        console.log("BUS CLOSED???");
        return Promise.resolve(true);
    }
    try {
        i2cBus.i2cReadSync(i2cAddress, 1, Buffer.from(data));
        const busy = data[0] >>> 7 & 1;
        if (!busy) {
            return Promise.resolve(true);
        } else {
            return new Promise((resolve, reject) => {
                function tick() {
                    //console.log("_waitUntilReady::tick()");
                    _readI2C(i2cBus, i2cAddress, function(byte) {
                        // read the busy byte in the response
                        const busy = byte >>> 7 & 1;
                        if (!busy) {
                            //console.log("_waitUntilReady::resolve(true)");
                            resolve(true);
                        } else {
                            //console.log("*************_waitUntilReady::setTimeout()");
                            setTimeout(function () {tick() }, 30);
                        }
                    });
                };
                //console.log("_waitUntilReady::start()");
                setTimeout(function () {tick() }, 10);
            });
        }
    } catch (err) {
        console.error("Bus close prematurely??? err:%o", err);
        return Promise.reject(err);
    }
}


// read a byte synchronously from the bus
function _readI2C(i2cBus, i2cAddress, fn) {
    let data=[0];
    i2cBus.i2cReadSync(i2cAddress, 1, Buffer.from(data));
    fn && fn(data[0]);
}


function initGpio(gpioId, direction, options = {}) {
    return new Gpio(gpioId, direction, options);
}

function initGpioOut(gpioId) {
    return initGpio(gpioId, "out");
}

function unexportGpio(gpio) {
    gpio && gpio.unexport();
}

async function gpioHardwareReset_101(gpio) {
    const resetMs = 100;
    if (gpio) {
        _debug_init && console.log("gpioHardwareReset_101 execute!");
        gpio.writeSync(GPIO_HIGH);
        await sleepMs(resetMs);
        gpio.writeSync(GPIO_LOW);
        await sleepMs(resetMs);
        gpio.writeSync(GPIO_HIGH);
        await sleepMs(resetMs);
    }
}

module.exports = {Mixin_I2C_Display, I2C_DEFAULTS}
