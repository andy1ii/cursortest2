// --- CUBE MODE VARIABLES ---
var cubeMaskPixels = [];
var quadtreeRects = [];
var minRectSize = 20; 
var maxRectSize = 128;
var cubeGridSpacing = 10; 
var densityBoost = 1.4; 
var cubeFluidityFade = 0.0; // NEW
var cubePg; 

window.currentCubeStyle = 'Style 1'; 

var bgColor = typeof BRAND_RASTER_NEUTRAL !== 'undefined' ? BRAND_RASTER_NEUTRAL.bg : '#1C1C1C';
var lineColor = typeof BRAND_RASTER_NEUTRAL !== 'undefined' ? BRAND_RASTER_NEUTRAL.line : '#3D3D3D';
var fillColor = typeof BRAND_RASTER_NEUTRAL !== 'undefined' ? BRAND_RASTER_NEUTRAL.fill : '#FF8000';
var accentColor = typeof BRAND_RASTER_NEUTRAL !== 'undefined' ? BRAND_RASTER_NEUTRAL.accent : '#FF8000';
var innerColor = '#FFFFFF'; 
var strokeC, fillC, accentC, innerC;

var __rasterCubeHarmonySig = null;

if (typeof window !== 'undefined') {
  window.__rasterCubeUserCustomPaint = false;
}

// --- NEW FLUIDITY HELPER ---
function getCubeFluidityAlphaScale(x, y) {
  if (typeof cubeFluidityFade === 'undefined' || cubeFluidityFade <= 0.01) return 1.0;
  var n = noise(x * 0.003, y * 0.003);
  var minScale = 1.0 - cubeFluidityFade;
  var scale = map(n, 0.2, 0.8, minScale, 1.1); 
  return constrain(scale, 0.05, 1.0); 
}

function fillArtMaskFromLogoComposite(pg, maskArray) {
  var totalPixels = pg.width * pg.height;
  pg.loadPixels();
  var px = pg.pixels;
  var lowAlpha = 0;
  for (var i = 0; i < totalPixels; i++) {
    if (px[i * 4 + 3] < 250) lowAlpha++;
  }
  var useAlpha = lowAlpha / totalPixels > 0.008;

  var sumL = 0;
  var cnt = 0;
  for (var j = 0; j < totalPixels; j++) {
    var o = j * 4;
    if (px[o + 3] < 40) continue;
    var l = 0.2126 * px[o] + 0.7152 * px[o + 1] + 0.0722 * px[o + 2];
    sumL += l;
    cnt++;
  }
  var meanL = cnt > 0 ? sumL / cnt : 128;
  var darkDoc = meanL < 105;

  for (var k = 0; k < totalPixels; k++) {
    var idx = k * 4;
    var r = px[idx];
    var g = px[idx + 1];
    var b = px[idx + 2];
    var a = px[idx + 3];
    var lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    if (useAlpha) {
      maskArray[k] = a > 38 ? 1 : 0;
    } else if (darkDoc) {
      maskArray[k] = lum > 132 ? 1 : 0;
    } else {
      maskArray[k] = lum < 138 ? 1 : 0;
    }
  }
}

function computeRasterCubeHarmonySig() {
  if (typeof window.getArtColorHarmonyForMode !== 'function') return null;
  var hid = window.getArtColorHarmonyForMode('cube');
  var roll = 0;
  if (typeof artHarmonyVariantByMode !== 'undefined' && artHarmonyVariantByMode !== null) {
    var v = artHarmonyVariantByMode.cube;
    if (typeof v === 'number' && isFinite(v)) roll = v | 0;
  }
  return hid + ':' + roll;
}

function refreshRasterCubeHarmonySigCache() {
  var sig = computeRasterCubeHarmonySig();
  if (sig != null) __rasterCubeHarmonySig = sig;
}

