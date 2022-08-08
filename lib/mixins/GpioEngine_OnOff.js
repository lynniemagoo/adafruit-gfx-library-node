'use strict';
const Gpio = require('onoff').Gpio;

class GpioWrapper {
    constructor(pin, gpioMode, initialValue) {
        this._pin = pin;
        this._gpioMode = gpioMode;
        this._initialValue = initialValue;
        this._gpio = null;
    }

    startup() {
        const pin = this._pin, gpioMode = this._gpioMode, initialValue = this._initialValue;
        let direction = gpioMode;
        if (!(initialValue === undefined)) {
            // we have an initial value.
            direction = !!initialValue ? "high" : "low";
        }
        const gpioOptions = {};
        this._gpio = new Gpio(pin, direction, gpioOptions);
    }

    shutdown() {
       this._gpio && this._gpio.unexport();
       this._gpio = null;
    }

    writeSync(value) {
        this._gpio && this._gpio.writeSync(!!value ? Gpio.HIGH : Gpio.LOW);
    }

    high() {
        this._gpio && this._gpio.writeSync(Gpio.HIGH);
    }

    low() {
        this._gpio && this._gpio.writeSync(Gpio.LOW);
    }
}

class GpioEngine {
    static GPIO_HIGH = Gpio.HIGH;
    static GPIO_LOW = Gpio.LOW;
    static GPIO_MODE_OUTPUT = "out";
    static GPIO_MODE_INPUT = "in";

    constructor() {
        this._started = false;
    }

    startup() {
        // noOp for onoff
        this._started = true;
        return this._started;
    }

    shutdown() {
        // noOp for onoff
        this._started = false;
        return this._started;
    }

    createGpioOut(gpioId, initialValue) {
        return new GpioWrapper(gpioId, "out", initialValue);
    }
}

module.exports = GpioEngine;
