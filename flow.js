var plotterRenderQueue = [];
var plotterDrawingLayer;

var flowMaskPixels = [];
var flowLogoScale = 1;
var flowPg;

var plotLogoHrX = 0;
var plotLogoHrY = 0;
var plotLogoHrW = 0;
var plotLogoHrH = 0;

var plotLumaBuffer;
var plotHatchLumaInvert = false;

var flowBgColor = typeof BRAND_NEUTRAL !== 'undefined' ? BRAND_NEUTRAL.OFF_WHITE : '#f5f3f0';
var flowColor1 = typeof BRAND_EXTENDED !== 'undefined' ? BRAND_EXTENDED.ROYAL_BLUE : '#2D69E6';

var flowCurveScale = 0.001; 
var flowLineWeight = 1.2; 
var flowFluidityFade = 0.0; 

function getFlowFluidityScale(x, y) {
  if (typeof flowFluidityFade === 'undefined' || flowFluidityFade <= 0.01) return 1.0;
  var n = noise(x * 0.003, y * 0.003);
  var minScale = 1.0 - flowFluidityFade;
  var scale = map(n, 0.2, 0.8, minScale, 1.1); 
  return constrain(scale, 0.0, 1.0); 
}

function getActiveFlowImage() {
  return (typeof usingCustomSourceImage !== 'undefined' && usingCustomSourceImage && uploadedSourceImg) ? uploadedSourceImg : logoImg;
}

function isFlowUpload() {
  return (typeof usingCustomSourceImage !== 'undefined' && usingCustomSourceImage);
}

function palRgb(c) {
  var cc = color(c);
  return [red(cc), green(cc), blue(cc)];
}

function plotMaskAt(fx, fy) {
  var xi = constrain(floor(fx), 0, width - 1);
  var yi = constrain(floor(fy), 0, height - 1);
  return flowMaskPixels[xi + yi * width] === 1;
}

function plotGetHatchRect() {
  if (isWholePageMode || isFlowUpload() || plotLogoHrW < 2 || plotLogoHrH < 2) {
    return { x0: 0, y0: 0, x1: width, y1: height };
  }
  return {
    x0: plotLogoHrX,
    y0: plotLogoHrY,
    x1: plotLogoHrX + plotLogoHrW,
    y1: plotLogoHrY + plotLogoHrH
  };
}

function processPlotterMask() {
  var totalPixels = width * height;
  flowMaskPixels = new Uint8Array(totalPixels);

  var activeImg = getActiveFlowImage();
  if (!activeImg || activeImg.width < 1) {
    plotLogoHrW = 0; plotLogoHrH = 0;
    return;
  }

  if (isFlowUpload() && typeof getUploadDrawRect === 'function') {
    var r = getUploadDrawRect(activeImg);
    plotLogoHrX = r.x; plotLogoHrY = r.y; plotLogoHrW = r.w; plotLogoHrH = r.h;
  } else {
    var baseScale = min(width / activeImg.width, height / activeImg.height) * 0.55;
    var minScale = 280 / max(activeImg.width, 1);
    flowLogoScale = max(baseScale, minScale);

    plotLogoHrW = floor(activeImg.width * flowLogoScale);
    plotLogoHrH = floor(activeImg.height * flowLogoScale);
    plotLogoHrX = floor((width - plotLogoHrW) / 2);
    plotLogoHrY = floor((height - plotLogoHrH) / 2);
  }

  if (isWholePageMode || isFlowUpload()) {
    for (var i = 0; i < totalPixels; i++) flowMaskPixels[i] = 1;
  } else {
    if (!flowPg) {
      flowPg = createGraphics(width, height);
      flowPg.pixelDensity(1);
    }
    flowPg.clear();
    flowPg.image(activeImg, plotLogoHrX, plotLogoHrY, plotLogoHrW, plotLogoHrH);
    
    if (typeof fillArtMaskFromLogoComposite === 'function') {
        fillArtMaskFromLogoComposite(flowPg, flowMaskPixels);
    }
  }
}

function plotRebuildLumaBuffer() {
  plotHatchLumaInvert = false;
  var activeImg = getActiveFlowImage();
  if ((isWholePageMode && !isFlowUpload()) || plotLogoHrW < 2 || plotLogoHrH < 2 || !activeImg) {
    return;
  }
  if (!plotLumaBuffer || plotLumaBuffer.width !== plotLogoHrW || plotLumaBuffer.height !== plotLogoHrH) {
    plotLumaBuffer = createGraphics(plotLogoHrW, plotLogoHrH);
    plotLumaBuffer.pixelDensity(1);
  }
  plotLumaBuffer.clear();
  plotLumaBuffer.image(activeImg, 0, 0, plotLogoHrW, plotLogoHrH);
  plotLumaBuffer.loadPixels();
  var px = plotLumaBuffer.pixels;
  var n = plotLogoHrW * plotLogoHrH;
  var sum = 0;
  var cnt = 0;
  for (var i = 0; i < n; i++) {
    var o = i * 4;
    if (px[o + 3] < 24) continue;
    var r = px[o]; var g = px[o + 1]; var b = px[o + 2];
    sum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
    cnt++;
  }
  var mean = cnt > 0 ? sum / cnt / 255 : 0.4;
  plotHatchLumaInvert = mean > 0.52;
}

