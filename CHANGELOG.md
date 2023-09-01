# Changelog

## v1.0.6 2023-08-27

- Cosmetic changes to I2C and SPI Mixins following analysis of nested start/endWrite calls.
  The changes have no impact on current implementations but users wanting to implement their
  own custom SPI or I2C implementations should review comments in the Mixins.
- Comment added to Adafruit_SPITFT and AdafruitGrayOLED.js regarding differences between the
  Adafruit CPP libraries and the Javascript implementation provided here.
- Adafruit_GFX.js updated to remove nested call to startWrite/endWrite in fillRoundRect().

## v1.0.5 2023-08-19

- Remove sleepMs(1) and replace with promisified nextTick.
- Revert change from 1.0.4 
- Fix issue where startup()/shutdown() on a display returns before IO worker chaining completes.

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
