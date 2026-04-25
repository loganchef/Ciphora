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

const FRAME_INTERVAL = 80; // 约 12.5 FPS

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

// 辅助函数：安全启动循环
function startLoopIfNeeded() {
    if (!_isLoopActive && _engineFullyReady && _renderCallbacks.size > 0) {
        console.log('🚀 Starting/Resuming Cimbar render loop');
        _isLoopActive = true;
        _lastFrameTime = 0;
        requestAnimationFrame(tick);
    }
}

function tick(now) {
    if (_renderCallbacks.size === 0 || !_engineFullyReady) {
        console.log('🛑 Loop paused: ', { callbacks: _renderCallbacks.size, ready: _engineFullyReady });
        _isLoopActive = false;
        return;
    }

    if (now - _lastFrameTime >= FRAME_INTERVAL) {
        _lastFrameTime = now;
        const M = window.Module;
        const canvas = getSharedCanvas();
        
        if (M && typeof M._cimbare_render === 'function') {
            try {
                // 强制每一帧都同步引用，防止 WASM 内部丢失目标
                if (M.canvas !== canvas) M.canvas = canvas;

                M._cimbare_render();

                _renderCallbacks.forEach(cb => { try { cb(canvas); } catch(e) {} });

                if (typeof M._cimbare_next_frame === 'function') {
                    M._cimbare_next_frame();
                }
            } catch (e) {
                console.warn('Cimbar Tick skipped:', e.message);
            }
        }
    }
    requestAnimationFrame(tick);
}

export const loadCimbarEngine = (forceRetry = false) => {
    if (typeof window === 'undefined') return Promise.reject(new Error('Browser required'));
    
    if (forceRetry) {
        console.log('♻️ Resetting Engine...');
        _engineFullyReady = false;
        _loadPromise = null;
        _cachedGL = null;
        window.dispatchEvent(new CustomEvent('cimbar-force-reset'));
        
        if (window.Module && window.Module._cimbare_init_encode) {
            _engineFullyReady = true;
            startLoopIfNeeded();
            return Promise.resolve(window.Module);
        }
    }

    if (_loadPromise && !forceRetry) return _loadPromise;

    _loadPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            if (_loadPromise) {
                _loadPromise = null;
                reject(new Error('加载超时'));
            }
        }, 15000);

        const canvas = getSharedCanvas();
        window.Module = window.Module || {};
        window.Module.canvas = canvas;
        
        window.Module.onRuntimeInitialized = () => {
            clearTimeout(timeout);
            if (typeof window.Module._cimbare_configure === 'function') {
                window.Module._cimbare_configure(488, 488);
            }
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

export const subscribeToCimbarRender = (callback) => {
    _renderCallbacks.add(callback);
    const canvas = getSharedCanvas();
    if (canvas) { try { callback(canvas); } catch(e) {} }
    startLoopIfNeeded();
    return () => { _renderCallbacks.delete(callback); };
};
