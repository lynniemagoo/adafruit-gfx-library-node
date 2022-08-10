'use strict';
const RpioModule = require('rpio');

class GpioWrapper {
    constructor(pin, gpioMode, initialValue) {
        this._pin = pin;
        this._gpioMode = gpioMode;
        this._initialValue = initialValue;
        this._started = false;
    }

    startup() {
        const pin = this._pin, gpioMode = this._gpioMode, initialValue = this._initialValue;
        RpioModule.open(pin, gpioMode, initialValue == RpioModule.LOW ? RpioModule.LOW : RpioModule.HIGH);
        this._started = true;
        return Promise.resolve(this._started);
    }

    shutdown() {
        // noOp for Rpio
        this._started = false;
        return Promise.resolve(this._started);
    }

    write(value) {
        const self = this;
        return new Promise((resolve,reject) => {
            (self._started) ?  resolve(RpioModule.write(this._pin, value == RpioModule.LOW ? RpioModule.LOW : RpioModule.HIGH)) : reject("Error!  Cannot write to GPIO before it has been started!");
        });    
    }
    
    writeSync(value) {
        const self = this;
        if (this._started) {
            RpioModule.write(this._pin, value == RpioModule.LOW ? RpioModule.LOW : RpioModule.HIGH);
        } else {
            throw new Error("Cannot write to Gpio before it has been started!");
        }
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
        return Promise.resolve(this._started);
    }

    shutdown() {
        // stop rpio
        this._started && RpioModule.exit();
        this._started = false;
        return Promise.resolve(this._started);
    }

    createGpioOut(gpioId, initialValue) {
        return Promise.resolve(new GpioWrapper(gpioId, RpioModule.OUTPUT, initialValue));
    }
}
module.exports = GpioEngine;
