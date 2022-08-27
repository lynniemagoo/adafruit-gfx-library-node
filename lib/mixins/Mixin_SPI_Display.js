'use strict';
//===============================================================
// No Adafruit equivalent
//===============================================================
const Spi = require('spi-device');
const GpioEngine = require("./GpioEngine_OnOff");
const GPIO_HIGH = GpioEngine.GPIO_HIGH;
const GPIO_LOW = GpioEngine.GPIO_LOW;

const UTILS_BASE = "../utils/";

const CommonUtilsModule = require (UTILS_BASE + "CommonUtils.js");
const sleepMs = CommonUtilsModule.sleepMs;
const extractOption = CommonUtilsModule.extractOption;

const DEFAULT_RESET_GPIO = 25;
const DEFAULT_DC_GPIO = 24;

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
        _debug && console.log("SPI_Display_Mixin::constructor() begin");
        self._rstGpioId = extractOption(self._options, "rstGpioNb", DEFAULT_RESET_GPIO);
        self._dcGpioId = extractOption(self._options, "dcGpioNb", DEFAULT_DC_GPIO);

        self._gpioEngine = new GpioEngine();

        self._spiBusNumber = extractOption(self._options, "spiBusNumber", BUS_NUMBER_DEFAULT);
        self._spiDeviceNumber = extractOption(self._options, "spiDeviceNumber", DEVICE_NUMBER_DEFAULT);
        self._spiMode = _validateSPIMode(extractOption(self._options, "spiMode", MODE_DEFAULT));

        self._spiMaxSpeedHz = extractOption(self._options, "spiMaxSpeedHz", SPEED_DEFAULT);
        _debug && console.log("SPI_Display_Mixin::constructor() completed");
    }


    _hardwareStartup() {
        const self = this, gpioEngine = self._gpioEngine;
        _debug && console.log("SPI_Display_Mixin::_hardwareStartup()");
        const doWork = async _ => {
            if ((undefined === self._rstGpio) && (self._rstGpioId >= 0)) {
                await gpioEngine.startup();
                // Initialize with high value.
                self._rstGpio = await gpioEngine.createGpioOut(self._rstGpioId, GPIO_HIGH);
                self._rstGpio && await self._rstGpio.startup();
            }
            if ((undefined === self._dcGpio) && (self._dcGpioId >= 0)) {
                await gpioEngine.startup();
                // Initialize with high value.
                self._dcGpio = await gpioEngine.createGpioOut(self._dcGpioId, GPIO_HIGH);
                self._dcGpio && await self._dcGpio.startup();
            }
            if (undefined === self._spiConnection) {
                _debug && console.log("bus:%d dev:%d speed:%d", self._spiBusNumber, self._spiDeviceNumber, self._spiMaxSpeedHz);
                self._spiConnection = await openSpiConnection(self._spiBusNumber, self._spiDeviceNumber, self._spiMode, self._spiMaxSpeedHz);
                _debug && console.log("options:%o", await self._spiConnection.getOptionsSync());
            }
        };
        self._chain(doWork);
        _debug && console.log("SPI_Display_Mixin::_hardwareStartup() completed");
        return self;
    }


    _hardwareReset() {
        _debug && console.log("SPI_Display_Mixin::_hardwareReset()");
        const self = this;
        if (self._rstGpio) {
            const doWork = async _ => {
                await gpioHardwareReset_101(self._rstGpio);
            };
            self._chain(doWork);
        }
        _debug && console.log("SPI_Display_Mixin::_hardwareReset() completed");
        return self;
    }


    _hardwareShutdown() {
        const self = this, gpioEngine = self._gpioEngine;
        _debug && console.log("SPI_Display_Mixin::_hardwareShutdown()");
        const doWork = async _ => {
            if (self._spiConnection) {
                closeSpiConnection(self._spiConnection);
                self._spiConnection = null;
            }
            //Disconnect Gpio pins
            if (self._rstGpio) {
                await self._rstGpio.shutdown();
                self._rstGpio = undefined;
            }
            if (self._dcGpio) {
                await self._dcGpio.shutdown();
                self._dcGpio = undefined;
            }
            await gpioEngine.shutdown();
        };
        self._chain(doWork);
        _debug && console.log("SPI_Display_Mixin::_hardwareShutdown() completed");
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
            dcGpio && await dcGpio.writeSync(GPIO_LOW);
            await sendSpiBytes(spiConnection, [command]);
            if (data && data.length) {
                !dcGpioLowForCommandData && dcGpio && await dcGpio.writeSync(GPIO_HIGH);
                await sendSpiBytes(spiConnection,  data);
            }
            // Ensure DC Line back to 1 if left low.
            dcGpio && await dcGpio.writeSync(GPIO_HIGH);
        };
        self._chain(doWork);
        return self;
    }


    _hardwareWriteData(data) {
        const self = this;
        const doWork = async _ => {
            const spiConnection = self._spiConnection, dcGpio = self._dcGpio;
            //_debug && console.log("SPI_Display_Mixin::_hardwareWriteData data:%o", data.map(e => "0x" + ("00" +  e.toString(16)).substr(-2).toUpperCase()));
            // set dcGpio High to indicate data write.
            dcGpio && await dcGpio.writeSync(GPIO_HIGH);
            await sendSpiBytes(spiConnection, data);
        };
        self._chain(doWork);
        return self;
    }


    // sometimes the hardware gets a bit busy with lots of bytes.
    // Read the response byte to see if this is the case
    _hardwareWaitReady() {
        _debug && console.log("SPI_Display_Mixin::_hardwareWaitReady()");
        return true;
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

async function _sendSpiBlock(spiConnection, arrOrBuffer) {
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
        const forLoop = async _ => {
            for (let i = 0; i < data.length; i = i + 4096) {
                const dataToSend = Buffer.from(data.slice(i, i + 4096))
                await _sendSpiBlock(spiConnection, dataToSend);
            }
        };
        await forLoop();
    }
    Promise.resolve(true);
}

async function gpioHardwareReset_101(gpio) {
    const resetMs = 100;
    if (gpio) {
        await gpio.writeSync(GPIO_HIGH);
        await sleepMs(resetMs);
        await gpio.writeSync(GPIO_LOW);
        await sleepMs(resetMs);
        await gpio.writeSync(GPIO_HIGH);
        await sleepMs(resetMs);
    }
}

module.exports = {Mixin_SPI_Display, SPI_MODES, SPI_DEFAULTS};
