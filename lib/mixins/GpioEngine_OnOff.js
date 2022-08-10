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
        return Promise.resolve(!!this._gpio);
    }

    shutdown() {
       this._gpio && this._gpio.unexport();
       this._gpio = null;
       return Promise.resolve(!!this._gpio);
    }

    write(value) {
        const gpio = this._gpio;
        return (gpio) ? gpio.write(!!value ? Gpio.HIGH : Gpio.LOW) : Promise.reject("Error!  Cannot write to GPIO before it has been started!");
    }

    writeSync(value) {
        const gpio = this._gpio;
        if (gpio) {
            gpio.writeSync(!!value ? Gpio.HIGH : Gpio.LOW);
        } else {
            throw new Error("Cannot write to Gpio before it has been started!");
        }
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
        return Promise.resolve(this._started);
    }

    shutdown() {
        // noOp for onoff
        this._started = false;
        Promise.resolve(this._started);
    }

    createGpioOut(gpioId, initialValue) {
        return Promise.resolve(new GpioWrapper(gpioId, "out", initialValue));
    }
}

module.exports = GpioEngine;
