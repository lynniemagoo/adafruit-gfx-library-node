/*
This is the core graphics library for all our displays, providing a common
set of graphics primitives (points, lines, circles, etc.).  It needs to be
paired with a hardware-specific library for each display device we carry
(to handle the lower-level functions).

Adafruit invests time and resources providing this open source code, please
support Adafruit & open-source hardware by purchasing products from Adafruit!

Copyright (c) 2013 Adafruit Industries.  All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

- Redistributions of source code must retain the above copyright notice,
  this list of conditions and the following disclaimer.
- Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';
const OHOP = Object.hasOwnProperty;
const UTILS_LOCATION = "../utils/";
const extractOption = require (UTILS_LOCATION + "CommonUtils.js").extractOption;
const Thenable = require("./Thenable.js");
const util = require("util");
const os = require("os");
const toInt = Math.trunc;

const BUILTIN_FONT = require("./glcdfont.js");

const FONT_TYPE_BUILTIN = 0;
const FONT_TYPE_GFX = 1;
const FONT_TYPE_OLED = 2;

class Adafruit_GFX extends Thenable {

    constructor(options) {
        // Setup Thenable for chaining.
        super();
        const self = this;

        self._options = Object.assign({}, options);
        self.WIDTH = extractOption(self._options, "width", 0)
        self.HEIGHT = extractOption(self._options, "height", 0);
        if ((self.WIDTH <= 0) || (self.HEIGHT <= 0)) throw new Error("Invalid width or height specified");

        self.letterSpacing = 1;
        self.lineSpacing = 1;

        // AdaFruitFont stuff.
        self.cursor_x = 0;
        self.cursor_y = 0;
        self.textsize_x = self.textsize_y = 1;
        self.textcolor = 0xFFFF;
        self.textbgcolor = 0xFFFF;
        self.wrap = true;
        self._cp437 = false;
        // Install default font.
        self.setFont(null);

        self._initRotation(extractOption(self._options, "rotation", 0) & 3);
    }


    /**************************************************************************/
    /*!
        @brief  Private function to be used internally to manage 'rotation'
                instance field' and update '_width' and '_height'.
        @returns  this
    */
    /**************************************************************************/
   _initRotation(m) {
        const self = this, rotation = m & 3;
        let w = self.WIDTH, h = self.HEIGHT;
        if (rotation % 2) { // 90 or 270 degree rotation.
            w = self.HEIGHT;
            h = self.WIDTH;
        }
        self._width = w;
        self._height = h;
        self.rotation = rotation;
        return self;
    }


    /**************************************************************************/
    /*!
        @brief  Set rotation setting for display
        @param  x   0 thru 3 corresponding to 4 cardinal rotations
        @returns  this
    */
    /**************************************************************************/
    setRotation(m) {
        this._initRotation(m);
        return this;
    }


    /************************************************************************/
    /*!
        @brief  Get width of the display, accounting for current rotation
        @returns  Width in pixels
    */
    /************************************************************************/
    width() {return this._width;}


    /************************************************************************/
    /*!
        @brief  Get height of the display, accounting for current rotation
        @returns  Height in pixels
    */
    /************************************************************************/
    height() {return this._height;}


    /************************************************************************/
    /*!
        @brief  Get rotation setting for display
        @returns  0 thru 3 corresponding to 4 cardinal rotations
    */
    /************************************************************************/
    getRotation() {return this.rotation;}


    /************************************************************************/
    /*!
        @brief  Get text cursor X location
        @returns  X coordinate in pixels
    */
    /************************************************************************/
    getCursorX() {return this.cursor_x;}


    /************************************************************************/
    /*!
        @brief  Get text cursor Y location
        @returns  Y coordinate in pixels
    */
    /************************************************************************/
    getCursorY() {return this.cursor_y;}


    /**********************************************************************/
    /*!
        @brief  Set text cursor location
        @param  x    X coordinate in pixels
        @param  y    Y coordinate in pixels
        @returns  this
    */
    /**********************************************************************/
    setCursor(x, y) {
        const self = this;
        self.cursor_x = x;
        self.cursor_y = y;
        // set the values immediately but if there are chained tasks that depend on ordering, also add as a task.
        const doWork = _ => {
            self.cursor_x = x;
            self.cursor_y = y;
        }
        self._chain(doWork);
        return self;
    }


    /**************************************************************************/
    /*!
        @brief    Write a line.  Bresenham's algorithm - thx wikpedia
        @param    x0  Start point x coordinate
        @param    y0  Start point y coordinate
        @param    x1  End point x coordinate
        @param    y1  End point y coordinate
        @param    color 16-bit 5-6-5 Color to draw with
        @returns  this
    */
    /**************************************************************************/
    writeLineAdafruit(x0, y0, x1, y1, color)  {
        //console.log("GFX::writeLine(x0:%d, y0:%d, x1:%d, y1:%d, color:%d)", x0, y0, x1, y1, color);
        const self = this;
        let t, steep = Math.abs(y1 - y0) > Math.abs(x1 - x0);
        if (steep) {
            //_swap_int16_t(x0, y0);
            //(((x0) ^= (y0)), ((y0) ^= (x0)), ((x0) ^= (y0))); // No-temp-var swap operation
            (t = x0, x0 = y0, y0 = t);
            //_swap_int16_t(x1, y1);
            //(((x1) ^= (y1)), ((y1) ^= (x1)), ((x1) ^= (y1))); // No-temp-var swap operation
            (t = x1, x1 = y1, y1 = t);
        }
        if (x0 > x1) {
            //_swap_int16_t(x0, x1);
            //(((x0) ^= (x1)), ((x1) ^= (x0)), ((x0) ^= (x1))); // No-temp-var swap operation
            (t = x0, x0 = x1, x1 = t);
            //_swap_int16_t(y0, y1);
            //(((y0) ^= (y1)), ((y1) ^= (y0)), ((y0) ^= (y1))); // No-temp-var swap operation
            (t = y0, y0 = y1, y1 = t);
        }

        const dx = x1 - x0, dy = Math.abs(y1 - y0);

        let err = toInt(dx / 2),
            ystep = (y0 < y1) ? 1 : - 1;
        for ( ; x0 <= x1; x0++) {
            if (steep) {
                self.writePixel(y0, x0, color);
            } else {
                self.writePixel(x0, y0, color);
            }
            err -= dy;
            if (err < 0) {
                y0 += ystep;
                err += dx;
            }
        }
        return self;
    }


    /**************************************************************************/
    /*!
        @brief    Write a line.  Bresenham's algorithm - thx wikpedia
        @param    x0  Start point x coordinate
        @param    y0  Start point y coordinate
        @param    x1  End point x coordinate
        @param    y1  End point y coordinate
        @param    color 16-bit 5-6-5 Color to draw with
        @returns  this
        @note     Modified from adafruit approach based on final algorithm here.
                  https://en.wikipedia.org/wiki/Bresenham%27s_line_algorithm
                  This ensures that lines are drawn from (x0,y0) to (x1,y1).
    */
    /**************************************************************************/
    writeLine(x0, y0, x1, y1, color)  {
        const self = this,
              dx = Math.abs(x1 - x0),
              sx = x0 < x1 ? 1 : -1,
              dy = -Math.abs(y1 - y0),
              sy = y0 < y1 ? 1 : -1;
        let error = dx + dy;

        while(true) {
            self.writePixel(x0, y0, color);
            if ((x0 === x1) && (y0 === y1)) break;
            let e2 = error << 1; //(error * 2)
            if (e2 >= dy) {
                if (x0 === x1) break;
                error += dy;
                x0 += sx;
            }
            if (e2 <= dx) {
                if (y0 === y1) break;
                error += dx;
                y0 += sy;
            }
        }
        return self;
    }


    /**************************************************************************/
    /*!
        @brief    Start a display-writing routine, overwrite in subclasses.
        @returns  this
    */
    /**************************************************************************/
    startWrite() {return this;}


    /**************************************************************************/
    /*!
        @brief   Write a pixel, overwrite in subclasses if startWrite is defined!
        @param   x   x coordinate
        @param   y   y coordinate
        @param   color 16-bit 5-6-5 Color to fill with
        @returns this (result of drawPixel)
    */
    /**************************************************************************/
    writePixel(x, y, color) {
        return this.drawPixel(x, y, color);
    }


    /**************************************************************************/
    /*!
        @brief    Write a perfectly vertical line, overwrite in subclasses if
                  startWrite is defined!
        @param    x   Top-most x coordinate
        @param    y   Top-most y coordinate
        @param    h   Height in pixels
        @param    color 16-bit 5-6-5 Color to fill with
        @returns  this (result of drawFastVLine)
    */
    /**************************************************************************/
    writeFastVLine(x, y, h, color) {
        // Overwrite in subclasses if startWrite is defined!
        // Can be just writeLine(x, y, x, y+h-1, color);
        // or writeFillRect(x, y, 1, h, color);
        return this.drawFastVLine(x, y, h, color);
    }


    /**************************************************************************/
    /*!
        @brief    Write a perfectly horizontal line, overwrite in subclasses if
                  startWrite is defined!
        @param    x   Left-most x coordinate
        @param    y   Left-most y coordinate
        @param    w   Width in pixels
        @param    color 16-bit 5-6-5 Color to fill with
        @returns  this
    */
    /**************************************************************************/
    writeFastHLine(x, y, w, color) {
        // Overwrite in subclasses if startWrite is defined!
        // Example: writeLine(x, y, x+w-1, y, color);
        // or writeFillRect(x, y, w, 1, color);
        return this.drawFastHLine(x, y, w, color);
    }


    /**************************************************************************/
    /*!
        @brief    Write a rectangle completely with one color, overwrite in
                  subclasses if startWrite is defined!
        @param    x   Top left corner x coordinate
        @param    y   Top left corner y coordinate
        @param    w   Width in pixels
        @param    h   Height in pixels
        @param    color 16-bit 5-6-5 Color to fill with
        @returns  this
    */
    /**************************************************************************/
    writeFillRect(x, y, w, h, color) {
        // Overwrite in subclasses if desired!
        return this.fillRect(x, y, w, h, color);
    }


    /**************************************************************************/
    /*!
        @brief    End a display-writing routine, overwrite in subclasses if
                  startWrite is defined!
        @returns  this
    */
    /**************************************************************************/
    endWrite() {return this;}


    /**************************************************************************/
    /*!
        @brief    Draw a perfectly vertical line (this is often optimized in a
                  subclass!)
        @param    x   Top-most x coordinate
        @param    y   Top-most y coordinate
        @param    h   Height in pixels
        @param    color 16-bit 5-6-5 Color to fill with
        @returns  this
    */
    /**************************************************************************/
    drawFastVLine(x, y, h, color) {
        const self = this;
        //console.log("GFX::drawFastVLine(x:%d y:%d, h:%d, color:%d)", x, y, h, color);
        self.startWrite();
        self.writeLine(x, y, x, y + h - 1, color);
        self.endWrite();
        return self;
    }


    /**************************************************************************/
    /*!
        @brief    Draw a perfectly horizontal line (this is often optimized in a
                  subclass!)
        @param    x   Left-most x coordinate
        @param    y   Left-most y coordinate
        @param    w   Width in pixels
        @param    color 16-bit 5-6-5 Color to fill with
        @returns  this
    */
    /**************************************************************************/
    drawFastHLine(x, y, w, color) {
        const self = this;
        //console.log("GFX::drawFastHLine(x:%d y:%d, w:%d, color:%d)", x, y, w, color);
        self.startWrite();
        self.writeLine(x, y, x + w - 1, y, color);
        self.endWrite();
        return self;
    }


    /**************************************************************************/
    /*!
        @brief    Fill a rectangle completely with one color. Update in subclasses if
                  desired!
        @param    x   Top left corner x coordinate
        @param    y   Top left corner y coordinate
        @param    w   Width in pixels
        @param    h   Height in pixels
        @param    color 16-bit 5-6-5 Color to fill with
        @returns  this
    */
    /**************************************************************************/
    fillRect(x, y, w, h, color) {
        const self = this;
        //// LRM - Bugfix - Only draw if positive width or height.
        //if (w <= 0 || h <= 0) {
        //    return self;
        //}

        self.startWrite();
        for (let i = x; i < x + w; i++) {
            self.writeFastVLine(i, y, h, color);
        }
        self.endWrite();
        return self;
    }


    /**************************************************************************/
    /*!
        @brief    Fill the screen completely with one color. Update in subclasses if
                  desired!
        @param    color 16-bit 5-6-5 Color to fill with
        @returns  this
    */
    /**************************************************************************/
    fillScreen(color) {
        return this.fillRect(0, 0, this._width, this._height, color);
    }


    /**************************************************************************/
    /*!
        @brief    Draw a line
        @param    x0  Start point x coordinate
        @param    y0  Start point y coordinate
        @param    x1  End point x coordinate
        @param    y1  End point y coordinate
        @param    color 16-bit 5-6-5 Color to draw with
        @returns  this
    */
    /**************************************************************************/
    drawLine(x0, y0, x1, y1, color) {
        const self = this;
        let t;
        // Update in subclasses if desired!
        if (x0 == x1) {
            if (y0 > y1) {
                //_swap_int16_t(y0, y1);
                //(((y0) ^= (y1)), ((y1) ^= (y0)), ((y0) ^= (y1))); // No-temp-var swap operation
                (t = y0, y0 = y1, y1 = t);
            }
            self.drawFastVLine(x0, y0, y1 - y0 + 1, color);
        } else if (y0 == y1) {
            if (x0 > x1) {
                //_swap_int16_t(x0, x1);
                //(((x0) ^= (x1)), ((x1) ^= (x0)), ((x0) ^= (x1))); // No-temp-var swap operation
                (t = x0, x0 = x1, x1 = t);
            }
            self.drawFastHLine(x0, y0, x1 - x0 + 1, color);
        } else {
            self.startWrite();
            self.writeLine(x0, y0, x1, y1, color);
            self.endWrite();
        }
        return self;
    }


    /**************************************************************************/
    /*!
        @brief    Draw a circle outline
        @param    x0   Center-point x coordinate
        @param    y0   Center-point y coordinate
        @param    r   Radius of circle
        @param    color 16-bit 5-6-5 Color to draw with
        @returns  this
    */
    /**************************************************************************/
    drawCircle(x0, y0, r, color) {
        const self = this;
        //// LRM - Bugfix - Only draw if positive radius.
        //if (r <= 0) {
        //    return self;
        //}

        let f = 1 - r,
            ddF_x = 1,
            ddF_y = -2 * r,
            x = 0,
            y = r;
        self.startWrite();

        self.writePixel(x0, y0 + r, color);
        self.writePixel(x0, y0 - r, color);
        self.writePixel(x0 + r, y0, color);
        self.writePixel(x0 - r, y0, color);

        while (x < y) {
            if (f >= 0) {
                y--;
                ddF_y += 2;
                f += ddF_y;
            }
            x++;
            ddF_x += 2;
            f += ddF_x;

            self.writePixel(x0 + x, y0 + y, color);
            self.writePixel(x0 - x, y0 + y, color);
            self.writePixel(x0 + x, y0 - y, color);
            self.writePixel(x0 - x, y0 - y, color);
            self.writePixel(x0 + y, y0 + x, color);
            self.writePixel(x0 - y, y0 + x, color);
            self.writePixel(x0 + y, y0 - x, color);
            self.writePixel(x0 - y, y0 - x, color);
        }

        self.endWrite();
        return self;

    }


    /**************************************************************************/
    /*!
        @brief    Quarter-circle drawer, used to do circles and roundrects
        @param    x0   Center-point x coordinate
        @param    y0   Center-point y coordinate
        @param    r   Radius of circle
        @param    cornername  Mask bit #1 or bit #2 to indicate which quarters of
                              the circle we're doing
        @param    color 16-bit 5-6-5 Color to draw with
        @returns  this
    */
    /**************************************************************************/
    drawCircleHelper(x0, y0, r, cornername, color) {
        const self = this;
        //// LRM - Bugfix - Only draw if positive radius.
        //if (r <= 0) {
        //    return self;
        //}
        let f = 1 - r,
            ddF_x = 1,
            ddF_y = -2 * r,
            x = 0,
            y = r;

        while (x < y) {
            if (f >= 0) {
                y--;
                ddF_y += 2;
                f += ddF_y;
            }
            x++;
            ddF_x += 2;
            f += ddF_x;
            if (cornername & 0x4) {
                self.writePixel(x0 + x, y0 + y, color);
                self.writePixel(x0 + y, y0 + x, color);
            }
            if (cornername & 0x2) {
                self.writePixel(x0 + x, y0 - y, color);
                self.writePixel(x0 + y, y0 - x, color);
            }
            if (cornername & 0x8) {
                self.writePixel(x0 - y, y0 + x, color);
                self.writePixel(x0 - x, y0 + y, color);
            }
            if (cornername & 0x1) {
                self.writePixel(x0 - y, y0 - x, color);
                self.writePixel(x0 - x, y0 - y, color);
            }
        }
        return self;
    }


    /**************************************************************************/
    /*!
        @brief    Draw a circle with filled color
        @param    x0   Center-point x coordinate
        @param    y0   Center-point y coordinate
        @param    r   Radius of circle
        @param    color 16-bit 5-6-5 Color to fill with
        @returns  this
    */
    /**************************************************************************/
    fillCircle(x0, y0, r, color) {
        const self = this;
        //// LRM - Bugfix - Only draw if positive radius.
        //if (r <= 0) {
        //    return self;
        //}
        self.startWrite();
        self.writeFastVLine(x0, y0 - r, 2 * r + 1, color);
        self.fillCircleHelper(x0, y0, r, 3, 0, color);
        self.endWrite();
        return self;
    }


    /**************************************************************************/
    /*!
        @brief  Quarter-circle drawer with fill, used for circles and roundrects
        @param  x0       Center-point x coordinate
        @param  y0       Center-point y coordinate
        @param  r        Radius of circle
        @param  corners  Mask bits indicating which quarters we're doing
        @param  delta    Offset from center-point, used for round-rects
        @param  color    16-bit 5-6-5 Color to fill with
        @returns  this
    */
    /**************************************************************************/
    fillCircleHelper(x0, y0, r, corners, delta, color) {
        const self = this;
        let f = 1 - r,
            ddF_x = 1,
            ddF_y = -2 * r,
            x = 0,
            y = r,
            px = x,
            py = y;

        delta++; // Avoid some +1's in the loop

        while (x < y) {
            if (f >= 0) {
                y--;
                ddF_y += 2;
                f += ddF_y;
            }
            x++;
            ddF_x += 2;
            f += ddF_x;
            // These checks avoid double-drawing certain lines, important
            // for the SSD1306 library which has an INVERT drawing mode.
            if (x < (y + 1)) {
                if (corners & 1) {
                    self.writeFastVLine(x0 + x, y0 - y, 2 * y + delta, color);
                }
                if (corners & 2) {
                    self.writeFastVLine(x0 - x, y0 - y, 2 * y + delta, color);
                }
            }
            if (y != py) {
                if (corners & 1) {
                    self.writeFastVLine(x0 + py, y0 - px, 2 * px + delta, color);
                }
                if (corners & 2) {
                    self.writeFastVLine(x0 - py, y0 - px, 2 * px + delta, color);
                }
                py = y;
            }
            px = x;
        }
        return self;
    }


    /**************************************************************************/
    /*!
        @brief    Draw a rectangle with no fill color
        @param    x   Top left corner x coordinate
        @param    y   Top left corner y coordinate
        @param    w   Width in pixels
        @param    h   Height in pixels
        @param    color 16-bit 5-6-5 Color to draw with
        @returns  this
    */
    /**************************************************************************/
    drawRect(x, y, w, h, color) {
        const self = this;
        //// LRM - Bugfix - Only draw if positive width or height.
        //if (w <= 0 || h <= 0) {
        //    return self;
        //}

        self.startWrite();

        self.writeFastHLine(x, y, w, color);
        self.writeFastHLine(x, y + h - 1, w, color);

        // Don't redraw corner pixels.
        y++;h -=2;

        self.writeFastVLine(x, y, h, color);
        self.writeFastVLine(x + w - 1, y, h, color);

        self.endWrite();

        return self;
    }


    /**************************************************************************/
    /*!
        @brief   Draw a rounded rectangle with no fill color
        @param    x   Top left corner x coordinate
        @param    y   Top left corner y coordinate
        @param    w   Width in pixels
        @param    h   Height in pixels
        @param    r   Radius of corner rounding
        @param    color 16-bit 5-6-5 Color to draw with
        @returns  this
    */
    /**************************************************************************/
    drawRoundRect( x, y, w, h, r, color) {
        const self = this;
        //// LRM - Bugfix - Only draw if positive width or height.
        //if (w <= 0 || h <= 0) {
        //    return self;
        //}

        let max_radius = toInt(((w < h) ? w : h) / 2); // 1/2 minor axis
        if (r > max_radius) {
            r = max_radius;
        }

        // smarter version
        self.startWrite();
        self.writeFastHLine(x + r, y, w - 2 * r, color);         // Top
        self.writeFastHLine(x + r, y + h - 1, w - 2 * r, color); // Bottom
        self.writeFastVLine(x, y + r, h - 2 * r, color);         // Left
        self.writeFastVLine(x + w - 1, y + r, h - 2 * r, color); // Right
        // draw four corners
        self.drawCircleHelper(x + r, y + r, r, 1, color);
        self.drawCircleHelper(x + w - r - 1, y + r, r, 2, color);
        self.drawCircleHelper(x + w - r - 1, y + h - r - 1, r, 4, color);
        self.drawCircleHelper(x + r, y + h - r - 1, r, 8, color);

        self.endWrite();
        return self;
    }


    /**************************************************************************/
    /*!
        @brief   Draw a rounded rectangle with fill color
        @param    x   Top left corner x coordinate
        @param    y   Top left corner y coordinate
        @param    w   Width in pixels
        @param    h   Height in pixels
        @param    r   Radius of corner rounding
        @param    color 16-bit 5-6-5 Color to draw/fill with
        @returns  this
    */
    /**************************************************************************/
    fillRoundRect(x, y, w, h, r, color) {
        const self = this;
        let max_radius = toInt(((w < h) ? w : h) / 2); // 1/2 minor axis
        if (r > max_radius) {
            r = max_radius;
        }
        // smarter version
        self.startWrite();
        //self.writeFillRect(x + r, y, w - 2 * r, h, color);
        self.fillRect(x + r, y, w - 2 * r, h, color);
        // draw four corners
        self.fillCircleHelper(x + w - r - 1, y + r, r, 1, h - 2 * r - 1, color);
        self.fillCircleHelper(x + r, y + r, r, 2, h - 2 * r - 1, color);
        self.endWrite();
        return self;
    }


    /**************************************************************************/
    /*!
        @brief    Draw a triangle with no fill color
        @param    x0  Vertex #0 x coordinate
        @param    y0  Vertex #0 y coordinate
        @param    x1  Vertex #1 x coordinate
        @param    y1  Vertex #1 y coordinate
        @param    x2  Vertex #2 x coordinate
        @param    y2  Vertex #2 y coordinate
        @param    color 16-bit 5-6-5 Color to draw with
        @returns  this

        @note     This original Adafruit algorithm is not ideal in that if you draw lines between the vertices
                  the appearance of the edges may not be identical to edges of a triangle that is filled.
    */
    /**************************************************************************/
    drawTriangle(x0, y0, x1, y1, x2, y2, color) {
        const self = this;
        self.drawLine(x0, y0, x1, y1, color);
        self.drawLine(x1, y1, x2, y2, color);
        self.drawLine(x2, y2, x0, y0, color);
        return self;
    }

    /**************************************************************************/
    /*!
        @brief    Draw a triangle with no fill color
        @param    x0  Vertex #0 x coordinate
        @param    y0  Vertex #0 y coordinate
        @param    x1  Vertex #1 x coordinate
        @param    y1  Vertex #1 y coordinate
        @param    x2  Vertex #2 x coordinate
        @param    y2  Vertex #2 y coordinate
        @param    color 16-bit 5-6-5 Color to fill/draw with
        @returns  this
        @note     This is a new function created from fillTriangle that uses the
                  exact points that would be used in fillTriangle and draws
                  pixels or lines to connect the points on the edges.
    */
    /**************************************************************************/
    drawTriangleNew(x0, y0, x1, y1, x2, y2, color) {
        const self = this;
        let a, b, y, t, last;

        // Sort coordinates by Y order (y2 >= y1 >= y0)
        if (y0 > y1) {
            //_swap_int16_t(y0, y1);
            //(((y0) ^= (y1)), ((y1) ^= (y0)), ((y0) ^= (y1))); // No-temp-var swap operation
            (t = y0, y0 = y1, y1 = t);
            //_swap_int16_t(x0, x1);
            //(((x0) ^= (x1)), ((x1) ^= (x0)), ((x0) ^= (x1))); // No-temp-var swap operation
            (t = x0, x0 = x1, x1 = t);
        }
        if (y1 > y2) {
            //_swap_int16_t(y2, y1);
            //(((y2) ^= (y1)), ((y1) ^= (y2)), ((y2) ^= (y1))); // No-temp-var swap operation
            (t = y1, y1 = y2, y2 = t);
            //_swap_int16_t(x2, x1);
            //(((x2) ^= (x1)), ((x1) ^= (x2)), ((x2) ^= (x1))); // No-temp-var swap operation
            (t = x1, x1 = x2, x2 = t);
        }
        if (y0 > y1) {
            //_swap_int16_t(y0, y1);
            //(((y0) ^= (y1)), ((y1) ^= (y0)), ((y0) ^= (y1))); // No-temp-var swap operation
            (t = y0, y0 = y1, y1 = t);
            //_swap_int16_t(x0, x1);
            //(((x0) ^= (x1)), ((x1) ^= (x0)), ((x0) ^= (x1))); // No-temp-var swap operation
            (t = x0, x0 = x1, x1 = t);
        }

        const pointsA = [];
        const pointsB = [];

        self.startWrite();
        if (y0 == y2) { // Handle awkward all-on-same-line case as its own thing
            a = b = x0;
            if (x1 < a)
                a = x1;
            else if (x1 > b)
                b = x1;
            if (x2 < a)
                a = x2;
            else if (x2 > b)
                b = x2;

            self.writeFastHLine(a, y0, b - a + 1, color);
        } else {

            let dx01 = x1 - x0, dy01 = y1 - y0, dx02 = x2 - x0, dy02 = y2 - y0,
                dx12 = x2 - x1, dy12 = y2 - y1;
            let sa = 0, sb = 0;

            // For upper part of triangle, find scanline crossings for segments
            // 0-1 and 0-2.  If y1=y2 (flat-bottomed triangle), the scanline y1
            // is included here (and second loop will be skipped, avoiding a /0
            // error there), otherwise scanline y1 is skipped here and handled
            // in the second loop...which also avoids a /0 error here if y0=y1
            // (flat-topped triangle).

            if (y1 == y2)
                last = y1; // Include y1 scanline
            else
                last = y1 - 1; // Skip it

            for (y = y0; y <= last; y++) {
                a = x0 + toInt(sa / dy01);
                b = x0 + toInt(sb / dy02);
                sa += dx01;
                sb += dx02;
                /* longhand:
                a = x0 + (x1 - x0) * (y - y0) / (y1 - y0);
                b = x0 + (x2 - x0) * (y - y0) / (y2 - y0);
                */
                if (a > b) {
                    //_swap_int16_t(a, b);
                    //(((a) ^= (b)), ((b) ^= (a)), ((a) ^= (b))); // No-temp-var swap operation
                    (t = a, a = b, b = t);
                }
                // Instead of drawing lines between Point A and Point B,
                // capture edge points of each which will be joined by a line.
                pointsA.push([a, y]);
                pointsB.push([b, y]);
            }
            // For lower part of triangle, find scanline crossings for segments
            // 0-2 and 1-2.  This loop is skipped if y1=y2.
            sa = (dx12 * (y - y1)) & 0xFFFFFFFF; // was cast int32_t
            sb = (dx02 * (y - y0)) & 0xFFFFFFFF; // was cast int32_t
            for (; y <= y2; y++) {
                a = x1 + toInt(sa / dy12);
                b = x0 + toInt(sb / dy02);
                sa += dx12;
                sb += dx02;
                /* longhand:
                a = x1 + (x2 - x1) * (y - y1) / (y2 - y1);
                b = x0 + (x2 - x0) * (y - y0) / (y2 - y0);
                */
                if (a > b) {
                    //_swap_int16_t(a, b);
                    //(((a) ^= (b)), ((b) ^= (a)), ((a) ^= (b))); // No-temp-var swap operation
                    (t = a, a = b, b = t);
                }
                // Instead of drawing lines between Point A and Point B,
                // capture edge points of each which will be joined by a line.
                pointsA.push([a, y]);
                pointsB.push([b, y]);
            }

            let p0, p1, dx, dy;
            // Draw lines between captured edge points.
            // Process pointsA and pointsB at same time for flowing draw.
            while(pointsA.length > 1 || pointsB.length > 1) {
                p0 = pointsA[0];
                p1 = pointsA[1];
                dx = p0[0] - p1[0];
                dy = p0[1] - p1[1];
                // Use sum of squares algorithm to check for squared distances <=2
                // This will allow us to determine do we need to draw 2 pixels only or a line.
                dx *= dx;
                dy *= dy;
                //console.log("p0:%o p1:%o dx:%d dy:%d", p0, p1, dx, dy);
                if ((dx + dy) <= 2) {
                    self.writePixel(p0[0], p0[1], color);
                    self.writePixel(p1[0], p1[1], color);
                } else {
                    self.writeLine(p0[0], p0[1], p1[0], p1[1], color);
                }
                // Remove first point just handled.
                pointsA.shift();

                p0 = pointsB[0];
                p1 = pointsB[1];
                dx = p0[0] - p1[0];
                dy = p0[1] - p1[1];
                // Use sum of squares algorithm to check for squared distances <=2
                // This will allow us to determine do we need to draw 2 pixels only or a line.
                dx *= dx;
                dy *= dy;
                //console.log("p0:%o p1:%o dx:%d dy:%d", p0, p1, dx, dy);
                if ((dx + dy) <= 2) {
                    self.writePixel(p0[0], p0[1], color);
                    self.writePixel(p1[0], p1[1], color);
                } else {
                    self.writeLine(p0[0], p0[1], p1[0], p1[1], color);
                }
                // Remove first point just handled.
                pointsB.shift();
            }

            // Draw flat top or flat bottom lines that are not covered above.
            if (y0 == y1) {
                self.writeFastHLine(x0, y0, x1 - x0 + 1, color);
            } else if (y1 == y2) {
                self.writeFastHLine(x1, y1, x2 - x1 + 1, color);
            }

            // Fill in corner pixels to be sure they are covered.
            self.writePixel(x0, y0, color);
            self.writePixel(x1, y1, color);
            self.writePixel(x2, y2, color);

            self.endWrite();
        }
        return self;
    }

    /**************************************************************************/
    /*!
        @brief    Draw a triangle with color-fill
        @param    x0  Vertex #0 x coordinate
        @param    y0  Vertex #0 y coordinate
        @param    x1  Vertex #1 x coordinate
        @param    y1  Vertex #1 y coordinate
        @param    x2  Vertex #2 x coordinate
        @param    y2  Vertex #2 y coordinate
        @param    color 16-bit 5-6-5 Color to fill/draw with
        @returns  this
    */
    /**************************************************************************/
    fillTriangle(x0, y0, x1, y1, x2, y2, color) {
        const self = this;
        let a, b, y, t, last;

        // Sort coordinates by Y order (y2 >= y1 >= y0)
        if (y0 > y1) {
            //_swap_int16_t(y0, y1);
            //(((y0) ^= (y1)), ((y1) ^= (y0)), ((y0) ^= (y1))); // No-temp-var swap operation
            (t = y0, y0 = y1, y1 = t);
            //_swap_int16_t(x0, x1);
            //(((x0) ^= (x1)), ((x1) ^= (x0)), ((x0) ^= (x1))); // No-temp-var swap operation
            (t = x0, x0 = x1, x1 = t);
        }
        if (y1 > y2) {
            //_swap_int16_t(y2, y1);
            //(((y2) ^= (y1)), ((y1) ^= (y2)), ((y2) ^= (y1))); // No-temp-var swap operation
            (t = y1, y1 = y2, y2 = t);
            //_swap_int16_t(x2, x1);
            //(((x2) ^= (x1)), ((x1) ^= (x2)), ((x2) ^= (x1))); // No-temp-var swap operation
            (t = x1, x1 = x2, x2 = t);
        }
        if (y0 > y1) {
            //_swap_int16_t(y0, y1);
            //(((y0) ^= (y1)), ((y1) ^= (y0)), ((y0) ^= (y1))); // No-temp-var swap operation
            (t = y0, y0 = y1, y1 = t);
            //_swap_int16_t(x0, x1);
            //(((x0) ^= (x1)), ((x1) ^= (x0)), ((x0) ^= (x1))); // No-temp-var swap operation
            (t = x0, x0 = x1, x1 = t);
        }

        self.startWrite();
        if (y0 == y2) { // Handle awkward all-on-same-line case as its own thing
            a = b = x0;
            if (x1 < a)
                a = x1;
            else if (x1 > b)
                b = x1;
            if (x2 < a)
                a = x2;
            else if (x2 > b)
                b = x2;
            self.writeFastHLine(a, y0, b - a + 1, color);
        } else {

            let dx01 = x1 - x0, dy01 = y1 - y0, dx02 = x2 - x0, dy02 = y2 - y0,
                dx12 = x2 - x1, dy12 = y2 - y1;
            let sa = 0, sb = 0;

            // For upper part of triangle, find scanline crossings for segments
            // 0-1 and 0-2.  If y1=y2 (flat-bottomed triangle), the scanline y1
            // is included here (and second loop will be skipped, avoiding a /0
            // error there), otherwise scanline y1 is skipped here and handled
            // in the second loop...which also avoids a /0 error here if y0=y1
            // (flat-topped triangle).
            if (y1 == y2)
                last = y1; // Include y1 scanline
            else
                last = y1 - 1; // Skip it

            for (y = y0; y <= last; y++) {
                a = x0 + toInt(sa / dy01);
                b = x0 + toInt(sb / dy02);
                sa += dx01;
                sb += dx02;
                /* longhand:
                a = x0 + (x1 - x0) * (y - y0) / (y1 - y0);
                b = x0 + (x2 - x0) * (y - y0) / (y2 - y0);
                */
                if (a > b) {
                    //_swap_int16_t(a, b);
                    //(((a) ^= (b)), ((b) ^= (a)), ((a) ^= (b))); // No-temp-var swap operation
                    (t = a, a = b, b = t);
                }
                self.writeFastHLine(a, y, b - a + 1, color);
            }

            // For lower part of triangle, find scanline crossings for segments
            // 0-2 and 1-2.  This loop is skipped if y1=y2.
            sa = (dx12 * (y - y1)) & 0xFFFFFFFF; // was cast int32_t
            sb = (dx02 * (y - y0)) & 0xFFFFFFFF; // was cast int32_t
            for (; y <= y2; y++) {
                a = x1 + toInt(sa / dy12);
                b = x0 + toInt(sb / dy02);
                sa += dx12;
                sb += dx02;
                /* longhand:
                a = x1 + (x2 - x1) * (y - y1) / (y2 - y1);
                b = x0 + (x2 - x0) * (y - y0) / (y2 - y0);
                */
                if (a > b) {
                    //_swap_int16_t(a, b);
                    //(((a) ^= (b)), ((b) ^= (a)), ((a) ^= (b))); // No-temp-var swap operation
                    (t = a, a = b, b = t);
                }
                self.writeFastHLine(a, y, b - a + 1, color);
            }
        }
        self.endWrite();
        return self;
    }


    /**************************************************************************/
    /*!
        @brief  Draw a single pixel to the display at requested coordinates.
                Self-contained and provides its own transaction as needed
                (see writePixel(x,y,color) for a lower-level variant).
                Edge clipping is performed here.
        @param  x      Horizontal position (0 = left).
        @param  y      Vertical position   (0 = top).
        @param  color  16-bit pixel color in '565' RGB format.
        @throws Error
    */
    /**************************************************************************/
    drawPixel(x, y, color) {
        throw new Error("Subclasses must override this function!");
    }


    /**************************************************************************/
    /*!
        @brief      Draw a RAM-resident 1-bit image at the specified (x,y) position,
                    using the specified foreground color (unset bits are transparent).
        @param    x   Top left corner x coordinate
        @param    y   Top left corner y coordinate
        @param    bitmap  byte array with monochrome bitmap
        @param    w   Width of bitmap in pixels
        @param    h   Height of bitmap in pixels
        @param    color 16-bit 5-6-5 Color to draw with
        @returns  this
    */
    /**************************************************************************/
    draw1BitBitmap(x, y, bitmap, w, h, color) {
        const self = this;
        const byteWidth = toInt((w + 7) / 8); // Bitmap scanline pad = whole byte
        let byte = 0;

        self.startWrite();
        for (let j = 0; j < h; j++, y++) {
            for (let i = 0; i < w; i++) {
                if (i & 7) {
                    byte <<= 1;
                } else {
                    byte = bitmap[j * byteWidth + toInt(i / 8)];
                }
                if (byte & 0x80)
                    self.writePixel(x + i, y, color);
            }
        }
        self.endWrite();
        return self;
    }


    /**************************************************************************/
    /*!
        @brief      Draw a RAM-resident 1-bit image at the specified (x,y) position,
                    using the specified foreground (for set bits) and background (unset bits)
                    colors.
        @param    x   Top left corner x coordinate
        @param    y   Top left corner y coordinate
        @param    bitmap  byte array with monochrome bitmap
        @param    w   Width of bitmap in pixels
        @param    h   Height of bitmap in pixels
        @param    color 16-bit 5-6-5 Color to draw pixels with
        @param    backgroundColor 16-bit 5-6-5 Color to draw background with
        @returns  this
    */
    /**************************************************************************/
    draw1BitBitmapSetBackgroundColor(x, y, bitmap, w, h, color, backgroundColor) {
        const self = this;
        const byteWidth = toInt((w + 7) / 8); // Bitmap scanline pad = whole byte
        let byte = 0;

        self.startWrite();
        for (let j = 0; j < h; j++, y++) {
            for (let i = 0; i < w; i++) {
                if (i & 7) {
                    byte <<= 1;
                } else {
                    byte = bitmap[j * byteWidth + toInt(i / 8)];
                }
                self.writePixel(x + i, y, (byte & 0x80) ? color : backgroundColor);
            }
        }
        self.endWrite();
        return self;
    }


    /**************************************************************************/
    /*!
        @brief      Draw XBitMap Files (*.xbm), exported from GIMP.
                    Usage: Export from GIMP to *.xbm, rename *.xbm to *.c and open in editor.
                    C Array can be directly used with this function.
                    There is no RAM-resident version of this function; if generating bitmaps
                    in RAM, use the format defined by drawBitmap() and call that instead.
        @param    x   Top left corner x coordinate
        @param    y   Top left corner y coordinate
        @param    bitmap  byte array with monochrome bitmap
        @param    w   Width of bitmap in pixels
        @param    h   Height of bitmap in pixels
        @param    color 16-bit 5-6-5 Color to draw pixels with
        @returns  this
    */
    /**************************************************************************/
    drawXBitmap(x, y, bitmap, w, h, color) {
        const self = this;

        const byteWidth = toInt((w + 7) / 8); // Bitmap scanline pad = whole byte
        let byte = 0;

        self.startWrite();
        for (let j = 0; j < h; j++, y++) {
            for (let i = 0; i < w; i++) {
                if (i & 7) {
                    byte >>= 1;
                } else {
                    byte = bitmap[j * byteWidth + toInt(i / 8)];
                }
                // Nearly identical to drawBitmap(), only the bit order
                // is reversed here (left-to-right = LSB to MSB):
                if (byte & 0x01)
                    self.writePixel(x + i, y, color);
            }
        }
        self.endWrite();
        return self;
    }


    /**************************************************************************/
    /*!
        @brief   Draw a RAM-resident 8-bit image (grayscale) at the specified (x,y)
                 pos. Specifically for 8-bit display devices such as IS31FL3731; no color
                 reduction/expansion is performed.
        @param    x   Top left corner x coordinate
        @param    y   Top left corner y coordinate
        @param    bitmap  byte array with grayscale bitmap
        @param    w   Width of bitmap in pixels
        @param    h   Height of bitmap in pixels
        @returns  this
    */
    /**************************************************************************/
    drawGrayscaleBitmap(x, y, bitmap, w, h) {
        const self = this;
        self.startWrite();
        for (let j = 0; j < h; j++, y++) {
            for (let i = 0; i < w; i++) {
                self.writePixel(x + i, y, bitmap[j * w + i] & 0xFF);
            }
        }
        self.endWrite();
        return self;
    }


    /**************************************************************************/
    /*!
        @brief   Draw a PROGMEM-resident 8-bit image (grayscale) with a 1-bit mask
                 (set bits = opaque, unset bits = clear) at the specified (x,y) position.
                 BOTH buffers (grayscale and mask) must be PROGMEM-resident.
                 Specifically for 8-bit display devices such as IS31FL3731; no color
                 reduction/expansion is performed.
        @param    x   Top left corner x coordinate
        @param    y   Top left corner y coordinate
        @param    bitmap  byte array with grayscale bitmap
        @param    mask  byte array with mask bitmap
        @param    w   Width of bitmap in pixels
        @param    h   Height of bitmap in pixels
        @returns  this
    */
    /**************************************************************************/
    drawGrayscaleBitmapWithMask(x, y, bitmap, mask, w, h) {
        const self = this;
        const byteWidth = toInt((w + 7) / 8); // Bitmask scanline pad = whole byte
        let byte = 0;
        self.startWrite();
        for (let j = 0; j < h; j++, y++) {
            for (let i = 0; i < w; i++) {
                if (i & 7) {
                    byte <<= 1;
                } else {
                    byte = mask[j * byteWidth + toInt(i / 8)];
                }
                if (byte & 0x80) {
                    self.writePixel(x + i, y, bitmap[j * w + i] & 0xFF);
                }
            }
        }
        self.endWrite();
        return self;
    }


    /**************************************************************************/
    /*!
        @brief   Draw a RAM-resident 16-bit image (RGB 5/6/5) at the specified (x,y)
                 position. For 16-bit display devices; no color reduction performed.
        @param    x   Top left corner x coordinate
        @param    y   Top left corner y coordinate
        @param    bitmap  byte array with 16-bit color bitmap
        @param    w   Width of bitmap in pixels
        @param    h   Height of bitmap in pixels
        @returns  this
    */
    /**************************************************************************/
    drawRGBBitmap(x, y, bitmap, w, h) {
        const self = this;
        self.startWrite();
        for (let j = 0; j < h; j++, y++) {
            for (let i = 0; i < w; i++) {
                self.writePixel(x + i, y, bitmap[j * w + i]);
            }
        }
        self.endWrite();
        return self;
    }


    /**************************************************************************/
    /*!
        @brief   Draw a RAM-resident 16-bit image (RGB 5/6/5) with a 1-bit mask (set
                 bits = opaque, unset bits = clear) at the specified (x,y) position. BOTH
                 buffers (color and mask) must be RAM-resident. For 16-bit display devices; no
                 color reduction performed.
        @param    x   Top left corner x coordinate
        @param    y   Top left corner y coordinate
        @param    bitmap  byte array with 16-bit color bitmap
        @param    mask  byte array with monochrome mask bitmap
        @param    w   Width of bitmap in pixels
        @param    h   Height of bitmap in pixels
        @returns  this
    */
    /**************************************************************************/
    drawRGBBitmapWithMask(x, y, bitmap, mask, w, h) {
        const self = this;
        const byteWidth = toInt((w + 7) / 8); // Bitmask scanline pad = whole byte
        let byte = 0;
        self.startWrite();
        for (let j = 0; j < h; j++, y++) {
            for (let i = 0; i < w; i++) {
                if (i & 7) {
                    byte <<= 1;
                } else {
                    byte = mask[j * byteWidth + toInt(i / 8)];
                }
                if (byte & 0x80) {
                    self.writePixel(x + i, y, bitmap[j * w + i]);
                }
            }
        }
        self.endWrite();
        return self;
    }


    /**************************************************************************/
    /*!
        @brief   Set text 'magnification' size. Each increase in s makes 1 pixel
                 that much bigger.
                 Desired text size. 1 is default 6x8, 2 is 12x16, 3 is 18x24, etc
        @param  s_x  Desired text width magnification level in X-axis. 1 is default
        @param  s_y  Desired text width magnification level in Y-axis. 1 is default
                     (Defaults to s_x if not specified)
        @returns  this
   */
    /**************************************************************************/
    setTextSize(s_x, s_y = s_x) {
        const self = this;
        self.textsize_x = (s_x > 0) ? s_x : 1;
        self.textsize_y = (s_y > 0) ? s_y : 1;
        // set the value immediately but if there are chained tasks that depend on ordering, also add as a task.
        const doWork = _ => {
            self.textsize_x = (s_x > 0) ? s_x : 1;
            self.textsize_y = (s_y > 0) ? s_y : 1;
        }
        self._chain(doWork);
        //console.log("tx:%o ty:%o", this.textsize_x, this.textsize_y);
        return self;
    }


    /**************************************************************************/
    /*!
        @brief   Get text 'magnification' X size.
        @returns Desired text width magnification level in X-axis. 1 is default
   */
    /**************************************************************************/
    getTextSizeX() {
        return this.textsize_x;
    }


    /**************************************************************************/
    /*!
        @brief   Get text 'magnification' Y size.
        @returns Desired text width magnification level in Y-axis. 1 is default
   */
    /**************************************************************************/
    getTextSizeY() {
        return this.textsize_y;
    }


    /**********************************************************************/
    /*!
        @brief  Set whether text that is too long for the screen width should
                automatically wrap around to the next line (else clip right).
        @param  w  true for wrapping, false for clipping
        @returns  this
    */
    /**********************************************************************/
    setTextWrap(w) {
        const self = this;
        self.wrap = !!w;
        // set the value immediately but if there are chained tasks that depend on ordering, also add as a task.
        const doWork = _ => {
            self.wrap = !!w;
        }
        self._chain(doWork);
        return self;
    }


    /**********************************************************************/
    /*!
        @brief  Get flag controlling whether text that is too long for the
                screen width should automatically wrap around to the
                next line (else clip right).
        @returns  true for wrapping, false for clipping
    */
    /**********************************************************************/
    getTextWrap() {
        return this.wrap;
    }


    /**********************************************************************/
    /*!
        @brief  Enable (or disable) Code Page 437-compatible charset.
                There was an error in glcdfont.c for the longest time -- one
                character (#176, the 'light shade' block) was missing -- this
                threw off the index of every character that followed it.
                But a TON of code has been written with the erroneous
                character indices. By default, the library uses the original
                'wrong' behavior and old sketches will still work. Pass
                'true' to this function to use correct CP437 character values
                in your code.
        @param  x  true = enable (new behavior), false = disable (old behavior)
        @returns  this
    */
    /**********************************************************************/
    setCP437(x = true) {
        const self = this;
        self._cp437 = !!x;
        // set the value immediately but if there are chained tasks that depend on ordering, also add as a task.
        const doWork = _ => {
            self._cp437 = !!x;
        }
        self._chain(doWork);
        return self;
    }


    /**********************************************************************/
    /*!
        @brief  Enable (or disable) Code Page 437-compatible charset.
                There was an error in glcdfont.c for the longest time -- one
                character (#176, the 'light shade' block) was missing -- this
                threw off the index of every character that followed it.
                But a TON of code has been written with the erroneous
                character indices. By default, the library uses the original
                'wrong' behavior and old sketches will still work. Pass
                'true' to this function to use correct CP437 character values
                in your code.
        @param  x  true = enable (new behavior), false = disable (old behavior)
        @returns  this
    */
    /**********************************************************************/
    cp437(x = true) {
        const self = this;
        self._cp437 = !!x;
        // set the value immediately but if there are chained tasks that depend on ordering, also add as a task.
        const doWork = _ => {
            self._cp437 = !!x;
        }
        self._chain(doWork);
        return self;
    }


    /**********************************************************************/
    /*!
        @brief  Get flag controlling the Enable (or disable) Code Page
                437-compatible charset.
        @returns  true = enable (new behavior), false = disable (old behavior)
    */
    /**********************************************************************/
    getCP437() {
        return this._cp437;
    }


    /**************************************************************************/
    /*!
        @brief Set the font to display when print()ing, either custom or default
        @param  f  The GFXfont object, if NULL use built in 6x8 font
        @returns  this
    */
    /**************************************************************************/
    setFont(f = null) {
        const self = this;
        let fontType = FONT_TYPE_BUILTIN;
        if (Adafruit_GFX.isGfxFont(f)) {
           fontType = FONT_TYPE_GFX;
        } else if (Adafruit_GFX.isOledFont(f)) {
           fontType = FONT_TYPE_OLED;
        } else {
           // default to built-in font
           f = null;
        }
        self.font = f;
        self.fontType = fontType;
        // set the values immediately but if there are chained tasks that depend on ordering, also add as a task.
        const doWork = _ => {
            self.font = f;
            self.fontType = fontType;
        }
        self._chain(doWork);
        return self;
    }

    /**********************************************************************/
    /*!
        @brief   Set text font color with custom background color
        @param   c   16-bit 5-6-5 Color to draw text with
        @param   bg  16-bit 5-6-5 Color to draw background/fill with
                     (Defaults to color if not specified)
        @returns  this
    */
    /**********************************************************************/
    setTextColor(c, bg = c) {
        const self = this;
        self.textcolor = c;
        self.textbgcolor = bg;
        // set the values immediately but if there are chained tasks that depend on ordering, also add as a task.
        const doWork = _ => {
            self.textcolor = c;
            self.textbgcolor = bg;
        }
        return self;
    }


    /**********************************************************************/
    /*!
        @brief   Get text font color
        @returns  Color to draw text with
    */
    /**********************************************************************/
    getTextColor() {
        return this.textcolor;
    }


    /**********************************************************************/
    /*!
        @brief   Get text background color
        @returns  Color to draw background/fill with
    */
    /**********************************************************************/
    getTextBgColor() {
        return this.textbgcolor;
    }


    // Draw a character
    /**************************************************************************/
    /*!
        @brief   Draw a single character
        @param    x   Bottom left corner x coordinate
        @param    y   Bottom left corner y coordinate
        @param    letter The 8-bit ascii character;
        @param    color 16-bit 5-6-5 Color to draw chraracter with
        @param    bg 16-bit 5-6-5 Color to fill background with (if same as color, no background)
        @param    size_x  Font magnification level in X-axis, 1 is 'original' size
        @param    size_y  Font magnification level in Y-axis, 1 is 'original' size
                  (Defaults to size_x if not specified)
        @returns  this
    */
    /**************************************************************************/
    drawChar(x, y, letterOrByte, color, bg, size_x = 1, size_y = size_x) {
        const self = this;
        switch(self.fontType) {
            case FONT_TYPE_BUILTIN:
            default:
                self._drawCharBuiltInFont(x, y, letterOrByte, color, bg, size_x, size_y);
                break;
            case FONT_TYPE_OLED:
                self._drawCharOledFont(x, y, letterOrByte, color, bg, size_x, size_y);
                break;
            case FONT_TYPE_GFX:
                ret = self._drawCharGFXFont(x, y, letterOrByte, color, bg, size_x, size_y);
                break;
        }
        return self;
    }


    /**************************************************************************/
    /*!
        @brief   Draw a single character with builtin font
        @param    x   Bottom left corner x coordinate
        @param    y   Bottom left corner y coordinate
        @param    letter The 8-bit ascii character;
        @param    color 16-bit 5-6-5 Color to draw chraracter with
        @param    bg 16-bit 5-6-5 Color to fill background with (if same as color, no background)
        @param    size_x  Font magnification level in X-axis, 1 is 'original' size
        @param    size_y  Font magnification level in Y-axis, 1 is 'original' size
                  (Defaults to size_x if not specified)
        @returns  this
    */
    /**************************************************************************/
    _drawCharBuiltInFont(x, y, letterOrByte, color, bg, size_x = 1, size_y = size_x) {
        const self = this,
            _width = self._width,
            _height = self._height,
            _cp437 = self._cp437;
        let c = ((typeof letterOrByte != "string") ? letterOrByte : (letterOrByte + " ").charCodeAt(0)) & 0xFF;

        if (!((x >= _width) ||               // Clip right
            (y >= _height) ||                // Clip bottom
            ((x + 6 * size_x - 1) < 0) ||    // Clip left
            ((y + 8 * size_y - 1) < 0)))  {  // Clip top

            // Inside clipping region
            if (!_cp437 && (c >= 176)) {
                c++; // Handle 'classic' charset behavior
            }

            self.startWrite();
            for (let i = 0; i < 5; i++) { // Char bitmap = 5 columns
                let line = BUILTIN_FONT[c * 5 + i];
                for (let j = 0; j < 8; j++, line >>= 1) {
                    if (line & 1) {
                        if (size_x == 1 && size_y == 1)
                            self.writePixel(x + i, y + j, color);
                        else
                            self.writeFillRect(x + i * size_x, y + j * size_y, size_x, size_y, color);
                    } else if (bg != color) {
                        if (size_x == 1 && size_y == 1)
                            self.writePixel(x + i, y + j, bg);
                        else
                            self.writeFillRect(x + i * size_x, y + j * size_y, size_x, size_y, bg);
                    }
                }
            }

            if (bg != color) { // If opaque, draw vertical line for last column
                if (size_x == 1 && size_y == 1)
                    self.writeFastVLine(x + 5, y, 8, bg);
                else
                    self.writeFillRect(x + 5 * size_x, y, size_x, 8 * size_y, bg);
            }
            self.endWrite();
        }
        return self;
    }


    /**************************************************************************/
    /*!
        @brief  Print one byte/character of data, used to support print()
                for Built-In Font.
        @param  letterOrByte  The 8-bit ascii character to write
        @returns  this
    */
    /**************************************************************************/
    _writeBuiltInFont(letterOrByte) {
        const self = this,
            wrap = self.wrap,
            _width = self._width,
            textsize_x = self.textsize_x,
            textsize_y = self.textsize_y,
            textcolor = self.textcolor,
            textbgcolor = self.textbgcolor;

        let cursor_x = self.cursor_x,
            cursor_y = self.cursor_y,
            c = ((typeof letterOrByte == "string") ? (letterOrByte + " ").charCodeAt(0) : letterOrByte) & 0xFF;

        const charWidth = 6;
        const charHeight = 8;
        if (c == 0x0A) {                // Newline?
            cursor_x = 0;               // Reset x to zero,
            cursor_y += textsize_y * charHeight; // advance y one line
        } else if (c != 0x0D) {         // Ignore carriage returns
            if (wrap && ((cursor_x + textsize_x * charWidth) > _width)) { // Off right?
                cursor_x = 0;                                       // Reset x to zero,
                cursor_y += textsize_y * charHeight; // advance y one line
            }
            self._drawCharBuiltInFont(cursor_x, cursor_y, c, textcolor, textbgcolor, textsize_x, textsize_y);
            cursor_x += textsize_x * charWidth; // Advance x one char
        }

        // update cursor position without function call.
        self.cursor_x = cursor_x;
        self.cursor_y = cursor_y;
        return self;
    }


    /**************************************************************************/
    /*!
        @brief   Draw a single character using an Oled Font (oled-font-pack)
        @param    x   Bottom left corner x coordinate
        @param    y   Bottom left corner y coordinate
        @param    letter The 8-bit ascii character;
        @param    color 16-bit 5-6-5 Color to draw chraracter with
        @param    bg 16-bit 5-6-5 Color to fill background with (if same as color, no background)
        @param    size_x  Font magnification level in X-axis, 1 is 'original' size
        @param    size_y  Font magnification level in Y-axis, 1 is 'original' size
                  (Defaults to size_x if not specified)
        @returns  this
    */
    /**************************************************************************/
    _drawCharOledFont(x, y, letterOrByte, color, bg, size_x = 1, size_y = size_x) {
        const self = this,
            _width = self._width,
            _height = self._height,
            _cp437 = self._cp437,
            fontType = self.fontType,
            font = self.font;
        let c = ((typeof letterOrByte != "string") ? letterOrByte : (letterOrByte + " ").charCodeAt(0)) & 0xFF;
        const charBuf = Adafruit_GFX._findOledCharBuf(font, letterOrByte);
        // look up the position of the char, pull out the buffer slice
        if (charBuf) {
            const charWidth = font["width"];
            const charHeight = font["height"];
            if (!((x >= _width) ||               // Clip right
                (y >= _height) ||                // Clip bottom
                ((x + charWidth * size_x - 1) < 0) ||    // Clip left
                ((y + charHeight * size_y - 1) < 0)))  {  // Clip top

                // read the bits in the bytes that make up the char
                const byteArray = Adafruit_GFX._readOledCharBytes(charBuf, charHeight);

                self.startWrite();
                // draw the entire character
                for (let i = 0; i < byteArray.length; i += 1) {
                    for (let j = 0; j < charHeight; j += 1) {
                        const pixelValue = byteArray[i][j];
                        if (pixelValue) {
                            if (size_x == 1 && size_y == 1)
                                self.writePixel(x + i, y + j, color);
                            else
                                self.writeFillRect(x + i * size_x, y + j * size_y, size_x, size_y, color);
                        } else if (bg != color) {
                            if (size_x == 1 && size_y == 1)
                                self.writePixel(x + i, y + j, bg);
                            else
                                self.writeFillRect(x + i * size_x, y + j * size_y, size_x, size_y, bg);
                        }
                    }
                }
                self.endWrite();
            }
        }
        return self;
    }


    /**************************************************************************/
    /*!
        @brief  Print one byte/character of data, used to support print()
                for Oled Font.
        @param  letterOrByte  The 8-bit ascii character to write
        @returns  this
    */
    /**************************************************************************/
    _writeOledFont(letterOrByte) {
        const self = this,
            font = self.font,
            wrap = self.wrap,
            _width = self._width,
            textsize_x = self.textsize_x,
            textsize_y = self.textsize_y,
            textcolor = self.textcolor,
            textbgcolor = self.textbgcolor;

        let cursor_x = self.cursor_x,
            cursor_y = self.cursor_y,
            c = ((typeof letterOrByte == "string") ? (letterOrByte + " ").charCodeAt(0) : letterOrByte) & 0xFF;

        const charWidth = font["width"];
        const charHeight = font["height"];
        if (c == 0x0A) {                // Newline?
            cursor_x = 0;               // Reset x to zero,
            cursor_y += textsize_y * charHeight; // advance y one line
        } else if (c != 0x0D) {         // Ignore carriage returns
            if (wrap && ((cursor_x + textsize_x * charWidth) > _width)) { // Off right?
                cursor_x = 0;                                       // Reset x to zero,
                cursor_y += textsize_y * charHeight; // advance y one line
            }
            self._drawCharOledFont(cursor_x, cursor_y, c, textcolor, textbgcolor, textsize_x, textsize_y);
            cursor_x += textsize_x * charWidth; // Advance x one char
        }

        // update cursor position without function call.
        self.cursor_x = cursor_x;
        self.cursor_y = cursor_y;
        return self;
    }


    /**************************************************************************/
    /*!
        @brief   Draw a single character with a GFX Font
        @param    x   Bottom left corner x coordinate
        @param    y   Bottom left corner y coordinate
        @param    letter The 8-bit ascii character;
        @param    color 16-bit 5-6-5 Color to draw chraracter with
        @param    bg 16-bit 5-6-5 Color to fill background with (if same as color, no background)
        @param    size_x  Font magnification level in X-axis, 1 is 'original' size
        @param    size_y  Font magnification level in Y-axis, 1 is 'original' size
                  (Defaults to size_x if not specified)
        @returns  this
    */
    /**************************************************************************/
    _drawCharGFXFont(x, y, letterOrByte, color, bg, size_x = 1, size_y = size_x) {
        const self = this,
            _width = self._width,
            _height = self._height,
            _cp437 = self._cp437,
            fontType = self.fontType,
            font = self.font;
        let c = ((typeof letterOrByte != "string") ? letterOrByte : (letterOrByte + " ").charCodeAt(0)) & 0xFF;

        // Custom font
        // Character is assumed previously filtered by write() to eliminate
        // newlines, returns, non-printable characters, etc.  Calling
        // drawChar() directly with 'bad' characters of font may cause mayhem!

        const first =  font["first"] & 0xFF;
        const glyph =  font["glyph"][c - (first & 0xFF)];
        const bitmap = font["bitmap"];

        let bo = glyph[0];
        const gw = glyph[1],
              gh = glyph[2],
              xa = glyph[3],
              xo = glyph[4],
              yo = glyph[5];

        let xx, yy, bits = 0, bit = 0;
        let xo16 = 0, yo16 = 0;

        if (size_x > 1 || size_y > 1) {
            xo16 = xo;
            yo16 = yo;
        }

        // Todo: Add character clipping here

        // NOTE: THERE IS NO 'BACKGROUND' COLOR OPTION ON CUSTOM FONTS.
        // THIS IS ON PURPOSE AND BY DESIGN.  The background color feature
        // has typically been used with the 'classic' font to overwrite old
        // screen contents with new data.  This ONLY works because the
        // characters are a uniform size; it's not a sensible thing to do with
        // proportionally-spaced fonts with glyphs of varying sizes (and that
        // may overlap).  To replace previously-drawn text when using a custom
        // font, use the getTextBounds() function to determine the smallest
        // rectangle encompassing a string, erase the area with fillRect(),
        // then draw new text.  This WILL infortunately 'blink' the text, but
        // is unavoidable.  Drawing 'background' pixels will NOT fix this,
        // only creates a new set of problems.  Have an idea to work around
        // this (a canvas object type for MCUs that can afford the RAM and
        // displays supporting setAddrWindow() and pushColors()), but haven't
        // implemented this yet.

        self.startWrite();
        for (yy = 0; yy < gh; yy++) {
            for (xx = 0; xx < gw; xx++) {
                if (!(bit++ & 7)) {
                    bits = bitmap[bo++];
                }
                if (bits & 0x80) {
                    if (size_x == 1 && size_y == 1) {
                        self.writePixel(x + xo + xx, y + yo + yy, color);
                    } else {
                        self.writeFillRect(x + (xo16 + xx) * size_x, y + (yo16 + yy) * size_y,size_x, size_y, color);
                    }
                }
                bits <<= 1;
            }
        }
        self.endWrite();

        return self;
    }


    /**************************************************************************/
    /*!
        @brief  Print one byte/character of data, used to support print()
                for GFX Font.
        @param  letterOrByte  The 8-bit ascii character to write
        @returns  this
    */
    /**************************************************************************/
    _writeGFXFont(letterOrByte) {
        const self = this,
            font = self.font,
            wrap = self.wrap,
            _width = self._width,
            textsize_x = self.textsize_x,
            textsize_y = self.textsize_y,
            textcolor = self.textcolor,
            textbgcolor = self.textbgcolor;
        let cursor_x = self.cursor_x,
            cursor_y = self.cursor_y,
            c = ((typeof letterOrByte == "string") ? (letterOrByte + " ").charCodeAt(0) : letterOrByte) & 0xFF;

        const yAdvance = font["yAdvance"] & 0xFF;
        if (c == 0x0A) {
            cursor_x = 0;
            cursor_y += (textsize_y * yAdvance);
        } else if (c != 0x0D) {
            const first = font["first"] & 0xFF;
            const last = font["last"] & 0xFF;
            if ((c >= first) && (c <= last)) {
                const glyph = font["glyph"][c - first];
                const bo = glyph[0],
                      gw = glyph[1],
                      gh = glyph[2],
                      xa = glyph[3],
                      xo = glyph[4],
                      yo = glyph[5];
                if ((gw > 0) && (gh > 0)) { // Is there an associated bitmap?
                    if (wrap && ((cursor_x + textsize_x * (xo + gw)) > _width)) {
                        cursor_x = 0;
                        cursor_y += (textsize_y * yAdvance);
                    }
                    self._drawCharGFXFont(cursor_x, cursor_y, c, textcolor, textbgcolor, textsize_x, textsize_y);
                }
                cursor_x += (xa * textsize_x);
            }
        }

        // update cursor position without function call.
        self.cursor_x = cursor_x;
        self.cursor_y = cursor_y;
        return self;
    }


    /**************************************************************************/
    /*!
        @brief  Print one byte/character of data, used to support print()
        @param  letterOrByte  The 8-bit ascii character to write
        @returns  this
    */
    /**************************************************************************/
    write(letterOrByte) {
        const self = this;
        switch(self.fontType) {
            case FONT_TYPE_BUILTIN:
            default:
                self._writeBuiltInFont(letterOrByte);
                break;
            case FONT_TYPE_OLED:
                self._writeOledFont(letterOrByte);
                break;
            case FONT_TYPE_GFX:
                self._writeGFXFont(letterOrByte);
                break;
        }
        return self;
    }


    /**************************************************************************/
    /*!
        @brief  Print text to the screen - See NodeJS util.format documentation
                for format parameters.
        @param  arguments - text to write or format + parameters.

        @returns  this
    */
    /**************************************************************************/
    print() {
        let text = util.format.apply(this, arguments);
        for (let i=0; i < text.length; i++) {
            // only support ASCII for now.
            this.write(text.charCodeAt(i) & 0xFF);
        }
        return this;
    }


    /**************************************************************************/
    /*!
        @brief  Print line of text to the screen - See NodeJS util.format
                documentation for format parameters.  If text does not end with
                newline (0x0A or \n) one is added.
        @param  text  The string to write
        @returns  this
    */
    /**************************************************************************/
    println() {
        let text = util.format.apply(this, arguments);
        // if does not end with newline, add one.
        const EOL = os.EOL;
        if (!text.endsWith(EOL)) text += EOL;
        for (let i=0; i < text.length; i++) {
            // only support ASCII for now.
            this.write(text.charCodeAt(i) & 0xFF);
        }
        return this;
    }


    /**************************************************************************/
    /*!
        @brief  Helper to determine size of a character with current font/size.
                Broke this out as it's used by both the PROGMEM- and RAM-resident
                getTextBounds() functions.
        @param  c     The ASCII character in question
        @param  bounds - Object consisting of the following fields.
                x     x location of character. Value is modified by
                      this function to advance to next character.
                y     y location of character. Value is modified by
                      this function to advance to next character.
                minx  minimum X coordinate, passed in to AND returned
                      by this function -- this is used to incrementally build a
                      bounding rectangle for a string.
                miny  minimum Y coord, passed in AND returned.
                maxx  maximum X coord, passed in AND returned.
                maxy  maximum Y coord, passed in AND returned.
        @returns  this
   */
    /**************************************************************************/
    _charBoundsBuiltInFont(letterOrByte, bounds) {
        const self = this,
            wrap = self.wrap,
            _width = self._width,
            textsize_x = self.textsize_x,
            textsize_y = self.textsize_y;

        // expand bounds to local variables.
        let x = bounds["x"],
            y = bounds["y"],
            minx = bounds["minx"],
            miny = bounds["miny"],
            maxx = bounds["maxx"],
            maxy = bounds["maxy"];;
        let c = ((typeof letterOrByte == "string") ? (letterOrByte + " ").charCodeAt(0) : letterOrByte) & 0xFF;

        const charWidth = 6;
        const charHeight = 8;
        if (c == 0x0A) {        // Newline?
            x = 0;               // Reset x to zero,
            y += textsize_y * charHeight; // advance y one line
        // min/max x/y unchanged -- that waits for next 'normal' character
        } else if (c != 0x0D) { // Normal char; ignore carriage returns
            if (wrap && ((x + textsize_x * charWidth) > _width)) { // Off right?
                x = 0;                                       // Reset x to zero,
                y += textsize_y * charHeight;                         // advance y one line
            }
            let x2 = x + textsize_x * charWidth - 1, // Lower-right pixel of char
                y2 = y + textsize_y * charHeight - 1;
            if (x2 > maxx)  maxx = x2; // Track max x, y
            if (y2 > maxy) maxy = y2;
            if (x < minx)   minx = x; // Track min x, y
            if (y < miny)   miny = y;
            x += textsize_x * charWidth; // Advance x one char
        }
        // Update the bounds object.
        Object.assign(bounds, {x, y, minx, miny, maxx, maxy});
        return self;
    }


    /**************************************************************************/
    /*!
        @brief  Helper to determine size of a character with current font/size.
                Broke this out as it's used by both the PROGMEM- and RAM-resident
                getTextBounds() functions.
        @param  c     The ASCII character in question
        @param  bounds - Object consisting of the following fields.
                x     x location of character. Value is modified by
                      this function to advance to next character.
                y     y location of character. Value is modified by
                      this function to advance to next character.
                minx  minimum X coordinate, passed in to AND returned
                      by this function -- this is used to incrementally build a
                      bounding rectangle for a string.
                miny  minimum Y coord, passed in AND returned.
                maxx  maximum X coord, passed in AND returned.
                maxy  maximum Y coord, passed in AND returned.
        @returns  this
    */
    /**************************************************************************/
    _charBoundsGFXFont(letterOrByte, bounds) {
        const self = this,
            font = self.font,
            wrap = self.wrap,
            _width = self._width,
            textsize_x = self.textsize_x,
            textsize_y = self.textsize_y;

        // expand bounds to local variables.
        let x = bounds["x"],
            y = bounds["y"],
            minx = bounds["minx"],
            miny = bounds["miny"],
            maxx = bounds["maxx"],
            maxy = bounds["maxy"];;
        let c = ((typeof letterOrByte == "string") ? (letterOrByte + " ").charCodeAt(0) : letterOrByte) & 0xFF;

        const yAdvance = font["yAdvance"] & 0xFF;
        if (c == 0x0A) { // Newline?
            x = 0;        // Reset x to zero, advance y by one line
            y += textsize_y * yAdvance;
        } else if (c != 0x0D) { // Not a carriage return; is normal char
            const first = font["first"] & 0xFF;
            const last = font["last"] & 0xFF;
            if ((c >= first) && (c <= last)) { // Char present in this font?
                const glyph = font["glyph"][c - first];
                const bo = glyph[0],
                      gw = glyph[1],
                      gh = glyph[2],
                      xa = glyph[3],
                      xo = glyph[4],
                      yo = glyph[5];

                if (wrap && ((x + (((xo + gw) & 0xFFFF) * textsize_x)) > _width)) {
                    x = 0; // Reset x to zero, advance y by one line
                    y += textsize_y * yAdvance;
                }
                let tsx = textsize_x & 0xFFFF,
                    tsy = textsize_y & 0xFFFF,
                    x1 = x + xo * tsx,
                    y1 = y + yo * tsy,
                    x2 = x1 + gw * tsx - 1,
                    y2 = y1 + gh * tsy - 1;
                if (x1 < minx)  minx = x1;
                if (y1 < miny)  miny = y1;
                if (x2 > maxx)  maxx = x2;
                if (y2 > maxy)  maxy = y2;
                x += xa * tsx;
            }
        }
        // Update the bounds object.
        Object.assign(bounds, {x, y, minx, miny, maxx, maxy});
        return self;
    }


    /**************************************************************************/
    /*!
        @brief  Helper to determine size of a character with current font/size.
                Broke this out as it's used by both the PROGMEM- and RAM-resident
                getTextBounds() functions.
        @param  c     The ASCII character in question
        @param  bounds - Object consisting of the following fields.
                x     x location of character. Value is modified by
                      this function to advance to next character.
                y     y location of character. Value is modified by
                      this function to advance to next character.
                minx  minimum X coordinate, passed in to AND returned
                      by this function -- this is used to incrementally build a
                      bounding rectangle for a string.
                miny  minimum Y coord, passed in AND returned.
                maxx  maximum X coord, passed in AND returned.
                maxy  maximum Y coord, passed in AND returned.
        @returns  this
    */
    /**************************************************************************/
    _charBoundsOledFont(letterOrByte, bounds) {
        const self = this,
            font = self.font,
            wrap = self.wrap,
            _width = self._width,
            textsize_x = self.textsize_x,
            textsize_y = self.textsize_y;

        // expand bounds to local variables.
        let x = bounds["x"],
            y = bounds["y"],
            minx = bounds["minx"],
            miny = bounds["miny"],
            maxx = bounds["maxx"],
            maxy = bounds["maxy"];;
        let c = ((typeof letterOrByte == "string") ? (letterOrByte + " ").charCodeAt(0) : letterOrByte) & 0xFF;

        const charWidth = font["width"];
        const charHeight = font["height"];
        if (c == 0x0A) {        // Newline?
            x = 0;               // Reset x to zero,
            y += textsize_y * charHeight; // advance y one line
        // min/max x/y unchanged -- that waits for next 'normal' character
        } else if (c != 0x0D) { // Normal char; ignore carriage returns
            if (wrap && ((x + textsize_x * charWidth) > _width)) { // Off right?
                x = 0;                                       // Reset x to zero,
                y += textsize_y * charHeight;                         // advance y one line
            }
            let x2 = x + textsize_x * charWidth - 1, // Lower-right pixel of char
                y2 = y + textsize_y * charHeight - 1;
            if (x2 > maxx)  maxx = x2; // Track max x, y
            if (y2 > maxy) maxy = y2;
            if (x < minx)   minx = x; // Track min x, y
            if (y < miny)   miny = y;
            x += textsize_x * charWidth; // Advance x one char
        }
        // Update the bounds object.
        Object.assign(bounds, {x, y, minx, miny, maxx, maxy});
        return self;
    }


    /**************************************************************************/
    /*!
        @brief  Helper to determine size of a character with current font/size.
                Broke this out as it's used by both the PROGMEM- and RAM-resident
                getTextBounds() functions.
        @param  c     The ASCII character in question
        @param  bounds - Object consisting of the following fields.
                x     x location of character. Value is modified by
                      this function to advance to next character.
                y     y location of character. Value is modified by
                      this function to advance to next character.
                minx  minimum X coordinate, passed in to AND returned
                      by this function -- this is used to incrementally build a
                      bounding rectangle for a string.
                miny  minimum Y coord, passed in AND returned.
                maxx  maximum X coord, passed in AND returned.
                maxy  maximum Y coord, passed in AND returned.
        @returns  this
    */
    /**************************************************************************/
    _charBounds(letterOrByte, bounds) {
        const self = this,
            fontType = self.fontType;

        switch(fontType) {
            case FONT_TYPE_BUILTIN:
            default:
               self._charBoundsBuiltInFont(letterOrByte, bounds);
               break;
            case FONT_TYPE_OLED:
               self._charBoundsOledFont(letterOrByte, bounds);
               break;
            case FONT_TYPE_GFX:
               self._charBoundsGFXFont(letterOrByte, bounds);
               break;
        }
    }

    /**************************************************************************/
    /*!
        @brief  Helper to determine size of a string with current font/size.
                Pass string and a cursor position, returns UL corner and W,H.
        @param  str  The ASCII string to measure
        @param  x    The current cursor X
        @param  y    The current cursor Y
        @return  bounds - Object consisting of the following fields.
                x    The boundary X coordinate, returned by function
                y    The boundary Y coordinate, returned by function
                w    The boundary width, returned by function
                h    The boundary height, returned by function
        @returns  this
    */
    /**************************************************************************/
    getTextBounds(str, x, y) {
        const self = this;

        // Initial position is cursor passed in.  Initial size is 0.
        let x1 = x, y1 = y, w = 0, h = 0;

        let minx = 0x7FFF, miny = 0x7FFF, maxx = -1, maxy = -1;
        const l = str.length;
        // Bound rect is intentionally initialized inverted, so 1st char sets it
        const bounds = {
            "x":x,
            "y":y,
            minx:0x7FFF, // Bound rect
            miny:0x7FFF,
            maxx:-1,
            maxy:-1
        };

        for (let i = 0; i < l; i++) {
            // _charBounds() modifies x/y to advance for each character,
            // and min/max x/y are updated to incrementally build bounding rect.
            this._charBounds(str.charCodeAt(i), bounds);
        }
        if (bounds.maxx >= bounds.minx) {     // If legit string bounds were found...
            x1 = bounds.minx;           // Update x1 to least X coord,
            w = bounds.maxx - bounds.minx + 1; // And w to bound rect width
        }
        if (bounds.maxy >= bounds.miny) { // Same for height
            y1 = bounds.miny;
            h = bounds.maxy - bounds.miny + 1;
        }
        // capture the bounding rectangle
        return {
            "x":x1,
            "y":y1,
            w,
            h
        };
    }


    /**************************************************************************/
    /*!
        @brief  Helper to locate the Glyph Buffer from Oled Font
        @returns  Array bytes for Glyph.
    */
    /**************************************************************************/
    static _findOledCharBuf(oledFont, letterOrByte) {
        const char = (typeof(letterOrByte) == "string" ? (letterOrByte + " ")[0] : String.fromCharCode(letterOrByte));
        const bytesEachChar = oledFont["width"];
        const index = oledFont["lookup"].indexOf(char);
        let ret = null;
        if (index >= 0) {
            const cBufPos = index * bytesEachChar;
            ret = oledFont.fontData.slice(cBufPos, cBufPos + bytesEachChar);
        }
        return ret;
    }


    /**************************************************************************/
    /*!
        @brief  Helper to read character bytes as bit array from Oled Font
        @returns  Array of bit arrays for on pixels.
    */
    /**************************************************************************/
    static _readOledCharBytes(byteArray, charHeight = 8) {
        let bitArr = [],
            bitCharArr = [];
        // loop through each byte supplied for a char
        for (let i = 0; i < byteArray.length; i += 1) {
            // set current byte
            let byte = byteArray[i];
            // read each byte
            for (let j = 0; j < charHeight; j += 1) {
                // shift bits right until all are read
                let bit = byte >>> j & 1;
                bitArr.push(bit);
            }
            // push to array containing flattened bit sequence
            bitCharArr.push(bitArr);
            // clear bits for next byte
            bitArr = [];
        }
        return bitCharArr;
    }


    /**************************************************************************/
    /*!
        @brief  Helper to determine if a font is OLED Font from oled-font-pack
        @returns  true if font is OLED Font
    */
    /**************************************************************************/
    static isOledFont(font) {
        if (!font) return false;
        let ret = true;
        ret &= OHOP.call(font, "width");
        ret &= OHOP.call(font, "height");
        ret &= OHOP.call(font, "fontData");
        ret &= OHOP.call(font, "lookup");
        return ret;
    }


    /**************************************************************************/
    /*!
        @brief  Helper to determine if a font is Adafruit GFX Font
        @returns  true if font is GFX Font
    */
    /**************************************************************************/
    static isGfxFont(font) {
        if (!font) return false;
        let ret = true;
        ret &= OHOP.call(font, "bitmap");
        ret &= OHOP.call(font, "glyph");
        ret &= OHOP.call(font, "first");
        ret &= OHOP.call(font, "last");
        ret &= OHOP.call(font, "yAdvance");
        return ret;
    }
}


module.exports = Adafruit_GFX;
