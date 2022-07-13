'use strict';
const LIB_LOCATION = "./lib/";

const CANVAS_LOCATION = LIB_LOCATION + "canvas/";
const GFXcanvas1Module = require(CANVAS_LOCATION + "GFXcanvas1.js");
const GFXcanvas8 = require(CANVAS_LOCATION + "GFXcanvas8.js");
const GFXcanvas16 = require(CANVAS_LOCATION + "GFXcanvas16.js");
const GFXcanvas16_RGB565 = require(CANVAS_LOCATION + "GFXcanvas16_RGB565.js");

const CORE_LOCATION = LIB_LOCATION + "core/";
const Adafruit_GFX = require(CORE_LOCATION + "Adafruit_GFX.js");

const DISPLAY_LOCATION = LIB_LOCATION + "display/";
const Display_Base = require(DISPLAY_LOCATION + "Display_Base.js");
const Adafruit_SPITFT = require(DISPLAY_LOCATION + "Adafruit_SPITFT.js");

const MIXINS_LOCATION = LIB_LOCATION + "mixins/";
const Mixin_I2C_Display = require(MIXINS_LOCATION + "Mixin_I2C_Display.js");
const Mixin_SPI_Display_Module = require(MIXINS_LOCATION + "Mixin_SPI_Display.js");
const Mixin_RBG565_Display_Render = require(MIXINS_LOCATION + "Mixin_RBG565_Display_Render.js");
const Mixin_RGB565_GFXcanvas16_Render = require(MIXINS_LOCATION + "Mixin_RGB565_GFXcanvas16_Render.js");

const UTILS_LOCATION = LIB_LOCATION + "utils/";
const UtilsModule = require(UTILS_LOCATION + "CommonUtils.js");

const Canvas = {...GFXcanvas1Module, GFXcanvas8, GFXcanvas16, GFXcanvas16_RGB565};
const Core = {Adafruit_GFX};
const Display = {Display_Base, Adafruit_SPITFT};
const Mixins = {Mixin_I2C_Display, ...Mixin_SPI_Display_Module, Mixin_RBG565_Display_Render, Mixin_RGB565_GFXcanvas16_Render};
const Utils = {...UtilsModule};

const UTILS_LOCATION = LIB_LOCATION + "fonts/";
const Fonts = require(FONTS_LOCATION + "FontProxy.js");

module.exports = {
    Canvas, Core, Display, Fonts, Mixins, Utils
}