if (typeof window !== 'undefined') {
  window.refreshRasterCubeHarmonySigCache = refreshRasterCubeHarmonySigCache;
  window.resetRasterCubeUserPaint = function () {
    window.__rasterCubeUserCustomPaint = false;
  };
  window.applyRasterCubePaintFromControls = function (o) {
    if (!o || typeof o !== 'object') return;
    window.__rasterCubeUserCustomPaint = true;
    refreshRasterCubeHarmonySigCache();
    if (o.bg != null) bgColor = o.bg;
    if (o.line != null) lineColor = o.line;
    if (o.fill != null) fillColor = o.fill;
    if (o.accent != null) accentColor = o.accent;
    if (o.inner != null) innerColor = o.inner;
    if (typeof color === 'function') {
      if (o.line != null) strokeC = color(o.line);
      if (o.fill != null) fillC = color(o.fill);
      if (o.accent != null) accentC = color(o.accent);
      if (o.inner != null) innerC = color(o.inner);
    }
  };
}

function syncRasterCubeHarmonyColors() {
  if (typeof window.getArtColorHarmonyForMode !== 'function' || typeof window.applyModeHarmonyColors !== 'function') return;
  var sig = computeRasterCubeHarmonySig();
  if (sig == null) return;
  if (typeof window !== 'undefined' && window.__rasterCubeUserCustomPaint) {
    __rasterCubeHarmonySig = sig;
    return;
  }
  if (sig === __rasterCubeHarmonySig) return;
  __rasterCubeHarmonySig = sig;
  window.applyModeHarmonyColors('cube', window.getArtColorHarmonyForMode('cube'), false);
  if (typeof color === 'function') {
    if (typeof lineColor !== 'undefined') strokeC = color(lineColor);
    if (typeof fillColor !== 'undefined') fillC = color(fillColor);
    if (typeof accentColor !== 'undefined') accentC = color(accentColor);
    if (typeof innerColor !== 'undefined') innerC = color(innerColor);
  }
}

function setupCube() {
  strokeC = color(lineColor);
  fillC = color(fillColor);
  accentC = color(accentColor);
  innerC = color(innerColor);
  
  if (!cubePg) {
    cubePg = createGraphics(width, height);
    cubePg.pixelDensity(1); 
  }
  
  processCubeMask();
  generateQuadtreePattern();
}

function windowResizedCube() {
  if (cubePg) cubePg.resizeCanvas(width, height);
  processCubeMask();
  generateQuadtreePattern();
}

function processCubeMask() {
  if (!logoImg || logoImg.width < 1) return;
  var imgW = max(logoImg.width, 1);
  var imgH = max(logoImg.height, 1);
  var baseScale = min(width / imgW, height / imgH) * 0.55;
  var minScale = 280 / imgW;
  var scaleFactor = max(baseScale, minScale);
  var hrW = floor(imgW * scaleFactor);
  var hrH = floor(imgH * scaleFactor);
  var hrX = floor((width - hrW) / 2);
  var hrY = floor((height - hrH) / 2);
  var totalPixels = width * height;
  cubeMaskPixels = new Uint8Array(totalPixels);
  
  if (isWholePageMode) {
    for (var i = 0; i < totalPixels; i++) cubeMaskPixels[i] = 1;
  } else {
    cubePg.clear();
    cubePg.image(logoImg, hrX, hrY, hrW, hrH);
    fillArtMaskFromLogoComposite(cubePg, cubeMaskPixels);
  }
}

function computeCircleScaleForCell(x, y, coverage) {
  var covBias = map(constrain(coverage, 0.05, 1), 0.05, 1, 0.8, 1.15); 
  var nCoarse = noise(x * 0.0065 + 31.7, y * 0.0065 + 12.4);
  var nFine = noise(x * 0.038 + 8.2, y * 0.038 + 99.1);
  var mixSz = constrain(nCoarse * 0.58 + nFine * 0.42, 0, 1);
  var skew = pow(mixSz, 1.2);
  var raw = lerp(0.1, 1.0, skew) * covBias; 
  return min(1.0, raw);
}

