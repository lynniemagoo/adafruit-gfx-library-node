'use strict';
//===============================================================
// No Adafruit equivalent
//===============================================================
const {Gpio} = require('onoff');
const Spi = require('spi-device');
const GPIO_HIGH = Gpio.HIGH;
const GPIO_LOW = Gpio.LOW;

const UTILS_BASE = "../utils/";
const {sleepMs, extractOption}  = require (UTILS_BASE + "CommonUtils.js");
const nextTick = () => new Promise(r => process.nextTick(r));
const DEFAULT_RESET_GPIO = -1;
const DEFAULT_DC_GPIO = -1;

const BUS_NUMBER_DEFAULT = 0;
const DEVICE_NUMBER_DEFAULT = 0;
const MODE_DEFAULT = Spi.MODE0;
const SPEED_DEFAULT = 60000000;

const SPI_MODES = Object.freeze({
    "MODE0":Spi.MODE0,
    "MODE1":Spi.MODE1,
    "MODE2":Spi.MODE2,
    "MODE3":Spi.MODE3,
});

const SPI_DEFAULTS = Object.freeze({
    "rstGpioNb":DEFAULT_RESET_GPIO,
    "dcGpioNb":DEFAULT_DC_GPIO,
    "spiBusNumber":BUS_NUMBER_DEFAULT,
    "spiDeviceNumber":BUS_NUMBER_DEFAULT,
    "spiMode":MODE_DEFAULT,
    "spiMaxSpeedHz":SPEED_DEFAULT
});


const _debug = false;
const _debug_lifecycle = false;

function _validateSPIMode(spiMode) {
    switch(spiMode) {
        case Spi.MODE0:
        case Spi.MODE1:
        case Spi.MODE2:
        case Spi.MODE3:
            return spiMode;
        default:
            throw new Error("Invalid spiMode");
    }
}

const Mixin_SPI_Display = Base => class extends Base {

    constructor(options) {
        super(options);
        const self = this;
        _debug_lifecycle && console.log("SPI_Display_Mixin::constructor() begin");
        self._rstGpioId = extractOption(self._options, "rstGpioNb", DEFAULT_RESET_GPIO);
        self._dcGpioId = extractOption(self._options, "dcGpioNb", DEFAULT_DC_GPIO);
        self._rstGpio = undefined;
        self._dcGpio = undefined;

        self._spiBusNumber = extractOption(self._options, "spiBusNumber", BUS_NUMBER_DEFAULT);
        self._spiDeviceNumber = extractOption(self._options, "spiDeviceNumber", DEVICE_NUMBER_DEFAULT);
        self._spiMode = _validateSPIMode(extractOption(self._options, "spiMode", MODE_DEFAULT));

        self._spiMaxSpeedHz = extractOption(self._options, "spiMaxSpeedHz", SPEED_DEFAULT);
        _debug_lifecycle && console.log("SPI_Display_Mixin::constructor() completed");
    }


    _hardwareStartup() {
        const self = this;
        const doWork = async _ => {
            _debug_lifecycle && console.log("SPI_Display_Mixin::_hardwareStartup()");
            if ((undefined === self._rstGpio) && (self._rstGpioId >= 0)) {
                // Initialize with high value.
                self._rstGpio = initGpioOut(self._rstGpioId);
                self._rstGpio.writeSync(GPIO_HIGH);
            }
            if ((undefined === self._dcGpio) && (self._dcGpioId >= 0)) {
                // Initialize with high value.
                self._dcGpio = initGpioOut(self._dcGpioId);
                self._dcGpio.writeSync(GPIO_HIGH);
            }
            if (undefined === self._spiConnection) {
                _debug_lifecycle && console.log("bus:%d dev:%d speed:%d", self._spiBusNumber, self._spiDeviceNumber, self._spiMaxSpeedHz);
                self._spiConnection = await openSpiConnection(self._spiBusNumber, self._spiDeviceNumber, self._spiMode, self._spiMaxSpeedHz);
                _debug_lifecycle && console.log("options:%o", await self._spiConnection.getOptionsSync());
            }
            _debug_lifecycle && console.log("SPI_Display_Mixin::_hardwareStartup() completed");
        };
        self._chain(doWork);
        return self;
    }


    _hardwareReset() {
        const self = this;
        if (self._rstGpio) {
            const doWork = async _ => {
                _debug_lifecycle && console.log("SPI_Display_Mixin::_hardwareReset()");
                await gpioHardwareReset_101(self._rstGpio);
                _debug_lifecycle && console.log("SPI_Display_Mixin::_hardwareReset() completed");
            };
            self._chain(doWork);
        }
        return self;
    }


    _hardwareShutdown() {
        const self = this;
        const doWork = async _ => {
            _debug_lifecycle && console.log("SPI_Display_Mixin::_hardwareShutdown()");
            if (self._spiConnection) {
                closeSpiConnection(self._spiConnection);
                self._spiConnection = null;
            }
            //Disconnect Gpio pins
            if (self._rstGpio) {
                unexportGpio(self._rstGpio);
                self._rstGpio = undefined;
            }
            if (self._dcGpio) {
                unexportGpio(self._dcGpio);
                self._dcGpio = undefined;
            }
            _debug_lifecycle && console.log("SPI_Display_Mixin::_hardwareShutdown() completed");
        };
        self._chain(doWork);
        return self;
    }


    _hardwareWriteCommand(command, data) {
        const self = this;
        const doWork = async _ => {
            // SSD1306 SPI interface and possibly others require that DC Gpio be set to low when sending data as part of a command.
            const spiConnection = self._spiConnection, dcGpio = self._dcGpio, dcGpioLowForCommandData = !!self._dcGpioLowForCommandData;
            if (_debug) {
                if (data) {
                    console.log("SPI_Display_Mixin::_hardwareWriteCommand command:%s dataLen:%o", "0x" + ("00" + command.toString(16)).substr(-2).toUpperCase(),"0x" + ("00000000" + data.length.toString(16)).substr(-8).toUpperCase());
                    //console.log("SPI_Display_Mixin::_hardwareWriteCommand command:%s data:%o", "0x" + ("00" + command.toString(16)).substr(-2).toUpperCase(), data.map(e => "0x" + ("00" +  e.toString(16)).substr(-2).toUpperCase()));
                } else {
                    console.log("SPI_Display_Mixin::_hardwareWriteCommand command:%s", "0x" + ("00" + command.toString(16)).substr(-2).toUpperCase());
                }
            }
            await gpioTransition(dcGpio, GPIO_LOW);
            await sendSpiBytes(spiConnection, [command]);

            if (data && data.length) {
                if (!dcGpioLowForCommandData) {
                    await gpioTransition(dcGpio, GPIO_HIGH);
                }
                await sendSpiBytes(spiConnection,  data);
            }
            await gpioTransition(dcGpio, GPIO_HIGH);
        };
        self._chain(doWork);
        return self;
    }


    _hardwareWriteData(data) {
        const self = this;
        const doWork = async _ => {
            const spiConnection = self._spiConnection, dcGpio = self._dcGpio;
            //_debug && console.log("SPI_Display_Mixin::_hardwareWriteData data:%o", data.map(e => "0x" + ("00" +  e.toString(16)).substr(-2).toUpperCase()));
            await gpioTransition(dcGpio, GPIO_HIGH);
            await sendSpiBytes(spiConnection, data);
        };
        self._chain(doWork);
        return self;
    }


    // sometimes the hardware gets a bit busy with lots of bytes.
    // Read the response byte to see if this is the case
    _hardwareWaitReady() {
        _debug && console.log("SPI_Display_Mixin::_hardwareWaitReady()");
        return Promise.resolve(true);
    }


    /**********************************************************************/
    /*!
        @brief  Call before issuing command(s) or data to display. Performs
                chip-select (if required) and starts an SPI transaction (if
                using hardware SPI and transactions are supported). Required
                for all display types; not an SPI-specific function.
    */
    /**********************************************************************/
    startWrite() {
        /* Should someone implement another mixin that requires transactions,
           this is how you should implement to guarantee that whatever task is
           required is chained.
        */
        /*
        const self = this;
        const doWork = async _ => {
            super.startWrite();
        };
        self._chain(doWork);
        */
    }


    /**********************************************************************/
    /*!
        @brief  Call after issuing command(s) or data to display. Performs
                chip-deselect (if required) and ends an SPI transaction (if
                using hardware SPI and transactions are supported). Required
                for all display types; not an SPI-specific function.
    */
    /**********************************************************************/
    endWrite() {
        /* Should someone implement another mixin that requires transactions,
           this is how you should implement to guarantee that whatever task is
           required is chained.
        */
        /*
        const self = this;
        const doWork = async _ => {
            super.endWrite();
        };
        self._chain(doWork);
        */
    }
};

