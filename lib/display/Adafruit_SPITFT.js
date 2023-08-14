/*!
 * @file Adafruit_SPITFT.cpp
 *
 * @mainpage Adafruit SPI TFT Displays (and some others)
 *
 * @section intro_sec Introduction
 *
 * Part of Adafruit's GFX graphics library. Originally this class was
 * written to handle a range of color TFT displays connected via SPI,
 * but over time this library and some display-specific subclasses have
 * mutated to include some color OLEDs as well as parallel-interfaced
 * displays. The name's been kept for the sake of older code.
 *
 * Adafruit invests time and resources providing this open source code,
 * please support Adafruit and open-source hardware by purchasing
 * products from Adafruit!

 * @section dependencies Dependencies
 *
 * This library depends on <a href="https://github.com/adafruit/Adafruit_GFX">
 * Adafruit_GFX</a> being present on your system. Please make sure you have
 * installed the latest version before using this library.
 *
 * @section author Author
 *
 * Written by Limor "ladyada" Fried for Adafruit Industries,
 * with contributions from the open source community.
 *
 * Ported to NodeJs by Lyndel R. McGee.
 *
 * @section license License
 *
 * BSD license, all text here must be included in any redistribution.
 */

'use strict';
const DISPLAY_LOCATION = "./";
const MIXINS_LOCATION = "../mixins/";
const UTILS_LOCATION = "../utils/";

const Display_Base = require(DISPLAY_LOCATION + "Display_Base.js");
const {Mixin_SPI_Display, SPI_MODES, SPI_DEFAULTS} = require(MIXINS_LOCATION + "Mixin_SPI_Display.js");
const extractOption = require (UTILS_LOCATION + "CommonUtils.js").extractOption;

const os = require('os');
const LE = ("LE" === os.endianness());

// set this flag to true if need to debug something.
const _debug = false;
class Adafruit_SPITFT extends Mixin_SPI_Display(Display_Base) {

    constructor(options) {
        super(options);
        const self = this;
        self._xstart = 0;
        self._ystart = 0;
        self._reverseInversionMode = extractOption(self._options, "reverseInversionMode", false);
        self._reverseColorOrder = extractOption(self._options, "reverseColorOrder", false);
        self.invertOnCommand = 0;
        self.invertOffCommand = 0;
    }


    //===============================================================
    // <BEGIN> NON - Adafruit exact implementations
    //===============================================================
    _preStartup() {
        const self = this;
        self._hardwareStartup();
        self._hardwareReset();
        return self;
    }


    _postStartup() {
        return this;
    }


    _preShutdown() {
        return this;
    }


    _postShutdown() {
        const self = this;
        self._hardwareShutdown();
        return self;
    }

    //===============================================================
    // <END> NON - Adafruit exact implementations
    //===============================================================


    begin() {
        return Promise.reject("Subclasses must implement this method.");
    }


    /**********************************************************************/
    /*!
        @brief   Adafruit_SPITFT Send Command handles complete sending of commands and
        data
        @param   commandByte       The Command Byte
        @param   dataBytes         Array of Data bytes to send
        @param   numDataBytes      The number of bytes we should send
    */
    /**********************************************************************/
    sendCommand(cmd, data) {
        const self = this;
        if (_debug) {
            if (data) {
                console.log("Adafruit_SPITFT::sendCommand cmd:%o data:%o", "0x" + ("00" + cmd.toString(16)).substr(-2).toUpperCase(), data.map(e => "0x" + ("00" +  e.toString(16)).substr(-2).toUpperCase()));
            } else {
                console.log("Adafruit_SPITFT::sendCommand cmd:%o", "0x" + ("00" + cmd.toString(16)).substr(-2).toUpperCase());
            }
        }
        self._hardwareWriteCommand(cmd, data);
        return self;
    }


    /**********************************************************************/
    /*!
        @brief   sendData - send data block to SPI.
        @param   data   Array of Data bytes to send
        @return this
    */
    /**********************************************************************/
    sendData(data) {
        const self = this;
        if (_debug) {
            if (data) {
                //console.log("Adafruit_SPITFT::sendData data:%o", data.map(e => "0x" + ("00" +  e.toString(16)).substr(-2).toUpperCase()));
            }
        }
        self._hardwareWriteData(data);
        return self;
    }

