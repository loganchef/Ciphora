import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera } from 'lucide-react';

const CIMBAR_JS_FILE = 'cimbar.js';
const CIMBAR_WASM_FILE = 'cimbar.wasm';

/**
 * UTF8ToString 辅助函数
 * 用途：将 WASM 堆中的 UTF-8 字节转换为 JavaScript 字符串
 * 输入：heap (Uint8Array), ptr (指针), maxBytesToRead (最大字节数)
 * 输出：JavaScript 字符串
 * 必要性：解码器需要从 WASM 堆中读取字符串数据
 */
function UTF8ToString(heap, ptr, maxBytesToRead) {
    if (!ptr) return '';
    let endPtr = ptr;
    let idx = endPtr;
    let maxIdx = idx + (maxBytesToRead || 0);
    while (heap[idx] && !(idx >= maxIdx)) idx++;
    endPtr = idx;
    let str = '';
    while (ptr < endPtr) {
        let u0 = heap[ptr++];
        if (!(u0 & 128)) {
            str += String.fromCharCode(u0);
            continue;
        }
        let u1 = heap[ptr++] & 63;
        if ((u0 & 224) == 192) {
            str += String.fromCharCode((u0 & 31) << 6 | u1);
            continue;
        }
        let u2 = heap[ptr++] & 63;
        if ((u0 & 240) == 224) {
            u0 = (u0 & 15) << 12 | u1 << 6 | u2;
        } else {
            u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heap[ptr++] & 63;
        }
        if (u0 < 65536) {
            str += String.fromCharCode(u0);
        } else {
            let ch = u0 - 65536;
            str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
        }
    }
    return str;
}

/**
 * Cimbar 解码器组件
 * 
 * 用途：通过摄像头扫描并解码 Cimbar 动画二维码
 * 输入：onDecoded (回调函数，解码成功时调用，参数为 { filename, data: Blob })
 * 输出：在 UI 上显示摄像头画面和解码进度
 * 必要性：独立的解码组件，便于复用和维护
 */