function openSpiConnection(busNumber, deviceNumber, mode, maxSpeedHz) {
    const spiConnection = Spi.openSync(busNumber, deviceNumber, {
        "mode": mode,
        "maxSpeedHz": maxSpeedHz
    });
    return spiConnection;
}

function closeSpiConnection(spiConnection) {
    if (spiConnection) {
        spiConnection.closeSync();
    }
    return null;
}

function _sendSpiBlock(spiConnection, arrOrBuffer) {
    return new Promise((resolve, reject) => {
        const bufferToSend = Buffer.isBuffer(arrOrBuffer) ? arrOrBuffer : Buffer.from(arrOrBuffer);
        const message = [{
            sendBuffer: bufferToSend,
            byteLength: bufferToSend.length
        }];
        spiConnection.transfer(message, function (err) {
            if (err) {
                console.error(err);
                reject(err);
            } else {
                resolve(true);
            }
        });
    });
}

async function sendSpiBytes(spiConnection, data = []) {
    if (data && data.length) {
        const fullBuffer = Buffer.from(data);
        for (let i = 0; i < fullBuffer.length; i += 4096) {
            const dataToSend = fullBuffer.subarray(i, i + 4096);
            await _sendSpiBlock(spiConnection, dataToSend);
        }
    }
    return true;
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

async function gpioTransition(gpio, newState) {
    if (gpio) {
        if (gpio.readSync() !== newState) {
            gpio.writeSync(newState);
            // 20230819 - Bugfix - allow a process tick time for GPIO change to take effect.
            await nextTick();
        }
        return newState;
    } else {
        return Promise.resolve(newState);
    }
}

async function gpioHardwareReset_101(gpio) {
    const resetMs = 150;
    if (gpio) {
        _debug_lifecycle && console.log("gpioHardwareReset_101 execute!");
        await _gpioTransition(gpio, GPIO_HIGH);
        await sleepMs(resetMs);
        await _gpioTransition(gpio, GPIO_LOW);
        await sleepMs(resetMs);
        await _gpioTransition(gpio, GPIO_HIGH);
        await sleepMs(resetMs);
    }
}


module.exports = {Mixin_SPI_Display, SPI_MODES, SPI_DEFAULTS};
