import { useState, useEffect, useRef, useCallback } from 'react';

const CIMBAR_JS_FILE = 'cimbar.js';
const CIMBAR_WASM_FILE = 'cimbar.wasm';

// 模块级：WASM 只初始化一次
let _moduleInitPromise = null;

// 清理上一次热更新/版本遗留的孤立 canvas
function cleanupOrphanCanvases() {
    document.querySelectorAll('body > canvas').forEach(c => c.remove());
}

// WebGL 检测（用独立 canvas，不污染渲染 canvas）
function isWebGLOkay() {
    const canvas = document.createElement('canvas');
    const configs = [
        { version: 2, type: 'webgl2' },
        { version: 1, type: 'webgl' },
        { version: 1, type: 'experimental-webgl' },
    ];
    for (const cfg of configs) {
        const gl = canvas.getContext(cfg.type, { antialias: false, alpha: false });
        if (!gl) continue;
        const exts = gl.getSupportedExtensions() || [];
        const required = ['OES_texture_float', 'OES_texture_half_float', 'WEBGL_lose_context'];
        const missing = required.filter(x => !exts.includes(x));
        const isWebGL2 = cfg.version === 2;
        const criticalMissing = isWebGL2
            ? missing.filter(x => x !== 'OES_texture_float' && x !== 'OES_texture_half_float')
            : missing;
        if (criticalMissing.length > 0 && !isWebGL2) continue;
        return { ok: true };
    }
    return { ok: false };
}

