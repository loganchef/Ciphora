import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, CheckCircle2, RotateCcw, FileVideo, Upload } from 'lucide-react';
import { loadCimbarEngine } from '@/lib/cimbar-engine';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

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
        if (u0 < 65536) str += String.fromCharCode(u0);
        else {
            let ch = u0 - 65536;
            str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
        }
    }
    return str;
}

export default function CimbarDecoder({ onDecoded, onError, onProgress }) {
    const { t } = useTranslation();
    const [isDecoding, setIsDecoding] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState('idle'); 

    const videoRef = useRef(null);
    const isDecodingRef = useRef(false);
    const isMountedRef = useRef(true);
    const fileInputRef = useRef(null);

    const init = useCallback((retry = false) => {
        setStatus('loading');
        loadCimbarEngine(retry).then(() => {
            if (isMountedRef.current) setStatus('ready');
        }).catch(err => {
            if (isMountedRef.current) setStatus('error');
        });
    }, []);

    const stopDecoding = useCallback(() => {
        isDecodingRef.current = false;
        setIsDecoding(false);
        if (videoRef.current?.srcObject) {
            videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
            videoRef.current.srcObject = null;
        }
    }, []);

    // 核心解码逻辑
    const processFrame = useCallback((video, tempCanvas, ctx, Module) => {
        if (!isDecodingRef.current) return;

        tempCanvas.width = video.videoWidth;
        tempCanvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        try {
            const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            const bufSize = Module._cimbard_get_bufsize();
            const buffer = Module._malloc(bufSize);
            const imageDataPtr = Module._malloc(imageData.data.length);
            
            new Uint8Array(Module.HEAPU8.buffer, imageDataPtr, imageData.data.length).set(imageData.data);

            const result = Module._cimbard_scan_extract_decode(imageDataPtr, imageData.width, imageData.height, buffer, bufSize, 0);

            if (result > 0) {
                const progressValue = Math.min(99, result * 10);
                setMessage(`${t('cimbar.analyzing', { frame: result })}`);
                setProgress(progressValue);
                onProgress?.(progressValue);
            }

            const fileSize = Module._cimbard_get_filesize(0);
            if (fileSize > 0) {
                const filenameSize = 256;
                const filenamePtr = Module._malloc(filenameSize);
                Module._cimbard_get_filename(0, filenamePtr, filenameSize);
                const filename = UTF8ToString(Module.HEAPU8, filenamePtr, filenameSize);
                Module._free(filenamePtr);

                const decompressBufSize = Module._cimbard_get_decompress_bufsize();
                const decompressBuf = Module._malloc(decompressBufSize);
                const readSize = Module._cimbard_decompress_read(0, decompressBuf, decompressBufSize);

                if (readSize > 0) {
                    const blob = new Blob([new Uint8Array(Module.HEAPU8.buffer, decompressBuf, readSize)]);
                    isDecodingRef.current = false;
                    setIsDecoding(false);
                    setIsFinished(true);
                    setMessage(t('cimbar.importSuccess'));
                    setProgress(100);
                    
                    if (video.srcObject) {
                        video.srcObject.getTracks().forEach(t => t.stop());
                        video.srcObject = null;
                    }
                    onDecoded?.({ filename, data: blob });
                }
                Module._free(decompressBuf);
            }
            Module._free(imageDataPtr);
            Module._free(buffer);
        } catch (err) {
            console.error('Decode failed:', err);
        }

        if (isDecodingRef.current) {
            if (video.requestVideoFrameCallback) {
                video.requestVideoFrameCallback(() => processFrame(video, tempCanvas, ctx, Module));
            } else {
                requestAnimationFrame(() => processFrame(video, tempCanvas, ctx, Module));
            }
        }
    }, [onDecoded, onProgress]);

    const startDecoding = useCallback(async () => {
        if (!window.Module || !window.Module._cimbard_scan_extract_decode) {
            setStatus('error');
            setMessage(t('cimbar.engineError'));
            return;
        }

        setIsFinished(false);
        setIsDecoding(true);
        setStatus('decoding');
        setMessage(t('cimbar.cameraStarting'));
        isDecodingRef.current = true;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: 1280, height: 720 }
            });

            if (!isMountedRef.current || !isDecodingRef.current) {
                stream.getTracks().forEach(t => t.stop());
                return;
            }

            videoRef.current.srcObject = stream;
            await videoRef.current.play();

            const Module = window.Module;
            const tempCanvas = document.createElement('canvas');
            const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });

            if (Module._cimbard_configure_decode) Module._cimbard_configure_decode(68); 
            processFrame(videoRef.current, tempCanvas, ctx, Module);
        } catch (error) {
            setMessage(t('cimbar.cameraError', { error: error.message }));
            setStatus('error');
            setIsDecoding(false);
            isDecodingRef.current = false;
        }
    }, [processFrame]);

    // 文件导入解码逻辑
    const handleFileImport = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !window.Module) return;

        setIsFinished(false);
        setIsDecoding(true);
        setStatus('decoding');
        setMessage(t('cimbar.videoParsingFile'));
        isDecodingRef.current = true;

        const video = videoRef.current;
        const url = URL.createObjectURL(file);
        video.srcObject = null;
        video.src = url;
        video.loop = true;
        video.muted = true;
        
        try {
            await video.play();
            const Module = window.Module;
            const tempCanvas = document.createElement('canvas');
            const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });
            if (Module._cimbard_configure_decode) Module._cimbard_configure_decode(68);
            processFrame(video, tempCanvas, ctx, Module);
        } catch (err) {
            setMessage(t('cimbar.videoPlayError'));
            setIsDecoding(false);
        }
    };

    useEffect(() => {
        isMountedRef.current = true;
        init();
        return () => {
            isMountedRef.current = false;
            stopDecoding();
        };
    }, [init, stopDecoding]);

    return (
        <div className="flex flex-col gap-4 h-full relative">
            <div className="relative flex-1 bg-black rounded-3xl overflow-hidden shadow-inner border border-gray-100">
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                
                {!isDecoding && !isFinished && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/40 backdrop-blur-[2px]">
                        <FileVideo className="w-16 h-16 text-white/30" />
                    </div>
                )}

                {isFinished && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-500/10 backdrop-blur-xl animate-in fade-in duration-500">
                        <CheckCircle2 className="w-20 h-20 text-emerald-500 mb-4" />
                        <h4 className="text-xl font-black text-emerald-600 uppercase tracking-widest">{t('cimbar.received')}</h4>
                        <button
                            onClick={() => { setIsFinished(false); videoRef.current.src = ""; }}
                            className="mt-8 px-6 py-2 bg-emerald-500 text-white text-[10px] font-black rounded-full hover:bg-emerald-600 transition-colors"
                        >
                            <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
                            {t('cimbar.reset')}
                        </button>
                    </div>
                )}
            </div>

            <div className="flex gap-2 shrink-0">
                {!isFinished && (
                    <>
                        <button
                            onClick={isDecoding ? stopDecoding : startDecoding}
                            disabled={status === 'loading'}
                            className={cn(
                                "flex-[2] py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all",
                                isDecoding ? "bg-red-500 text-white shadow-lg shadow-red-100" : "bg-blue-600 text-white shadow-lg shadow-blue-100"
                            )}
                        >
                            {status === 'loading' ? t('cimbar.loading') : isDecoding ? t('cimbar.stop') : t('cimbar.openCamera')}
                        </button>
                        
                        {!isDecoding && (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex-1 py-3.5 rounded-2xl bg-gray-900 text-white font-black text-[10px] uppercase tracking-[0.1em] hover:bg-black transition-all flex items-center justify-center gap-2"
                            >
                                <Upload className="w-3.5 h-3.5" />
                                {t('cimbar.importFile')}
                            </button>
                        )}
                    </>
                )}
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="video/*" 
                    onChange={handleFileImport}
                />
            </div>

            {progress > 0 && !isFinished && (
                <div className="px-1 shrink-0">
                    <div className="h-1 w-full bg-gray-50 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                </div>
            )}

            {message && !isFinished && (
                <div className={`text-[10px] font-black uppercase text-center py-2.5 px-4 rounded-xl border transition-all shrink-0 ${
                    message.includes('✅') ? "text-emerald-700 bg-emerald-50 border-emerald-100" : "text-blue-600 bg-blue-50 border-blue-100"
                }`}>
                    {message}
                </div>
            )}
        </div>
    );
}
