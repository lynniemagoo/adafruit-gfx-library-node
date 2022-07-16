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

// Notes from original Adafruit CPP implementation.
// -------------------------------------------------------------------------
// GFXcanvas1, GFXcanvas8 and GFXcanvas16 (currently a WIP, don't get too
// comfy with the implementation) provide 1-, 8- and 16-bit offscreen
// canvases, the address of which can be passed to drawBitmap() or
// pushColors() (the latter appears only in a couple of GFX-subclassed TFT
// libraries at this time).  This is here mostly to help with the recently-
// added proportionally-spaced fonts; adds a way to refresh a section of the
// screen without a massive flickering clear-and-redraw...but maybe you'll
// find other uses too.  VERY RAM-intensive, since the buffer is in MCU
// memory and not the display driver...GXFcanvas1 might be minimally useful
// on an Uno-class board, but this and the others are much more likely to
// require at least a Mega or various recent ARM-type boards (recommended,
// as the text+bitmap draw can be pokey).  GFXcanvas1 requires 1 bit per
// pixel (rounded up to nearest byte per scanline), GFXcanvas8 is 1 byte
// per pixel (no scanline pad), and GFXcanvas16 uses 2 bytes per pixel (no
// scanline pad).
// NOT EXTENSIVELY TESTED YET.  MAY CONTAIN WORST BUGS KNOWN TO HUMANKIND.
// -------------------------------------------------------------------------

'use strict';
const CANVAS_LOCATION = "./";
const GFXcanvas16 = require(CANVAS_LOCATION + "GFXcanvas16.js");
const toInt = Math.trunc;

const ALPHA_MAX = 0xFF;

// This algorithm copied from here: https://stackoverflow.com/questions/18937701/combining-two-16-bits-rgb-colors-with-alpha-blending
function _alphaBlend565(fg, bg, alpha)
{
    // Split foreground into components
    const fg_r = fg >> 11;
    const fg_g = (fg >> 5) & ((1 << 6) - 1);
    const fg_b = fg & ((1 << 5) - 1);

    // Split background into components
    const bg_r = bg >> 11;
    const bg_g = (bg >> 5) & ((1 << 6) - 1);
    const bg_b = bg & ((1 << 5) - 1);

    // Alpha blend components
    const out_r = (fg_r * alpha + bg_r * (255 - alpha)) / 255;
    const out_g = (fg_g * alpha + bg_g * (255 - alpha)) / 255;
    const out_b = (fg_b * alpha + bg_b * (255 - alpha)) / 255;

    // Pack result
    return ((out_r << 11) | (out_g << 5) | out_b);
}


class GFXcanvas16_RGB565 extends GFXcanvas16 {

    constructor(options) {
        super(options);
        const self = this;
        self._alphaFloat = 1.0;
        self._alpha = ALPHA_MAX;
    }

    /**************************************************************************/
    /*!
        @brief  Set the alpha value for the Canvas - used in all drawing
                operations
        @param  alphaFloat   Value between 0.0 and 1.0 inclusive with 1.0
                             being fully opaque and 0.0 being fully transparent.
        @returns  this
    */
    /**************************************************************************/
    setAlpha(alphaFloat) {
        const self = this;
        if (isNaN(alphaFloat) || alphaFloat < 0.0 || alphaFloat > 1.0) throw new Error("Value for 'alpha' must be between 0.0 and 1.0");
        self._alphaFloat = alphaFloat;
        self._alpha = toInt(ALPHA_MAX * alphaFloat);
        return self;
    }

    /**************************************************************************/
    /*!
        @brief  get the alpha value for the Canvas - used in all drawing
                operations
        @returns  Floating point value between 0.0 and 1.0
    */
    /**************************************************************************/
    getAlpha() {
        return this._alphaFloat;
    }