function generateQuadtreePattern() {
  quadtreeRects = [];
  var cell = constrain(floor(typeof cubeGridSpacing === 'number' ? cubeGridSpacing : minRectSize), 4, 120);
  var maxBlock = cell;
  while (maxBlock < 48 && maxBlock * 2 <= 128) maxBlock *= 2;

  for (var y = 0; y < height; y += maxBlock) {
    for (var x = 0; x < width; x += maxBlock) {
      var w = min(maxBlock, width - x);
      var h = min(maxBlock, height - y);
      subdivide(x, y, w, h);
    }
  }

  var minSize = cell * 0.4;
  var filtered = quadtreeRects.filter(r => r.w >= minSize && r.h >= minSize && r.x < width - minSize && r.y < height - minSize);

  if (typeof isWholePageMode !== 'undefined' && isWholePageMode && window.currentCubeStyle !== 'Style 2') {
    var db = typeof densityBoost !== 'undefined' ? densityBoost : 1.4;
    var prob = 0.15 + ((db - 0.6) / 0.8) * 0.85;
    prob = Math.max(0.1, Math.min(1.0, prob));
    filtered = filtered.filter(r => {
      var rand = Math.sin(r.x * 12.9898 + r.y * 78.233) * 43758.5453;
      return (rand - Math.floor(rand)) <= prob;
    });
  }

  quadtreeRects = filtered;
}

function subdivide(x, y, w, h) {
  if (w <= 0 || h <= 0) return;
  var averageCoverage = checkAreaCoverage(x, y, w, h);
  var complexity = checkAreaComplexity(x, y, w, h);

  if (averageCoverage < 0.05) return;
  var cell = constrain(floor(typeof cubeGridSpacing === 'number' ? cubeGridSpacing : minRectSize), 4, 120);
  var maxInternalSize = max(cell * 2, 16);
  if ((averageCoverage > 0.95 && complexity < 0.1 && w <= maxInternalSize) || w <= cell || h <= cell) {
    var sx = x + w * 0.5;
    var sy = y + h * 0.5;
    var circleScale = computeCircleScaleForCell(sx, sy, averageCoverage);
    quadtreeRects.push({
      x: x, y: y, w: w, h: h, avgCov: averageCoverage, n: noise(x * 0.02, y * 0.02),
      phase: random(TWO_PI), circleScale: circleScale,
    });
    return;
  }

  var halfW = floor(w / 2);
  var halfH = floor(h / 2);
  subdivide(x, y, halfW, halfH);                 
  subdivide(x + halfW, y, halfW, halfH);         
  subdivide(x, y + halfH, halfW, halfH);         
  subdivide(x + halfW, y + halfH, halfW, halfH); 
}

function checkAreaCoverage(x, y, w, h) {
  if (w < 1 || h < 1) return 0;
  var count = 0;
  var sampleStep = (w > 16 || h > 16) ? 2 : 1; 
  var sampleCount = 0;
  for (var dy = 0; dy < h; dy += sampleStep) {
    for (var dx = 0; dx < w; dx += sampleStep) {
      var pxIdx = (floor(x + dx) + floor(y + dy) * width);
      if (cubeMaskPixels[pxIdx] === 1) count++;
      sampleCount++;
    }
  }
  return count / sampleCount;
}

function checkAreaComplexity(x, y, w, h) {
  if (w < 4 || h < 4) return 0;
  var count = 0;
  var totalChecks = 0;
  var sampleStep = 2; 
  for (var dy = 0; dy < h - sampleStep; dy += sampleStep) {
    for (var dx = 0; dx < w - sampleStep; dx += sampleStep) {
      var currIdx = (floor(x + dx) + floor(y + dy) * width);
      var nextIdx = (floor(x + dx + 1) + floor(y + dy) * width);
      if (cubeMaskPixels[currIdx] !== cubeMaskPixels[nextIdx]) count++;
      totalChecks++;
    }
  }
  return count / totalChecks;
}