function plotLumaAtLocal(lx, ly) {
  if (!plotLumaBuffer || lx < 0 || ly < 0 || lx >= plotLogoHrW || ly >= plotLogoHrH) {
    return { l: 1, a: 0 };
  }
  var o = (lx + ly * plotLogoHrW) * 4;
  var r = plotLumaBuffer.pixels[o];
  var g = plotLumaBuffer.pixels[o + 1];
  var b = plotLumaBuffer.pixels[o + 2];
  var a = plotLumaBuffer.pixels[o + 3] / 255;
  return { l: (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255, a: a };
}

function plotSubjectHatchLuma(wx, wy) {
  if (!isFlowUpload() && !plotMaskAt(wx, wy)) return null;
  var lx = floor(wx - plotLogoHrX);
  var ly = floor(wy - plotLogoHrY);
  var lumaData = plotLumaAtLocal(lx, ly);
  if (lumaData.a < 0.04) return null;
  var L = constrain(lumaData.l, 0, 1);
  if (plotHatchLumaInvert) L = 1 - L;
  return L;
}

function getLineDirection(x, y) {
  var gap = 0.06; 
  
  if (isFlowUpload()) {
    var L = plotSubjectHatchLuma(x, y);
    if (L === null) return 'H'; 
    if (L < 0.5 - gap) return 'V'; 
    if (L > 0.5 + gap) return 'H'; 
    return 'NONE'; 
  } else if (isWholePageMode) {
    var n = noise(x * 0.006, y * 0.006);
    if (n < 0.5 - gap) return 'V';
    if (n > 0.5 + gap) return 'H';
    return 'NONE';
  } else {
    var center = plotMaskAt(x, y);
    var left = plotMaskAt(x - 6, y);
    var right = plotMaskAt(x + 6, y);
    var up = plotMaskAt(x, y - 6);
    var down = plotMaskAt(x, y + 6);
    
    if (center !== left || center !== right || center !== up || center !== down) {
        return 'NONE'; 
    }
    return center ? 'V' : 'H';
  }
}

function flushHatchSeg(seg, queue) {
  if (seg && seg.vertices.length >= 2) queue.push(seg);
}

function plotPointInHatchRect(x, y, r) {
  return x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
}

function compileHorizontalHatch(nZ, nScale, hStep, inkRgb, r, queue) {
  var dx = 4; 
  var maxVerts = 300;

  for (var baseY = r.y0 + hStep * 0.5; baseY < r.y1 - 0.5; baseY += hStep) {
    var seg = null;
    var vertCount = 0;

    for (var x = r.x0; x <= r.x1 + 0.001; x += dx) {
      var py = baseY; 
      var insideBox = plotPointInHatchRect(x, py, r);
      var allowHoriz = insideBox && (getLineDirection(x, py) === 'H');
      var fScale = getFlowFluidityScale(x, py);
      if (fScale < 0.45) allowHoriz = false; 

      if (!allowHoriz) {
        flushHatchSeg(seg, queue);
        seg = null;
        vertCount = 0;
        continue;
      }

      if (!seg) {
        seg = { type: 'hLine', color: inkRgb, weight: typeof flowLineWeight !== 'undefined' ? flowLineWeight : 1.2, fScale: fScale, vertices: [] };
        vertCount = 0;
      }
      seg.vertices.push({ x: x, y: py });
      vertCount++;
      if (vertCount >= maxVerts) {
        flushHatchSeg(seg, queue);
        seg = null;
        vertCount = 0;
      }
    }
    flushHatchSeg(seg, queue);
  }
}

function compileVerticalHatch(nZ, nScale, vStep, inkRgb, r, queue) {
  var dy = 4; 
  var maxVerts = 300;

  for (var baseX = r.x0 + vStep * 0.5; baseX < r.x1 - 0.5; baseX += vStep) {
    var seg = null;
    var vertCount = 0;

    for (var y = r.y0; y <= r.y1 + 0.001; y += dy) {
      var px = baseX; 
      var insideBox = plotPointInHatchRect(px, y, r);
      var allowVert = insideBox && (getLineDirection(px, y) === 'V');
      var fScale = getFlowFluidityScale(px, y);
      if (fScale < 0.45) allowVert = false; 

      if (!allowVert) {
        flushHatchSeg(seg, queue);
        seg = null;
        vertCount = 0;
        continue;
      }

      if (!seg) {
        seg = { type: 'vLine', color: inkRgb, weight: typeof flowLineWeight !== 'undefined' ? flowLineWeight : 1.2, fScale: fScale, vertices: [] };
        vertCount = 0;
      }
      seg.vertices.push({ x: px, y: y });
      vertCount++;
      if (vertCount >= maxVerts) {
        flushHatchSeg(seg, queue);
        seg = null;
        vertCount = 0;
      }
    }
    flushHatchSeg(seg, queue);
  }
}

function compilePlotterTopology() {
  plotterRenderQueue = []; // Clear and use the global queue for SVG and instant rendering
  processPlotterMask();

  if (!plotterDrawingLayer) return;

  var paper = color(flowBgColor);
  plotterDrawingLayer.background(red(paper), green(paper), blue(paper));

  var activeImg = getActiveFlowImage();
  if (!activeImg || activeImg.width < 1) { return; }

  var seed = floor(random(100000));
  noiseSeed(seed); randomSeed(seed); noiseDetail(7, 0.5);

  var nScale = map(flowCurveScale, 0.0005, 0.005, 0.009, 0.026, true);
  var nZ = seed * 0.00001;

  plotRebuildLumaBuffer();
  var hatchR = plotGetHatchRect();
  var hStep = 8; var vStep = 8;
  var inkRgb = palRgb(flowColor1);

  // Generate the geometry
  compileHorizontalHatch(nZ, nScale, hStep, inkRgb, hatchR, plotterRenderQueue);
  compileVerticalHatch(nZ, nScale, vStep, inkRgb, hatchR, plotterRenderQueue);

  // INSTANT RENDER ALL QUEUED PATHS TO THE LAYER
  plotterDrawingLayer.strokeCap(SQUARE);
  plotterDrawingLayer.strokeJoin(MITER);

  for (let path of plotterRenderQueue) {
      if (path.type === 'dot') {
          plotterDrawingLayer.noStroke();
          var pathAlpha = 220 * (path.fScale || 1.0);
          plotterDrawingLayer.fill(path.color[0], path.color[1], path.color[2], pathAlpha);
          plotterDrawingLayer.circle(path.vertices[0].x, path.vertices[0].y, path.weight);
      } else {
          plotterDrawingLayer.noFill();
          var pathAlpha = 232 * (path.fScale || 1.0);
          plotterDrawingLayer.stroke(path.color[0], path.color[1], path.color[2], pathAlpha);
          plotterDrawingLayer.strokeWeight(path.weight);
          plotterDrawingLayer.beginShape();
          for (let v of path.vertices) {
              plotterDrawingLayer.vertex(v.x, v.y);
          }
          plotterDrawingLayer.endShape();
      }
  }
}

function setupFlow() {
  if (!flowPg) { flowPg = createGraphics(width, height); flowPg.pixelDensity(1); }
  if (!plotterDrawingLayer) { plotterDrawingLayer = createGraphics(width, height); plotterDrawingLayer.pixelDensity(1); } else { plotterDrawingLayer.resizeCanvas(width, height); }
  compilePlotterTopology();
}

function windowResizedFlow() {
  if (flowPg) flowPg.resizeCanvas(width, height);
  if (plotterDrawingLayer) plotterDrawingLayer.resizeCanvas(width, height);
  compilePlotterTopology();
}

function coverPlotterOutsideLogoBox() {
  if (typeof isWholePageMode !== 'undefined' && isWholePageMode) return;
  if (isFlowUpload()) return;
  if (typeof plotLogoHrW === 'undefined' || plotLogoHrW < 2 || plotLogoHrH < 2) return;

  var paper = color(flowBgColor);
  var x0 = plotLogoHrX; var y0 = plotLogoHrY;
  var x1 = plotLogoHrX + plotLogoHrW; var y1 = plotLogoHrY + plotLogoHrH;

  push();
  noStroke(); fill(red(paper), green(paper), blue(paper));
  rect(0, 0, width, y0); rect(0, y1, width, height - y1);
  rect(0, y0, x0, y1 - y0); rect(x1, y0, width - x1, y1 - y0);
  pop();
}

function drawFlow() {
  var paper = color(flowBgColor);
  background(red(paper), green(paper), blue(paper));

  if (!plotterDrawingLayer) { setupFlow(); return; }

  var activeImg = getActiveFlowImage();

  if (!isWholePageMode && !isFlowUpload() && activeImg && activeImg.width > 0 && plotLogoHrW > 0) {
    push(); tint(255, 14); image(activeImg, plotLogoHrX, plotLogoHrY, plotLogoHrW, plotLogoHrH); noTint(); pop();
  }

  image(plotterDrawingLayer, 0, 0);
  coverPlotterOutsideLogoBox();
}