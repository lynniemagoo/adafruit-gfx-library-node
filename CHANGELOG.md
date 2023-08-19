# Changelog

## v1.0.4 2023-08-19

- Updates to account for timing differences with SPI displays requiring support for GPIO settle time.  Settle time is 1ms on DC GPIO transitions.
- Fix issue where startup()/shutdown() on a display returns before IO worker chaining completes.

## v1.0.3 2023-08-13

- Updates to properly support startWrite() endWrite() for use with SPI and I2C transactions if a custom hardware mixin is written and requires them.

## v1.0.2 2023-07-27

- Fix issue where index not calculated properly in Adafruit_GrayOLED.js for displays where bpp = 1.

## v1.0.1 2023-06-10

- Update README.md with practical example and reference to Adafruit-GFX-Library used for port on Github.
- Fix issue where cursorY was not incremented by 6 to adjust the baseline when selecting AdafruitGFX fonts as provided in the original Adafruit implementation.

## v1.0.0 2022-09-13

- First official release
