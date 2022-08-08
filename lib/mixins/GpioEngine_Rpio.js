'use strict';
const RpioModule = require('rpio');

class GpioWrapper {
    constructor(pin, gpioMode, initialValue) {
        this._pin = pin;
        this._gpioMode = gpioMode;
        this._initialValue = initialValue;
    }

    startup() {
        const pin = this._pin, gpioMode = this._gpioMode, initialValue = this._initialValue;
        RpioModule.open(pin, gpioMode, initialValue == RpioModule.LOW ? RpioModule.LOW : RpioModule.HIGH);
    }

    shutdown() {
       // noOp for Rpio
    }

    writeSync(value) {
        RpioModule.write(this._pin, value == RpioModule.LOW ? RpioModule.LOW : RpioModule.HIGH);
    }

    high() {
        RpioModule.write(this._pin, RpioModule.HIGH);
    }

    low() {
        RpioModule.write(this._pin, RpioModule.LOW);
    }
}

class GpioEngine {
    static GPIO_HIGH = RpioModule.HIGH;
    static GPIO_LOW = RpioModule.LOW;

    constructor() {
        this._started = false;
    }

    startup() {
        const Rpio_Init_Options = {
            gpiomem: true,          /* Use /dev/gpiomem */
            mapping: 'gpio',        /* Use the GPIO scheme vs physical*/
            mock: undefined,        /* Emulate specific hardware in mock mode */
            close_on_exit:false     /* On node process exit automatically close rpio */
        };
        RpioModule.init(Rpio_Init_Options);
        this._started = true;
        return this._started;
    }

    shutdown() {
        // stop rpio
        this._started && RpioModule.exit();
        this._started = false;
        return this._started;
    }

    createGpioOut(gpioId, initialValue) {
        return new GpioWrapper(gpioId, RpioModule.OUTPUT, initialValue);
    }
}
module.exports = GpioEngine;
