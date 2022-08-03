'use strict';
//===============================================================
// No Adafruit equivalent
//===============================================================
const UTILS_LOCATION = "../utils/";
const ColorUtils_RGB565 = require(UTILS_LOCATION + "ColorUtils_RGB565.js");

const OHOP = Object.prototype.hasOwnProperty;
const ALPHA_MAX = 0xFF;

const toStringHexRGB565 = ColorUtils_RGB565.toStringHexRGB565

const MODULE_NAME = "Mixin_RGB565_Bresenham_Render";
const _debug = false;

const {
    plotLine, plotLineAA, plotLineWidth,
    plotCircle, plotCircleAA, /*cheating: no plotCircleWidth() exists*/ plotRotatedEllipseRect,
    plotEllipseRect, plotEllipseRectAA, plotEllipseRectWidth,
    plotRotatedEllipse, plotRotatedEllipseAA, plotRotatedEllipseWidth,
    plotQuadBezier, plotQuadBezierAA, /* cheating: no plotQuadBezierWidth() exists use plotQuadRationalBezierWidth */
    plotQuadRationalBezier, plotQuadRationalBezierAA, plotQuadRationalBezierWidth,
    plotCubicBezier, plotCubicBezierAA, plotCubicBezierWidth

    /* Used only internally or not exposed
    plotEllipse, // Helper not used by html page
    plotQuadRationalBezierSeg, plotQuadRationalBezierWidthSeg,
    plotQuadBezierSeg, plotQuadBezierSegAA,
    plotCubicBezierSeg, plotCubicBezierSegAA, plotCubicBezierSegWidth,
    plotQuadRationalBezierSegAA,
    plotRotatedEllipseRectAA, plotRotatedEllipseRectWidth, // not used by html page.
    */
} = require("./bresenham_internal.js");


