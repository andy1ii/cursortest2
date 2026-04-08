// --- ui.js : Handles global interface, variables, scaling and exporting ---

window.currentMode = 'cube'; 
let exportScaleVal = 1;
let exportFmtVal = 'png';
let exportRatioVal = 'screen';

const dummyPresets = [
  { label: 'Style 1', value: 'Style 1' },
  { label: 'Style 2', value: 'Style 2' },
  { label: 'Style 3', value: 'Style 3' }
];
const dummyPresetFn = (v) => { /* Ignored for now */ };

// Dynamic UI Configs
const toolbarConfigs = {
  cube: {
    dyn1: {
      type: 'select', label: "Circle Size", items: [{ label: 'Small', value: 10 }, { label: 'Medium', value: 20 }, { label: 'Large', value: 40 }], val: 10,
      onChange: (v) => { try{ cubeGridSpacing = parseFloat(v); }catch(e){} }
    },
    dyn2: {
      type: 'slider', label: "Density", min: 0.6, max: 1.4, step: 0.1, val: 1.4, 
      onChange: (v) => { try{ densityBoost = parseFloat(v); }catch(e){} }
    },
    dyn3: {
      type: 'slider', label: "Fluidity Fade", min: 0.0, max: 1.0, step: 0.05, val: 0.0, 
      onChange: (v) => { try{ cubeFluidityFade = parseFloat(v); }catch(e){} }
    },
    dynPreset: { 
      type: 'select', label: "Preset", items: dummyPresets, val: 'Style 1', 
      onChange: (v) => { window.currentCubeStyle = v; triggerCanvasUpdate(); } 
    }
  },
  mesh: {
    dyn1: { type: 'select', label: "Grid Resolution", items: [{ label: 'Fine', value: 15 }, { label: 'Standard', value: 30 }, { label: 'Coarse', value: 60 }], val: 15, onChange: (v) => { try{ meshGridSize = parseFloat(v); }catch(e){} } },
    dyn2: { type: 'slider', label: "Fluidity Fade", min: 0.0, max: 1.0, step: 0.05, val: 0.0, onChange: (v) => { try{ meshFluidityFade = parseFloat(v); }catch(e){} } },
    dyn3: null,
    dynPreset: { type: 'select', label: "Preset", items: dummyPresets, val: 'Style 1', onChange: dummyPresetFn }
  },
  shader: {
    dyn1: { type: 'slider', label: "Zoom", min: 0.2, max: 2.5, step: 0.1, val: 1.0, onChange: (v) => { try { window.shaderZoom = parseFloat(v); } catch(e){} if (typeof draw === 'function') draw(); } },
    dyn2: { type: 'slider', label: "Extrusion Depth", min: 0.1, max: 2.0, step: 0.1, val: 1.0, onChange: (v) => { try { shaderExtrusion = parseFloat(v); if (typeof shaderBlocks !== 'undefined') shaderBlocks.length = 0; _lastShaderWidth = 0; _shaderBuildPending = true; } catch(e){} } },
    dyn3: { type: 'slider', label: "Fluidity Fade", min: 0.0, max: 1.0, step: 0.05, val: 0.0, onChange: (v) => { try { shaderFluidityFade = parseFloat(v); if (typeof shaderBlocks !== 'undefined') shaderBlocks.length = 0; _lastShaderWidth = 0; _shaderBuildPending = true; } catch(e){} } },
    dynPreset: { type: 'select', label: "Preset", items: dummyPresets, val: 'Style 1', onChange: dummyPresetFn }
  },
  flow: {
    dyn1: { type: 'select', label: "Hatch Precision", items: [{ label: 'Fine', value: 0.001 }, { label: 'Medium', value: 0.0022 }, { label: 'Coarse', value: 0.005 }], val: 0.001, onChange: (v) => { try{ flowCurveScale = parseFloat(v); compilePlotterTopology(); }catch(e){} } },
    dyn2: { type: 'slider', label: "Line Thickness", min: 0.5, max: 3.0, step: 0.1, val: 1.2, onChange: (v) => { try{ flowLineWeight = parseFloat(v); compilePlotterTopology(); }catch(e){} } },
    dyn3: { type: 'slider', label: "Fluidity Fade", min: 0.0, max: 1.0, step: 0.05, val: 0.0, onChange: (v) => { try{ flowFluidityFade = parseFloat(v); compilePlotterTopology(); }catch(e){} } },
    dynPreset: { type: 'select', label: "Preset", items: dummyPresets, val: 'Style 1', onChange: dummyPresetFn }
  }
};