    //===============================================================
    // <END> NON - Adafruit exact implementations
    //===============================================================


    /**********************************************************************/
    /*!
        @brief  Write a single command byte to the display. Chip-select and
                transaction must have been previously set -- this ONLY sets
                the device to COMMAND mode, issues the byte and then restores
                DATA mode. There is no corresponding explicit writeData()
                function -- just use spiWrite().
        @param  cmd  8-bit command to write.
        @return this
    */
    /**********************************************************************/
    writeCommand(cmd) {
        const self = this;
        _debug && console.log("Adafruit_SPITFT::writeCommand cmd:%s", "0x"+ ("00" + cmd.toString(16)).substr(-2).toUpperCase());
        self._hardwareWriteCommand(cmd);
        //const self = this;
        //self.SPI_DC_LOW();
        //self.spiWrite(cmd);
        //self.SPI_DC_HIGH();
        return self;
    }


    /**********************************************************************/
    /*!
        @brief  Issue a series of pixels, all the same color. Not self-
                contained; should follow startWrite() and setAddrWindow() calls.
        @param  color  16-bit pixel color in '565' RGB format.
        @param  len    Number of pixels to draw.
        @return this (result of sendData)
    */
    /**********************************************************************/
    writeColor(color, count) {
        const self = this;
        // Javascript cast to uint16
        color = (color >>> 0) & 0xFFFF;
        // LE stuff.
        if (LE) {
            color = ((color & 0xFF) << 8) | ((color >>> 8) & 0xFF);
        }

        // This assumes 16 bit color entry.
        const colorData = new Uint16Array(count);
        colorData.fill(color);
        const data = new Uint8Array(colorData.buffer, colorData.byteOffset, colorData.byteLength);
        //console.log("data[0]:0x%s data[1]:0x%s", data[0].toString(16).padStart(2, '0'), data[1].toString(16).padStart(2, '0'))
        return self.sendData(data);
    }


    /**********************************************************************/
    /*!
        @brief  Draw a filled rectangle to the display. Not self-contained;
                should follow startWrite(). Typically used by higher-level
                graphics primitives; user code shouldn't need to call this and
                is likely to use the self-contained fillRect() instead.
                writeFillRect() performs its own edge clipping and rejection;
                see writeFillRectPreclipped() for a more 'raw' implementation.
        @param  x      Horizontal position of first corner.
        @param  y      Vertical position of first corner.
        @param  w      Rectangle width in pixels (positive = right of first
                       corner, negative = left of first corner).
        @param  h      Rectangle height in pixels (positive = below first
                       corner, negative = above first corner).
        @param  color  16-bit fill color in '565' RGB format.
        @return this
        @note   Written in this deep-nested way because C by definition will
                optimize for the 'if' case, not the 'else' -- avoids branches
                and rejects clipped rectangles at the least-work possibility.
    */
    /**********************************************************************/
    writeFillRect(x, y, w, h, color) {
        const self = this, _width = self._width, _height = self._height;

        if (w && h) {   // Nonzero width and height?
            if (w < 0) {  // If negative width...
                x += w + 1; //   Move X to left edge
                w = -w;     //   Use positive width
            }
            if (x < _width) { // Not off right
                if (h < 0) {    // If negative height...
                    y += h + 1;   //   Move Y to top edge
                    h = -h;       //   Use positive height
                }
                if (y < _height) { // Not off bottom
                    let x2 = x + w - 1;
                    if (x2 >= 0) { // Not off left
                        let y2 = y + h - 1;
                        if (y2 >= 0) { // Not off top
                            // Rectangle partly or fully overlaps screen
                            if (x < 0) {
                                x = 0;
                                w = x2 + 1;
                            } // Clip left
                            if (y < 0) {
                                y = 0;
                                h = y2 + 1;
                            } // Clip top
                            if (x2 >= _width) {
                                w = _width - x;
                            } // Clip right
                            if (y2 >= _height) {
                                h = _height - y;
                            } // Clip bottom
                            self.writeFillRectPreclipped(x, y, w, h, color);
                        }
                    }
                }
            }
        }
        return self;
    }


