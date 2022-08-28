/*!
 * @file Adafruit_GrayOLED.cpp
 *
 * This is documentation for Adafruit's generic library for grayscale
 * OLED displays: http://www.adafruit.com/category/63_98
 *
 * These displays use I2C or SPI to communicate. I2C requires 2 pins
 * (SCL+SDA) and optionally a RESET pin. SPI requires 4 pins (MOSI, SCK,
 * select, data/command) and optionally a reset pin. Hardware SPI or
 * 'bitbang' software SPI are both supported.
 *
 * Adafruit invests time and resources providing this open source code,
 * please support Adafruit and open-source hardware by purchasing
 * products from Adafruit!
 *
 * @section author Author
 *
 * Written by Limor Fried/Ladyada for Adafruit Industries, with
 * contributions from the open source community.
 *
 * Ported to NodeJs by Lyndel McGee.
 *
 * @section license License
 *
 * BSD license, all text above, and the splash screen included below,
 * must be included in any redistribution.
 *
 *
 */

'use strict';
const DISPLAY_LOCATION = "./";
const UTILS_LOCATION = "../utils/";

const Display_Base = require(DISPLAY_LOCATION + "Display_Base.js");
const extractOption = require (UTILS_LOCATION + "CommonUtils.js").extractOption;

const os = require('os');
const LE = ("LE" === os.endianness());

const toInt = Math.trunc,
      fmin = Math.min,
      fmax = Math.max;



// SOME DEFINES AND STATIC VARIABLES USED INTERNALLY -----------------------

//#define grayoled_swap(a, b)                                                    \
//  (((a) ^= (b)), ((b) ^= (a)), ((a) ^= (b))) ///< No-temp-var swap operation

const GRAYOLED_SETCONTRAST     = 0x81;   ///< Generic contrast for almost all OLEDs
const GRAYOLED_NORMALDISPLAY   = 0xA6;   ///< Generic non-invert for almost all OLEDs
const GRAYOLED_INVERTDISPLAY   = 0xA7;   ///< Generic invert for almost all OLEDs

const MONOOLED_BLACK           = 0;      ///< Default black 'color' for monochrome OLEDS
const MONOOLED_WHITE           = 1;      ///< Default white 'color' for monochrome OLEDS
const MONOOLED_INVERSE         = 2;      ///< Default inversion command for monochrome OLEDS


/*!
    @brief  Constructor for I2C-interfaced OLED displays.
    @param  bpp Bits per pixel, 1 for monochrome, 4 for 16-gray
    @param  w
            Display width in pixels
    @param  h
            Display height in pixels
    @param  twi
            Pointer to an existing TwoWire instance (e.g. &Wire, the
            microcontroller's primary I2C bus).
    @param  rst_pin
            Reset pin (using Arduino pin numbering), or -1 if not used
            (some displays might be wired to share the microcontroller's
            reset pin).
    @param  clkDuring
            Speed (in Hz) for Wire transmissions in library calls.
            Defaults to 400000 (400 KHz), a known 'safe' value for most
            microcontrollers, and meets the OLED datasheet spec.
            Some systems can operate I2C faster (800 KHz for ESP32, 1 MHz
            for many other 32-bit MCUs), and some (perhaps not all)
            Many OLED's can work with this -- so it's optionally be specified
            here and is not a default behavior. (Ignored if using pre-1.5.7
            Arduino software, which operates I2C at a fixed 100 KHz.)
    @param  clkAfter
            Speed (in Hz) for Wire transmissions following library
            calls. Defaults to 100000 (100 KHz), the default Arduino Wire
            speed. This is done rather than leaving it at the 'during' speed
            because other devices on the I2C bus might not be compatible
            with the faster rate. (Ignored if using pre-1.5.7 Arduino
            software, which operates I2C at a fixed 100 KHz.)
    @note   Call the object's begin() function before use -- buffer
            allocation is performed there!
*/

class Adafruit_GrayOLED_I2C extends Display_Base {
    constructor(options) {
        super(options);
        const self = this, WIDTH = self.WIDTH, HEIGHT = self.HEIGHT;

        // This is a bit of a hack for fine-grained control of SPI Mixin.
        // When using SPI Mixin, this display requires that DC GPIO be set low for command data writes.
        // In the original Adafruit implementation, all command data was sent 1 byte at a time using ssd1306_command1.
        // Here, we do this differently and send multiple bytes of data at a time so this flag is necessary.
        self._dcGpioLowForCommandData = true;

        self._bpp = extractOption(self._options, "bpp", 1);
        // allocate our buffer and clear it.
        const buffer = new Uint8Array(toInt(self._bpp * WIDTH * ((HEIGHT + 7) / 8)));
        buffer.fill(0x00);
        self._buffer = buffer;
    }

