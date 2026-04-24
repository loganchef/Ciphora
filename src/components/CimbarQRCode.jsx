import { useState, useEffect, useRef, useCallback } from 'react';

const CIMBAR_JS_FILE = 'cimbar.js';
const CIMBAR_WASM_FILE = 'cimbar.wasm';

// WebGL 检测函数
function isWebGLOkay() {
    const canvas = document.createElement("canvas");
    const configs = [
        { version: 2, type: "webgl2" },
        { version: 1, type: "webgl" },
        { version: 1, type: "experimental-webgl" }
    ];

    for (const cfg of configs) {
        const gl = canvas.getContext(cfg.type, { antialias: false, alpha: false });
        if (!gl) continue;

        const exts = gl.getSupportedExtensions() || [];
        const required = ["OES_texture_float", "OES_texture_half_float", "WEBGL_lose_context"];
        const missing = required.filter(x => !exts.includes(x));

        const isWebGL2 = cfg.version === 2;
        const criticalMissing = isWebGL2
            ? missing.filter(x => x !== 'OES_texture_float' && x !== 'OES_texture_half_float')
            : missing;

        if (criticalMissing.length > 0 && !isWebGL2) {
            continue;
        }

        return {
            ok: true,
            version: cfg.version,
            type: cfg.type,
            vendor: gl.getParameter(gl.VENDOR),
            renderer: gl.getParameter(gl.RENDERER),
            extensions: exts,
            missingExtensions: missing,
            isWebGL2: isWebGL2
        };
    }

    return { ok: false, reason: '无法创建任何 WebGL 上下文' };
}

/**
 * Cimbar 二维码显示组件
 * 完全按照官方代码逻辑实现
 */
