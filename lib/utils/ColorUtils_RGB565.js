'use strict';
const HTML_COLOR_CODE_PATTERN = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;

//===============================================================
// No Adafruit equivalent
//===============================================================
class ColorUtils_RGB565 {
    /**
     * Convert RGB 24 bit color to an array of bytes containing 16 bit color compatible with a display that requires RGB565.
     * @param {Integer} r
     * @param {Integer} g
     * @param {Integer} b
     */
    static convertRGBColorToRGB565(r, g, b) {
        const red = +r,
            green = +g,
            blue = +b;
        if (isNaN(red) || isNaN(green) || isNaN(blue) || red < 0 || red > 255 || green < 0 || green > 255 || blue < 0 || blue > 255) {
            throw new Error(`Rgb color ${r} ${g} ${b} is not a valid hexadecimal color`);
        }
        const MSB = (red & 0xF8 | green >>> 5);
        const LSB = ((green & 0x1C) << 3) | (blue >>> 3);
        return MSB << 8 | LSB
    }

    /**
     * Convert string containing web color code in RGB 24 bit color to an object with r,g,b field values.
     * @param {String} webColor in hex format #RRGGBB
     */
    static convertHtmlColorCodeToRGB565(htmlColorCode) {
        const result = HTML_COLOR_CODE_PATTERN.exec(htmlColorCode);
        if (result) {
            return ColorUtils_RGB565.convertRGBColorToRGB565(parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16));
        } else {
            throw new Error(`${htmlColorCode} is not a valid html color code string.`);
        }
    }

    static toStringHexRGB565(rgb565) {
        return "0x" + rgb565.toString(16).padStart(4,"0").toUpperCase();
    }

    static COLORS = {};
    static RGB565_COLORS = {};
    static HTML_COLOR_CODES = {};
}

// Color definitions RGB565 in int16 representation (Libraries shall reverse bytes for Little Endian as needed).
const RGB565_BLACK         = 0x0000;   ///<   0,   0,   0
const RGB565_NAVY          = 0x000F;   ///<   0,   0, 123
const RGB565_DARKGREEN     = 0x03E0;   ///<   0, 125,   0
const RGB565_DARKCYAN      = 0x03EF;   ///<   0, 125, 123
const RGB565_MAROON        = 0x7800;   ///< 123,   0,   0
const RGB565_PURPLE        = 0x780F;   ///< 123,   0, 123
const RGB565_OLIVE         = 0x7BE0;   ///< 123, 125,   0
const RGB565_LIGHTGREY     = 0xC618;   ///< 198, 195, 198
const RGB565_DARKGREY      = 0x7BEF;   ///< 123, 125, 123
const RGB565_BLUE          = 0x001F;   ///<   0,   0, 255
const RGB565_GREEN         = 0x07E0;   ///<   0, 255,   0
const RGB565_CYAN          = 0x07FF;   ///<   0, 255, 255
const RGB565_RED           = 0xF800;   ///< 255,   0,   0
const RGB565_MAGENTA       = 0xF81F;   ///< 255,   0, 255
const RGB565_YELLOW        = 0xFFE0;   ///< 255, 255,   0
const RGB565_WHITE         = 0xFFFF;   ///< 255, 255, 255
const RGB565_ORANGE        = 0xFD20;   ///< 255, 165,   0
const RGB565_GREENYELLOW   = 0xAFE5;   ///< 173, 255,  41
const RGB565_PINK          = 0xFC18;   ///< 255, 130, 198

// HTML Color code deviations to work with RGB565.
// NAVY         "#000080" -> "#00007B"
// DARKGREEN    "#006400" -> "#007D00"
// DARKCYAN     "#008B8B" -> "#007D7B"
// MAROON       "#808080" -> "#7B0000"
// PURPLE       "#800080" -> "#7B007B"
// OLIVE        "#808000" -> "#7B7D00"
// LIGHTGREY    "#D3D3D3" -> "#C6C3C6"
// DARKGREY     "#A9A9A9" -> "#7B7D7B"
// YELLOWGREEN  "#ADFF2F" -> "#ADFF29"
// PINK         "#FFC0CB" -> "#FF82C6"