window.fitToolbarToScreen = function() {
  const container = document.getElementById('ui-container');
  if (!container) return;

  // Reset to measure true unscaled height
  container.style.transform = 'none';
  void container.offsetHeight; // force layout
  
  const naturalHeight = container.scrollHeight;
  const topGap = 20; 
  const bottomGap = window.innerHeight / 8; // 1/8th viewport gap guarantee
  const availableHeight = window.innerHeight - topGap - bottomGap;

  // Shrinks base UI to 85% by default
  let scale = 0.85;

  // Mathematically shrink further if it STILL exceeds viewport real estate
  if (naturalHeight * scale > availableHeight) {
    scale = availableHeight / naturalHeight;
  }

  container.style.transform = `scale(${scale})`;
};

function triggerCanvasUpdate() {
  if (typeof constrain !== 'function') return; 
  if (typeof clear === 'function') clear();
  if (window.currentMode === 'cube' && typeof generateQuadtreePattern === 'function') generateQuadtreePattern();
  if (window.currentMode === 'flow' && typeof compilePlotterTopology === 'function') compilePlotterTopology();
  if (window.currentMode === 'mesh') { try { if (typeof setupMesh === 'function') setupMesh(); if (typeof processMeshMask === 'function') processMeshMask(); } catch(e){} }
}

