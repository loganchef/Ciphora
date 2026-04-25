import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { loadCimbarEngine, subscribeToCimbarRender } from '@/lib/cimbar-engine';
import { Video, StopCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// 全局锁定，跨组件实例同步
let GLOBAL_ENCODING = false;
let GLOBAL_LAST_DATA = null;

/**
 * CIMBAR QR COMPONENT (Resilient View)
 */
export default function CimbarQRCode({ data, filename = 'vault.ciphora', className = '', style, onError, onReady, visible = true }) {
    const [status, setStatus] = useState('initializing');
    const [message, setMessage] = useState('连接引擎...');
    const [progress, setProgress] = useState(0);
    const [isRecording, setIsRecording] = useState(false);

    const localCanvasRef = useRef(null);
    const isMountedRef = useRef(true);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const currentTaskRef = useRef(0);
    const engineReadyRef = useRef(false);

    // 监听强制重置事件
    useEffect(() => {
        const handleReset = () => {
            console.log('🔄 CimbarQRCode: Global reset triggered');
            GLOBAL_ENCODING = false;
            GLOBAL_LAST_DATA = null;
            if (isMountedRef.current && data) {
                setStatus('initializing');
                startEncode(data, filename);
            }
        };
        window.addEventListener('cimbar-force-reset', handleReset);
        return () => window.removeEventListener('cimbar-force-reset', handleReset);
    }, [data, filename]);

    // Optimized copy from background buffer
    const onRenderTick = useCallback((sharedCanvas) => {
        if (!isMountedRef.current || !localCanvasRef.current || !sharedCanvas) return;
        const localCanvas = localCanvasRef.current;
        if (localCanvas.offsetHeight === 0 && !visible) return;

        const ctx = localCanvas.getContext('2d', { alpha: false });
        if (ctx) {
            if (localCanvas.width !== sharedCanvas.width || localCanvas.height !== sharedCanvas.height) {
                localCanvas.width = sharedCanvas.width;
                localCanvas.height = sharedCanvas.height;
            }
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(sharedCanvas, 0, 0);
        }
    }, [visible]);

    const copyToWasmHeap = useCallback((abuff) => {
        if (!window.Module || !window.Module._malloc) return null;
        try {
            const ptr = window.Module._malloc(abuff.length);
            const view = new Uint8Array(window.Module.HEAPU8.buffer, ptr, abuff.length);
            view.set(abuff);
            return view;
        } catch (e) { return null; }
    }, []);

    const importFile = useCallback((file, taskId) => {
        if (!window.Module || !window.Module._cimbare_encode_bufsize) return;

        try {
            const chunkSize = window.Module._cimbare_encode_bufsize();
            const reader = new FileReader();

            const fnameEncoded = new TextEncoder().encode(file.name);
            const wasmFn = copyToWasmHeap(fnameEncoded);
            if (wasmFn) {
                window.Module._cimbare_init_encode(wasmFn.byteOffset, wasmFn.length, -1);
                window.Module._free(wasmFn.byteOffset);
            }

            const ptr = window.Module._malloc(chunkSize);
            const heapBuffer = new Uint8Array(window.Module.HEAPU8.buffer, ptr, chunkSize);
            let offset = 0;

            reader.onerror = () => {
                if (taskId !== currentTaskRef.current) return;
                GLOBAL_ENCODING = false;
                setStatus('error');
                setMessage('读取失败');
            };

            reader.onload = function (event) {
                if (!isMountedRef.current || taskId !== currentTaskRef.current) return;

                const datalen = event.target.result.byteLength;
                try {
                    if (datalen > 0) {
                        heapBuffer.set(new Uint8Array(event.target.result));
                        window.Module._cimbare_encode(heapBuffer.byteOffset, datalen);
                        offset += chunkSize;
                        readNext();
                    } else {
                        window.Module._cimbare_encode(heapBuffer.byteOffset, 0);
                        window.Module._free(ptr);
                        GLOBAL_ENCODING = false;
                        setStatus('ready');
                        setMessage('就绪');
                        setProgress(100);
                        console.log('✅ Cimbar encoding finished');
                    }
                } catch (e) {
                    GLOBAL_ENCODING = false;
                    setStatus('error');
                    setMessage('编码崩溃');
                }
            };

            function readNext() {
                if (!isMountedRef.current || taskId !== currentTaskRef.current) return;
                const slice = file.slice(offset, offset + chunkSize);
                reader.readAsArrayBuffer(slice);
                setProgress(Math.min(100, Math.round((offset / file.size) * 100)));
            }
            readNext();
        } catch (err) {
            GLOBAL_ENCODING = false;
            setStatus('error');
            setMessage('准备失败');
        }
    }, [copyToWasmHeap]);

    const startEncode = useCallback((currentData, currentFilename) => {
        const engineReady = engineReadyRef.current || !!(window.Module && window.Module._cimbare_encode_bufsize);
        if (!currentData || !engineReady || GLOBAL_ENCODING) return;
        
        if (GLOBAL_LAST_DATA && GLOBAL_LAST_DATA.length === currentData.length) {
            let same = true;
            for(let i=0; i<Math.min(50, currentData.length); i++) {
                if (GLOBAL_LAST_DATA[i] !== currentData[i]) { same = false; break; }
            }
            if (same) {
                setStatus('ready');
                setMessage('就绪');
                setProgress(100);
                return;
            }
        }

        try {
            const taskId = Date.now();
            currentTaskRef.current = taskId;
            GLOBAL_ENCODING = true;
            GLOBAL_LAST_DATA = currentData;
            setStatus('encoding');
            setMessage('正在生成...');
            setProgress(0);
            const dataArray = currentData instanceof ArrayBuffer ? new Uint8Array(currentData) : currentData;
            importFile(new File([new Blob([dataArray])], currentFilename), taskId);
        } catch (error) {
            GLOBAL_ENCODING = false;
            setStatus('error');
            setMessage('生成失败');
            onError?.(error);
        }
    }, [importFile, onError]);

    const init = useCallback(() => {
        if (window.Module && window.Module._cimbare_encode_bufsize) {
            engineReadyRef.current = true;
            setStatus('ready');
            onReady?.();
            return;
        }
        setStatus('initializing');
        engineReadyRef.current = false;
        loadCimbarEngine().then(() => {
            if (isMountedRef.current) {
                engineReadyRef.current = true;
                setStatus('ready');
                onReady?.();
            }
        }).catch(err => {
            if (isMountedRef.current) {
                setStatus('error');
                setMessage(err.message || '引擎挂起');
                onError?.(err);
            }
        });
    }, [onReady, onError]);

    useEffect(() => {
        isMountedRef.current = true;
        init();
        const unsub = subscribeToCimbarRender(onRenderTick);
        return () => {
            isMountedRef.current = false;
            unsub();
        };
    }, [onRenderTick]);

    useEffect(() => {
        if (visible && data && status === 'ready') {
            startEncode(data, filename);
        }
    }, [visible, status, data, filename, startEncode]);

    useEffect(() => {
        if (!data) return;
        const timer = setTimeout(() => {
            if (isMountedRef.current) startEncode(data, filename);
        }, 100);
        return () => clearTimeout(timer);
    }, [data, filename, startEncode]);

    return (
        <div className={cn("relative flex items-center justify-center bg-black overflow-hidden shadow-inner", className)} style={style}>
            <canvas ref={localCanvasRef} style={{ imageRendering: 'pixelated', display: 'block', width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#000' }} />
            {data && status === 'ready' && visible && (
                <button className="absolute top-4 left-4 p-2 bg-white/10 hover:bg-blue-600 text-white rounded-full transition-all opacity-0 group-hover:opacity-100 z-30 flex items-center gap-2 backdrop-blur-md border border-white/10">
                    <Video className="w-4 h-4" />
                </button>
            )}
            {(status === 'initializing' || status === 'encoding') && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-10">
                    <div className="text-center">
                        <div className="w-8 h-8 mx-auto mb-3 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{message} {progress > 0 && progress < 100 ? `${progress}%` : ''}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