    /**********************************************************************/
    /*!
        @brief  Draw a horizontal line on the display. Performs edge clipping
                and rejection. Not self-contained; should follow startWrite().
                Typically used by higher-level graphics primitives; user code
                shouldn't need to call this and is likely to use the self-
                contained drawFastHLine() instead.
        @param  x      Horizontal position of first point.
        @param  y      Vertical position of first point.
        @param  w      Line width in pixels (positive = right of first point,
                       negative = point of first corner).
        @param  color  16-bit line color in '565' RGB format.
        @return this
    */
    /**********************************************************************/
    writeFastHLine(x, y, w, color) {
        const self = this, _width = self._width, _height = self._height;
        if ((y >= 0) && (y < _height) && w) { // Y on screen, nonzero width
            if (w < 0) {                        // If negative width...
                x += w + 1;                       //   Move X to left edge
                w = -w;                           //   Use positive width
            }
            if (x < _width) { // Not off right
                let x2 = x + w - 1;
                if (x2 >= 0) { // Not off left
                    // Line partly or fully overlaps screen
                    if (x < 0) {
                        x = 0;
                        w = x2 + 1;
                    } // Clip left
                    if (x2 >= _width) {
                        w = _width - x;
                    } // Clip right
                    self.writeFillRectPreclipped(x, y, w, 1, color);
                }
            }
        }
        return self;
    }


    /**********************************************************************/
    /*!
        @brief  Draw a vertical line on the display. Performs edge clipping and
                rejection. Not self-contained; should follow startWrite().
                Typically used by higher-level graphics primitives; user code
                shouldn't need to call this and is likely to use the self-
                contained drawFastVLine() instead.
        @param  x      Horizontal position of first point.
        @param  y      Vertical position of first point.
        @param  h      Line height in pixels (positive = below first point,
                       negative = above first point).
        @param  color  16-bit line color in '565' RGB format.
        @return this
    */
    /**********************************************************************/
    writeFastVLine(x, y, h, color) {
        const self = this, _width = self._width, _height = self._height;
        if ((x >= 0) && (x < _width) && h) { // X on screen, nonzero height
            if (h < 0) {                       // If negative height...
                y += h + 1;                      //   Move Y to top edge
                h = -h;                          //   Use positive height
            }
            if (y < _height) { // Not off bottom
                let y2 = y + h - 1;
                if (y2 >= 0) { // Not off top
                    // Line partly or fully overlaps screen
                    if (y < 0) {
                        y = 0;
                        h = y2 + 1;
                    } // Clip top
                    if (y2 >= _height) {
                        h = _height - y;
                    } // Clip bottom
                    self.writeFillRectPreclipped(x, y, 1, h, color);
                }
            }
        }
        return self;
    }

    /**********************************************************************/
    /*!
        @brief  A lower-level version of writeFillRect(). This version requires
                all inputs are in-bounds, that width and height are positive,
                and no part extends offscreen. NO EDGE CLIPPING OR REJECTION IS
                PERFORMED. If higher-level graphics primitives are written to
                handle their own clipping earlier in the drawing process, this
                can avoid unnecessary function calls and repeated clipping
                operations in the lower-level functions.
        @param  x      Horizontal position of first corner. MUST BE WITHIN
                       SCREEN BOUNDS.
        @param  y      Vertical position of first corner. MUST BE WITHIN SCREEN
                       BOUNDS.
        @param  w      Rectangle width in pixels. MUST BE POSITIVE AND NOT
                       EXTEND OFF SCREEN.
        @param  h      Rectangle height in pixels. MUST BE POSITIVE AND NOT
                       EXTEND OFF SCREEN.
        @param  color  16-bit fill color in '565' RGB format.
        @return this
        @note   This is a new function, no graphics primitives besides rects
                and horizontal/vertical lines are written to best use this yet.
    */
    /**********************************************************************/
    writeFillRectPreclipped(x, y, w, h, color) {
        const self = this;
        self.setAddrWindow(x, y, w, h);
        self.writeColor(color, w * h);
        return self;
    }

