'use strict';
let i2c = require('i2c-bus');

const UTILS_LOCATION = "../utils/";
const CommonUtilsModule = require (UTILS_LOCATION + "CommonUtils.js");

const extractOption = CommonUtilsModule.extractOption;


// Default is bus #1, address 0x3C.
const DEFAULT_I2C_BUS_NUMBER = 0x01;
const DEFAULT_I2C_ADDRESS = 0x3C;

const BUS_NUMBER_DEFAULT = 0x01;
const I2C_BLOCK_SIZE_MAX = 8192;
const BLOCK_TYPE_CMD = 0x00;
const BLOCK_TYPE_DATA = 0x40;


const _debug = false;
const Mixin_I2C_Display = Base => class extends Base {

    _hardwareConstruct() {
        const self = this;
        _debug && console.log("I2C_Display_Mixin::_hardwareConstruct() begin");
        self._i2cBusNumber = extractOption(self._options, "i2cBusNumber", DEFAULT_I2C_BUS_NUMBER);
        self._i2cAddress = extractOption(self._options, "i2cAddress", DEFAULT_I2C_ADDRESS);
        _debug && console.log("I2C_Display_Mixin::_hardwareConstruct() completed");
    }


    _hardwareStartup() {
        const self = this;
        _debug && console.log("I2C_Display_Mixin::_hardwareStartup() begin");
        if (!self._i2c_bus) {
            //console.log(self);
            const i2c_options = {};
            self._i2c_bus = i2c.openSync(self._i2cBusNumber, i2c_options);
        }
        _debug && console.log("I2C_Display_Mixin::_hardwareStartup() completed");
        return self;
    }


    _hardwareReset() {
        return this;
    }


    _hardwareShutdown() {
        const self = this;
        _debug && console.log("I2C_Display_Mixin::_hardwareShutdown() begin");
        if (self._i2c_bus) {
            const i2c_bus = self._i2c_bus;
            i2c_bus.closeSync();
            self._i2c_bus = null;
        }
        _debug && console.log("I2C_Display_Mixin::_hardwareShutdown() completed");
        return self;
    }


     _hardwareWriteCommand(command, data) {
        const blockBytes = [];
        if (null != command && undefined != command) {
            blockBytes.push(command);
        }
        if (data && data.length) {
            blockBytes.push.apply(blockBytes, data);
        }
        return this._hardwareWriteBlock(BLOCK_TYPE_CMD, blockBytes);
    }


    _hardwareWriteData(arrBytes) {
        return this._hardwareWriteBlock(BLOCK_TYPE_DATA, arrBytes);
    }


    _hardwareWriteBlock(blockType, blockBytes) {
        const self = this;
        const _i2c_bus = self._i2c_bus;
        const _i2cAddress = self._i2cAddress;
        const arrBlockBytes = flattenArray(blockBytes);
        const l = arrBlockBytes.length;
        let bytesSent = 0;
        const blockSize = I2C_BLOCK_SIZE_MAX - 1; // subtract 1 to account for the blockType byte.
        const transferLoop = async _ => {
            for (let i = 0; i < l; i += blockSize) {
                const bufferData = Buffer.from(arrBlockBytes.slice(i, i + blockSize))
                const bufferToSend = Buffer.concat([Buffer.from([blockType & 0xFF]), bufferData]);
                await _hardwareWaitReady(_i2c_bus, _i2cAddress);
                _i2c_bus.i2cWriteSync(_i2cAddress, bufferToSend.length, bufferToSend);
                bytesSent += bufferData.length;
            }
        };
        self._chain(transferLoop);
        return self;
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

module.exports = Mixin_I2C_Display