    //===============================================================
    // <BEGIN> NON - Adafruit implementations
    //               Startup/Shutdown Invocation Order - See Display_Base class
    //
    //               _preStartup
    //               begin()
    //               _postStartup (turn off display or other things)
    //
    //               _preShutdown
    //               // currently nothing defined for middle.
    //               _postShutdown
    //===============================================================
    _preStartup() {
        const self = this;
        self._hardwareStartup();   // (setup SPI, I2C)
        self._hardwareReset();     // (hardware reset for SPI, I2C if specified)
        return self;
    }


    _postStartup() {
        return this;
    }


    _preShutdown() {
        const self = this;
        return self;
    }


    _postShutdown() {
        const self = this;
        self._hardwareShutdown(); // (release SPI, I2C hardware)
        return self;
    }
    //===============================================================
    // <END> NON - Adafruit implementations
    //===============================================================

    // LOW-LEVEL UTILS ---------------------------------------------------------

    /*!
        @brief Issue single command byte to OLED, using I2C or hard/soft SPI as
       needed.
        @param c The single byte command
    */
    oled_command(cmd) {
        const self = this;
        self.startWrite();
        // use hardware abstraction to write command/data.
        self._hardwareWriteCommand(cmd);
        self.endWrite();
        return self;
    }


    // Issue list of commands to GrayOLED
    /*!
        @brief Issue multiple bytes of commands OLED, using I2C or hard/soft SPI as
       needed.
        @param cmdArray
        @returns this
    */
    oled_commandList(cmdArray) {
        const self = this,
              l = cmdArray ? cmdArray.length : 0;
        for (let i=0;i < l;i++) {
            self.oled_command(cmdArray[i]);
        }
        return self;
    }


    // non-adafruit implementation - provided for hardware abstraction using mixin.
    oled_data(data) {
        const self = this;
        self.startWrite();
        // use hardware abstraction to write data.
        self._hardwareWriteData(self._buffer);
        self.endWrite();
        return self;
    }

    /*!
        @brief The function that sub-classes define that writes out the buffer to
               the display over I2C or SPI
    */
    display() {
        throw new Error("Subclasses must override this function!");
    }


    // ALLOCATE & INIT DISPLAY -------------------------------------------------
    /**************************************************************************/
    /*!
        @brief  Modified Adafruit startup function - Options are passed in the
                constructor.
        @return  this
    */
    /**************************************************************************/
    begin() {
        const self = this, WIDTH = self.WIDTH, HEIGHT = self.HEIGHT;
        let ret = false;

        self.clearDisplay();

        // set max dirty window
        self.window_x1 = 0;
        self.window_y1 = 0;
        self.window_x2 = WIDTH - 1;
        self.window_y2 = HEIGHT - 1;

        return self;
    }



    // DRAWING FUNCTIONS -------------------------------------------------------

    /*!
        @brief  Set/clear/invert a single pixel. This is also invoked by the
                Adafruit_GFX library in generating many higher-level graphics
                primitives.
        @param  x
                Column of display -- 0 at left to (screen width - 1) at right.
        @param  y
                Row of display -- 0 at top to (screen height -1) at bottom.
        @param  color
                Pixel color, one of: MONOOLED_BLACK, MONOOLED_WHITE or
       MONOOLED_INVERT.
        @note   Changes buffer contents only, no immediate effect on display.
                Follow up with a call to display(), or with other graphics
                commands as needed by one's own application.
    */
    drawPixel(x, y, color) {
        const self = this,
              rotation = self.rotation;
              WIDTH = self.WIDTH,
              HEIGHT = self.HEIGHT,
              _bpp = self._bpp;
        let t;
        if ((x >= 0) && (x < self.width()) && (y >= 0) && (y < self.height())) {
            // Pixel is in-bounds. Rotate coordinates if needed.
            switch (rotation) {
                case 1:
                    //grayoled_swap(x, y);
                    (t = x, x = y, y = t);
                    x = WIDTH - x - 1;
                    break;
                case 2:
                    x = WIDTH - x - 1;
                    y = HEIGHT - y - 1;
                    break;
                case 3:
                    //grayoled_swap(x, y);
                    (t = x, x = y, y = t);
                    y = HEIGHT - y - 1;
                    break;
            }

            // adjust dirty window
            self.window_x1 = fmin(self.window_x1, x);
            self.window_y1 = fmin(self.window_y1, y);
            self.window_x2 = fmax(self.window_x2, x);
            self.window_y2 = fmax(self.window_y2, y);

            if (_bpp == 1) {
                const idx = toInt(x + (y / 8) * WIDTH);
                const value = (1 << (y & 7));
                switch (color) {
                    case MONOOLED_WHITE:
                        buffer[idx] = buffer[idx] | value;
                        break;
                    case MONOOLED_BLACK:
                        buffer[idx] = buffer[idx] & ~value;
                        break;
                    case MONOOLED_INVERSE:
                        buffer[idx] = buffer[idx] ^value;
                        break;
              }
            } else if (_bpp == 4) {
                const idx = toInt(x / 2 + (y * WIDTH / 2));
                const value = buffer[idx];
                // Serial.printf("(%d, %d) -> offset %d\n", x, y, x/2 + (y * WIDTH / 2));
                if (x % 2 == 0) { // even, left nibble
                    t = value & 0x0F;
                    t |= (color & 0xF) << 4;
                    buffer[idx] = t;
                } else { // odd, right lower nibble
                    t = value & 0xF0;
                    t |= color & 0xF;
                    buffer[idx] = t;
                }
            }
        }
        return self;
    }