const Mixin_RGB565_Bresenham_Render = Base => class extends Base {


    constructor(options) {
        super(options);
        const self = this;
        self.draw = {
            antialias:false,
            width:1.0
        };
    }

    /**************************************************************************/
    /*!
        @brief  Set the default drawing options.
        @param  options   object with 'width' and/or 'antialias' values
        @returns  this
    */
    /**************************************************************************/
    setDrawOptions({width = this.draw.width, antialias=this.draw.antialias} = {}) {
        const self = this;
        if (width <= 0.0) throw new Error("width must be > 0");
        self.draw.width = width;
        self.draw.antialias = !! antialias;
        return self;
    }


    /**************************************************************************/
    /*!
        @brief  Set the default drawing antialias value.
        @param  aFlag   Boolean value true or false.
        @returns  this
    */
    /**************************************************************************/
    setDrawAntialias(aFlag) {
        const self = this;
        self.draw.antialias = !! aFlag;
        return self;
    }

    /**************************************************************************/
    /*!
        @brief  Get the default drawing antialias value.
        @returns  Boolean value true or false.
    */
    /**************************************************************************/
    getDrawAntialias() {
        return this.draw.antialias;
    }


    /**************************************************************************/
    /*!
        @brief  Set the default drawing width.
        @param  width  - Default width used for drawing operations.
        @returns  this
    */
    /**************************************************************************/
    setDrawWidth(width) {
        const self = this;
        if (width <= 0.0) throw new Error("width must be > 0");
        self.draw.width = width;
        return self;
    }

    /**************************************************************************/
    /*!
        @brief  Get the default drawing width.
        @returns  Default width used for drawing operations.
    */
    /**************************************************************************/
    getDrawWidth() {
        return this.draw.width;
    }

    drawRect(x0, y0, w, h, color, {width = this.draw.width, antialias = this.draw.antialias}) {
        this.drawLine(x0, y0,        x0 + w - 1, y0,         color, {width, antialias});
        this.drawLine(x0, y0 + h -1, x0 + w - 1, y0 + h - 1, color, {width, antialias});
        // Don't redraw corner pixels.
        y0+=width; h -=(2 * width);
        this.drawLine(x0,         y0, x0,         y0 + h - 1, color, {width, antialias});
        this.drawLine(x0 + w - 1, y0, x0 + w - 1, y0 + h - 1, color, {width, antialias});
        return this;
    }

    /**************************************************************************/
    /*!
        @brief    Draw a line with or without antialiasing
                  Clipping is responsibility of writePixel() implementation.
        @param    x0  Start point x coordinate
        @param    y0  Start point y coordinate
        @param    x1  End point x coordinate
        @param    y1  End point y coordinate
        @param    color 16-bit 5-6-5 Color to draw with
        @param    options {width = this.draw.width, antialias = this.draw.antialias}
        @returns  this
    */
    /**************************************************************************/
    drawLine(x0, y0, x1, y1, color, {width = this.draw.width, antialias = this.draw.antialias} = {}) {
        const self = this;
        const w = width, aa = antialias;
        _debug && console.log("%s::drawLine(x0:%o, y0:%o, x1:%o, y1:%o, color565:%s, aa:%o)", MODULE_NAME, x0, y0, x1, y1, toStringHexRGB565(color) , aa);
        const dc = new DeviceContext(self, color);
        self.startWrite();
        if (w == 1) {
            if (aa) {
                if((x0 == x1) || (y0 == y1)) {
                    // horizontal or vertical line.
                    _debug && console.log("==>plotLine(x0:%o, y0:%o, x1:%o, y1:%o)", x0, x1, y0, y1);
                    plotLine(dc, x0, y0, x1, y1);
                } else if (Math.abs(x1-x0) == Math.abs(y1-y0)) {
                    // Line slope is either +1 or -1.
                    _debug && console.log("==>plotLine(x0:%o, y0:%o, x1:%o, y1:%o)", x0, x1, y0, y1);
                    plotLine(dc, x0, y0, x1, y1);
                } else {
                    _debug && console.log("==>plotLineAA(x0:%o, y0:%o, x1:%o, y1:%o)", x0, x1, y0, y1);
                    plotLineAA(dc, x0, y0, x1, y1);
                }
            } else {
                _debug && console.log("==>plotLine(x0:%o, y0:%o, x1:%o, y1:%o)", x0, x1, y0, y1);
               plotLine(dc, x0, y0, x1, y1);
            }
        } else {
            _debug && console.log("==>plotLineWidth(x0:%o, y0:%o, x1:%o, y1:%o, w:%o)", x0, x1, y0, y1, w);
            plotLineWidth(dc, x0, y0, x1, y1, w);
        }
        self.endWrite();
        return self;
    }


    /**************************************************************************/
    /*!
        @brief    Draw a circle outline.
                  Clipping is responsibility of writePixel() implementation.
        @param    xm   Center-point x coordinate
        @param    ym   Center-point y coordinate
        @param    r   Radius of circle
        @param    color 16-bit 5-6-5 Color to draw with
        @param    options {width = this.draw.width, antialias = this.draw.antialias}
        @returns  this
    */
    /**************************************************************************/
    drawCircle(xm, ym, r, color, {width = this.draw.width, antialias = this.draw.antialias} = {}) {
        return this.plotCircle(xm, ym, r, color, {width, antialias});
    }

    /**************************************************************************/
    /*!
        @brief    Draw an ellipse outline.
                  Clipping is responsibility of writePixel() implementation.
        @param    xm   Center-point x coordinate
        @param    ym   Center-point y coordinate
        @param    rx   Radius x in pixels
        @param    ry   Radius y in pixels
        @param    color 16-bit 5-6-5 Color to draw with
        @param    options {width = this.draw.width, antialias = this.draw.antialias}
        @returns  this
    */
    /**************************************************************************/
    drawEllipse(xm, ym, rx, ry, color, {rotation = 0.0, width = this.draw.width, antialias = this.draw.antialias} = {}) {
        /*
        const x0 = xm - rx,
              y0 = ym - ry,
              x1 = xm + rx,
              y1 = ym + ry;
        return this.plotEllipseRect(x0, y0, x1, y1, color, {width, antialias});
        */
        return this.plotRotatedEllipse(xm, ym, rx, ry, rotation, color, {width, antialias});
    }

    /**************************************************************************/
    /*!
        @brief    Draw a rotated ellipse outline.
                  Clipping is responsibility of writePixel() implementation.
        @param    xm   Center-point x coordinate
        @param    ym   Center-point y coordinate
        @param    rx   Radius x in pixels
        @param    ry   Radius y in pixels
        @param    rad  Angle(radians) to rotate
        @param    color 16-bit 5-6-5 Color to draw with
        @param    options {width = this.draw.width, antialias = this.draw.antialias}
        @returns  this
    */
    /**************************************************************************/
    drawRotatedEllipse(xm, ym, rx, ry, rad, color, {width = this.draw.width, antialias = this.draw.antialias} = {}) {
        return this.plotRotatedEllipse(xm, ym, rx, ry, rad, color, {width, antialias});
    }

    /**************************************************************************/
    /*!
        @brief    Draw an ellipse within a rectangle of specified width.
                  Clipping is responsibility of writePixel() implementation.
        @param    x0  Left x coordinate
        @param    y0  Top  y coordinate
        @param    x1  Right x coordinate
        @param    y1  Bottom y coordinate
        @param    color 16-bit 5-6-5 Color to draw with
        @param    options {width = this.draw.width, antialias = this.draw.antialias}
        @returns  this
    */
    /**************************************************************************/
    drawEllipseRect(x0, y0, x1, y1, color, {width = this.draw.width, antialias = this.draw.antialias} = {}) {
        return this.plotEllipseRect(x0, y0, x1, y1, color, {width, antialias});
    }

    /**************************************************************************/
    /*!
        @brief    Draw a limited quadratic bezier curve using 3 points.
                  Clipping is responsibility of writePixel() implementation.
        @param    x0  Point1 x coordinate - start
        @param    y0  Point1 y coordinate - start
        @param    x1  Point2 x coordinate - middle
        @param    y1  Point2 y coordinate - middle
        @param    x2  Point3 x coordinate - end
        @param    y2  Point3 y coordinate - end
        @param    color 16-bit 5-6-5 Color to draw with
        @param    options {width = this.draw.width, antialias = this.draw.antialias}
        @returns  this
    */
    /**************************************************************************/
    drawQuadraticBezier(x0, y0, x1, y1, x2, y2, color, {width = this.draw.width, antialias = this.draw.antialias} = {}) {
        return this.plotQuadraticBezier(x0, y0, x1, y1, x2, y2, color, {width, antialias});
    }

    /**************************************************************************/
    /*!
        @brief    Draw a quadratic rational bezier curve using 3 points.
                  Clipping is responsibility of writePixel() implementation.
        @param    x0  Point1 x coordinate - start
        @param    y0  Point1 y coordinate - start
        @param    x1  Point2 x coordinate - middle
        @param    y1  Point2 y coordinate - middle
        @param    x2  Point3 x coordinate - end
        @param    y2  Point3 y coordinate - end
        @param    weight - floating point value (usually 1.0 from original web page http://members.chello.at/~easyfilter/canvas.html)
        @param    color 16-bit 5-6-5 Color to draw with
        @param    options {width = this.draw.width, antialias = this.draw.antialias}
        @returns  this
    */
    /**************************************************************************/
    drawQuadraticRationalBezier(x0, y0, x1, y1, x2, y2, weight, color, {width = this.draw.width, antialias = this.draw.antialias} = {}) {
        return this.plotQuadraticRationalBezier(x0, y0, x1, y1, x2, y2, weight, color, {width, antialias});
    }


    /**************************************************************************/
    /*!
        @brief    Draw a cubic bezier curve using 4 points.
                  Clipping is responsibility of writePixel() implementation.
        @param    x0  Point1 x coordinate - start
        @param    y0  Point1 y coordinate - start
        @param    x1  Point2 x coordinate - middle
        @param    y1  Point2 y coordinate - middle
        @param    x2  Point3 x coordinate - middle
        @param    y2  Point3 y coordinate - middle
        @param    x3  Point3 x coordinate - end
        @param    y3  Point3 y coordinate - end
        @param    color 16-bit 5-6-5 Color to draw with
        @param    options {width = this.draw.width, antialias = this.draw.antialias}
        @returns  this
    */
    /**************************************************************************/
    drawCubicBezier(x0, y0, x1, y1, x2, y2, x3, y3, color, {width = this.draw.width, antialias = this.draw.antialias} = {}) {
        return this.plotCubicBezier(x0, y0, x1, y1, x2, y2, x3, y3, color, {width, antialias});
    }

    /**************************************************************************/
    /*!
        @brief    Draw a line with or without antialiasing
                  Clipping is responsibility of writePixel() implementation.
        @param    x0  Start point x coordinate
        @param    y0  Start point y coordinate
        @param    x1  End point x coordinate
        @param    y1  End point y coordinate
        @param    color 16-bit 5-6-5 Color to draw with
        @param    antialias boolean value default(false)
        @returns  this
    */
    /**************************************************************************/
    drawLineOrig(x0, y0, x1, y1, color, antialias = this.draw.antialias) {
        const self = this;
        const aa = antialias;
        _debug && console.log("%s::drawLine(x0:%o, y0:%o, x1:%o, y1:%o, color565:%s, aa:%o)", MODULE_NAME, x0, y0, x1, y1, toStringHexRGB565(color) , aa);
        const dc = new DeviceContext(self, color);
        self.startWrite();
        if ((x0 == x1) || (y0 == y1) || !aa) {
            // Draw line without antialiasing in superclass.
            //super.drawLine(x0, y0, x1, y1, color);
            plotLine(dc, x0, y0, x1, y1);
        } else if (Math.abs(x1-x0) == Math.abs(y1-y0)) {
            // We get here antialias is true.
            // Check if we have a slope that is either +1 or -1.
            // If so, Draw line without antialiasing in superclass.
            //super.drawLine(x0, y0, x1, y1, color);
            plotLine(dc, x0, y0, x1, y1);
        } else {
            plotLineAA(dc, x0, y0, x1, y1);
        }
        self.endWrite();
        return self;
    }


    /**************************************************************************/
    /*!
        @brief    Plot a circle outline with options
                  Clipping is responsibility of writePixel() implementation.
        @param    xm   Center-point x coordinate
        @param    ym   Center-point y coordinate
        @param    r   Radius of circle
        @param    color 16-bit 5-6-5 Color to draw with
        @param    options {width = this.draw.width, antialias = this.draw.antialias}
        @returns  this
    */
    /**************************************************************************/
    plotCircle(xm, ym, r, color, {width = this.draw.width, antialias = this.draw.antialias} = {}) {
        const self = this;
        const w = width, aa = antialias;
        _debug && console.log("%s::plotCircle(xm:%o, ym:%o, r:%o, color565:%s, w:%o, aa:%o)", MODULE_NAME, xm, ym, r, toStringHexRGB565(color), w, antialias);
        const dc = new DeviceContext(self, color);
        self.startWrite();
        if (!aa && (w == 1)) {
            _debug && console.log("==>plotCircle(xm:%o, ym:%o, r:%o)", xm, ym, r);
            plotCircle(dc, xm, ym, r);
        } else {
            const x0 = xm - r,
                  y0 = ym - r,
                  x1 = xm + r,
                  y1 = ym + r;
            _debug && console.log("==>plotEllipseRectWidth(x0:%o, y0:%o, x1:%o, y1:%o, w:%o)", x0, y0, x1, y1, w);
            // if w < 1.5 plotEllipseRectWidth will use plotEllipsRectAA.
            plotEllipseRectWidth(dc, x0, y0, x1, y1, w);
        }
        self.endWrite();
        return self;
    }


    /**************************************************************************/
    /*!
        @brief    Plot an ellipse within a rectangle of specified width.
                  Clipping is responsibility of writePixel() implementation.
        @param    x0  Left x coordinate
        @param    y0  Top  y coordinate
        @param    x1  Right x coordinate
        @param    y1  Bottom y coordinate
        @param    color 16-bit 5-6-5 Color to draw with
        @param    options {width = this.draw.width, antialias = this.draw.antialias}
        @returns  this
    */
    /**************************************************************************/
    plotEllipseRect(x0, y0, x1, y1, color, {width = this.draw.width, antialias = this.draw.antialias} = {}) {
        const self = this;
        const w = width, aa = antialias;
        _debug && console.log("%s::drawEllipseRectWidth(x0:%o, y0:%o, x1:%o, y1:%o, color565:%s, w:%o, aa:%o)", MODULE_NAME, x0, y0, x1, y1, toStringHexRGB565(color), w, aa);
        const dc = new DeviceContext(self, color);
        self.startWrite();
        if (!aa && (w == 1)) {
            _debug && console.log("==>plotEllipseRect(x0:%o, y0:%o, x1:%o, y1:%o)", x0, y0, x1, y1);
            plotEllipseRect(dc, x0, y0, x1, y1);
        } else {
            _debug && console.log("==>plotEllipseRectWidth(x0:%o, y0:%o, x1:%o, y1:%o, w:%o)", x0, y0, x1, y1, w);
            // if width < 1.5 plotEllipseRectWidth will use plotEllipsRectAA.
            plotEllipseRectWidth(dc, x0, y0, x1, y1, w);
        }
        self.endWrite();
        return self;
    }


    /**************************************************************************/
    /*!
        @brief    Plot a rotated ellipse.
                  Clipping is responsibility of writePixel() implementation.
        @param    x0  Left x coordinate
        @param    y0  Top  y coordinate
        @param    x1  Right x coordinate
        @param    y1  Bottom y coordinate
        @param    rad Angle(radians) for rotation
        @param    color 16-bit 5-6-5 Color to draw with
        @param    options {radians = 0, width = this.draw.width, antialias = this.draw.antialias}
        @returns  this
    */
    /**************************************************************************/
    plotRotatedEllipse(xm, ym, rx, ry, rad, color, {width = this.draw.width, antialias = this.draw.antialias} = {}) {
        const self = this;
        const w = width, aa = antialias;
        _debug && console.log("%s::plotRotatedEllipse(xm:%o, ym:%o, rx:%o, ry:%o, rad:%o color565:%s, w:%o, aa:%o)", MODULE_NAME, xm, ym, rx, ry, rad, toStringHexRGB565(color), w, aa);
        const dc = new DeviceContext(self, color);
        self.startWrite();
        if (!aa && (w == 1)) {
            _debug && console.log("==>plotRotatedEllipse(xm:%o, ym:%o, rx:%o, ry:%o, rad:%o)", xm, ym, rx, ry, rad);
            plotRotatedEllipse(dc, xm, ym, rx, ry, rad);
        } else {
            if (w == 1) {
                _debug && console.log("==>plotRotatedEllipseAA(xm:%o, ym:%o, rx:%o, ry:%o, rad:%o)", xm, ym, rx, ry, rad);
                plotRotatedEllipseAA(dc, xm, ym, rx, ry, rad);
            } else {
                _debug && console.log("==>plotRotatedEllipseWidth(xm:%o, ym:%o, rx:%o, ry:%o, rad:%o w:%o)", xm, ym, rx, ry, rad, w);
                plotRotatedEllipseWidth(dc, xm, ym, rx, ry, rad, w);
            }
        }
        self.endWrite();
        return self;
    }


    /**************************************************************************/
    /*!
        @brief    Plot a Quadratic Bezier using 3 points.
                  Clipping is responsibility of writePixel() implementation.
        @param    x0  Point1 x coordinate - start
        @param    y0  Point1 y coordinate - start
        @param    x1  Point2 x coordinate - middle
        @param    y1  Point2 y coordinate - middle
        @param    x2  Point3 x coordinate - end
        @param    y2  Point3 y coordinate - end
        @param    color 16-bit 5-6-5 Color to draw with
        @param    options {width = this.draw.width, antialias = this.draw.antialias}
        @returns  this
    */
    /**************************************************************************/
    plotQuadraticBezier(x0, y0, x1, y1, x2, y2, color, {width = this.draw.width, antialias = this.draw.antialias} = {}) {
        const self = this;
        const w = width, aa = antialias;
        _debug && console.log("%s::plotQuadraticBezier(x0:%o, y0:%o, x1:%o, y1:%o, x2:%o, y2:%o, color565:%s, w:%o, aa:%o)", MODULE_NAME, x0, y0, x1, y1, x2, y2, toStringHexRGB565(color), w, aa);
        const dc = new DeviceContext(self, color);
        self.startWrite();
        if (w == 1) {
            if (!aa) {
                _debug && console.log("==>plotQuadBezier(x0:%o, y0:%o, x1:%o, y1:%o, x2:%o, y2:%o)", x0, y0, x1, y1, x2, y2);
                plotQuadBezier(dc, x0, y0, x1, y1, x2, y2);
            } else {
                _debug && console.log("==>plotQuadBezierAA(x0:%o, y0:%o, x1:%o, y1:%o, x2:%o, y2:%o)", x0, y0, x1, y1, x2, y2);
                plotQuadBezierAA(dc, x0, y0, x1, y1, x2, y2);
            }
        } else {
            const weight = 1;
            _debug && console.log("==>plotQuadRationalBezierWidth(x0:%o, y0:%o, x1:%o, y1:%o, x2:%o, y2:%o, weight:%o, w:%o)", x0, y0, x1, y1, x2, y2, weight, w);
            plotQuadRationalBezierWidth(dc, x0, y0, x1, y1, x2, y2, weight, w);
        }
        self.endWrite();
        return self;
    }

    /**************************************************************************/
    /*!
        @brief    Plot a Quadratic Rational Bezier using 3 points with a weight.
                  Clipping is responsibility of writePixel() implementation.
        @param    x0  Point1 x coordinate - start
        @param    y0  Point1 y coordinate - start
        @param    x1  Point2 x coordinate - middle
        @param    y1  Point2 y coordinate - middle
        @param    x2  Point3 x coordinate - end
        @param    y2  Point3 y coordinate - end
        @param    weight - floating point value (usually 1.0 from original web page http://members.chello.at/~easyfilter/canvas.html)
        @param    color 16-bit 5-6-5 Color to draw with
        @param    options {width = this.draw.width, antialias = this.draw.antialias}
        @returns  this
    */
    /**************************************************************************/
    plotQuadraticRationalBezier(x0, y0, x1, y1, x2, y2, weight, color, {width = this.draw.width, antialias = this.draw.antialias} = {}) {
        const self = this;
        const w = width, aa = antialias;
        _debug && console.log("%s::plotQuadraticBezier(x0:%o, y0:%o, x1:%o, y1:%o, x2:%o, y2:%o, weight:%o, color565:%s, w:%o, aa:%o)", MODULE_NAME, x0, y0, x1, y1, x2, y2, weight, toStringHexRGB565(color), w, aa);
        const dc = new DeviceContext(self, color);
        self.startWrite();
        if (w == 1) {
            if (!aa) {
                _debug && console.log("==>plotQuadRationalBezier(x0:%o, y0:%o, x1:%o, y1:%o, x2:%o, y2:%o, weight:%o)", x0, y0, x1, y1, x2, y2, weight);
                plotQuadRationalBezier(dc, x0, y0, x1, y1, x2, y2);
            } else {
                _debug && console.log("==>plotQuadBezierAA(x0:%o, y0:%o, x1:%o, y1:%o, x2:%o, y2:%o, weight:%o)", x0, y0, x1, y1, x2, y2, weight);
                plotQuadRationalBezierAA(dc, x0, y0, x1, y1, x2, y2, weight);
            }
        } else {
            _debug && console.log("==>plotQuadRationalBezierWidth(x0:%o, y0:%o, x1:%o, y1:%o, x2:%o, y2:%o, weight:%o, w:%o)", x0, y0, x1, y1, x2, y2, weight, w);
            plotQuadRationalBezierWidth(dc, x0, y0, x1, y1, x2, y2, weight, w);
        }
        self.endWrite();
        return self;
    }

    /**************************************************************************/
    /*!
        @brief    Plot a Cubic Bezier using 4 points.
                  Clipping is responsibility of writePixel() implementation.
        @param    x0  Point1 x coordinate - start
        @param    y0  Point1 y coordinate - start
        @param    x1  Point2 x coordinate - middle
        @param    y1  Point2 y coordinate - middle
        @param    x2  Point3 x coordinate - middle
        @param    y2  Point3 y coordinate - middle
        @param    x3  Point3 x coordinate - end
        @param    y3  Point3 y coordinate - end
        @param    color 16-bit 5-6-5 Color to draw with
        @param    options {width = this.draw.width, antialias = this.draw.antialias}
        @returns  this
    */
    /**************************************************************************/
    plotCubicBezier(x0, y0, x1, y1, x2, y2, x3, y3, color, {width = this.draw.width, antialias = this.draw.antialias} = {}) {
        const self = this;
        const w = width, aa = antialias;
        _debug && console.log("%s::plotCubicBezier(x0:%o, y0:%o, x1:%o, y1:%o, x2:%o, y2:%o, x3:%o, y3:%o, color565:%s, w:%o, aa:%o)", MODULE_NAME, x0, y0, x1, y1, x2, y2, x3, y3, toStringHexRGB565(color), w, aa);
        const dc = new DeviceContext(self, color);
        self.startWrite();
        if (w == 1) {
            if (!aa) {
                _debug && console.log("==>plotCubicBezier(x0:%o, y0:%o, x1:%o, y1:%o, x2:%o, y2:%o, x3:%o, y3:%o)", x0, y0, x1, y1, x2, y2, x3, y3);
                plotCubicBezier(dc, x0, y0, x1, y1, x2, y2, x3, y3);
            } else {
                _debug && console.log("==>plotCubicBezierAA(x0:%o, y0:%o, x1:%o, y1:%o, x2:%o, y2:%o,x3:%o, y3:%o)", x0, y0, x1, y1, x2, y2, x3, y3);
                plotCubicBezierAA(dc, x0, y0, x1, y1, x2, y2, x3, y3);
            }
        } else {
            const weight = 1;
            _debug && console.log("==>plotCubicBezierWidth(x0:%o, y0:%o, x1:%o, y1:%o, x2:%o, y2:%o, x3:%o, y3:%o, w:%o)", x0, y0, x1, y1, x2, y2, x3, y3, w);
            plotCubicBezierWidth(dc, x0, y0, x1, y1, x2, y2, x3, y3, w);
        }
        self.endWrite();
        return self;
    }

    /**************************************************************************/
    /*!
        @brief    Plot an ellipse outline with options
                  Clipping is responsibility of writePixel() implementation.
        @param    xm   Center-point x coordinate
        @param    ym   Center-point y coordinate
        @param    rx   Radius x in pixels
        @param    ry   Radius y in pixels
        @param    color 16-bit 5-6-5 Color to draw with
        @param    options {width = this.draw.width, antialias = this.draw.antialias}
        @returns  this
    */
    /**************************************************************************/
    /*
    plotEllipse(xm, ym, rx, ry, color, {width = this.draw.width, antialias = this.draw.antialias} = {}) {
        const self = this;
        const w = width, aa = antialias;
        _debug && console.log("%s::plotEllipse(xm:%o, ym:%o, rx:%o, ry:%o, color565:%s, w:%o aa:%o)", MODULE_NAME, xm, ym, rx, ry, toStringHexRGB565(color), w, aa);
        const dc = new DeviceContext(self, color);
        const x0 = xm - rx,
              y0 = ym - ry,
              x1 = xm + rx,
              y1 = ym + ry;
        self.startWrite();
        if (!aa && (w == 1)) {
            _debug && console.log("==>plotEllipseRect(x0:%o, y0:%o, x1:%o, y1:%o, w:%o)", x0, y0, x1, y1, w);
            plotEllipseRect(dc, x0, y0, x1, y1);
        } else {
            _debug && console.log("==>plotEllipseRectWidth(x0:%o, y0:%o, x1:%o, y1:%o, w:%o)", x0, y0, x1, y1, w);
            // if w < 1.5 plotEllipseRectWidth will use plotEllipsRectAA.
            plotEllipseRectWidth(dc, x0, y0, x1, y1, w);
        }
        self.endWrite();
        return self;
    }
    */
};

class DeviceContext {
    constructor(device, color) {
        this._device = device;
        this._color = color;
        // If the device supports alpha, then use the value from the device, otherwize, ALPHA_MAX.
        this._alpha = OHOP.call(device, "_alpha") ? device._alpha : ALPHA_MAX;
    }

    assert(m) {
        console.log(m);
    }

    setPixel(x,y) {
        //console.log("DeviceContext.setPixel(x:%o, y:%o)", x, y);
        this._device.writePixel(x, y, this._color);
    }

    setPixelAA(x, y, aa) {
        //console.log("DeviceContext.setPixelAA(x:%o, y:%o aa:%o)", x, y, aa);
        const newAlpha = ((ALPHA_MAX - aa) * this._alpha) / ALPHA_MAX;
        this._device.writePixel(x, y, this._color, newAlpha & ALPHA_MAX);
    }
}


module.exports = Mixin_RGB565_Bresenham_Render;
