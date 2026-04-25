/**
 * Cimbar WASM Engine Manager (Stable Persistent Buffer)
 */

let _loadPromise = null;
let _isScriptAppended = false;
let _sharedCanvas = null;
let _isLoopActive = false;
let _renderCallbacks = new Set();
let _cachedGL = null;
let _engineFullyReady = false;
let _lastFrameTime = 0;

// 动态状态
let _fps = parseInt(localStorage.getItem('cimbar_fps') || '12');
let _frameInterval = 1000 / _fps;
let _currentMode = localStorage.getItem('cimbar_densityMode') || 'bu';

const CIMBAR_JS_FILE = '/wasm/cimbar.js';
const CIMBAR_WASM_FILE = '/wasm/cimbar.wasm';

function getSharedCanvas() {
    if (typeof document === 'undefined') return null;
    let canvas = document.getElementById('canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'canvas';
        canvas.width = 488;
        canvas.height = 488;
        canvas.style.cssText = 'position:fixed;left:0;top:0;width:488px;height:488px;pointer-events:none;z-index:-9999;opacity:0.01;display:block;';
        const originalGetContext = canvas.getContext;
        canvas.getContext = function(type, attributes) {
            if (type.includes('webgl')) {
                if (_cachedGL) return _cachedGL;
                attributes = attributes || {};
                attributes.preserveDrawingBuffer = true;
                attributes.alpha = false;
                _cachedGL = originalGetContext.call(this, type, attributes);
                return _cachedGL;
            }
            return originalGetContext.call(this, type, attributes);
        };
        document.body.appendChild(canvas);
    }
    _sharedCanvas = canvas;
    return canvas;
}

function startLoopIfNeeded() {
    if (!_isLoopActive && _engineFullyReady && _renderCallbacks.size > 0) {
        _isLoopActive = true;
        _lastFrameTime = 0;
        requestAnimationFrame(tick);
    }
}

function tick(now) {
    if (_renderCallbacks.size === 0 || !_engineFullyReady) {
        _isLoopActive = false;
        return;
    }
    if (now - _lastFrameTime >= _frameInterval) {
        _lastFrameTime = now;
        const M = window.Module;
        const canvas = getSharedCanvas();
        if (M && typeof M._cimbare_render === 'function') {
            try {
                if (M.canvas !== canvas) M.canvas = canvas;
                M._cimbare_render();
                _renderCallbacks.forEach(cb => { try { cb(canvas); } catch(e) {} });
                if (typeof M._cimbare_next_frame === 'function') {
                    M._cimbare_next_frame();
                }
            } catch (e) { }
        }
    }
    requestAnimationFrame(tick);
}

// 各模式的原生宽高比（来自 GridConf.h，+16 匹配 configure() 的 window 计算）
// B(68):  Conf8x8     1024+16 / 1024+16 = 1.0
// BU(66): Conf8x8_micro 736+16 / 637+16 = 752/653 ≈ 1.1515
// BM(67): Conf8x8_mini  1024+16 / 720+16 = 1040/736 ≈ 1.4130
// 4C(4):  Conf8x8 (legacy) 1024+16 / 1024+16 = 1.0
const MODE_ASPECT_RATIO = { b: 1.0, bu: 752/653, bm: 1040/736, '4c': 1.0 };

// 对应官方 Main.setMode 逻辑
export const updateCimbarMode = (modeStr) => {
    const M = window.Module;
    if (!M || !M._cimbare_configure) return;

    let modeVal = 68;
    const s = modeStr.toUpperCase();
    if (s === '4C') modeVal = 4;
    else if (s === 'BU') modeVal = 66;
    else if (s === 'BM') modeVal = 67;
    else if (s === 'B') modeVal = 68;

    M._cimbare_configure(modeVal, -1);
    _currentMode = modeStr.toLowerCase();
    localStorage.setItem('cimbar_densityMode', _currentMode);

    const ratio = MODE_ASPECT_RATIO[_currentMode] ?? 1.0;
    window.dispatchEvent(new CustomEvent('cimbar-aspect-ratio', { detail: { ratio } }));
    console.log(`⚙️ [WASM] Mode: ${s} (${modeVal}), ratio: ${ratio}`);
};

export const updateCimbarFPS = (newFps) => {
    _fps = Math.max(1, Math.min(60, newFps));
    _frameInterval = 1000 / _fps;
    localStorage.setItem('cimbar_fps', _fps.toString());
};

export const loadCimbarEngine = (forceRetry = false) => {
    if (typeof window === 'undefined') return Promise.reject(new Error('Browser required'));
    if (forceRetry) {
        _engineFullyReady = false;
        _loadPromise = null;
        _cachedGL = null;
        window.dispatchEvent(new CustomEvent('cimbar-force-reset'));
        if (window.Module && window.Module._cimbare_init_encode) {
            _engineFullyReady = true;
            updateCimbarMode(_currentMode);
            startLoopIfNeeded();
            return Promise.resolve(window.Module);
        }
    }

    if (_loadPromise && !forceRetry) return _loadPromise;

    _loadPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            if (_loadPromise) { _loadPromise = null; reject(new Error('加载超时')); }
        }, 15000);

        const canvas = getSharedCanvas();
        window.Module = window.Module || {};
        window.Module.canvas = canvas;
        window.Module.onRuntimeInitialized = () => {
            clearTimeout(timeout);
            updateCimbarMode(_currentMode);
            if (window.Module._cimbare_init_encode) {
                _engineFullyReady = true;
                startLoopIfNeeded();
                resolve(window.Module);
            }
        };
        window.Module.locateFile = (path) => path.endsWith('.wasm') ? CIMBAR_WASM_FILE : path;
        if (!_isScriptAppended) {
            _isScriptAppended = true;
            const script = document.createElement('script');
            script.id = 'cimbar-engine-singleton';
            script.src = CIMBAR_JS_FILE;
            script.async = true;
            document.head.appendChild(script);
        } else if (window.Module._cimbare_init_encode) {
            window.Module.onRuntimeInitialized();
        }
    });
    return _loadPromise;
};

export const resetEncoderCache = () => {
    window.dispatchEvent(new CustomEvent('cimbar-force-reset'));
};

export const subscribeToCimbarRender = (callback) => {
    _renderCallbacks.add(callback);
    const canvas = getSharedCanvas();
    if (canvas) { try { callback(canvas); } catch(e) {} }
    startLoopIfNeeded();
    return () => { _renderCallbacks.delete(callback); };
};
