import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, CheckCircle2, RotateCcw, FileVideo, Upload, Monitor, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import { loadCimbarEngine } from '@/lib/cimbar-engine';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { tauriAPI } from '@/api/tauri-api';
import { readFile } from '@tauri-apps/plugin-fs';

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
        if (!(u0 & 128)) { str += String.fromCharCode(u0); continue; }
        let u1 = heap[ptr++] & 63;
        if ((u0 & 224) == 192) { str += String.fromCharCode((u0 & 31) << 6 | u1); continue; }
        let u2 = heap[ptr++] & 63;
        if ((u0 & 240) == 224) {
            u0 = (u0 & 15) << 12 | u1 << 6 | u2;
        } else {
            u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heap[ptr++] & 63;
        }
        if (u0 < 65536) str += String.fromCharCode(u0);
        else { let ch = u0 - 65536; str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023); }
    }
    return str;
}

// 官方模式定义
const MODE_MAP = {
    'auto': 0,
    'b': 68,
    'bm': 67,
    'bu': 66,
    '4c': 4
};
const MODE_VALS = [66, 68, 67, 4]; // autodetect 轮换顺序

export default function CimbarDecoder({ onDecoded, onError, onProgress }) {
    const { t } = useTranslation();
    const [isDecoding, setIsDecoding] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState('idle');
    const [decodeMode, setDecodeMode] = useState('auto');

    // Post-decode import state
    const [decodedPayload, setDecodedPayload] = useState(null); // { filename, meta, encrypted, raw }
    const [importPassword, setImportPassword] = useState('');
    const [showImportPassword, setShowImportPassword] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState(null); // { success, message }

    const videoRef = useRef(null);
    const isDecodingRef = useRef(false);
    const isMountedRef = useRef(true);
    const currentBlobUrl = useRef(null);
    const wasmBuffsRef = useRef({ img: null, fountain: null, err: null });
    const frameCounterRef = useRef(0);

    const init = useCallback((retry = false) => {
        setStatus('loading');
        loadCimbarEngine(retry).then(() => {
            if (isMountedRef.current) setStatus('ready');
        }).catch(() => {
            if (isMountedRef.current) setStatus('error');
        });
    }, []);

    const mallocPersist = useCallback((name, size) => {
        const M = window.Module;
        const buffs = wasmBuffsRef.current;
        if (buffs[name] && buffs[name].buffer !== M.HEAPU8.buffer) {
            buffs[name] = new Uint8Array(M.HEAPU8.buffer, buffs[name].byteOffset, buffs[name].byteLength);
        }
        if (!buffs[name] || size > buffs[name].length) {
            if (buffs[name]) M._free(buffs[name].byteOffset);
            const ptr = M._malloc(size);
            buffs[name] = new Uint8Array(M.HEAPU8.buffer, ptr, size);
        }
        return buffs[name];
    }, []);

    const freeWasmBuffs = useCallback(() => {
        const M = window.Module;
        if (!M) return;
        const buffs = wasmBuffsRef.current;
        ['img', 'fountain', 'err'].forEach(name => {
            if (buffs[name]) { try { M._free(buffs[name].byteOffset); } catch(e) {} buffs[name] = null; }
        });
    }, []);

    const stopDecoding = useCallback(() => {
        isDecodingRef.current = false;
        setIsDecoding(false);
        if (videoRef.current) {
            if (videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
                videoRef.current.srcObject = null;
            }
            videoRef.current.src = '';
            videoRef.current.load();
        }
        if (currentBlobUrl.current) {
            URL.revokeObjectURL(currentBlobUrl.current);
            currentBlobUrl.current = null;
        }
        freeWasmBuffs();
    }, [freeWasmBuffs]);

    const reassembleFile = useCallback((fileId, video) => {
        const Module = window.Module;
        const errBuff = mallocPersist('err', 1024);

        const fileSize = Module._cimbard_get_filesize(fileId);
        if (!fileSize) return;

        const fnLen = Module._cimbard_get_filename(fileId, errBuff.byteOffset, errBuff.length);
        let filename = 'vault.ciphora';
        if (fnLen > 0) {
            filename = new TextDecoder('utf-8').decode(
                new Uint8Array(Module.HEAPU8.buffer, errBuff.byteOffset, fnLen)
            );
        }

        const decompBufSize = Module._cimbard_get_decompress_bufsize();
        const decompPtr = Module._malloc(decompBufSize);

        const chunks = [];
        let totalRead = 0;
        while (true) {
            const readSize = Module._cimbard_decompress_read(fileId, decompPtr, decompBufSize);
            if (readSize <= 0) break;
            chunks.push(new Uint8Array(Module.HEAPU8.buffer, decompPtr, readSize).slice());
            totalRead += readSize;
        }
        Module._free(decompPtr);

        if (totalRead > 0) {
            const finalData = new Uint8Array(totalRead);
            let offset = 0;
            for (const chunk of chunks) {
                finalData.set(chunk, offset);
                offset += chunk.length;
            }

            isDecodingRef.current = false;
            setIsDecoding(false);
            setIsFinished(true);
            setProgress(100);

            if (video.srcObject) {
                video.srcObject.getTracks().forEach(tr => tr.stop());
                video.srcObject = null;
            }
            video.pause();

            // Try to parse as cimbar payload JSON
            try {
                const text = new TextDecoder().decode(finalData);
                const parsed = JSON.parse(text);
                if (parsed && parsed.encrypted !== undefined) {
                    setDecodedPayload({
                        filename,
                        meta: parsed.meta || {},
                        encrypted: parsed.encrypted,
                        raw: finalData,
                    });
                    setMessage('');
                    return;
                }
            } catch (e) {
                // Not JSON payload — fall back to raw download
            }

            // Raw file: offer download via onDecoded
            const blob = new Blob([finalData]);
            onDecoded?.({ filename, data: blob });
            setMessage(t('cimbar.decodeSuccess'));
        }
    }, [mallocPersist, onDecoded, t]);

    const processFrame = useCallback(async (video, tempCanvas, ctx, Module) => {
        if (!isDecodingRef.current || !isMountedRef.current) return;
        if (video.ended && !video.srcObject) { stopDecoding(); return; }

        const vw = video.videoWidth;
        const vh = video.videoHeight;
        if (!vw || !vh) {
            requestAnimationFrame(() => processFrame(video, tempCanvas, ctx, Module));
            return;
        }

        try {
            let pixels, width, height, format = 'RGBA';

            // 优先使用 VideoFrame API (更高效)
            if (video.requestVideoFrameCallback && typeof window.VideoFrame === 'function') {
                try {
                    const vf = new VideoFrame(video);
                    width = vf.displayWidth;
                    height = vf.displayHeight;
                    const size = vf.allocationSize({ format: 'RGBA' });
                    pixels = mallocPersist('img', size);
                    await vf.copyTo(pixels, { format: 'RGBA' });
                    vf.close();
                } catch (e) {
                    // Fallback to Canvas
                }
            }

            if (!pixels) {
                // 默认使用 512x512 以平衡性能和精度
                const targetSize = 512;
                if (tempCanvas.width !== targetSize || tempCanvas.height !== targetSize) {
                    tempCanvas.width = targetSize;
                    tempCanvas.height = targetSize;
                }
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(video, 0, 0, vw, vh, 0, 0, targetSize, targetSize);
                const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
                pixels = mallocPersist('img', imageData.data.length);
                pixels.set(imageData.data);
                width = targetSize;
                height = targetSize;
            }

            const fountainBufSize = Module._cimbard_get_bufsize();
            const fountainBuff = mallocPersist('fountain', fountainBufSize);

            frameCounterRef.current += 1;
            let activeMode = MODE_MAP[decodeMode];
            if (activeMode === 0) {
                // Auto 模式下轮换，但放慢轮换频率以增加识别机会
                activeMode = MODE_VALS[Math.floor(frameCounterRef.current / 3) % MODE_VALS.length];
            }
            Module._cimbard_configure_decode(activeMode);

            const len = Module._cimbard_scan_extract_decode(
                wasmBuffsRef.current.img.byteOffset, width, height,
                4, // RGBA
                fountainBuff.byteOffset, fountainBuff.length
            );

            if (len > 0) {
                const msgbuf = new Uint8Array(Module.HEAPU8.buffer, fountainBuff.byteOffset, len).slice();
                const errBuff = mallocPersist('err', 1024);
                const errLen = Module._cimbard_get_report(errBuff.byteOffset, errBuff.length);

                if (errLen > 0) {
                    const errView = new Uint8Array(Module.HEAPU8.buffer, errBuff.byteOffset, errLen);
                    try {
                        const report = JSON.parse(new TextDecoder().decode(errView));
                        if (Array.isArray(report)) {
                            const maxProg = Math.max(...report);
                            setProgress(Math.min(99, Math.round(maxProg * 100)));
                            setMessage(t('cimbar.analyzing', { frame: frameCounterRef.current }));
                        }
                    } catch(e) {}
                }

                const fountRes = Module._cimbard_fountain_decode(fountainBuff.byteOffset, msgbuf.length);
                if (fountRes > 0) {
                    reassembleFile(Number(BigInt(fountRes) & 0xFFFFFFFFn), video);
                    return;
                }
            }
        } catch (err) {
            console.error('Decode frame error:', err);
        }

        if (isDecodingRef.current) {
            if (video.requestVideoFrameCallback) {
                video.requestVideoFrameCallback(() => processFrame(video, tempCanvas, ctx, Module));
            } else {
                requestAnimationFrame(() => processFrame(video, tempCanvas, ctx, Module));
            }
        }
    }, [decodeMode, t, stopDecoding, mallocPersist, reassembleFile]);

    const startVideoDecoding = useCallback(async (stream) => {
        const video = videoRef.current;
        if (!video || !window.Module) return;

        setIsFinished(false);
        setIsDecoding(true);
        setStatus('decoding');
        isDecodingRef.current = true;
        frameCounterRef.current = 0;
        freeWasmBuffs();

        video.srcObject = stream;
        try {
            await video.play();
        } catch(e) {
            setMessage(t('cimbar.videoPlayError'));
            setIsDecoding(false);
            isDecodingRef.current = false;
            stream.getTracks().forEach(tr => tr.stop());
            return;
        }

        const tempCanvas = document.createElement('canvas');
        const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });
        processFrame(video, tempCanvas, ctx, window.Module);
    }, [processFrame, t, freeWasmBuffs]);

    const startCameraDecoding = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    facingMode: 'environment',
                    width: { min: 720, ideal: 1920 },
                    height: { min: 720, ideal: 1080 },
                    frameRate: { ideal: 15 }
                }
            });
            await startVideoDecoding(stream);
        } catch (error) {
            setMessage(t('cimbar.cameraError', { error: error.message }));
            setIsDecoding(false);
        }
    }, [startVideoDecoding, t]);

    const startScreenDecoding = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                audio: false,
                video: { width: { ideal: 1920 }, height: { ideal: 1080 } }
            });
            stream.getVideoTracks()[0].addEventListener('ended', () => {
                if (isDecodingRef.current) stopDecoding();
            });
            await startVideoDecoding(stream);
        } catch (error) {
            if (error.name !== 'NotAllowedError') {
                setMessage(t('cimbar.cameraError', { error: error.message }));
            }
            setIsDecoding(false);
        }
    }, [startVideoDecoding, stopDecoding, t]);

    const handleImportVideo = async () => {
        try {
            const res = await tauriAPI.selectFile([{ name: 'Video Files', extensions: ['webm', 'mp4', 'mkv', 'mov'] }]);
            if (!res.success || !res.filePath) return;

            setIsFinished(false);
            setIsDecoding(true);
            setStatus('decoding');
            setMessage(t('cimbar.videoParsingFile'));
            isDecodingRef.current = true;
            freeWasmBuffs();

            const binaryData = await readFile(res.filePath);
            const blobUrl = URL.createObjectURL(new Blob([binaryData]));
            currentBlobUrl.current = blobUrl;

            const video = videoRef.current;
            video.srcObject = null;
            video.src = blobUrl;
            video.loop = true;
            video.muted = true;
            await video.play();
            
            const tempCanvas = document.createElement('canvas');
            const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });
            processFrame(video, tempCanvas, ctx, window.Module);
        } catch (err) {
            setMessage(t('cimbar.videoPlayError'));
            setIsDecoding(false);
        }
    };

    const handleImport = useCallback(async () => {
        if (!decodedPayload) return;
        setIsImporting(true);
        setImportResult(null);
        try {
            const sharePasswordSet = decodedPayload.meta?.sharePasswordSet === true;
            const result = await tauriAPI.importCimbarPayload(
                decodedPayload.encrypted,
                sharePasswordSet,
                importPassword || '',
            );
            if (result && result.success !== false) {
                setImportResult({ success: true, message: result.message || t('common.importSuccess') });
            } else {
                setImportResult({ success: false, message: result?.message || t('errors.importFailed') });
            }
        } catch (e) {
            setImportResult({ success: false, message: e.message || t('errors.importFailed') });
        } finally {
            setIsImporting(false);
        }
    }, [decodedPayload, importPassword, t]);

    const handleReset = useCallback(() => {
        setIsFinished(false);
        setDecodedPayload(null);
        setImportPassword('');
        setImportResult(null);
        setProgress(0);
        setMessage('');
        if (videoRef.current) videoRef.current.src = '';
    }, []);

    useEffect(() => {
        isMountedRef.current = true;
        init();
        return () => { isMountedRef.current = false; stopDecoding(); };
    }, [init, stopDecoding]);

    return (
        <div className="flex flex-col gap-4 h-full relative">
            <div className="relative flex-1 bg-black rounded-3xl overflow-hidden shadow-inner border border-gray-100">
                <video ref={videoRef} className="w-full h-full object-contain" autoPlay playsInline muted />
                {!isDecoding && !isFinished && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/40 backdrop-blur-[2px]">
                        <FileVideo className="w-16 h-16 text-white/30" />
                    </div>
                )}
                {isFinished && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/90 backdrop-blur-xl animate-in fade-in duration-500 p-6 overflow-y-auto">
                        {importResult?.success ? (
                            <>
                                <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-3" />
                                <h4 className="text-lg font-black text-emerald-400 uppercase tracking-widest mb-2">{t('common.importSuccess')}</h4>
                                <p className="text-xs text-gray-400 text-center mb-6">{importResult.message}</p>
                                <button onClick={handleReset} className="px-6 py-2 bg-emerald-600 text-white text-[10px] font-black rounded-full hover:bg-emerald-700 transition-all flex items-center gap-1.5">
                                    <RotateCcw className="w-3.5 h-3.5" />{t('cimbar.reset')}
                                </button>
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
                                <h4 className="text-base font-black text-white uppercase tracking-widest mb-1">{t('cimbar.received')}</h4>

                                {/* File info */}
                                <div className="w-full max-w-xs bg-white/5 border border-white/10 rounded-xl p-3 mb-4 text-left">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">File</p>
                                    <p className="text-xs font-bold text-white truncate">{decodedPayload?.filename || 'vault.ciphora'}</p>
                                    {decodedPayload?.meta?.count != null && (
                                        <p className="text-[10px] text-gray-400 mt-0.5">{decodedPayload.meta.count} entries</p>
                                    )}
                                </div>

                                {/* Password input (always shown — sender may or may not have encrypted) */}
                                <div className="w-full max-w-xs mb-4">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                        <Lock className="w-3 h-3" />
                                        {decodedPayload?.meta?.sharePasswordSet ? 'Decryption Password (required)' : 'Decryption Password (if set)'}
                                    </p>
                                    <div className="relative">
                                        <input
                                            type={showImportPassword ? 'text' : 'password'}
                                            value={importPassword}
                                            onChange={e => setImportPassword(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleImport()}
                                            placeholder={decodedPayload?.meta?.sharePasswordSet ? 'Enter password...' : 'Leave blank if none'}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg pl-3 pr-10 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500"
                                        />
                                        <button onClick={() => setShowImportPassword(v => !v)} className="absolute right-2.5 top-2.5 text-gray-400 hover:text-white">
                                            {showImportPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {importResult?.success === false && (
                                        <p className="text-[10px] text-red-400 mt-1.5">{importResult.message}</p>
                                    )}
                                </div>

                                <div className="flex gap-2 w-full max-w-xs">
                                    <button onClick={handleReset} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-wider hover:bg-white/10 transition-all flex items-center justify-center gap-1.5">
                                        <RotateCcw className="w-3.5 h-3.5" />{t('cimbar.reset')}
                                    </button>
                                    <button onClick={handleImport} disabled={isImporting} className="flex-[2] py-2.5 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
                                        <LogIn className="w-3.5 h-3.5" />{isImporting ? t('common.loading') : 'Import'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
                {/* 模式切换浮层 */}
                {!isFinished && (
                    <div className="absolute top-4 right-4 flex gap-1 p-1 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 z-50">
                        {Object.keys(MODE_MAP).map(m => (
                            <button key={m} onClick={() => setDecodeMode(m)} className={cn("px-3 py-1 text-[9px] font-black uppercase rounded-lg transition-all", decodeMode === m ? "bg-white text-blue-600 shadow-sm" : "text-white/50 hover:text-white")}>{m}</button>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex gap-2 shrink-0">
                {!isFinished && (
                    <>
                        <button onClick={isDecoding ? stopDecoding : startCameraDecoding} disabled={status === 'loading'} className={cn("flex-[2] py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2", isDecoding ? "bg-red-500 text-white shadow-lg shadow-red-100" : "bg-blue-600 text-white shadow-lg shadow-blue-100")}><Camera className="w-3.5 h-3.5" />{status === 'loading' ? t('cimbar.loading') : isDecoding ? t('cimbar.stop') : t('cimbar.openCamera')}</button>
                        {!isDecoding && (
                            <>
                                <button onClick={startScreenDecoding} className="flex-1 py-3.5 rounded-2xl bg-gray-700 text-white font-black text-[10px] uppercase tracking-[0.1em] hover:bg-gray-800 transition-all flex items-center justify-center gap-2"><Monitor className="w-3.5 h-3.5" />{t('cimbar.screenRecord')}</button>
                                <button onClick={handleImportVideo} className="flex-1 py-3.5 rounded-2xl bg-gray-900 text-white font-black text-[10px] uppercase tracking-[0.1em] hover:bg-black transition-all flex items-center justify-center gap-2"><Upload className="w-3.5 h-3.5" />{t('cimbar.importFile')}</button>
                            </>
                        )}
                    </>
                )}
            </div>
            {progress > 0 && !isFinished && (
                <div className="px-1 shrink-0"><div className="h-1 w-full bg-gray-50 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${progress}%` }} /></div></div>
            )}
            {message && !isFinished && (
                <div className={cn("text-[10px] font-black uppercase text-center py-2.5 px-4 rounded-xl border transition-all shrink-0", progress === 100 ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-blue-600 bg-blue-50 border-blue-100')}>{message}</div>
            )}
        </div>
    );
}