    /**************************************************************************/
    /*!
        @brief  Draw a pixel to the canvas framebuffer
        @param  x   x coordinate
        @param  y   y coordinate
        @param  color 16-bit Color to fill with..
        @returns  this
    */
    /**************************************************************************/
    drawPixel(x, y, color, alpha = this._alpha) {
        const self = this,
            rotation = self.rotation,
            WIDTH = self.WIDTH,
            HEIGHT = self.HEIGHT,
            _width = self._width,
            _height = self._height,
            buffer = self._buffer;

            if ((x < 0) || (y < 0) || (x >= _width) || (y >= _height)) {
            return self;
        }

        let t;
        switch (rotation) {
            case 0:
            default:
                break;
            case 1:
                t = x;
                x = WIDTH - 1 - y;
                y = t;
                break;
            case 2:
                x = WIDTH - 1 - x;
                y = HEIGHT - 1 - y;
                break;
            case 3:
                t = x;
                x = y;
                y = HEIGHT - 1 - t;
                break;
        }

        color &= 0xFFFF;
        const bufferIdx = y * WIDTH + x;
        buffer[bufferIdx] = (alpha === ALPHA_MAX) ? color : _alphaBlend565(color, buffer[bufferIdx], alpha);
        return self;
    }


    /**************************************************************************/
    /*!
        @brief  Fill the framebuffer completely with one color
        @param  color 16-bit Color to fill with.
        @returns  this
    */
    /**************************************************************************/
    fillScreen(color, alpha = this._alpha) {
        const self = this,
            buffer = self._buffer;
        if (buffer) {
            color &= 0xFFFF;

            // Support alpha.
            if (alpha === ALPHA_MAX) {
                buffer.fill(color);
            } else {
                let idx, l = buffer.length;
                for(idx = 0; idx < l; idx++) {
                    buffer[idx] = _alphaBlend565(color, buffer[idx], alpha);
                }
            }
        }
        return self;
    }


    /**************************************************************************/
    /*!
        @brief    Speed optimized vertical line drawing into the raw canvas buffer
        @param    x   Line horizontal start point
        @param    y   Line vertical start point
        @param    h   length of vertical line to be drawn, including first point
        @param    color   16-bit Color to fill with.
        @returns  this
    */
    /**************************************************************************/
    _drawFastRawVLine(x, y, h, color) {
        const self = this,
            WIDTH = self.WIDTH,
            alpha = self._alpha,
            buffer = self._buffer;

        let idx = y * WIDTH + x;

        color &= 0xFFFF;

        if (alpha === ALPHA_MAX) {
            // 100% opacity
            for(let i = 0; i < h; i++, idx += WIDTH) {
                buffer[idx] = color;
            }
        } else {
            for(let i = 0; i < h; i++, idx += WIDTH) {
                buffer[idx] = _alphaBlend565(color, buffer[idx], alpha);
            }
        }
        return self;
    }


    /**************************************************************************/
    /*!
        @brief    Speed optimized horizontal line drawing into the raw canvas buffer
        @param    x   Line horizontal start point
        @param    y   Line vertical start point
        @param    w   length of horizontal line to be drawn, including first point
        @param    color   16-bit Color to fill with.
        @returns  this
    */
    /**************************************************************************/
    _drawFastRawHLine(x, y, w, color) {
        // x & y already in raw (rotation 0) coordinates, no need to transform.
        const self = this,
            WIDTH = self.WIDTH,
            buffer = self._buffer,
            idxStart = y * WIDTH + x,
            idxEnd = idxStart + w,
            alpha = self._alpha;

        color &= 0xFFFF;

        if (alpha === ALPHA_MAX) {
            // 100% opacity
            buffer.fill(color, idxStart, idxEnd);
        } else {
            for (let idx = idxStart; idx < idxEnd; idx++) {
                buffer[idx] = _alphaBlend565(color, buffer[idx], alpha);
            }
        }
        return self;
    }
}

module.exports = GFXcanvas16_RGB565;

