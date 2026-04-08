// --- KINETIC (MESH) MODE VARIABLES ---
let meshCodeRamp = [
  " ", " ", ".", "-", ":", ";", "=", "+", "<", ">", "/", "\\",
  "()", "{}", "[]", "0", "1", "=>", "&&", "||", "let", "var",
  "NaN", "null", "true", "false", "0x00", "0xFF", "#", "@"
]; 
let meshGridSize = 15; 
let meshFluidityFade = 0.0; 
let meshBgColor = '#1C1C1C'; // NEW: Variable for background color
let meshAlphaMask;
let meshPg;
let meshSnippetSizes = []; 

function getMeshFluidityScale(x, y) {
  if (typeof meshFluidityFade === 'undefined' || meshFluidityFade <= 0.01) return 1.0;
  var n = noise(x * 0.003, y * 0.003);
  var minScale = 1.0 - meshFluidityFade;
  var scale = map(n, 0.2, 0.8, minScale, 1.1); 
  return constrain(scale, 0.05, 1.0); 
}

function updateMeshTextSizes() {
  meshSnippetSizes = [];
  for (let i = 0; i < meshCodeRamp.length; i++) {
    let snippet = meshCodeRamp[i];
    let snippetLength = max(1, snippet.length);
    let maxAllowedSize = (meshGridSize * 0.95) / (0.6 * snippetLength);
    meshSnippetSizes.push(min(meshGridSize * 0.85, maxAllowedSize));
  }
}

function setupMesh() {
  if (typeof cursorFont !== 'undefined') { textFont(cursorFont); } else { textFont('monospace'); }
  textAlign(CENTER, CENTER);
  noStroke();
  updateMeshTextSizes();
  processMeshMask();
}

function windowResizedMesh() {
  if (meshPg) { meshPg.resizeCanvas(width, height); }
  updateMeshTextSizes();
  processMeshMask();
}

function processMeshMask() {
  if (!logoImg || (logoImg.width === 2 && logoImg.height === 2)) {
    isWholePageMode = true;
    return;
  }
  isWholePageMode = false;

  if (!meshPg) { meshPg = createGraphics(width, height); } else if (meshPg.width !== width || meshPg.height !== height) { meshPg.resizeCanvas(width, height); }
  if (!meshAlphaMask) { meshAlphaMask = createImage(width, height); } else if (meshAlphaMask.width !== width || meshAlphaMask.height !== height) { meshAlphaMask.resize(width, height); }

  let rect = getUploadDrawRect(logoImg);
  let hrW = rect.w; let hrH = rect.h; let hrX = rect.x; let hrY = rect.y;

  meshPg.clear();
  meshPg.background(0);
  meshPg.image(logoImg, hrX, hrY, hrW, hrH);
  meshPg.loadPixels();
  
  meshAlphaMask.loadPixels();
  let totalPixels = width * height;
  for (let i = 0; i < totalPixels; i++) {
    let isMask = meshPg.pixels[i * 4] > 128; 
    let o = i * 4;
    meshAlphaMask.pixels[o] = 255; meshAlphaMask.pixels[o+1] = 255; meshAlphaMask.pixels[o+2] = 255;
    meshAlphaMask.pixels[o+3] = isMask ? 255 : 0;
  }
  meshAlphaMask.updatePixels();
}

function drawMesh() {
  clear();
  let speed = 0.005; 
  let t = frameCount * speed;
  
  let defaultMeshColors = ['#C2CB7F', '#D99084', '#5C8DB8', '#A493C4'];
  let colorsToUse = [];
  for (let i = 0; i < 4; i++) {
      colorsToUse.push((typeof window.artColors !== 'undefined' && window.artColors[i]) ? window.artColors[i] : defaultMeshColors[i]);
  }

  if (meshSnippetSizes.length !== meshCodeRamp.length) { updateMeshTextSizes(); }

  for (let x = 0; x < width; x += meshGridSize) {
    for (let y = 0; y < height; y += meshGridSize) {
      let n = noise(x * 0.004, y * 0.004, t);
      let charIndex = floor(map(n, 0, 1, 0, meshCodeRamp.length));
      charIndex = constrain(charIndex, 0, meshCodeRamp.length - 1);
      let snippet = meshCodeRamp[charIndex];

      if (snippet === ' ') continue;

      let colorNoise = noise(x * 0.015, y * 0.015, t * 0.5);
      let colorIndex = floor(map(colorNoise, 0, 1, 0, colorsToUse.length));
      colorIndex = constrain(colorIndex, 0, colorsToUse.length - 1);
      
      let fScale = getMeshFluidityScale(x, y);
      let alphaVal = 255 * fScale;
      if (alphaVal < 5) continue; 
      
      let cc = color(colorsToUse[colorIndex]);
      fill(red(cc), green(cc), blue(cc), alphaVal);
      
      let dynSize = meshSnippetSizes[charIndex] * map(fScale, 0.05, 1.0, 0.4, 1.0);
      textSize(dynSize);
      
      text(snippet, x + meshGridSize / 2, y + meshGridSize / 2);
    }
  }

  if (!isWholePageMode && meshAlphaMask) {
    drawingContext.globalCompositeOperation = 'destination-in';
    image(meshAlphaMask, 0, 0);
  }

  drawingContext.globalCompositeOperation = 'destination-over';
  background(typeof meshBgColor !== 'undefined' ? meshBgColor : '#1C1C1C'); 
  drawingContext.globalCompositeOperation = 'source-over'; 
}