export default function CimbarQRCode({ data, filename = 'data.bin', className = '', onError, onReady }) {
    const [status, setStatus] = useState('initializing');
    const [message, setMessage] = useState('正在初始化...');
    const [progress, setProgress] = useState(0);

    const canvasRef = useRef(null);
    const moduleInitPromise = useRef(null);

    // 官方代码中的状态变量
    const _interval = useRef(66);
    const _pause = useRef(0);
    const _counter = useRef(0);
    const _renderTime = useRef(0);
    const _idealRatio = useRef(1);
    const _compressBuff = useRef(undefined);
    const nextFrameTimer = useRef(null);

    // 官方代码：copyToWasmHeap
    const copyToWasmHeap = useCallback((abuff) => {
        if (!window.Module) return null;
        const dataPtr = window.Module._malloc(abuff.length);
        const wasmData = new Uint8Array(window.Module.HEAPU8.buffer, dataPtr, abuff.length);
        wasmData.set(abuff);
        return wasmData;
    }, []);

    // 官方代码：encode_init
    const encode_init = useCallback((filename) => {
        if (!window.Module) return;
        console.log("encoding " + filename);
        const wasmFn = copyToWasmHeap(new TextEncoder("utf-8").encode(filename));
        if (!wasmFn) return;
        try {
            var res = window.Module._cimbare_init_encode(wasmFn.byteOffset, wasmFn.length, -1);
            console.log("init_encode returned " + res);
        } finally {
            window.Module._free(wasmFn.byteOffset);
        }
    }, [copyToWasmHeap]);

    // 官方代码：encode_bytes
    const encode_bytes = useCallback((wasmData) => {
        if (!window.Module) return;
        var res = window.Module._cimbare_encode(wasmData.byteOffset, wasmData.length);
        console.log("encode returned " + res);

        if (res == 0) {
            // 官方代码：Main.setActive(true)
            // 我们这里只是标记编码器已激活
            console.log('✅ 编码器已激活');
        }
    }, []);

    // 官方代码：importFile - 完全按照官方逻辑
    const importFile = useCallback((file) => {
        if (!window.Module) return;

        let chunkSize = window.Module._cimbare_encode_bufsize();
        if (_compressBuff.current === undefined) {
            const dataPtr = window.Module._malloc(chunkSize);
            _compressBuff.current = new Uint8Array(window.Module.HEAPU8.buffer, dataPtr, chunkSize);
        }
        let offset = 0;
        let reader = new FileReader();

        encode_init(file.name);

        reader.onload = function (event) {
            const datalen = event.target.result.byteLength;
            if (datalen > 0) {
                // copy to wasm buff and write
                const uint8View = new Uint8Array(event.target.result);
                _compressBuff.current.set(uint8View);
                const buffView = new Uint8Array(window.Module.HEAPU8.buffer, _compressBuff.current.byteOffset, datalen);
                encode_bytes(buffView);

                offset += chunkSize;
                readNext();
            } else {
                // Done reading file
                console.log("Finished reading file.");

                // this null call is functionally a flush()
                // so a no-op, unless it isn't
                const nullBuff = new Uint8Array(window.Module.HEAPU8.buffer, _compressBuff.current.byteOffset, 0);
                encode_bytes(nullBuff);

                setStatus('rendering');
                setMessage('正在渲染...');
                setProgress(100);
            }
        };

        function readNext() {
            let slice = file.slice(offset, offset + chunkSize);
            reader.readAsArrayBuffer(slice);

            // 更新进度
            const percent = Math.min(100, Math.round((offset / file.size) * 100));
            setProgress(percent);
        }

        readNext();
    }, [encode_init, encode_bytes]);

    // 官方代码：nextFrame - 完全按照官方逻辑
    const nextFrame = useCallback(() => {
        if (!window.Module || !canvasRef.current) {
            return;
        }

        _counter.current += 1;
        if (_pause.current > 0) {
            _pause.current -= 1;
        }
        var start = performance.now();
        if (_pause.current === 0) {
            window.Module._cimbare_render();
            var frameCount = window.Module._cimbare_next_frame();
        }

        var elapsed = performance.now() - start;
        var nextInterval = _interval.current > elapsed ? _interval.current - elapsed : 0;
        nextFrameTimer.current = setTimeout(nextFrame, nextInterval);
    }, []);

    // 官方代码：setMode
    const setMode = useCallback((mode_str) => {
        if (!window.Module) return;
        let modeVal = 68;
        if (mode_str == "4C") {
            modeVal = 4;
        }
        else if (mode_str == "Bm") {
            modeVal = 67;
        }
        window.Module._cimbare_configure(modeVal, -1);
        _idealRatio.current = window.Module._cimbare_get_aspect_ratio();
    }, []);

    // 官方代码：init
    const init = useCallback((canvas) => {
        if (!window.Module || !canvas) return;
        setMode('B');

        // 官方代码：check_GL_enabled
        if (canvas.getContext("2d")) {
            console.warn('⚠️ Canvas 已有 2D 上下文，这可能导致 WebGL 创建失败');
        }
    }, [setMode]);

    // 加载 WASM 模块
    const loadCimbarWasm = useCallback(() => {
        if (typeof window === 'undefined') return Promise.reject(new Error('不在浏览器环境'));

        if (moduleInitPromise.current) {
            return moduleInitPromise.current;
        }

        if (window.Module && window.Module._cimbare_init_encode) {
            // WASM 已加载
            const canvas = canvasRef.current;
            if (canvas) {
                window.Module.canvas = canvas;
            }
            setStatus('ready');
            setMessage('引擎已就绪');
            onReady?.();
            return Promise.resolve();
        }

        moduleInitPromise.current = new Promise((resolve, reject) => {
            const base = '/wasm/';
            const canvas = canvasRef.current;

            if (!canvas) {
                const error = 'Canvas 未就绪';
                setStatus('error');
                setMessage(error);
                onError?.(new Error(error));
                reject(new Error(error));
                return;
            }

            // 检查 WebGL 支持
            const result = isWebGLOkay();
            if (!result.ok) {
                const error = 'WebGL 不支持';
                setStatus('error');
                setMessage(error);
                onError?.(new Error(error));
                reject(new Error(error));
                return;
            }

            // 设置 Module 配置
            if (!window.Module) {
                window.Module = {};
            }

            window.Module.canvas = canvas;
            window.Module.locateFile = (path) => {
                if (path.endsWith('.wasm')) {
                    return base + CIMBAR_WASM_FILE;
                }
                return base + path;
            };

            window.Module.onRuntimeInitialized = () => {
                if (window.Module._cimbare_init_encode && window.Module._cimbare_encode) {
                    if (canvasRef.current) {
                        window.Module.canvas = canvasRef.current;
                    }

                    // 官方代码：Main.init(canvas)
                    init(canvasRef.current);

                    // 设置 canvas 尺寸
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
                    if (canvasRef.current) {
                        canvasRef.current.width = width;
                        canvasRef.current.height = height;
                    }

                    setStatus('ready');
                    setMessage('引擎已就绪');
                    onReady?.();

                    // 官方代码：Main.nextFrame() 在 onRuntimeInitialized 中调用
                    nextFrame();

                    resolve();
                } else {
                    const error = 'Cimbar 函数未正确导出';
                    setStatus('error');
                    setMessage(error);
                    onError?.(new Error(error));
                    reject(new Error(error));
                }
            };

            // 加载 cimbar.js
            const script = document.createElement('script');
            script.src = base + CIMBAR_JS_FILE;
            script.async = true;
            script.onload = () => {
                console.log('✅ Cimbar JS 脚本加载完成');
            };
            script.onerror = () => {
                const error = '无法加载 Cimbar JS 脚本';
                setStatus('error');
                setMessage(error);
                onError?.(new Error(error));
                reject(new Error(error));
            };
            document.head.appendChild(script);
        });

        return moduleInitPromise.current;
    }, [init, nextFrame, onError, onReady]);

    // 初始化
    useEffect(() => {
        loadCimbarWasm().catch(err => {
            console.error('加载引擎失败:', err);
        });

        return () => {
            if (nextFrameTimer.current) {
                clearTimeout(nextFrameTimer.current);
                nextFrameTimer.current = null;
            }
            // 清理编码缓冲区
            if (_compressBuff.current && window.Module) {
                window.Module._free(_compressBuff.current.byteOffset);
                _compressBuff.current = undefined;
            }
        };
    }, [loadCimbarWasm]);

    // 当数据变化时重新编码
    useEffect(() => {
        if (status === 'ready' && data && window.Module) {
            const timer = setTimeout(() => {
                try {
                    // 将数据转换为 Blob，模拟文件
                    const dataArray = data instanceof ArrayBuffer
                        ? new Uint8Array(data)
                        : data;

                    const blob = new Blob([dataArray], { type: 'application/octet-stream' });
                    const file = new File([blob], filename, { type: 'application/octet-stream' });

                    setStatus('encoding');
                    setMessage('正在编码...');
                    setProgress(0);

                    importFile(file);
                } catch (error) {
                    console.error('编码失败:', error);
                    setStatus('error');
                    setMessage('编码失败: ' + error.message);
                    onError?.(error);
                }
            }, 100);

            return () => {
                clearTimeout(timer);
            };
        }
    }, [data, filename, status, importFile, onError]);

    return (
        <div className={`relative ${className}`}>
            <canvas
                ref={canvasRef}
                width={588}
                height={588}
                className="rounded-lg"
                style={{
                    imageRendering: 'pixelated',
                    display: 'block',
                    position: 'relative',
                    backgroundColor: '#000000',
                    maxWidth: '100%',
                    height: 'auto',
                    zIndex: 0
                }}
            />
            {status === 'initializing' || status === 'encoding' ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg z-10">
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-2 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
                        <p className="text-sm text-gray-500">{message}</p>
                        {status === 'encoding' && progress > 0 && (
                            <p className="text-xs text-gray-400 mt-1">{progress}%</p>
                        )}
                    </div>
                </div>
            ) : status === 'error' ? (
                <div className="absolute inset-0 flex items-center justify-center bg-red-50/80 rounded-lg z-10">
                    <p className="text-sm text-red-600">{message}</p>
                </div>
            ) : null}
        </div>
    );
}
