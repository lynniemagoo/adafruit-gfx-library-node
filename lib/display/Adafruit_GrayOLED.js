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
 * Ported to NodeJs by Lyndel R. McGee.
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
      fMin = Math.min,
      fMax = Math.max;



// SOME DEFINES AND STATIC VARIABLES USED INTERNALLY -----------------------

//#define grayoled_swap(a, b)                                                    \
//  (((a) ^= (b)), ((b) ^= (a)), ((a) ^= (b))) ///< No-temp-var swap operation

const GRAYOLED_SETCONTRAST     = 0x81;   ///< Generic contrast for almost all OLEDs
const GRAYOLED_NORMALDISPLAY   = 0xA6;   ///< Generic non-invert for almost all OLEDs
const GRAYOLED_INVERTDISPLAY   = 0xA7;   ///< Generic invert for almost all OLEDs

const MONOOLED_BLACK           = 0;      ///< Default black 'color' for monochrome OLEDS
const MONOOLED_WHITE           = 1;      ///< Default white 'color' for monochrome OLEDS
const MONOOLED_INVERSE         = 2;      ///< Default inversion command for monochrome OLEDS


class Adafruit_GrayOLED extends Display_Base {
    constructor(options) {
        super(options);
        const self = this, WIDTH = self.WIDTH, HEIGHT = self.HEIGHT;

        // This is a bit of a hack for fine-grained control of SPI Mixin.
        // When using SPI Mixin, this display requires that DC GPIO be set low for command data writes.
        // In the original Adafruit implementation, all command data was sent 1 byte at a time using ssd1306_command1.
        // Here, we do this differently and send multiple bytes of data at a time so this flag is necessary.
        self._dcGpioLowForCommandData = true;

        self._bpp = extractOption(self._options, "bpp", 1);
        // allocate our buffer.
        self._buffer = new Uint8Array(toInt(self._bpp * WIDTH * ((HEIGHT + 7) / 8)));
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


    /**************************************************************************/
    /*!
        @brief Issue single command byte to OLED, using I2C or hard/soft SPI as
       needed.
        @param cmd The single byte command
    */
    /**************************************************************************/
    oled_command(cmd) {
        const self = this;
        self.startWrite();
        // use hardware abstraction to write command/data.
        self._hardwareWriteCommand(cmd);
        self.endWrite();
        return self;
    }


    // Issue list of commands to GrayOLED
    /**************************************************************************/
    /*!
        @brief Issue multiple bytes of commands OLED, using I2C or hard/soft SPI as
       needed.
        @param cmdArray
        @returns this
    */
    /**************************************************************************/
    oled_commandList(cmdArray) {
        const self = this,
              l = cmdArray ? cmdArray.length : 0;
        for (let i=0;i < l;i++) {
            self.oled_command(cmdArray[i]);
        }
        return self;
    }


    /**************************************************************************/
    /*!
        @brief Issue multiple bytes of data to OLED, using I2C or hard/soft SPI as
       needed.
        @param dataArray
        @returns this
    */
    /**************************************************************************/
    // non-adafruit implementation - provided for hardware abstraction using mixin.
    oled_data(dataArray) {
        const self = this;
        self.startWrite();
        // use hardware abstraction to write data.
        self._hardwareWriteData(dataArray);
        self.endWrite();
        return self;
    }

    
    // ALLOCATE & INIT / DISPLAY subclasses must override.
    
    
    /**************************************************************************/
    /*!
        @brief  Modified Adafruit startup function - Options are passed in the
                constructor.
        @return  this
    */
    /**************************************************************************/
    begin() {
        throw new Error("Subclasses must override this function!");
    }

    
    /**************************************************************************/
    /*!
        @brief The function that sub-classes define that writes out the buffer to
               the display over I2C or SPI
    */
    /**************************************************************************/
    display() {
        throw new Error("Subclasses must override this function and return 'this'!");
    }


    // DRAWING FUNCTIONS -------------------------------------------------------

    
    /**************************************************************************/
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
    /**************************************************************************/
    getPixel(x, y) {
        const self = this,
              rotation = self.rotation;
              WIDTH = self.WIDTH,
              HEIGHT = self.HEIGHT,
              _bpp = self._bpp;
        if ((x >= 0) && (x < self.width()) && (y >= 0) && (y < self.height())) {
            let t;
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
                case 0:
                default:
                    break;
            }
            if (_bpp === 1) {
                return (buffer[toInt(x + (y / 8) * WIDTH)] & (1 << (y & 7)));
            } else if (_bpp === 4) {
                const value = buffer[toInt(x / 2 + (y * WIDTH / 2))];
                // if x is even, we want left 4 bits.
                return ((x & 1) ? value : (value >>> 4)) & 0x0F;
            }
        }
        return 0x00; // Pixel out of bounds
    }

    
    /**************************************************************************/
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
    /**************************************************************************/
    drawPixel(x, y, color) {
        const self = this,
              rotation = self.rotation,
              WIDTH = self.WIDTH,
              HEIGHT = self.HEIGHT,
              buffer = self._buffer,
              _bpp = self._bpp;
        if ((x >= 0) && (x < self.width()) && (y >= 0) && (y < self.height())) {
            let t;
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
            self.window_x1 = fMin(self.window_x1, x);
            self.window_y1 = fMin(self.window_y1, y);
            self.window_x2 = fMax(self.window_x2, x);
            self.window_y2 = fMax(self.window_y2, y);

            if (_bpp === 1) {
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
            } else if (_bpp === 4) {
                const idx = toInt(x / 2 + (y * WIDTH / 2));
                let value = buffer[idx];
                // odd = right LSN even = left MSN.
                value = (x & 1) ? (value & 0xF0) | (color & 0xF) : (value & 0x0F) | ((color & 0xF) << 4); 
                buffer[idx] = value;
            }
        }
        return self;
    }