function getBrandPalette() {
  if (typeof window.getBrandPaletteHexCatalog === 'function') { return window.getBrandPaletteHexCatalog(); }
  let colors = [];
  for (let key in window) {
    if (key.startsWith('BRAND_') && typeof window[key] === 'object') {
      for (let cKey in window[key]) {
        let val = window[key][cKey];
        if (typeof val === 'string' && val.match(/^#([0-9A-F]{3}){1,2}$/i)) { colors.push(val.toUpperCase()); }
      }
    }
  }
  if (colors.length === 0) { colors = ['#1C1C1C', '#3D3D3D', '#FF8000', '#8B5C44', '#2D69E6', '#C2CB7F', '#7DBA97', '#284A3A', '#F4F2EB', '#DCDFE3', '#5C5A55']; }
  return [...new Set(colors)]; 
}

window.updateGlobalColor = function(type, index, hex) {
    const mode = window.currentMode;
    window.__rasterCubeUserCustomPaint = true; 

    try {
        if (mode === 'cube') {
            if (type === 'bg') { try { bgColor = hex; } catch(e){} }
            if (type === 'fg') {
               if(index === 0) { try { lineColor = hex; } catch(e){} }
               if(index === 1) { try { fillColor = hex; } catch(e){} }
               if(index === 2) { try { accentColor = hex; } catch(e){} }
               if(index === 3) { try { innerColor = hex; } catch(e){} } 
            }
        } else if (mode === 'shader') {
            if (type === 'bg') { try { shaderBgColor = hex; } catch(e){} }
            if (type === 'fg') {
               if(index === 0) { try { shaderBaseColor = hex; } catch(e){} }
               if(index === 1) { try { shaderAccentColor = hex; } catch(e){} }
               if(index === 2) { try { shaderAccentColor2 = hex; } catch(e){} }
            }
        } else if (mode === 'flow') {
            if (type === 'bg') { try { flowBgColor = hex; } catch(e){} }
            if (type === 'fg' && index === 0) { try { flowColor1 = hex; } catch(e){} }
        } else if (mode === 'mesh') {
            if (type === 'bg') { try { meshBgColor = hex; } catch(e){} }
            if (type === 'fg') { try { window.artColors = window.artColors || []; window.artColors[index] = hex; } catch(e){} }
        }
    } catch(e) {}

    const labelSpan = document.getElementById(`swatch-label-${type}-${index}`);
    if (labelSpan) labelSpan.innerText = hex.toUpperCase().replace('#', '');
    const swatch = document.getElementById(`swatch-color-${type}-${index}`);
    if(swatch) { swatch.style.background = hex; }
    if (mode !== 'shader') { triggerCanvasUpdate(); }
}

window.openCustomColorPicker = function(e, type, index, currentHex) {
  e.stopPropagation();
  closeAllDropdowns();

  let picker = document.getElementById('custom-color-picker');
  if (!picker) {
    picker = document.createElement('div');
    picker.id = 'custom-color-picker';
    picker.style.position = 'absolute';
    picker.style.top = 'calc(100% + 4px)';
    picker.style.left = '0px'; 
    picker.style.zIndex = '9999';
    picker.style.width = '180px';
    picker.style.background = 'rgba(255, 255, 255, 0.9)';
    picker.style.backdropFilter = 'blur(15px)';
    picker.style.border = '1px solid rgba(0, 0, 0, 0.1)';
    picker.style.borderRadius = '6px';
    picker.style.padding = '10px';
    picker.style.boxShadow = '0 6px 16px rgba(0,0,0,0.15)';
    picker.style.display = 'flex';
    picker.style.flexDirection = 'column';
    picker.style.gap = '8px';
    picker.addEventListener('click', (ev) => ev.stopPropagation());
  }

  // Appends to the specific swatch row clicked, keeping math contained in the scaled layer
  e.currentTarget.appendChild(picker);
  picker.style.display = 'flex';

  const palette = getBrandPalette();
  let gridHTML = '<div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;">';
  palette.forEach(hex => {
    let borderStyle = hex.toUpperCase() === '#FFFFFF' ? '1px solid rgba(0,0,0,0.1)' : 'none';
    gridHTML += `<div 
        style="width: 18px; height: 18px; background: ${hex}; cursor: pointer; border: ${borderStyle}; box-sizing: border-box; transition: transform 0.1s; border-radius: 4px;"
        onmouseover="this.style.transform='scale(1.15)'"
        onmouseout="this.style.transform='scale(1)'"
        onclick="window.updateGlobalColor('${type}', ${index}, '${hex}'); closeAllDropdowns();"
        title="${hex}"
    ></div>`; 
  });
  gridHTML += '</div>';

  let hexValue = currentHex.replace('#', '');
  let hexInputHTML = `
    <div style="display: flex; gap: 6px; align-items: center; border-top: 1px solid rgba(0,0,0,0.1); padding-top: 8px;">
      <div id="custom-picker-preview" style="width: 18px; height: 18px; background: ${currentHex}; border: ${currentHex.toUpperCase() === '#FFFFFF' ? '1px solid rgba(0,0,0,0.1)' : 'none'}; box-sizing: border-box; border-radius: 4px;"></div>
      <span style="color: black; font-family: monospace; font-size: 10px;">#</span>
      <input type="text" value="${hexValue}" maxlength="6"
          style="width: 100%; background: white; color: black; border: 1px solid rgba(0,0,0,0.1); border-radius: 4px; padding: 3px 6px; font-family: monospace; font-size: 10px; outline: none;"
          oninput="
            let val = this.value.replace(/[^0-9A-Fa-f]/g, ''); 
            this.value = val;
            if(val.length === 6 || val.length === 3) {
              window.updateGlobalColor('${type}', ${index}, '#' + val);
              document.getElementById('custom-picker-preview').style.background = '#' + val;
            }
          "
      >
    </div>
  `; 

  picker.innerHTML = gridHTML + hexInputHTML;
};

function renderColorUI() {
  let bg = '#000000';
  let fgColors = [];
  const mode = window.currentMode;
  
  try {
    if (mode === 'cube') {
      bg = typeof bgColor !== 'undefined' ? bgColor : '#1C1C1C';
      fgColors = [
        typeof lineColor !== 'undefined' ? lineColor : '#3D3D3D', 
        typeof fillColor !== 'undefined' ? fillColor : '#FF8000', 
        typeof accentColor !== 'undefined' ? accentColor : '#FF8000',
        typeof innerColor !== 'undefined' ? innerColor : '#FFFFFF' 
      ];
    } else if (mode === 'mesh') {
      bg = typeof meshBgColor !== 'undefined' ? meshBgColor : '#1C1C1C';
      let defaultMeshColors = ['#C2CB7F', '#D99084', '#5C8DB8', '#A493C4'];
      fgColors = [];
      for(let i=0; i<4; i++) {
         fgColors.push((window.artColors && window.artColors[i]) ? window.artColors[i] : defaultMeshColors[i]);
      }
    } else if (mode === 'shader') {
      bg = typeof shaderBgColor !== 'undefined' ? shaderBgColor : '#F4F2EB';
      fgColors = [
        typeof shaderBaseColor !== 'undefined' ? shaderBaseColor : '#FFFFFF', 
        typeof shaderAccentColor !== 'undefined' ? shaderAccentColor : '#DCDFE3', 
        typeof shaderAccentColor2 !== 'undefined' ? shaderAccentColor2 : '#5C5A55'
      ];
    } else if (mode === 'flow') {
      bg = typeof flowBgColor !== 'undefined' ? flowBgColor : '#f5f3f0';
      fgColors = [typeof flowColor1 !== 'undefined' ? flowColor1 : '#2D69E6'];
    }
  } catch (e) {}

  const createSwatchHTML = (hex, type, index) => {
    let h = (hex || '#000000').toUpperCase();
    if(!h.startsWith('#')) h = '#' + h;
    return `
      <div class="color-row" onclick="window.openCustomColorPicker(event, '${type}', ${index}, '${h}')">
        <div class="color-left">
          <span class="swatch" id="swatch-color-${type}-${index}" style="background:${h};"></span>
          <span id="swatch-label-${type}-${index}">${h.replace('#','')}</span>
        </div>
        <span class="pct">100%</span>
      </div>
    `; 
  };

  const swatchesContainer = document.getElementById('ui-color-swatches');
  const bgContainer = document.getElementById('ui-bg-swatch');

  if (swatchesContainer) { swatchesContainer.innerHTML = fgColors.map((c, i) => createSwatchHTML(c, 'fg', i)).join(''); }
  if (bgContainer) { bgContainer.innerHTML = createSwatchHTML(bg, 'bg', 0); }
  
  // Re-eval height after populating
  setTimeout(window.fitToolbarToScreen, 10);
}

function closeAllDropdowns() {
  document.querySelectorAll('.select-items').forEach(item => item.classList.add('select-hide'));
  document.querySelectorAll('.select-selected').forEach(btn => btn.classList.remove('active'));
  const picker = document.getElementById('custom-color-picker');
  if (picker) picker.style.display = 'none';
}

function applyDropdown(selectId, items, defaultVal, callback) {
  const select = document.getElementById(selectId);
  if(!select) return;
  const btn = select.querySelector('.select-selected');
  let dropdown = select.querySelector('.select-items');
  if(!btn || !dropdown) return;
  
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    const isOpening = dropdown.classList.contains('select-hide');
    closeAllDropdowns();
    if (isOpening) {
      btn.classList.add('active');
      dropdown.classList.remove('select-hide');
      // Anchor dynamically inside relative wrapper
      dropdown.style.position = 'absolute';
      dropdown.style.top = 'calc(100% + 4px)'; 
      dropdown.style.left = '0px';
      dropdown.style.width = '100%';
    }
  });

  dropdown.innerHTML = '';
  items.forEach(item => {
    const div = document.createElement('div');
    div.innerText = item.label;
    div.addEventListener('click', function(e) {
      e.stopPropagation();
      btn.innerText = item.label;
      btn.dataset.value = item.value;
      callback(item.value);
      dropdown.classList.add('select-hide');
      btn.classList.remove('active');
      triggerCanvasUpdate();
    });
    dropdown.appendChild(div);
  });
  
  const defItem = items.find(i => i.value == defaultVal) || items[0];
  if (defItem) {
    btn.innerText = defItem.label;
    btn.dataset.value = defItem.value;
    callback(defItem.value); 
  }
}

