import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { loadCimbarEngine, subscribeToCimbarRender } from '@/lib/cimbar-engine';
import { Video, StopCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * CIMBAR QR COMPONENT (Resilient View)
 */
export default function CimbarQRCode({ data, filename = 'data.bin', className = '', style, onError, onReady, visible = true }) {
    const [status, setStatus] = useState('initializing');
    const [message, setMessage] = useState('连接引擎...');
    const [progress, setProgress] = useState(0);
    const [isRecording, setIsRecording] = useState(false);

    const localCanvasRef = useRef(null);
    const isEncodingRef = useRef(false);
    const lastEncodedDataRef = useRef(null);
    const isMountedRef = useRef(true);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const currentTaskRef = useRef(0);
    const engineReadyRef = useRef(false);

    // Optimized copy from background buffer
    const onRenderTick = useCallback((sharedCanvas) => {
        if (!isMountedRef.current || !localCanvasRef.current || !sharedCanvas) return;
        const localCanvas = localCanvasRef.current;
        const ctx = localCanvas.getContext('2d', { alpha: false });
        if (ctx) {
            // Sync canvas pixel size to shared buffer
            if (localCanvas.width !== sharedCanvas.width || localCanvas.height !== sharedCanvas.height) {
                localCanvas.width = sharedCanvas.width;
                localCanvas.height = sharedCanvas.height;
            }
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(sharedCanvas, 0, 0);
        }
    }, []);

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

            // Init encode session
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
                isEncodingRef.current = false;
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
                        // EOF
                        window.Module._cimbare_encode(heapBuffer.byteOffset, 0);
                        window.Module._free(ptr);
                        isEncodingRef.current = false;
                        setStatus('ready');
                        setMessage('就绪');
                        setProgress(100);
                    }
                } catch (e) {
                    isEncodingRef.current = false;
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
            isEncodingRef.current = false;
            setStatus('error');
            setMessage('准备失败');
        }
    }, [copyToWasmHeap]);

    // Start encoding immediately - no status dependency to avoid re-trigger loops
    const startEncode = useCallback((currentData, currentFilename) => {
        // Accept either engineReadyRef OR window.Module already available (singleton already loaded)
        const engineReady = engineReadyRef.current || !!(window.Module && window.Module._cimbare_encode_bufsize);
        if (!currentData || !engineReady || isEncodingRef.current) return;
        if (lastEncodedDataRef.current === currentData) return;

        // Sync engineReadyRef in case it was missed
        if (!engineReadyRef.current) engineReadyRef.current = true;

        try {
            const taskId = Date.now();
            currentTaskRef.current = taskId;
            isEncodingRef.current = true;
            lastEncodedDataRef.current = currentData;

            setStatus('encoding');
            setMessage('正在生成...');
            setProgress(0);

            // Deadman switch: force unlock if encoding takes too long (>5s)
            setTimeout(() => {
                if (currentTaskRef.current === taskId && isEncodingRef.current) {
                    console.warn('Encoding task timed out, force unlocking...');
                    isEncodingRef.current = false;
                    setStatus('ready');
                }
            }, 5000);

            const dataArray = currentData instanceof ArrayBuffer ? new Uint8Array(currentData) : currentData;
            importFile(new File([new Blob([dataArray])], currentFilename), taskId);
        } catch (error) {
            isEncodingRef.current = false;
            setStatus('error');
            setMessage('生成失败');
            onError?.(error);
        }
    }, [importFile, onError]);

    const init = useCallback((retry = false) => {
        // If engine singleton already loaded AND WebGL ctx is alive, skip async wait
        if (!retry && window.Module && window.Module._cimbare_encode_bufsize && window.Module.ctx) {
            engineReadyRef.current = true;
            setStatus('ready');
            onReady?.();
            return;
        }
        setStatus('initializing');
        engineReadyRef.current = false;
        loadCimbarEngine(retry).then(() => {
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

    // Mount: load engine + always subscribe to render loop
    useEffect(() => {
        isMountedRef.current = true;
        init();
        const unsub = subscribeToCimbarRender(onRenderTick);
        return () => {
            isMountedRef.current = false;
            unsub();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // When visible becomes true, force re-encode so canvas repaints
    const prevVisibleRef = useRef(false);
    useEffect(() => {
        const wasVisible = prevVisibleRef.current;
        prevVisibleRef.current = visible;
        if (visible && !wasVisible && dataRef.current) {
            lastEncodedDataRef.current = null;
            isEncodingRef.current = false;
            setTimeout(() => {
                if (isMountedRef.current && dataRef.current) {
                    startEncode(dataRef.current, filenameRef.current);
                }
            }, 50);
        }
    }, [visible, startEncode]);

    const dataRef = useRef(null);
    const filenameRef = useRef(filename);
    filenameRef.current = filename;

    // Handle data changes - independent of status state to avoid loops
    useEffect(() => {
        if (!data) return;
        dataRef.current = data;

        const timer = setTimeout(() => {
            if (!isMountedRef.current) return;
            startEncode(data, filenameRef.current);
        }, 100);

        return () => clearTimeout(timer);
    }, [data, startEncode]);

    // When engine becomes ready, trigger encode if data is waiting
    useEffect(() => {
        if (status === 'ready' && dataRef.current && lastEncodedDataRef.current !== dataRef.current) {
            startEncode(dataRef.current, filenameRef.current);
        }
    }, [status, startEncode]);

    // Recording logic
    const startRecording = () => {
        if (!localCanvasRef.current) return;
        chunksRef.current = [];
        const stream = localCanvasRef.current.captureStream(20); 
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        recorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: 'video/webm' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `cimbar-stream-${Date.now()}.webm`;
            a.click();
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    return (
        <div className={`relative flex items-center justify-center bg-black overflow-hidden shadow-inner ${className}`} style={style}>
            <canvas
                ref={localCanvasRef}
                style={{
                    imageRendering: 'pixelated',
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    backgroundColor: '#000'
                }}
            />
            
            {data && !isRecording && status === 'ready' && (
                <button 
                    onClick={startRecording}
                    className="absolute top-4 left-4 p-2 bg-white/10 hover:bg-blue-600 text-white rounded-full transition-all opacity-0 group-hover:opacity-100 z-30 flex items-center gap-2 backdrop-blur-md border border-white/10"
                    title="录制动画"
                >
                    <Video className="w-4 h-4" />
                </button>
            )}

            {isRecording && (
                <button 
                    onClick={stopRecording}
                    className="absolute top-4 left-4 p-2 bg-red-600 text-white rounded-full transition-all z-30 flex items-center gap-2 animate-pulse shadow-lg shadow-red-900/50"
                >
                    <StopCircle className="w-4 h-4" />
                    <span className="text-[10px] font-black pr-1 uppercase tracking-widest">Recording</span>
                </button>
            )}

            {(status === 'initializing' || status === 'encoding') && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-10">
                    <div className="text-center">
                        <div className="w-8 h-8 mx-auto mb-3 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{message}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