    /**************************************************************************/
    // Protected method to clear the dirty window.
    /**************************************************************************/
    _resetDirtyWindow() {
        const self = this, WIDTH = self.WIDTH, HEIGHT = self.HEIGHT;
        // Pick value >= WIDTH/HEIGHT to clear low values.
        self.window_x1 = self.WIDTH;
        self.window_y1 = self.HEIGHT;
        // Pick value < 0 to clear high values
        self.window_x2 = -1;
        self.window_y2 = -1;
        return self;
    }


    /**************************************************************************/
    // Protected method to set the entire window dirty so display() 
    // will write full screen.
    /**************************************************************************/
    _setMaxDirtyWindow() {
        const self = this, WIDTH = self.WIDTH, HEIGHT = self.HEIGHT;
        // Dirty set to (0,0) - (WIDTH - 1, HEIGHT - 1);
        self.window_x1 = 0;
        self.window_y1 = 0;
        self.window_x2 = WIDTH - 1;
        self.window_y2 = HEIGHT - 1;
        return self;
    }


    /**************************************************************************/
    /*!
        @brief  Clear the contents of display buffer. (set all pixels to off.)
                Follow up with a call to display(), or with other graphics
                commands as needed by one's own application.
        @return this
        @note   Changes buffer contents only, no immediate effect on display.
    */
    /**************************************************************************/
    clearDisplay() {
        return this.fillScreen(MONOOLED_BLACK);
    }


    /**************************************************************************/
    /*!
        @brief  Fill the contents of display buffer completely with one color
        @param  color Color to fill with.
        @returns  this
        @note   Changes buffer contents only, no immediate effect on display.
    */
    /**************************************************************************/
    // overrides fillScreen() in Adafruit_GFX base class.
    fillScreen(color) {
        const self = this,
            _bpp = self._bpp,
            buffer = self._buffer;
        if (buffer) {
            // ensure only 8 bits for color to start.
            color &= 0xFF;
            switch(_bpp) {
                case 1:
                    // If we have either MONOOLED_WHITE fill with all 1 bits, otherwise all 0 bits.
                    color = (color & 1) ? 0xFF : 0x00;
                    break;
                case 4:
                    // Allow only colors 0x00 to 0x0F;
                    color = color & 0x0F;
                    // mask the color to 16 colors and duplicate in upper nibble.
                    color = (color << 4) | color;
                    break;
                default:
                    break;
            }
            buffer.fill(color);
            self._setMaxDirtyWindow();
        }
        return self;
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


    /**********************************************************************/
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
    /**********************************************************************/
    invertDisplay(aValue) {
        this.oled_command(!!aValue ? GRAYOLED_INVERTDISPLAY : GRAYOLED_NORMALDISPLAY);
    }


    /**********************************************************************/
    /*!
        @brief  Adjust the display contrast.
        @param  level The contrast level from 0 to 0x7F
        @note   This has an immediate effect on the display, no need to call the
                display() function -- buffer contents are not changed.
    */
    /**********************************************************************/
    setContrast(level) {
        this.oled_commandList([GRAYOLED_SETCONTRAST, level & 0xFF]);
    }
}

module.exports = Adafruit_GrayOLED;