    /*!
        @brief  Clear contents of display buffer (set all pixels to off).
        @note   Changes buffer contents only, no immediate effect on display.
                Follow up with a call to display(), or with other graphics
                commands as needed by one's own application.
    */
    clearDisplay() {
        const self = this, WIDTH = self.WIDTH, HEIGHT = self.HEIGHT;
        self._buffer.fill(0x00);
        // set max dirty window
        self.window_x1 = 0;
        self.window_y1 = 0;
        self.window_x2 = WIDTH - 1;
        self.window_y2 = HEIGHT - 1;
    }

    /*!
        @brief  Return color of a single pixel in display buffer.
        @param  x
                Column of display -- 0 at left to (screen width - 1) at right.
        @param  y
                Row of display -- 0 at top to (screen height -1) at bottom.
        @return true if pixel is set (usually MONOOLED_WHITE, unless display invert
       mode is enabled), false if clear (MONOOLED_BLACK).
        @note   Reads from buffer contents; may not reflect current contents of
                screen if display() has not been called.
    */
    getPixel(x, y) {
        const self = this,
              rotation = self.rotation;
              WIDTH = self.WIDTH,
              HEIGHT = self.HEIGHT,
              _bpp = self._bpp;
        let t;
        if ((x >= 0) && (x < self.width()) && (y >= 0) && (y < self.height())) {
            // Pixel is in-bounds. Rotate coordinates if needed.
            switch (rotation) {
                case 1:
                    //grayoled_swap(x, y);
                    (t = x, x = y, y = t);
                    x = WIDTH - x - 1;
                    break;
                case 2:
                    x = WIDTH - x - 1;
                    y = HEIGHT - y - 1;
                    break;
                case 3:
                    //grayoled_swap(x, y);
                    (t = x, x = y, y = t);
                    y = HEIGHT - y - 1;
                    break;
            }
            const bufferIdx = toInt(x + (y / 8) * WIDTH);
            return (buffer[bufferIdx] & (1 << (y & 7)));
        }
        return false; // Pixel out of bounds
    }

    /**********************************************************************/
    /*!
        @brief    Get a reference to the internal buffer memory
        @returns  A reference to the Uint8Array buffer
    */
    /**********************************************************************/
    getBuffer(){
        return this._buffer;
    }

    /*!
        @brief  Enable or disable display invert mode (white-on-black vs
                black-on-white). Handy for testing!
        @param  i
                If true, switch to invert mode (black-on-white), else normal
                mode (white-on-black).
        @note   This has an immediate effect on the display, no need to call the
                display() function -- buffer contents are not changed, rather a
                different pixel mode of the display hardware is used. When
                enabled, drawing MONOOLED_BLACK (value 0) pixels will actually draw
       white, MONOOLED_WHITE (value 1) will draw black.
    */
    invertDisplay(aValue) {
        this.oled_command(!!aValue ? GRAYOLED_INVERTDISPLAY : GRAYOLED_NORMALDISPLAY);
    }

    /*!
        @brief  Adjust the display contrast.
        @param  level The contrast level from 0 to 0x7F
        @note   This has an immediate effect on the display, no need to call the
                display() function -- buffer contents are not changed.
    */
    setContrast(level) {
        this.oled_commandList([GRAYOLED_SETCONTRAST, level & 0xFF]);
    }
}