function drawRasterUploadHalftone(sourceImg, rect, skipBaseBackground) {
  var src = sourceImg || (typeof uploadedSourceImg !== 'undefined' ? uploadedSourceImg : null);
  if (!src || src.width < 1) return;
  var r = rect;
  if (!r && typeof getUploadDrawRect === 'function' && typeof uploadedSourceImg !== 'undefined' && uploadedSourceImg) {
    r = getUploadDrawRect(uploadedSourceImg);
  }
  if (!r || r.w < 8 || r.h < 8) return;

  var useUx = typeof uxBackground === 'function';
  var bgFn = useUx ? uxBackground : background;
  var noSFn = useUx ? uxNoStroke : noStroke;
  var flFn = useUx ? uxFill : fill;
  var circFn = useUx ? uxCircle : function (x, y, d) { circle(x, y, d); };

  if (!skipBaseBackground) bgFn(typeof bgColor !== 'undefined' ? bgColor : '#ffffff');

  var cLine = color('#3D3D3D'); 
  if (typeof color === 'function') {
    fillC = color(fillColor);
    accentC = color(accentColor);
    innerC = color(typeof innerColor !== 'undefined' ? innerColor : '#FFFFFF');
    cLine = color(typeof lineColor !== 'undefined' ? lineColor : '#3D3D3D');
  }

  var boost = typeof densityBoost !== 'undefined' ? densityBoost : 1.4;
  var invCut = constrain(0.125 - (boost - 0.65) * 0.09, 0.035, 0.2);
  var cell = constrain(floor(typeof cubeGridSpacing === 'number' ? cubeGridSpacing : minRectSize), 4, 120);

  var w = max(16, floor(r.w / cell));
  var h = max(16, floor(r.h / cell));
  var lumaPg = createGraphics(w, h);
  lumaPg.pixelDensity(1);
  lumaPg.image(src, 0, 0, w, h);
  lumaPg.loadPixels();

  var cFill = color(typeof fillColor !== 'undefined' ? fillColor : '#000000');
  var cAccent = color(typeof accentColor !== 'undefined' ? accentColor : '#888888');

  var lumaAt = function(xi, yi) {
    var ii = (xi + yi * w) * 4;
    return (0.2126 * lumaPg.pixels[ii] + 0.7152 * lumaPg.pixels[ii + 1] + 0.0722 * lumaPg.pixels[ii + 2]);
  };

  noSFn();
  ellipseMode(CENTER);
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      var luma = lumaAt(x, y);
      var inv = 1.0 - luma / 255.0;
      var gateRand = customFract(sin(x * 12.9898 + y * 78.233 + boost * 43.17) * 43758.5453);
      var isBg = (inv < invCut || gateRand > map(boost, 0.2, 1.2, 0.3, 0.9));

      var cx = r.x + x * cell + cell * 0.5;
      var cy = r.y + y * cell + cell * 0.5;
      var fScale = getCubeFluidityAlphaScale(cx, cy);

      if (window.currentCubeStyle === 'Style 2') {
        var fixedS = cell; 
        var alphaVal = constrain(map(inv, 0.05, 0.85, 0, 255), 0, 255) * fScale;
        var ccStyle2 = lerpColor(cLine, cFill, inv);
        var innerRatio = map(inv, 0, 1, 0.85, 0.25);
        if (alphaVal > 2) { 
          flFn(red(ccStyle2), green(ccStyle2), blue(ccStyle2), alphaVal);
          circFn(cx, cy, fixedS);
          flFn(red(innerC), green(innerC), blue(innerC), alphaVal);
          circFn(cx, cy, fixedS * innerRatio);
        }
        continue;
      }
      
      if (isBg) continue;

      var span = max(1e-6, 1.0 - invCut);
      var invNorm = constrain((inv - invCut) / span, 0, 1);
      var sizeT = pow(invNorm, 0.3);

      var edgeMag = 0;
      if (x > 0 && x < w - 1 && y > 0 && y < h - 1) {
        var gx = lumaAt(x + 1, y) - lumaAt(x - 1, y);
        var gy = lumaAt(x, y + 1) - lumaAt(x, y - 1);
        edgeMag = sqrt(gx * gx + gy * gy);
      }
      var edgeFactor = map(edgeMag, 0, 88, 0.88, 1.0, true);

      var nA = noise(x * 0.1 + 2.4, y * 0.11 - 1.2, boost * 0.85);
      var nB = noise(x * 0.33 + 7.1, y * 0.29 + 4.9, boost * 0.45);
      var dynScale = lerp(0.55, 1.0, constrain(nA * 0.55 + nB * 0.45, 0, 1));

      var minD = cell * 0.05;
      var maxD = cell * 0.9995;
      var size = lerp(minD, maxD, sizeT) * edgeFactor * dynScale;
      size = constrain(size, cell * 0.035, cell * 0.9995);

      var ccU1 = lerpColor(cFill, cAccent, inv * 0.75);
      var alphaValU1 = 255 * fScale;
      var sizeDrawU1 = size * map(fScale, 0.05, 1.0, 0.5, 1.0); 
      
      flFn(red(ccU1), green(ccU1), blue(ccU1), alphaValU1);
      circFn(cx, cy, sizeDrawU1);
    }
  }
  lumaPg.remove();
}