const HTML_BLACK        = "#000000";
const HTML_NAVY         = "#00007B";
const HTML_DARKGREEN    = "#007D00";
const HTML_DARKCYAN     = "#007D7B";
const HTML_MAROON       = "#7B0000";
const HTML_PURPLE       = "#7B007B";
const HTML_OLIVE        = "#7B7D00";
const HTML_LIGHTGREY    = "#C6C3C6";
const HTML_DARKGREY     = "#7B7D7B";
const HTML_BLUE         = "#0000FF";
const HTML_GREEN        = "#00FF00";
const HTML_CYAN         = "#00FFFF";
const HTML_RED          = "#FF0000";
const HTML_MAGENTA      = "#FF00FF";
const HTML_YELLOW       = "#FFFF00";
const HTML_WHITE        = "#FFFFFF";
const HTML_ORANGE       = "#FFA500";
const HTML_GREENYELLOW  = "#ADFF29";
const HTML_PINK         = "#FF82C6";



const COLOR_DICT = Object.freeze({
    HTML_BLACK,
    HTML_NAVY,
    HTML_DARKGREEN,
    HTML_DARKCYAN,
    HTML_MAROON,
    HTML_PURPLE,
    HTML_OLIVE,
    HTML_LIGHTGREY,
    HTML_DARKGREY,
    HTML_BLUE,
    HTML_GREEN,
    HTML_CYAN,
    HTML_RED,
    HTML_MAGENTA,
    HTML_YELLOW,
    HTML_WHITE,
    HTML_ORANGE,
    HTML_GREENYELLOW,
    HTML_PINK,

    RGB565_BLACK,
    RGB565_NAVY,
    RGB565_DARKGREEN,
    RGB565_DARKCYAN,
    RGB565_MAROON,
    RGB565_PURPLE,
    RGB565_OLIVE,
    RGB565_LIGHTGREY,
    RGB565_DARKGREY,
    RGB565_BLUE,
    RGB565_GREEN,
    RGB565_CYAN,
    RGB565_RED,
    RGB565_MAGENTA,
    RGB565_YELLOW,
    RGB565_WHITE,
    RGB565_ORANGE,
    RGB565_GREENYELLOW,
    RGB565_PINK

});

const RGB565_COLORS_DICT = Object.freeze({
    BLACK:RGB565_BLACK,
    NAVY:RGB565_NAVY,
    DARKGREEN:RGB565_DARKGREEN,
    DARKCYAN:RGB565_DARKCYAN,
    MAROON:RGB565_MAROON,
    PURPLE:RGB565_PURPLE,
    OLIVE:RGB565_OLIVE,
    LIGHTGREY:RGB565_LIGHTGREY,
    DARKGREY:RGB565_DARKGREY,
    BLUE:RGB565_BLUE,
    GREEN:RGB565_GREEN,
    CYAN:RGB565_CYAN,
    RED:RGB565_RED,
    MAGENTA:RGB565_MAGENTA,
    YELLOW:RGB565_YELLOW,
    WHITE:RGB565_WHITE,
    ORANGE:RGB565_ORANGE,
    GREENYELLOW:RGB565_GREENYELLOW,
    PINK:RGB565_PINK

});

const HTML_COLOR_CODES_HTML_DICT = Object.freeze({
    BLACK:HTML_BLACK,
    NAVY:HTML_NAVY,
    DARKGREEN:HTML_DARKGREEN,
    DARKCYAN:HTML_DARKCYAN,
    MAROON:HTML_MAROON,
    PURPLE:HTML_PURPLE,
    OLIVE:HTML_OLIVE,
    LIGHTGREY:HTML_LIGHTGREY,
    DARKGREY:HTML_DARKGREY,
    BLUE:HTML_BLUE,
    GREEN:HTML_GREEN,
    CYAN:HTML_CYAN,
    RED:HTML_RED,
    MAGENTA:HTML_MAGENTA,
    YELLOW:HTML_YELLOW,
    WHITE:HTML_WHITE,
    ORANGE:HTML_ORANGE,
    GREENYELLOW:HTML_GREENYELLOW,
    PINK:HTML_PINK
});


Object.assign(ColorUtils_RGB565.COLORS, COLOR_DICT);
Object.freeze(ColorUtils_RGB565.COLORS);

Object.assign(ColorUtils_RGB565.RGB565_COLORS, RGB565_COLORS_DICT);
Object.freeze(ColorUtils_RGB565.RGB565_COLORS);

Object.assign(ColorUtils_RGB565.HTML_COLOR_CODES, HTML_COLOR_CODES_HTML_DICT);
Object.freeze(ColorUtils_RGB565.HTML_COLOR_CODES);


module.exports = ColorUtils_RGB565;