function applyCustomSlider(slotId, cfg) {
  const container = document.getElementById('slider-container-' + slotId);
  if(!container) return;

  const newSliderEl = container.querySelector('.custom-slider').cloneNode(true);
  container.querySelector('.custom-slider').replaceWith(newSliderEl);

  const track = newSliderEl.querySelector('.custom-slider-track');
  const fill = newSliderEl.querySelector('.custom-slider-fill');
  const thumb = newSliderEl.querySelector('.custom-slider-thumb');
  const valDisplay = document.getElementById('val-' + slotId);

  let isDragging = false;
  const min = cfg.min;
  const max = cfg.max;
  const step = cfg.step || 0.1;

  function updateUI(val) {
    const pct = (val - min) / (max - min);
    fill.style.width = (pct * 100) + '%';
    thumb.style.left = (pct * 100) + '%';
    if (valDisplay) valDisplay.innerText = Number(val).toFixed(step < 1 ? 2 : 0);
  }

  function calculateValue(clientX) {
    const rect = track.getBoundingClientRect();
    let pct = (clientX - rect.left) / rect.width;
    pct = Math.max(0, Math.min(1, pct));
    let rawVal = min + pct * (max - min);
    let snappedVal = Math.round(rawVal / step) * step;
    return Math.max(min, Math.min(max, snappedVal));
  }

  function onMove(e) {
    if (!isDragging) return;
    e.preventDefault(); 
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const v = calculateValue(clientX);
    updateUI(v);
    cfg.val = v;
    cfg.onChange(v);
    triggerCanvasUpdate();
  }

  function onUp() {
    isDragging = false;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onUp);
  }

  newSliderEl.addEventListener('mousedown', (e) => {
    isDragging = true;
    const v = calculateValue(e.clientX);
    updateUI(v);
    cfg.val = v;
    cfg.onChange(v);
    triggerCanvasUpdate();
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  newSliderEl.addEventListener('touchstart', (e) => {
    isDragging = true;
    const v = calculateValue(e.touches[0].clientX);
    updateUI(v);
    cfg.val = v;
    cfg.onChange(v);
    triggerCanvasUpdate();
    document.addEventListener('touchmove', onMove, {passive: false});
    document.addEventListener('touchend', onUp);
  }, {passive: true});

  updateUI(cfg.val);
  cfg.onChange(cfg.val); 
}

function updateToolbar(mode) {
  const cfg = toolbarConfigs[mode];
  if(!cfg) return;
  
  const slots = ['dyn1', 'dyn2', 'dyn3', 'dynPreset'];
  
  slots.forEach(slot => {
    const DOM_ID_SUFFIX = slot === 'dynPreset' ? 'dyn-preset' : slot;
    const group = document.getElementById('control-group-' + DOM_ID_SUFFIX);
    const label = document.getElementById('label-' + DOM_ID_SUFFIX);
    const selectContainer = document.getElementById('select-' + DOM_ID_SUFFIX);
    const sliderContainer = document.getElementById('slider-container-' + DOM_ID_SUFFIX);
    
    if (cfg[slot]) {
      group.style.display = 'block';
      
      if (cfg[slot].type === 'slider') {
        label.innerHTML = `${cfg[slot].label} <span id="val-${DOM_ID_SUFFIX}" style="float:right; opacity:0.5; font-size:10px;">${cfg[slot].val}</span>`;
        if (selectContainer) selectContainer.style.display = 'none';
        if (sliderContainer) sliderContainer.style.display = 'block';
        applyCustomSlider(DOM_ID_SUFFIX, cfg[slot]);
      } else {
        label.innerHTML = cfg[slot].label;
        if (selectContainer) selectContainer.style.display = 'block';
        if (sliderContainer) sliderContainer.style.display = 'none';
        applyDropdown(selectContainer.id, cfg[slot].items, cfg[slot].val, (v) => {
          cfg[slot].val = v; 
          cfg[slot].onChange(v); 
        });
      }
    } else {
      group.style.display = 'none';
    }
  });

  const formatItems = [ {label: 'PNG', value: 'png'}, {label: 'JPG', value: 'jpg'} ];
  if (mode === 'cube' || mode === 'flow') { formatItems.push({label: 'SVG', value: 'svg'}); }
  if (!formatItems.find(i => i.value === exportFmtVal)) { exportFmtVal = 'png'; }
  
  applyDropdown('select-export-fmt', formatItems, exportFmtVal, (v) => { exportFmtVal = v; });
  
  // Re-eval scale after sections change height
  setTimeout(window.fitToolbarToScreen, 10);
}

function generateTrueVectorSVG(targetW, targetH, cropX, cropY) {
  let svgStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${targetW} ${targetH}" width="${targetW}" height="${targetH}">`;
  svgStr += `<g transform="translate(${-cropX}, ${-cropY})">`;

  if (window.currentMode === 'flow') {
      let bg = typeof flowBgColor !== 'undefined' ? flowBgColor : '#f5f3f0';
      svgStr += `<rect x="0" y="0" width="${width}" height="${height}" fill="${bg}" />`;
      
      if (typeof compilePlotterTopology === 'function') {
          compilePlotterTopology(); 
          for (let path of plotterRenderQueue) {
              let c = path.color;
              let strokeStr = `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
              
              if (path.type === 'hLine' || path.type === 'vLine') {
                  let pts = path.vertices.map(v => `${v.x},${v.y}`).join(' ');
                  svgStr += `<polyline points="${pts}" fill="none" stroke="${strokeStr}" stroke-width="${path.weight}" opacity="0.9"/>`;
              } else if (path.type === 'dot') {
                  svgStr += `<circle cx="${path.vertices[0].x}" cy="${path.vertices[0].y}" r="${path.weight/2}" fill="${strokeStr}" opacity="0.86"/>`;
              }
          }
          setupFlow(); 
      }
  } 
  else if (window.currentMode === 'cube') {
      const parseColor = (args) => {
          if(args.length === 0) return {c: 'none', a: 1};
          let r=0, g=0, b=0, a=1;
          if(args.length === 1) {
              if(typeof args[0] === 'string') return {c: args[0], a: 1};
              if(args[0] && args[0].levels) {
                  r = args[0].levels[0]; g = args[0].levels[1]; b = args[0].levels[2]; a = args[0].levels[3]/255;
              }
          } else if(args.length >= 3) {
              r = args[0]; g = args[1]; b = args[2];
              if(args.length === 4) a = args[3]/255;
          }
          if(typeof args[0] === 'string') return {c: args[0], a: 1};
          return {c: `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`, a: a};
      };

      let fallbackBg = typeof bgColor !== 'undefined' ? bgColor : '#1c1c1c';
      let bgObj = parseColor([fallbackBg]);
      svgStr += `<rect x="0" y="0" width="${width}" height="${height}" fill="${bgObj.c}" fill-opacity="${bgObj.a}" />`;

      let cFill = {c: 'none', a: 1}, cStroke = {c: 'none', a: 1}, cStrokeWeight = 1;

      const orig = {
          background: window.background, stroke: window.stroke, noStroke: window.noStroke,
          strokeWeight: window.strokeWeight, fill: window.fill, noFill: window.noFill,
          line: window.line, ellipse: window.ellipse, circle: window.circle, ellipseMode: window.ellipseMode,
          rect: window.rect, rectMode: window.rectMode
      };

      try {
          window.background = function() { 
              let bgC = parseColor(arguments);
              svgStr += `<rect x="0" y="0" width="${width}" height="${height}" fill="${bgC.c}" fill-opacity="${bgC.a}" />`; 
          };
          window.stroke = function() { cStroke = parseColor(arguments); };
          window.noStroke = function() { cStroke = {c: 'none', a: 1}; };
          window.strokeWeight = function(w) { cStrokeWeight = w; };
          window.fill = function() { cFill = parseColor(arguments); };
          window.noFill = function() { cFill = {c: 'none', a: 1}; };
          window.line = function(x1, y1, x2, y2) {
              if (cStroke.c !== 'none') {
                  svgStr += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${cStroke.c}" stroke-opacity="${cStroke.a}" stroke-width="${cStrokeWeight}" />`;
              }
          };
          window.ellipse = function(x, y, w, h) {
              let fillAttr = cFill.c !== 'none' ? `fill="${cFill.c}" fill-opacity="${cFill.a}"` : `fill="none"`;
              let strAttr = cStroke.c !== 'none' ? `stroke="${cStroke.c}" stroke-opacity="${cStroke.a}" stroke-width="${cStrokeWeight}"` : ``;
              svgStr += `<ellipse cx="${x}" cy="${y}" rx="${w/2}" ry="${h/2}" ${fillAttr} ${strAttr} />`;
          };
          window.circle = function(x, y, d) {
              let fillAttr = cFill.c !== 'none' ? `fill="${cFill.c}" fill-opacity="${cFill.a}"` : `fill="none"`;
              let strAttr = cStroke.c !== 'none' ? `stroke="${cStroke.c}" stroke-opacity="${cStroke.a}" stroke-width="${cStrokeWeight}"` : ``;
              svgStr += `<circle cx="${x}" cy="${y}" r="${d/2}" ${fillAttr} ${strAttr} />`;
          };
          window.ellipseMode = function() {};

          let currentRectMode = 'CORNER';
          window.rectMode = function(m) { currentRectMode = m; };
          window.rect = function(x, y, w, h) {
              let fillAttr = cFill.c !== 'none' ? `fill="${cFill.c}" fill-opacity="${cFill.a}"` : `fill="none"`;
              let strAttr = cStroke.c !== 'none' ? `stroke="${cStroke.c}" stroke-opacity="${cStroke.a}" stroke-width="${cStrokeWeight}"` : ``;
              let rx = currentRectMode === 'CENTER' ? x - w/2 : x;
              let ry = currentRectMode === 'CENTER' ? y - h/2 : y;
              svgStr += `<rect x="${rx}" y="${ry}" width="${w}" height="${h}" ${fillAttr} ${strAttr} />`;
          };

          if (typeof drawCube === 'function') drawCube();

      } finally {
          Object.assign(window, orig); 
      }
  }

  svgStr += `</g></svg>`;

  const blob = new Blob([svgStr], {type: "image/svg+xml;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `CreativeGen_${window.currentMode}_${Math.floor(Date.now()/1000)}.svg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

document.addEventListener('DOMContentLoaded', () => {

  const modeItems = document.querySelectorAll('#mode-selector li:not(.disabled)');
  modeItems.forEach(item => {
    item.addEventListener('click', function() {
      modeItems.forEach(i => i.classList.remove('active'));
      this.classList.add('active');
      window.currentMode = this.dataset.mode;
      
      updateToolbar(window.currentMode);
      setTimeout(renderColorUI, 50); 
    });
  });

  document.addEventListener("click", function(e) {
    if (!e.target.matches('.select-selected') && !e.target.closest('#custom-color-picker')) closeAllDropdowns();
  });
  
  window.addEventListener('resize', () => {
      closeAllDropdowns();
      window.fitToolbarToScreen();
  });

  updateToolbar(window.currentMode);
  setTimeout(window.fitToolbarToScreen, 100);
  
  document.getElementById('shuffle-btn').addEventListener('click', () => {
    const palette = getBrandPalette();
    const mode = window.currentMode;
    const getLuma = (hex) => {
        const rgb = parseInt(hex.replace('#', ''), 16);
        let r, g, b;
        if (hex.length === 4) {
           r = parseInt(hex[1]+hex[1], 16);
           g = parseInt(hex[2]+hex[2], 16);
           b = parseInt(hex[3]+hex[3], 16);
        } else {
           r = (rgb >> 16) & 0xff; g = (rgb >> 8) & 0xff; b = (rgb >> 0) & 0xff;
        }
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    let shuffled = [...palette];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    let bg = shuffled[0] || '#000000';
    let bgLuma = getLuma(bg);
    let remaining = [];
    
    for (let c of shuffled) {
        if (c === bg) continue;
        if (Math.abs(getLuma(c) - bgLuma) < 35) continue; 
        let isDistinct = true;
        for (let r of remaining) {
            if (Math.abs(getLuma(c) - getLuma(r)) < 25) { isDistinct = false; break; }
        }
        if (isDistinct) remaining.push(c);
        if (remaining.length >= 4) break;
    }
    for (let c of shuffled) {
        if (remaining.length >= 4) break;
        if (!remaining.includes(c) && c !== bg) remaining.push(c);
    }
    while(remaining.length < 4) remaining.push('#FFFFFF');
    const getFg = (index) => remaining[index];

    window.__rasterCubeUserCustomPaint = true; 

    try {
        if (mode === 'cube') {
            try { bgColor = bg; } catch(e){} try { lineColor = getFg(0); } catch(e){}
            try { fillColor = getFg(1); } catch(e){} try { accentColor = getFg(2); } catch(e){}
            try { innerColor = getFg(3); } catch(e){} 
        } else if (mode === 'shader') {
            try { shaderBgColor = bg; } catch(e){} try { shaderBaseColor = getFg(0); } catch(e){}
            try { shaderAccentColor = getFg(1); } catch(e){} try { shaderAccentColor2 = getFg(2); } catch(e){}
        } else if (mode === 'flow') {
            try { flowBgColor = bg; } catch(e){} try { flowColor1 = getFg(0); } catch(e){}
        } else if (mode === 'mesh') {
            try { meshBgColor = bg; } catch(e){}
            try { window.artColors = window.artColors || []; window.artColors[0] = getFg(0); window.artColors[1] = getFg(1); window.artColors[2] = getFg(2); window.artColors[3] = getFg(3); } catch(e){}
        }
    } catch(e){}

    renderColorUI();
    if (mode !== 'shader') triggerCanvasUpdate();
  });

  let initCount = 0;
  const initColors = setInterval(() => {
     renderColorUI(); initCount++; if(initCount > 10) clearInterval(initColors);
  }, 200);
  
  applyDropdown('select-export-scale', [{label:'1x', value: 1}, {label:'2x', value: 2}, {label:'4x', value: 4}], 1, (v) => { exportScaleVal = parseInt(v); });

  document.getElementById('export-btn').addEventListener('click', () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const filename = `CreativeGen_${window.currentMode}_${timestamp}`;

    let targetW = width; let targetH = height;
    
    let cropX = (width - targetW) / 2; let cropY = (height - targetH) / 2;

    if (exportFmtVal === 'svg') {
      generateTrueVectorSVG(targetW, targetH, cropX, cropY); 
      return;
    }

    const doExport = () => {
      saveCanvas(filename, exportFmtVal); 
    };

    if (exportScaleVal > 1) {
      const oldDensity = pixelDensity();
      pixelDensity(exportScaleVal);
      
      // 1. Update Graphics Layer Densities
      if (window.cubePg) window.cubePg.pixelDensity(exportScaleVal);
      if (window.meshPg) window.meshPg.pixelDensity(exportScaleVal);
      if (window.flowPg) window.flowPg.pixelDensity(exportScaleVal);
      if (window.plotterDrawingLayer) window.plotterDrawingLayer.pixelDensity(exportScaleVal);
      if (window.shaderCanvas) window.shaderCanvas.pixelDensity(exportScaleVal);

      // 2. Force layers to redraw themselves after density reset
      if (window.currentMode === 'flow' && typeof compilePlotterTopology === 'function') compilePlotterTopology();
      if (window.currentMode === 'cube' && typeof processCubeMask === 'function') processCubeMask();
      if (window.currentMode === 'mesh' && typeof processMeshMask === 'function') processMeshMask();

      // Draw and Export
      if (typeof draw === 'function') draw();
      doExport();

      // 3. Restore original screen density
      pixelDensity(oldDensity);
      if (window.cubePg) window.cubePg.pixelDensity(oldDensity);
      if (window.meshPg) window.meshPg.pixelDensity(oldDensity);
      if (window.flowPg) window.flowPg.pixelDensity(oldDensity);
      if (window.plotterDrawingLayer) window.plotterDrawingLayer.pixelDensity(oldDensity);
      if (window.shaderCanvas) window.shaderCanvas.pixelDensity(oldDensity);
      
      // 4. Force layers to redraw again to bring the UI preview back
      if (window.currentMode === 'flow' && typeof compilePlotterTopology === 'function') compilePlotterTopology();
      if (window.currentMode === 'cube' && typeof processCubeMask === 'function') processCubeMask();
      if (window.currentMode === 'mesh' && typeof processMeshMask === 'function') processMeshMask();
      
      if (typeof draw === 'function') draw();
    } else {
      doExport();
    }
  });
});