function drawCube() {
  syncRasterCubeHarmonyColors();
  if (typeof color === 'function') {
    strokeC = color(lineColor);
    fillC = color(fillColor);
    accentC = color(accentColor);
    innerC = color(innerColor);
  }

  var isUpload = typeof usingCustomSourceImage !== 'undefined' && usingCustomSourceImage && typeof uploadedSourceImg !== 'undefined' && uploadedSourceImg != null && uploadedSourceImg.width > 0;
  if (isUpload) {
    drawRasterUploadHalftone(undefined, undefined, true);
    return;
  }

  background(bgColor);

  var gridStroke = typeof strokeC !== 'undefined' && strokeC !== null ? strokeC : color(typeof lineColor !== 'undefined' ? lineColor : '#8B5C44');
  stroke(red(gridStroke), green(gridStroke), blue(gridStroke), 14);
  strokeWeight(0.5);
  var cell = constrain(floor(typeof cubeGridSpacing === 'number' ? cubeGridSpacing : minRectSize), 4, 120);
  
  for (var gx = 0; gx < width; gx += cell) line(gx, 0, gx, height);
  for (var gy = 0; gy < height; gy += cell) line(0, gy, width, gy);

  noStroke();
  ellipseMode(CENTER);
  var cellDraw = max(4, cell);

  if (window.currentCubeStyle === 'Style 2') {
    for (var y = 0; y < height; y += cellDraw) {
      for (var x = 0; x < width; x += cellDraw) {
        var snapCx = x + cellDraw * 0.5;
        var snapCy = y + cellDraw * 0.5;
        var coverage = checkAreaCoverage(x, y, cellDraw, cellDraw);
        var isFg = coverage > 0.01;

        if (typeof isWholePageMode !== 'undefined' && isWholePageMode) {
            var db = typeof densityBoost !== 'undefined' ? densityBoost : 1.4;
            var prob = 0.15 + ((db - 0.6) / 0.8) * 0.85;
            prob = Math.max(0.1, Math.min(1.0, prob));
            var rand = customFract(sin(x * 12.9898 + y * 78.233) * 43758.5453);
            isFg = rand <= prob;
        }

        var fScale2 = getCubeFluidityAlphaScale(snapCx, snapCy);
        var alphaVal2 = 255 * fScale2;

        if (isFg) { fill(red(fillC), green(fillC), blue(fillC), alphaVal2); } else { fill(red(strokeC), green(strokeC), blue(strokeC), alphaVal2); }
        ellipse(snapCx, snapCy, cellDraw, cellDraw);
        fill(red(innerC), green(innerC), blue(innerC), alphaVal2);
        ellipse(snapCx, snapCy, cellDraw * 0.45, cellDraw * 0.45);
      }
    }
    return; 
  }

  if (quadtreeRects.length === 0) return;

  var drawnGrid = new Set();
  var rectsSorted = quadtreeRects.length < 2 ? quadtreeRects : [...quadtreeRects].sort((a, b) => b.avgCov - a.avgCov);

  for (var idx = 0; idx < rectsSorted.length; idx++) {
    var qBox = rectsSorted[idx];
    var cx = qBox.x + qBox.w * 0.5;
    var cy = qBox.y + qBox.h * 0.5;
    var gxi = floor(cx / cellDraw);
    var gyi = floor(cy / cellDraw);
    var gridKey = gxi + ',' + gyi;
    if (drawnGrid.has(gridKey)) continue;

    var snapCx = gxi * cellDraw + cellDraw * 0.5;
    var snapCy = gyi * cellDraw + cellDraw * 0.5;

    var insideMaskWeight = constrain(map(qBox.avgCov, 0.05, 1.0, 0.15, 1.0), 0.1, 1.0);
    var chance = qBox.n * 0.7 + insideMaskWeight * 0.6;
    var fScale1 = getCubeFluidityAlphaScale(snapCx, snapCy);

    if (qBox.avgCov > 0.01 || chance < densityBoost) {
      drawnGrid.add(gridKey);
      
      var cov = constrain(map(qBox.avgCov, 0.01, 1.0, 0.2, 1.0), 0, 1);
      var staticNoise = noise(snapCx * 0.015, snapCy * 0.015, 100);
      var contrastValue = staticNoise > 0.55 ? 1.0 : pow(staticNoise * 1.8, 4.2);
      var covScale = lerp(0.15, 1.0, pow(cov, 0.5)); 
      var spatialScale = lerp(0.2, 1.0, contrastValue); 
      var cs = typeof qBox.circleScale === 'number' ? qBox.circleScale : 1;
      
      var factor = constrain(covScale * spatialScale * cs, 0.05, 1);
      var s = min(cellDraw * factor, cellDraw * 0.9995);

      var blendT = noise(qBox.x * 0.01, qBox.y * 0.01, qBox.phase);
      var cA = lerpColor(fillC, accentC, blendT);
      var alphaVal1 = 255 * fScale1;
      var sDraw1 = s * map(fScale1, 0.05, 1.0, 0.6, 1.0); 

      noStroke();
      fill(red(cA), green(cA), blue(cA), alphaVal1);
      ellipse(snapCx, snapCy, max(1, sDraw1), max(1, sDraw1));

    } else {
      var speckRand1 = customFract(sin(gxi * 12.9898 + gyi * 78.233) * 43758.5453);
      if (speckRand1 < 0.06) {
        drawnGrid.add(gridKey);
        var speckRand2 = customFract(sin(gxi * 39.346 + gyi * 11.135) * 43758.5453);
        var speckRand3 = customFract(sin(gxi * 73.156 + gyi * 52.235) * 43758.5453);
        var speckSize = speckRand2 < 0.45 ? lerp(1.1, 2.4, speckRand3) : lerp(2.8, 5.2, speckRand3);
        var speck = min(speckSize, cellDraw * 0.42);
        
        var speckAlpha = 255 * fScale1;
        var speckDraw = speck * map(fScale1, 0.05, 1.0, 0.3, 1.0); 

        if (speckAlpha > 10 && speckDraw > 0.5) {
            noStroke();
            fill(red(strokeC), green(strokeC), blue(strokeC), speckAlpha);
            ellipse(snapCx, snapCy, max(1, speckDraw), max(1, speckDraw));
        }
      }
    }
  }
}

function customFract(x) { return x - Math.floor(x); }