    // -------------------------------------------------------------------------
    // Ever-so-slightly higher-level graphics operations. Similar to the 'write'
    // functions above, but these contain their own chip-select and SPI
    // transactions as needed (via startWrite(), endWrite()). They're typically
    // used solo -- as graphics primitives in themselves, not invoked by higher-
    // level primitives (which should use the functions above for better
    // performance).


    /**********************************************************************/
    /*!
        @brief  Draw a single pixel to the display at requested coordinates.
                Self-contained and provides its own transaction as needed
                (see writePixel(x,y,color) for a lower-level variant).
                Edge clipping is performed here.
        @param  x      Horizontal position (0 = left).
        @param  y      Vertical position   (0 = top).
        @param  color  16-bit pixel color in '565' RGB format.
        @return this
    */
    /**********************************************************************/
    drawPixel(x, y, color) {
        const self = this, _width = self._width, _height = self._height;
        // Clip first...
        if ((x >= 0) && (x < _width) && (y >= 0) && (y < _height)) {
            // THEN set up transaction (if needed) and draw...
            self.startWrite();
            self.setAddrWindow(x, y, 1, 1);

            // LE stuff.
            const data = LE ? [color >>> 8 & 0xFF, color & 0xFF] : [color & 0xFF, color >>> 8 & 0xFF];

            self.sendData(data);
            self.endWrite();
        }
        return self;
    }


    /**********************************************************************/
    /*!
        @brief  Draw a filled rectangle to the display. Self-contained and
                provides its own transaction as needed (see writeFillRect() or
                writeFillRectPreclipped() for lower-level variants). Edge
                clipping and rejection is performed here.
        @param  x      Horizontal position of first corner.
        @param  y      Vertical position of first corner.
        @param  w      Rectangle width in pixels (positive = right of first
                       corner, negative = left of first corner).
        @param  h      Rectangle height in pixels (positive = below first
                       corner, negative = above first corner).
        @param  color  16-bit fill color in '565' RGB format.
        @return this
        @note   This repeats the writeFillRect() function almost in its entirety,
                with the addition of a transaction start/end. It's done this way
                (rather than starting the transaction and calling writeFillRect()
                to handle clipping and so forth) so that the transaction isn't
                performed at all if the rectangle is rejected. It's really not
                that much code.
    */
    /**********************************************************************/
    fillRect(x, y, w, h, color) {
        const self = this, _width = self._width, _height = self._height;
        _debug && console.log("BEGIN Adafruit_SPITFT::fillRect()");
        if (w && h) {   // Nonzero width and height?
            if (w < 0) {  // If negative width...
                x += w + 1; //   Move X to left edge
                w = -w;     //   Use positive width
            }
            if (x < _width) { // Not off right
                if (h < 0) {    // If negative height...
                    y += h + 1;   //   Move Y to top edge
                    h = -h;       //   Use positive height
                }
                if (y < _height) { // Not off bottom
                    let x2 = x + w - 1;
                    if (x2 >= 0) { // Not off left
                        let y2 = y + h - 1;
                        if (y2 >= 0) { // Not off top
                            // Rectangle partly or fully overlaps screen
                            if (x < 0) {
                                x = 0;
                                w = x2 + 1;
                            } // Clip left
                            if (y < 0) {
                                y = 0;
                                h = y2 + 1;
                            } // Clip top
                            if (x2 >= _width) {
                                w = _width - x;
                            } // Clip right
                            if (y2 >= _height) {
                                h = _height - y;
                            } // Clip bottom
                            self.startWrite();
                            self.writeFillRectPreclipped(x, y, w, h, color);
                            self.endWrite();
                        }
                    }
                }
            }
        }
        _debug && console.log("END Adafruit_SPITFT::fillRect()");
        return self;
    }


