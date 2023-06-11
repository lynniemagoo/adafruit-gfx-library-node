# @lynniemagoo/adafruit-gfx-library

This is a Node.js port of the Arduino C/C++ Adafruit GFX Library available from GitHub.

There are various libraries for LCD and OLED displays that extend this library.  Search NPM for @lynniemagoo for just a few.

The Adafruit Libraries were originally written by Limor Fried/Ladyada for Adafruit Industries.

For more information, see:

https://github.com/adafruit/Adafruit-GFX-Library

BSD license, check license.txt for more information.


# Useful Resources

- 'Fonts' folder contains in this project contains ported bitmap fonts for use with this module (See example below). 



# Installation

```
npm install @lynniemagoo/adafruit-gfx-library
```



# Font Test Example

The following code was tested using Node.js v16.13.2 and should work once the following libraries are installed:

- oled-font-pack
- @lynniemagoo/adafruit-gfx-library
- @lynniemagoo/adafruit-ssd-1306-library

***Note that you may need to change the I2C Bus Number or the I2C Address below depending on your display.***

```
// ES6 example usage of SSD1306 128x64 I2C implementation
'use strict';
const Adafruit_GFX_Library = require("@lynniemagoo/adafruit-gfx-library");
const delay = Adafruit_GFX_Library.Utils.sleepMs;
const GFXFonts = Adafruit_GFX_Library.Fonts;
const OLEDFontPack = require("oled-font-pack");
const {Adafruit_SSD1306, Adafruit_SSD1306_Colors} = require("@lynniemagoo/adafruit-ssd1306-library");
const {SSD1306_WHITE, SSD1306_BLACK, SSD1306_INVERSE,
       WHITE, BLACK, INVERSE} = Adafruit_SSD1306_Colors;
const Adafruit_SPITFT = Adafruit_GFX_Library.Display.Adafruit_SPITFT;
const {Mixin_I2C_Display, I2C_DEFAULTS} = Adafruit_GFX_Library.Mixins;


// Use mixin to bind I2C implementation to SSD1306 class as SSD1306 supports either I2C or SPI.
class Adafruit_SSD1306_I2C extends Mixin_I2C_Display(Adafruit_SSD1306) {};


async function main() {
    //Constants to use for vccSelection - default(SSD1306_SWITCHCAPVCC).
    //
    //const SSD1306_EXTERNALVCC = 0x01;  ///< External display voltage source
    //const SSD1306_SWITCHCAPVCC = 0x02; ///< Gen. display voltage from 3.3V
    const displayOptions = {
        width:128,
        height:64,
        rotation:0,
        noSplash:true,
        vccSelection:0x02,
        rstGpioNb:-1,
        i2cBusNumber:0x01,
        i2cAddress:0x3C
    }

    //console.log(OLEDFontPack._available);
    //console.log(GFXFonts._avaiable);
    
    const display = new Adafruit_SSD1306_I2C(displayOptions);
    let oledFont, gfxFont;
    // Startup display - same as original adafruit begin() but options specified in the constructor.
    await display.startup();
    await delay(3000);

    
    // Display supports chaining and operations are added to a queue.
    // Therefore, one can do multiple operations as needed using 'dot' chaining.
    // At the end of one's work, one can simply await the display to complete all operations.

    // Test the Built-In fonts.
    display.clearDisplay()
           .setTextSize(1)                  // Normal 1:1 pixel scale
           .setTextColor(SSD1306_WHITE)     // Draw white text
           .setCursor(0,0)                  // Start at top-left corner
           .println("Hello, world!");

    display.setTextColor(SSD1306_BLACK, SSD1306_WHITE) // Draw 'inverse' text
           .println(3.141592);

    display.setTextSize(2)             // Draw 2X-scale text
           .setTextColor(SSD1306_WHITE)
           .print("0x")
           .println(0xDEADBEEF.toString(16).padStart(8,"0").toUpperCase())
           .display();

    // Wait for the display() operation to complete as we did not do so on the line where textSize was set to 2.
    await display;

    // Wait a bit.
    await delay(3000);

    // test a GFX Font from original library.
    display.clearDisplay()
           .setTextSize(1)                  // Normal 1:1 pixel scale
           .setTextColor(SSD1306_WHITE);     // Draw white text

    // This particular font requires that to draw on first line, cursor must be set to (0,5)
    display.setCursor(0,5);

    gfxFont = GFXFonts.FreeSans9pt7b;
    display.setFont(gfxFont);
           
    await display.print("Hello, User!").display();
    
    // Wait a bit.
    await delay(3000);

    // Test an OLED Font pack font.       
    display.clearDisplay()
           .setTextSize(1)                  // Normal 1:1 pixel scale
           .setTextColor(SSD1306_WHITE)     // Draw white text
           .setCursor(0,0);                  // Start at top-left corner

    oledFont = OLEDFontPack.dot_matrix_medium_zero_slash_16x22;
    display.setFont(oledFont);
    await display.print("0123456789-/.,").display();

    // Wait a bit.
    await delay(3000);

    display.clearDisplay()
           .setTextSize(1)                  // Normal 1:1 pixel scale
           .setTextColor(SSD1306_WHITE)     // Draw white text
           .setCursor(0,0);                  // Start at top-left corner

    oledFont = OLEDFontPack.sinclair_8x8;
    display.setFont(oledFont);
    await display.println("Abcde").println("56789-/.,").display();

    await delay(3000);
    await display.shutdown();
}
main();
```