export default function CimbarQRCode({ data, filename = 'data.bin', className = '', style, onError, onReady }) {
    const [status, setStatus] = useState('initializing');
    const [message, setMessage] = useState('正在初始化...');
    const [progress, setProgress] = useState(0);

    const canvasRef = useRef(null);
    const isEncodingRef = useRef(false);
    const importFileRef = useRef(null);
    const lastEncodedDataRef = useRef(null);

    const _interval = useRef(66);
    const _pause = useRef(0);
    const _compressBuff = useRef(undefined);
    const nextFrameTimer = useRef(null);

    const nextFrame = useCallback(() => {
        if (!window.Module) return;
        if (_pause.current > 0) _pause.current -= 1;
        const start = performance.now();
        if (_pause.current === 0) {
            window.Module._cimbare_render();
            window.Module._cimbare_next_frame();
        }
        const elapsed = performance.now() - start;
        const next = _interval.current > elapsed ? _interval.current - elapsed : 0;
        nextFrameTimer.current = setTimeout(nextFrame, next);
    }, []);

    const setMode = useCallback((mode_str) => {
        if (!window.Module) return;
        let modeVal = 68;
        if (mode_str === '4C') modeVal = 4;
        else if (mode_str === 'Bm') modeVal = 67;
        window.Module._cimbare_configure(modeVal, -1);
    }, []);

    const copyToWasmHeap = useCallback((abuff) => {
        if (!window.Module) return null;
        const ptr = window.Module._malloc(abuff.length);
        const view = new Uint8Array(window.Module.HEAPU8.buffer, ptr, abuff.length);
        view.set(abuff);
        return view;
    }, []);

    const encode_init = useCallback((fname) => {
        if (!window.Module) return;
        console.log('encoding ' + fname);
        const wasmFn = copyToWasmHeap(new TextEncoder().encode(fname));
        if (!wasmFn) return;
        try {
            const res = window.Module._cimbare_init_encode(wasmFn.byteOffset, wasmFn.length, -1);
            console.log('init_encode returned ' + res);
        } finally {
            window.Module._free(wasmFn.byteOffset);
        }
    }, [copyToWasmHeap]);

    const encode_bytes = useCallback((wasmData) => {
        if (!window.Module) return;
        const res = window.Module._cimbare_encode(wasmData.byteOffset, wasmData.length);
        console.log('encode returned ' + res);
    }, []);

    const importFile = useCallback((file) => {
        if (!window.Module) return;
        const chunkSize = window.Module._cimbare_encode_bufsize();

        if (_compressBuff.current !== undefined) {
            window.Module._free(_compressBuff.current.byteOffset);
            _compressBuff.current = undefined;
        }
        const ptr = window.Module._malloc(chunkSize);
        _compressBuff.current = new Uint8Array(window.Module.HEAPU8.buffer, ptr, chunkSize);

        let offset = 0;
        const reader = new FileReader();
        encode_init(file.name);

        reader.onload = function (event) {
            const datalen = event.target.result.byteLength;
            if (datalen > 0) {
                const uint8View = new Uint8Array(event.target.result);
                _compressBuff.current.set(uint8View);
                const buffView = new Uint8Array(window.Module.HEAPU8.buffer, _compressBuff.current.byteOffset, datalen);
                encode_bytes(buffView);
                offset += chunkSize;
                readNext();
            } else {
                console.log('Finished reading file.');
                const nullBuff = new Uint8Array(window.Module.HEAPU8.buffer, _compressBuff.current.byteOffset, 0);
                encode_bytes(nullBuff);
                isEncodingRef.current = false;
                setStatus('rendering');
                setMessage('正在渲染...');
                setProgress(100);
            }
        };

        function readNext() {
            const slice = file.slice(offset, offset + chunkSize);
            reader.readAsArrayBuffer(slice);
            setProgress(Math.min(100, Math.round((offset / file.size) * 100)));
        }

        readNext();
    }, [encode_init, encode_bytes]);

    useEffect(() => {
        importFileRef.current = importFile;
    }, [importFile]);

    const loadCimbarWasm = useCallback(() => {
        if (typeof window === 'undefined') return Promise.reject(new Error('不在浏览器环境'));

        const canvas = canvasRef.current;
        if (!canvas) {
            return Promise.reject(new Error('Canvas 未就绪'));
        }

        // WASM 已初始化，重新绑定当前组件的 canvas
        if (_moduleInitPromise && window.Module && window.Module._cimbare_init_encode) {
            return _moduleInitPromise.then(() => {
                // 重新绑定 canvas（可能是热更新后的新 canvas）
                window.Module.canvas = canvas;

                // 重新设置尺寸
                const aspectRatio = window.Module._cimbare_get_aspect_ratio();
                const baseSize = 488;
                let width, height;
                if (aspectRatio > 1) {
                    width = Math.round(baseSize * aspectRatio);
                    height = baseSize;
                } else {
                    width = baseSize;
                    height = Math.round(baseSize / aspectRatio);
                }
                canvas.width = width;
                canvas.height = height;

                console.log('🔄 重新绑定 canvas:', width, 'x', height);

                setMode('B');
                setStatus('ready');
                setMessage('引擎已就绪');
                onReady?.();
                if (!nextFrameTimer.current) nextFrame();
            });
        }

        if (_moduleInitPromise) return _moduleInitPromise;

        if (!isWebGLOkay().ok) {
            const error = 'WebGL 不支持';
            setStatus('error');
            setMessage(error);
            onError?.(new Error(error));
            return Promise.reject(new Error(error));
        }

        _moduleInitPromise = new Promise((resolve, reject) => {
            const base = '/wasm/';

            if (!window.Module) window.Module = {};
            window.Module.canvas = canvas;
            window.Module.locateFile = (path) => {
                if (path.endsWith('.wasm')) return base + CIMBAR_WASM_FILE;
                return base + path;
            };

            window.Module.onRuntimeInitialized = () => {
                if (window.Module._cimbare_init_encode && window.Module._cimbare_encode) {
                    setMode('B');

                    const aspectRatio = window.Module._cimbare_get_aspect_ratio();
                    const baseSize = 488;
                    let width, height;
                    if (aspectRatio > 1) {
                        width = Math.round(baseSize * aspectRatio);
                        height = baseSize;
                    } else {
                        width = baseSize;
                        height = Math.round(baseSize / aspectRatio);
                    }
                    canvas.width = width;
                    canvas.height = height;

                    console.log('✅ WASM 初始化，canvas:', width, 'x', height);
                    console.log('GL contexts:', window.Module?.GL?.contexts);

                    setStatus('ready');
                    setMessage('引擎已就绪');
                    onReady?.();
                    nextFrame();
                    resolve();
                } else {
                    const error = 'Cimbar 函数未正确导出';
                    setStatus('error');
                    setMessage(error);
                    onError?.(new Error(error));
                    _moduleInitPromise = null;
                    reject(new Error(error));
                }
            };

            const script = document.createElement('script');
            script.src = base + CIMBAR_JS_FILE;
            script.async = true;
            script.onload = () => console.log('✅ Cimbar JS 加载完成');
            script.onerror = () => {
                const error = '无法加载 Cimbar JS';
                setStatus('error');
                setMessage(error);
                onError?.(new Error(error));
                _moduleInitPromise = null;
                reject(new Error(error));
            };
            document.head.appendChild(script);
        });

        return _moduleInitPromise;
    }, [setMode, nextFrame, onError, onReady]);

    useEffect(() => {
        // 清理上一次热更新遗留的孤立 canvas
        cleanupOrphanCanvases();

        loadCimbarWasm().catch(err => console.error('加载引擎失败:', err));

        return () => {
            if (nextFrameTimer.current) {
                clearTimeout(nextFrameTimer.current);
                nextFrameTimer.current = null;
            }
            if (_compressBuff.current && window.Module) {
                window.Module._free(_compressBuff.current.byteOffset);
                _compressBuff.current = undefined;
            }
        };
    }, [loadCimbarWasm]);

    useEffect(() => {
        if (!data || !window.Module) return;
        if (isEncodingRef.current) return;
        if (lastEncodedDataRef.current === data) return;

        const timer = setTimeout(() => {
            if (isEncodingRef.current) return;
            if (lastEncodedDataRef.current === data) return;
            try {
                isEncodingRef.current = true;
                lastEncodedDataRef.current = data;

                const dataArray = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
                const blob = new Blob([dataArray], { type: 'application/octet-stream' });
                const file = new File([blob], filename, { type: 'application/octet-stream' });

                setStatus('encoding');
                setMessage('正在编码...');
                setProgress(0);

                importFileRef.current?.(file);
            } catch (error) {
                isEncodingRef.current = false;
                lastEncodedDataRef.current = null;
                console.error('编码失败:', error);
                setStatus('error');
                setMessage('编码失败: ' + error.message);
                onError?.(error);
            }
        }, 100);

        return () => clearTimeout(timer);
    }, [data, filename, onError]);

    return (
        <div className={`relative ${className}`} style={style}>
            <canvas
                ref={canvasRef}
                width={488}
                height={488}
                style={{
                    imageRendering: 'pixelated',
                    display: 'block',
                    maxWidth: '100%',
                    maxHeight: '488px',
                    width: 'auto',
                    height: 'auto',
                    borderRadius: '0.5rem',
                    background: '#000',
                }}
            />
            {(status === 'initializing' || status === 'encoding') && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg z-10">
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-2 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                        <p className="text-sm text-gray-500">{message}</p>
                        {status === 'encoding' && progress > 0 && (
                            <p className="text-xs text-gray-400 mt-1">{progress}%</p>
                        )}
                    </div>
                </div>
            )}
            {status === 'error' && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-50/80 rounded-lg z-10">
                    <p className="text-sm text-red-600">{message}</p>
                </div>
            )}
        </div>
    );
}