    /**********************************************************************/
    /*!
        @brief  Draw a horizontal line on the display. Self-contained and
                provides its own transaction as needed (see writeFastHLine() for
                a lower-level variant). Edge clipping and rejection is performed
                here.
        @param  x      Horizontal position of first point.
        @param  y      Vertical position of first point.
        @param  w      Line width in pixels (positive = right of first point,
                       negative = point of first corner).
        @param  color  16-bit line color in '565' RGB format.
        @return this
        @note   This repeats the writeFastHLine() function almost in its
                entirety, with the addition of a transaction start/end. It's
                done this way (rather than starting the transaction and calling
                writeFastHLine() to handle clipping and so forth) so that the
                transaction isn't performed at all if the line is rejected.
    */
    /**********************************************************************/
    drawFastHLine(x, y, w, color) {
        const self = this, _width = self._width, _height = self._height;
        if ((y >= 0) && (y < _height) && w) { // Y on screen, nonzero width
            if (w < 0) {                        // If negative width...
                x += w + 1;                       //   Move X to left edge
                w = -w;                           //   Use positive width
            }
            if (x < _width) { // Not off right
                let x2 = x + w - 1;
                if (x2 >= 0) { // Not off left
                    // Line partly or fully overlaps screen
                    if (x < 0) {
                        x = 0;
                        w = x2 + 1;
                    } // Clip left
                    if (x2 >= _width) {
                        w = _width - x;
                    } // Clip right
                    self.startWrite();
                    self.writeFillRectPreclipped(x, y, w, 1, color);
                    self.endWrite();
                }
            }
        }
        return self;
    }


    /**********************************************************************/
    /*!
        @brief  Draw a vertical line on the display. Self-contained and provides
                its own transaction as needed (see writeFastHLine() for a lower-
                level variant). Edge clipping and rejection is performed here.
        @param  x      Horizontal position of first point.
        @param  y      Vertical position of first point.
        @param  h      Line height in pixels (positive = below first point,
                       negative = above first point).
        @param  color  16-bit line color in '565' RGB format.
        @return this
        @note   This repeats the writeFastVLine() function almost in its
                entirety, with the addition of a transaction start/end. It's
                done this way (rather than starting the transaction and calling
                writeFastVLine() to handle clipping and so forth) so that the
                transaction isn't performed at all if the line is rejected.
    */
    /**********************************************************************/
    drawFastVLine(x, y, h, color) {
        const self = this, _width = self._width, _height = self._height;
        if ((x >= 0) && (x < _width) && h) { // X on screen, nonzero height
            if (h < 0) {                       // If negative height...
                y += h + 1;                      //   Move Y to top edge
                h = -h;                          //   Use positive height
            }
            if (y < _height) { // Not off bottom
                let y2 = y + h - 1;
                if (y2 >= 0) { // Not off top
                    // Line partly or fully overlaps screen
                    if (y < 0) {
                        y = 0;
                        h = y2 + 1;
                    } // Clip top
                    if (y2 >= _height) {
                        h = _height - y;
                    } // Clip bottom
                    self.startWrite();
                    self.writeFillRectPreclipped(x, y, 1, h, color);
                    self.endWrite();
                }
            }
        }
        return self;
    }


    /**********************************************************************/
    /*!
        @brief  Invert the colors of the display (if supported by hardware).
                Self-contained, no transaction setup required.
        @param  aValue  true = inverted display, false = normal display.
        @return this
    */
    /**********************************************************************/
    invertDisplay(aValue) {
        const self = this;
        const boolVal = !!aValue;
        _debug && console.log("Adafruit_SPITFT::invertDisplay boolVal:%o", boolVal);
        self.startWrite();
        // if invertMode is reversed then we swap the commands.
        const invertOnCommand = self._reverseInversionMode ? self.invertOffCommand : self.invertOnCommand;
        const invertOffCommand = self._reverseInversionMode ? self.invertOnCommand : self.invertOffCommand;
        self.writeCommand(boolVal ? invertOnCommand : invertOffCommand);
        self.endWrite();
        return self;
    }
}

// define enumeration of modes allowed for initialization.
Object.defineProperty(Adafruit_SPITFT, "SPI_MODES", {
    configurable: false,
    writable: false,
    enumerable:false,
    value: SPI_MODES
});

Object.defineProperty(Adafruit_SPITFT, "SPI_DEFAULTS", {
    configurable: false,
    writable: false,
    enumerable:false,
    value: SPI_DEFAULTS
});

module.exports = Adafruit_SPITFT;