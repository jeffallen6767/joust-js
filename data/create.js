var
  fs = require("fs"),
  path = require("path"),
  TAB = "\t",
  NEWLINE = "\n",
  QUOTE = '"',
  COLON = ":",
  LEFT_BRACKET = "[",
  RIGHT_BRACKET = "]",
  COMMA = ",",
  EMPTY = "",
  xStart = 1,
  yStart = 1,
  // current x coordinate
  x = xStart,
  // x padding between assets
  pX = 10,
  // x multiple ( to pixels )
  mX = 4,
  // x unit adjustment
  aX = 0,
  // current y coordinate
  y = yStart,
  // y padding between rows of assets
  pY = 10,
  // y multiple ( to pixels )
  mY = 2,
  // y unit adjustment
  aY = -1,
  // width of spritesheet
  width = 608,
  // height of spritesheet
  height = 512,
  // maximum asset height encountered on this row
  vPad = 0,
  // read the raw data file
  data = fs.readFileSync("./sprites.txt", "UTF-8").split(NEWLINE).filter(function(val) {
    return val !== "";
  }),
  last = data.length - 1,
  lines = data.map(function(val, idx) {
    var
      parts = val.split(/\s+/g),
      // width of asset in pixels
      //w = ((parts[2] - aX) * mX) - 2,
      w = parts[2] * mX,
      // height of asset in pixels
      //h = (parts[3] - aY) * mY,
      h = parts[3] * mY,
      line;
    
    if (x + w > width) {
      x = xStart;
      y += vPad + pY;
      vPad = 0;
    }
    
    vPad = Math.max(vPad, h);
    
    line = [
      TAB,
      QUOTE, parts[0], QUOTE,
      COLON,
      LEFT_BRACKET,
      x, COMMA, 
      y, COMMA,
      w, COMMA, 
      h,
      RIGHT_BRACKET,
      idx == last ? EMPTY : COMMA
    ].join('');
    
    x += w + pX;
    
    return line;
  }),
  OUTPUT_START = "Application.configure.sprites({",
  OUTPUT_END = "});",
  output = [OUTPUT_START, lines.join(NEWLINE), OUTPUT_END].join(NEWLINE);

//console.log(data);

//console.log(lines);

console.log(output);

fs.writeFileSync("../public/assets/data/sprites.js", output, "UTF-8");
