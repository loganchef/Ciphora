/**
 * Cimbar WASM Engine Manager (Stable Persistent Buffer)
 */

let _loadPromise = null;
let _isScriptAppended = false;
let _sharedCanvas = null;
let _isLoopActive = false;
let _renderCallbacks = new Set();

const CIMBAR_JS_FILE = '/wasm/cimbar.js';
const CIMBAR_WASM_FILE = '/wasm/cimbar.wasm';

function getSharedCanvas() {
    if (typeof document === 'undefined') return null;
    if (!_sharedCanvas) {
        // Reuse existing element if hot-reload left one behind
        _sharedCanvas = document.getElementById('cimbar-persistent-buffer');
    }
    if (!_sharedCanvas) {
        _sharedCanvas = document.createElement('canvas');
        _sharedCanvas.id = 'cimbar-persistent-buffer';
        _sharedCanvas.width = 488;
        _sharedCanvas.height = 488;
        // Must be in DOM for WebGL context creation to succeed in WebView
        _sharedCanvas.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:488px;height:488px;pointer-events:none;z-index:-9999;visibility:visible;';
        document.body.appendChild(_sharedCanvas);
    }
    return _sharedCanvas;
}

let _lastTick = 0;
function tick(now) {
    if (_renderCallbacks.size === 0) {
        _isLoopActive = false;
        return;
    }

    // Limit to ~20fps for power safety
    if (now - _lastTick >= 50) {
        _lastTick = now;
        // Only render if engine is fully ready
        if (window.Module && typeof window.Module._cimbare_render === 'function') {
            try {
                if (window.Module.canvas !== _sharedCanvas) {
                    window.Module.canvas = _sharedCanvas;
                }
                window.Module._cimbare_render();
                window.Module._cimbare_next_frame();
                _renderCallbacks.forEach(cb => {
                    try { cb(_sharedCanvas); } catch(e) {}
                });
            } catch (e) {
                console.error('Cimbar Tick Crash:', e);
            }
        }
    }

    requestAnimationFrame(tick);
}

export const loadCimbarEngine = (forceRetry = false) => {
    if (typeof window === 'undefined') return Promise.reject(new Error('Browser required'));

    if (_loadPromise && !forceRetry) return _loadPromise;

    if (forceRetry) {
        console.log('♻️ Resetting Cimbar Singleton');
        _loadPromise = null;
        _isScriptAppended = false;
        window.Module = null;
        const old = document.getElementById('cimbar-engine-singleton');
        if (old) old.remove();
    }

    // Detect stale Module: functions exist but WebGL ctx is gone (HMR scenario)
    if (window.Module && window.Module._cimbare_encode_bufsize && !window.Module.ctx) {
        console.warn('⚠️ Stale Module detected (no WebGL ctx), forcing reset...');
        window.Module = null;
        _isScriptAppended = false;
        _loadPromise = null;
        const old = document.getElementById('cimbar-engine-singleton');
        if (old) old.remove();
    }

    if (_loadPromise) return _loadPromise;

    _loadPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            _loadPromise = null;
            reject(new Error('初始化超时，请尝试刷新页面'));
        }, 15000);

        const sharedCanvas = getSharedCanvas();
        window.Module = window.Module || {};
        window.Module.canvas = sharedCanvas;
        window.Module.locateFile = (path) => path.endsWith('.wasm') ? CIMBAR_WASM_FILE : path;
        const onDone = () => {
            clearTimeout(timeout);
            if (window.Module._cimbare_init_encode) {
                const ratio = window.Module._cimbare_get_aspect_ratio() || 1;
                _sharedCanvas.width = ratio > 1 ? Math.round(488 * ratio) : 488;
                _sharedCanvas.height = ratio > 1 ? 488 : Math.round(488 / ratio);
                console.log('✅ Cimbar engine ready, canvas:', _sharedCanvas.width, 'x', _sharedCanvas.height, 'ctx:', !!window.Module.ctx);
                if (!_isLoopActive && _renderCallbacks.size > 0) {
                    _isLoopActive = true;
                    requestAnimationFrame(tick);
                }
                resolve(window.Module);
            } else {
                _loadPromise = null;
                reject(new Error('WASM 模块异常'));
            }
        };

        console.log('🔧 loadCimbarEngine: calledRun=', window.Module.calledRun, 'ctx=', !!window.Module.ctx, '_cimbare_init_encode=', !!window.Module._cimbare_init_encode);

        if (window.Module._cimbare_init_encode) {
            onDone();
            return;
        }

        if (window.Module.calledRun && window.Module.ctx) {
            onDone();
            return;
        }

        window.Module.onRuntimeInitialized = onDone;

        if (!_isScriptAppended) {
            _isScriptAppended = true;
            const script = document.createElement('script');
            script.id = 'cimbar-engine-singleton';
            script.src = CIMBAR_JS_FILE;
            script.async = true;
            script.onerror = () => {
                _isScriptAppended = false;
                _loadPromise = null;
                reject(new Error('脚本下载失败'));
            };
            document.head.appendChild(script);
        } else {
            const check = setInterval(() => {
                if (window.Module && window.Module._cimbare_init_encode) {
                    clearInterval(check);
                    onDone();
                }
            }, 100);
        }
    });

    return _loadPromise;
};

export const subscribeToCimbarRender = (callback) => {
    console.log('🔌 New viewer subscribed to Cimbar stream');
    _renderCallbacks.add(callback);
    
    // Immediately trigger if shared buffer already has content
    if (_sharedCanvas) callback(_sharedCanvas);

    if (!_isLoopActive) {
        console.log('🚀 Starting Cimbar render loop');
        _isLoopActive = true;
        requestAnimationFrame(tick);
    }
    
    return () => {
        _renderCallbacks.delete(callback);
    };
};

export const resetCimbarEngine = () => {
    _loadPromise = null;
    _isScriptAppended = false;
    _isLoopActive = false;
    _renderCallbacks.clear();
};