export default function CimbarDecoder({ onDecoded, onError, onProgress }) {
    const [isDecoding, setIsDecoding] = useState(false);
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'ready' | 'decoding' | 'error'

    const videoRef = useRef(null);
    const isDecodingRef = useRef(false);
    const moduleInitPromise = useRef(null);

    // 加载 WASM 模块（如果需要）
    const loadCimbarWasm = useCallback(() => {
        if (typeof window === 'undefined') return Promise.reject(new Error('不在浏览器环境'));

        if (moduleInitPromise.current) {
            return moduleInitPromise.current;
        }

        if (window.Module && window.Module._cimbard_scan_extract_decode) {
            setStatus('ready');
            return Promise.resolve();
        }

        moduleInitPromise.current = new Promise((resolve, reject) => {
            const base = '/wasm/';

            // 检查脚本是否已存在
            const existingScript = document.getElementById('cimbar-decoder-script');
            if (existingScript) {
                if (window.Module && window.Module._cimbard_scan_extract_decode) {
                    setStatus('ready');
                    resolve();
                    return;
                }
                // 等待初始化
                const checkInterval = setInterval(() => {
                    if (window.Module && window.Module._cimbard_scan_extract_decode) {
                        clearInterval(checkInterval);
                        setStatus('ready');
                        resolve();
                    }
                }, 100);
                setTimeout(() => {
                    clearInterval(checkInterval);
                    if (!window.Module || !window.Module._cimbard_scan_extract_decode) {
                        reject(new Error('Module 初始化超时'));
                    }
                }, 15000);
                return;
            }

            window.Module = window.Module || {
                locateFile: (path) => {
                    if (path.endsWith('.wasm')) {
                        return base + CIMBAR_WASM_FILE;
                    }
                    return base + path;
                },
                onRuntimeInitialized: () => {
                    if (window.Module._cimbard_scan_extract_decode) {
                        setStatus('ready');
                        resolve();
                    } else {
                        const error = '解码器函数未正确导出';
                        setStatus('error');
                        setMessage(error);
                        onError?.(new Error(error));
                        reject(new Error(error));
                    }
                },
                onAbort: (err) => {
                    const error = 'WASM 初始化失败: ' + err;
                    setStatus('error');
                    setMessage(error);
                    onError?.(new Error(error));
                    reject(err);
                },
                print: (text) => console.log('[Cimbar Decoder]', text),
                printErr: (text) => console.error('[Cimbar Decoder Error]', text)
            };

            const script = document.createElement('script');
            script.id = 'cimbar-decoder-script';
            script.src = base + CIMBAR_JS_FILE;
            script.onerror = () => {
                const error = `加载失败: ${base + CIMBAR_JS_FILE}`;
                setStatus('error');
                setMessage(error);
                onError?.(new Error(error));
                reject(new Error(error));
            };
            script.onload = () => {
                console.log('✅ Cimbar Decoder JS 脚本加载完成');
            };
            document.body.appendChild(script);
        });

        return moduleInitPromise.current;
    }, [onError]);

    // 停止解码
    const stopDecoding = useCallback(() => {
        isDecodingRef.current = false;
        setIsDecoding(false);
        if (videoRef.current?.srcObject) {
            videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
            videoRef.current.srcObject = null;
        }
        setMessage('');
        setProgress(0);
    }, []);

    // 开始解码
    const startDecoding = useCallback(async () => {
        if (!window.Module || !window.Module._cimbard_scan_extract_decode) {
            const error = '解码器未就绪，请等待 Cimbar 引擎加载完成';
            setMessage(error);
            setStatus('error');
            onError?.(new Error(error));
            return;
        }

        setIsDecoding(true);
        setStatus('decoding');
        setMessage('正在启动摄像头...');
        setProgress(0);
        isDecodingRef.current = true;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: 1280, height: 720 }
            });

            if (!videoRef.current) {
                stopDecoding();
                return;
            }

            videoRef.current.srcObject = stream;
            await videoRef.current.play();

            const Module = window.Module;
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // 配置解码器
            Module._cimbard_configure_decode(68); // B 模式

            const processFrame = async () => {
                if (!isDecodingRef.current || !videoRef.current || !videoRef.current.srcObject) {
                    return;
                }

                canvas.width = videoRef.current.videoWidth;
                canvas.height = videoRef.current.videoHeight;
                ctx.drawImage(videoRef.current, 0, 0);

                try {
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const bufSize = Module._cimbard_get_bufsize();
                    const buffer = Module._malloc(bufSize);

                    // 扫描并解码
                    const result = Module._cimbard_scan_extract_decode(
                        imageData.data.byteOffset,
                        imageData.width,
                        imageData.height,
                        buffer,
                        bufSize,
                        0 // 不旋转
                    );

                    if (result > 0) {
                        // 获取报告
                        const reportSize = 1024;
                        const reportPtr = Module._malloc(reportSize);
                        Module._cimbard_get_report(reportPtr, reportSize);
                        const report = UTF8ToString(Module.HEAPU8, reportPtr, reportSize);
                        Module._free(reportPtr);

                        console.log('解码报告:', report);
                        const progressValue = Math.min(100, result * 10);
                        setMessage(`解析中: ${result} 帧`);
                        setProgress(progressValue);
                        onProgress?.(progressValue);
                    }

                    // 检查是否完成
                    const fileSize = Module._cimbard_get_filesize(0);
                    if (fileSize > 0) {
                        // 读取文件数据
                        const filenameSize = 256;
                        const filenamePtr = Module._malloc(filenameSize);
                        Module._cimbard_get_filename(0, filenamePtr, filenameSize);
                        const filename = UTF8ToString(Module.HEAPU8, filenamePtr, filenameSize);
                        Module._free(filenamePtr);

                        const decompressBufSize = Module._cimbard_get_decompress_bufsize();
                        const decompressBuf = Module._malloc(decompressBufSize);
                        const readSize = Module._cimbard_decompress_read(0, decompressBuf, decompressBufSize);

                        if (readSize > 0) {
                            const fileData = new Uint8Array(Module.HEAPU8.buffer, decompressBuf, readSize);
                            const blob = new Blob([fileData], { type: 'application/octet-stream' });

                            setMessage('✅ 解析完成');
                            setProgress(100);
                            stopDecoding();
                            onDecoded?.({ filename, data: blob });
                            Module._free(decompressBuf);
                            Module._free(buffer);
                            return;
                        }

                        Module._free(decompressBuf);
                    }

                    Module._free(buffer);
                } catch (err) {
                    console.error('解码错误:', err);
                }

                requestAnimationFrame(processFrame);
            };

            processFrame();
        } catch (error) {
            console.error('摄像头失败:', error);
            const errorMsg = '摄像头访问失败: ' + error.message;
            setMessage(errorMsg);
            setStatus('error');
            setIsDecoding(false);
            isDecodingRef.current = false;
            onError?.(error);
        }
    }, [stopDecoding, onDecoded, onError, onProgress]);

    // 初始化
    useEffect(() => {
        loadCimbarWasm().catch(err => {
            console.error('加载解码器引擎失败:', err);
        });

        return () => {
            stopDecoding();
        };
    }, [loadCimbarWasm, stopDecoding]);

    return (
        <div className="rounded-xl border p-3 space-y-3">
            <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-500" />
                <p className="text-sm font-semibold">摄像头解析</p>
            </div>
            <video
                ref={videoRef}
                className="w-full aspect-video rounded-lg border bg-black"
                autoPlay
                playsInline
            />
            <button
                onClick={isDecoding ? stopDecoding : startDecoding}
                disabled={status === 'loading' || status === 'error'}
                className={`w-full rounded-lg py-2 text-sm font-medium text-white transition-colors ${isDecoding
                    ? 'bg-red-500 hover:bg-red-600'
                    : status === 'loading' || status === 'error'
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
            >
                {status === 'loading'
                    ? '加载中...'
                    : status === 'error'
                        ? '解码器未就绪'
                        : isDecoding
                            ? '停止解析'
                            : '开启摄像头'}
            </button>
            {progress > 0 && (
                <div>
                    <div className="flex justify-between text-xs mb-1">
                        <span>解析进度</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
                    </div>
                </div>
            )}
            {message && (
                <div className={`text-xs px-2 py-1 rounded ${message.includes('✅')
                    ? 'bg-green-50 text-green-700'
                    : message.includes('失败') || message.includes('错误')
                        ? 'bg-red-50 text-red-700'
                        : 'bg-blue-50 text-blue-700'
                    }`}>
                    {message}
                </div>
            )}
        </div>
    );
}

