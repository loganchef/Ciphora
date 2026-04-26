import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, CheckCircle2, RotateCcw, FileVideo, Upload, Monitor, Lock, Eye, EyeOff, LogIn, AlertTriangle, RefreshCw } from 'lucide-react';
import { loadCimbarEngine } from '@/lib/cimbar-engine';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { tauriAPI } from '@/api/tauri-api';
import { readFile } from '@tauri-apps/plugin-fs';

const MODE_MAP = { 'auto': 0, 'b': 68, 'bm': 67, 'bu': 66, '4c': 4 };
const MODE_VALS = [66, 68, 67, 4];

export default function CimbarDecoder({ onDecoded, onError, onProgress }) {
    const { t } = useTranslation();
    const [isDecoding, setIsDecoding] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [isError, setIsError] = useState(false);
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState('idle');
    const [decodeMode, setDecodeMode] = useState('auto');

    const [decodedPayload, setDecodedPayload] = useState(null);
    const [importPassword, setImportPassword] = useState('');
    const [showImportPassword, setShowImportPassword] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);

    const videoRef = useRef(null);
    const isDecodingRef = useRef(false);
    const isMountedRef = useRef(true);
    const currentBlobUrl = useRef(null);
    const wasmBuffsRef = useRef({ img: null, fountain: null, err: null });
    const frameCounterRef = useRef(0);
    
    // 超时检测相关
    const startTimeRef = useRef(0);
    const lastProgressTimeRef = useRef(0);
    const lastProgressRef = useRef(0);
    const timeoutCheckTimer = useRef(null);

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

    const handleReset = useCallback(() => {
        console.log("Cimbar: Full reset of WASM and UI.");
        const M = window.Module;
        
        // 关键修复：除了重置喷泉码，如果 WASM 暴露了删除文件的接口则调用
        if (M && M._cimbard_reset) {
            M._cimbard_reset();
        }
        
        if (timeoutCheckTimer.current) clearInterval(timeoutCheckTimer.current);
        
        setIsFinished(false);
        setIsError(false);
        setDecodedPayload(null);
        setImportPassword('');
        setImportResult(null);
        setProgress(0);
        setMessage('');
        setIsDecoding(false);
        isDecodingRef.current = false;
        frameCounterRef.current = 0;
        lastProgressRef.current = 0;
        
        if (videoRef.current) {
            videoRef.current.src = '';
            videoRef.current.srcObject = null;
        }
    }, []);

    const stopDecoding = useCallback(() => {
        isDecodingRef.current = false;
        setIsDecoding(false);
        if (timeoutCheckTimer.current) clearInterval(timeoutCheckTimer.current);
        if (videoRef.current) {
            if (videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
                videoRef.current.srcObject = null;
            }
        }
        freeWasmBuffs();
    }, [freeWasmBuffs]);

    const reassembleFile = useCallback((fileId, video) => {
        isDecodingRef.current = false;
        setIsDecoding(false);
        if (timeoutCheckTimer.current) clearInterval(timeoutCheckTimer.current);
        
        const Module = window.Module;
        const errBuff = mallocPersist('err', 1024);
        
        const fileSize = Module._cimbard_get_filesize(fileId);
        if (fileSize <= 0) {
            setIsDecoding(true);
            isDecodingRef.current = true;
            return;
        }

        const fnLen = Module._cimbard_get_filename(fileId, errBuff.byteOffset, errBuff.length);
        let filename = 'vault.ciphora';
        if (fnLen > 0) {
            filename = new TextDecoder('utf-8').decode(
                new Uint8Array(Module.HEAPU8.buffer, errBuff.byteOffset, fnLen)
            );
        }

        const decompBufSize = Module._cimbard_get_decompress_bufsize ? Module._cimbard_get_decompress_bufsize() : 65536;
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

        // 关键修复：读完后，如果 WASM 支持释放文件，则释放，否则下一次读取会因指针在末尾返回 0
        if (Module._cimbard_delete_file) {
            Module._cimbard_delete_file(fileId);
        }

        if (totalRead > 0) {
            const finalData = new Uint8Array(totalRead);
            let offset = 0;
            for (const chunk of chunks) {
                finalData.set(chunk, offset);
                offset += chunk.length;
            }

            setIsFinished(true);
            setProgress(100);

            if (video && video.srcObject) {
                video.srcObject.getTracks().forEach(tr => tr.stop());
                video.srcObject = null;
            }
            if (video) video.pause();

            try {
                const text = new TextDecoder().decode(finalData);
                const parsed = JSON.parse(text);
                if (parsed && (parsed.encrypted !== undefined || parsed.passwords !== undefined)) {
                    setDecodedPayload({ 
                        filename, 
                        meta: parsed.meta || {}, 
                        encrypted: parsed.encrypted, 
                        passwords: parsed.passwords,
                        raw: finalData 
                    });
                    setMessage('');
                    return;
                }
            } catch (e) {}

            const blob = new Blob([finalData]);
            onDecoded?.({ filename, data: blob, raw: finalData, isPayload: false });
            setMessage(t('cimbar.decodeSuccess'));
        }
    }, [mallocPersist, onDecoded, t]);

    const decodeBuffer = useCallback((pixels, width, height, Module) => {
        if (!isDecodingRef.current) return false;
        const fountainBufSize = Module._cimbard_get_bufsize();
        const fountainBuff = mallocPersist('fountain', fountainBufSize);
        frameCounterRef.current += 1;
        
        let activeMode = MODE_MAP[decodeMode];
        if (activeMode === 0) {
            activeMode = MODE_VALS[Math.floor(frameCounterRef.current / 3) % MODE_VALS.length];
        }
        Module._cimbard_configure_decode(activeMode);

        const len = Module._cimbard_scan_extract_decode(
            wasmBuffsRef.current.img.byteOffset, width, height,
            4, fountainBuff.byteOffset, fountainBuff.length
        );

        if (len > 0) {
            const fountRes = Module._cimbard_fountain_decode(fountainBuff.byteOffset, len);
            if (fountRes > 0) {
                const fileId = Number(BigInt(fountRes) & 0xFFFFFFFFn);
                reassembleFile(fileId, videoRef.current);
                return true;
            }

            const errBuff = mallocPersist('err', 1024);
            const errLen = Module._cimbard_get_report(errBuff.byteOffset, errBuff.length);
            if (errLen > 0) {
                const errView = new Uint8Array(Module.HEAPU8.buffer, errBuff.byteOffset, errLen);
                try {
                    const report = JSON.parse(new TextDecoder().decode(errView));
                    if (Array.isArray(report)) {
                        const maxProg = Math.max(...report);
                        const newProg = Math.min(99, Math.round(maxProg * 100));
                        if (newProg > lastProgressRef.current) {
                            lastProgressRef.current = newProg;
                            lastProgressTimeRef.current = Date.now();
                        }
                        setProgress(newProg);
                        setMessage(t('cimbar.analyzing', { frame: frameCounterRef.current }));
                    }
                } catch(e) {}
            }
        }
        return false;
    }, [decodeMode, mallocPersist, reassembleFile, t]);

    const processFrame = useCallback(async (video, tempCanvas, ctx, Module) => {
        if (!isDecodingRef.current || !isMountedRef.current) return;
        if (video.ended && !video.srcObject) { 
            if (progress < 100) {
                setIsError(true);
                setMessage(t('cimbar.videoEndedUnfinished') || '视频已播放结束，但解码尚未完成。');
                stopDecoding();
                return;
            }
        }

        const vw = video.videoWidth;
        const vh = video.videoHeight;
        if (!vw || !vh) {
            requestAnimationFrame(() => processFrame(video, tempCanvas, ctx, Module));
            return;
        }

        try {
            let pixels, width, height;
            if (video.requestVideoFrameCallback && typeof window.VideoFrame === 'function') {
                try {
                    const vf = new VideoFrame(video);
                    width = vf.displayWidth; height = vf.displayHeight;
                    const size = vf.allocationSize({ format: 'RGBA' });
                    pixels = mallocPersist('img', size);
                    await vf.copyTo(pixels, { format: 'RGBA' });
                    vf.close();
                } catch (e) {}
            }

            if (!pixels) {
                const targetSize = 512;
                if (tempCanvas.width !== targetSize || tempCanvas.height !== targetSize) {
                    tempCanvas.width = targetSize; tempCanvas.height = targetSize;
                }
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(video, 0, 0, vw, vh, 0, 0, targetSize, targetSize);
                const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
                pixels = mallocPersist('img', imageData.data.length);
                pixels.set(imageData.data);
                width = targetSize; height = targetSize;
            }
            decodeBuffer(pixels, width, height, Module);
        } catch (err) { console.error('Decode frame error:', err); }

        if (isDecodingRef.current) {
            if (video.requestVideoFrameCallback) {
                video.requestVideoFrameCallback(() => processFrame(video, tempCanvas, ctx, Module));
            } else {
                requestAnimationFrame(() => processFrame(video, tempCanvas, ctx, Module));
            }
        }
    }, [decodeBuffer, mallocPersist, progress, stopDecoding, t]);

    const processFrameFromImage = useCallback((img, tempCanvas, ctx, Module) => {
        if (!isDecodingRef.current || !isMountedRef.current) return;
        const targetSize = 512;
        if (tempCanvas.width !== targetSize || tempCanvas.height !== targetSize) {
            tempCanvas.width = targetSize; tempCanvas.height = targetSize;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, targetSize, targetSize);
        const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
        const pixels = mallocPersist('img', imageData.data.length);
        pixels.set(imageData.data);
        decodeBuffer(pixels, targetSize, targetSize, Module);
    }, [decodeBuffer, mallocPersist]);

    const startVideoDecoding = useCallback(async (stream) => {
        const video = videoRef.current;
        if (!video || !window.Module) return;
        handleReset();
        setIsDecoding(true); setStatus('decoding');
        isDecodingRef.current = true;
        video.srcObject = stream;
        try {
            await video.play();
            startTimeRef.current = Date.now();
            lastProgressTimeRef.current = Date.now();
            if (timeoutCheckTimer.current) clearInterval(timeoutCheckTimer.current);
            timeoutCheckTimer.current = setInterval(() => {
                const now = Date.now();
                const idleElapsed = (now - lastProgressTimeRef.current) / 1000;
                if (progress > 0 && progress < 100 && idleElapsed > 20) {
                    setIsError(true);
                    setMessage(t('cimbar.timeoutStuck') || '解码中断：进度长时间未更新。');
                    stopDecoding();
                }
            }, 3000);
        } catch(e) {
            setMessage(t('cimbar.videoPlayError'));
            setIsDecoding(false); isDecodingRef.current = false;
            if (stream) stream.getTracks().forEach(tr => tr.stop());
            return;
        }
        const tempCanvas = document.createElement('canvas');
        const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });
        processFrame(video, tempCanvas, ctx, window.Module);
    }, [processFrame, t, handleReset, progress, stopDecoding]);

    const startCameraDecoding = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: { facingMode: 'environment', width: { min: 720, ideal: 1920 }, height: { min: 720, ideal: 1080 }, frameRate: { ideal: 15 } }
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
            stream.getVideoTracks()[0].addEventListener('ended', () => { if (isDecodingRef.current) stopDecoding(); });
            await startVideoDecoding(stream);
        } catch (error) {
            if (error.name !== 'NotAllowedError') setMessage(t('cimbar.cameraError', { error: error.message }));
            setIsDecoding(false);
        }
    }, [startVideoDecoding, stopDecoding, t]);

    const handleImportVideo = async () => {
        try {
            const res = await tauriAPI.selectFile([{ name: 'Media Files', extensions: ['webm', 'mp4', 'mkv', 'mov', 'gif'] }]);
            if (!res.success || !res.filePath) return;
            handleReset();
            setIsDecoding(true); setStatus('decoding');
            setMessage(t('cimbar.videoParsingFile'));
            isDecodingRef.current = true; freeWasmBuffs();
            const binaryData = await readFile(res.filePath);
            const blobUrl = URL.createObjectURL(new Blob([binaryData]));
            currentBlobUrl.current = blobUrl;
            const isGif = res.filePath.toLowerCase().endsWith('.gif');
            const video = videoRef.current;
            const tempCanvas = document.createElement('canvas');
            const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });
            
            startTimeRef.current = Date.now();
            lastProgressTimeRef.current = Date.now();

            if (isGif) {
                const img = new Image();
                img.onload = () => {
                    const playGif = () => {
                        if (!isDecodingRef.current) return;
                        processFrameFromImage(img, tempCanvas, ctx, window.Module);
                        requestAnimationFrame(playGif);
                    };
                    playGif();
                };
                img.src = blobUrl;
            } else {
                video.srcObject = null; video.src = blobUrl; video.loop = false; video.muted = true;
                await video.play();
                processFrame(video, tempCanvas, ctx, window.Module);
            }
        } catch (err) {
            console.error('Import error:', err);
            setMessage(t('cimbar.videoPlayError'));
            setIsDecoding(false);
        }
    };

    const handleImport = useCallback(async () => {
        if (!decodedPayload) return;
        setIsImporting(true); setImportResult(null);
        try {
            const sharePasswordSet = decodedPayload.meta?.sharePasswordSet === true;
            // 关键修复：显式处理空密码。如果没输，传入 null 而不是空字符串
            const result = await window.api.invoke('prepare_cimbar_import', {
                data: decodedPayload.encrypted,
                sharePasswordSet,
                sharePassword: importPassword.trim() || null, 
                masterPassword: window.__masterPassword || ''
            });
            
            if (result && result.success) {
                onDecoded?.({ 
                    filename: decodedPayload.filename, 
                    data: result.passwords, 
                    isPayload: true,
                    raw: decodedPayload.raw
                });
                setImportResult({ success: true, message: t('common.importSuccess') });
            } else {
                setImportResult({ success: false, message: result?.message || t('errors.importFailed') });
            }
        } catch (e) {
            setImportResult({ success: false, message: e.message || t('errors.importFailed') });
        } finally { setIsImporting(false); }
    }, [decodedPayload, importPassword, onDecoded, t]);

    useEffect(() => {
        isMountedRef.current = true; init();
        return () => { 
            isMountedRef.current = false; 
            if (timeoutCheckTimer.current) clearInterval(timeoutCheckTimer.current);
            stopDecoding(); 
        };
    }, [init, stopDecoding]);

    return (
        <div className="flex flex-col gap-4 h-full relative">
            <div className="relative flex-1 bg-black rounded-3xl overflow-hidden shadow-inner border border-gray-100">
                <video ref={videoRef} className="w-full h-full object-contain" autoPlay playsInline muted />
                {!isDecoding && !isFinished && !isError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/40 backdrop-blur-[2px]">
                        <FileVideo className="w-16 h-16 text-white/30" />
                    </div>
                )}
                {isError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/90 backdrop-blur-xl animate-in fade-in duration-300 p-6 text-center">
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                            <AlertTriangle className="w-8 h-8 text-red-500" />
                        </div>
                        <h4 className="text-white font-bold mb-2">{t('cimbar.decodeFailed') || '解码失败'}</h4>
                        <p className="text-xs text-gray-400 mb-8 max-w-[240px] leading-relaxed">{message}</p>
                        <button onClick={handleReset} className="px-8 py-3 bg-white text-black text-xs font-black rounded-full hover:bg-gray-200 transition-all flex items-center gap-2">
                            <RefreshCw className="w-4 h-4" />{t('cimbar.retry') || '重试'}
                        </button>
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
                                <div className="w-full max-w-xs bg-white/5 border border-white/10 rounded-xl p-3 mb-4 text-left">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">File</p>
                                    <p className="text-xs font-bold text-white truncate">{decodedPayload?.filename || 'vault.ciphora'}</p>
                                    {decodedPayload?.meta?.count != null && ( <p className="text-[10px] text-gray-400 mt-0.5">{decodedPayload.meta.count} entries</p> )}
                                </div>
                                <div className="w-full max-w-xs mb-4">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Lock className="w-3 h-3" />{decodedPayload?.meta?.sharePasswordSet ? 'Decryption Password (required)' : 'Decryption Password (if set)'}</p>
                                    <div className="relative">
                                        <input type={showImportPassword ? 'text' : 'password'} value={importPassword} onChange={e => setImportPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleImport()} placeholder={decodedPayload?.meta?.sharePasswordSet ? 'Enter password...' : 'Leave blank if none'} className="w-full bg-white/5 border border-white/10 rounded-lg pl-3 pr-10 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500" />
                                        <button onClick={() => setShowImportPassword(v => !v)} className="absolute right-2.5 top-2.5 text-gray-400 hover:text-white">{showImportPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                                    </div>
                                    {importResult?.success === false && ( <p className="text-[10px] text-red-400 mt-1.5">{importResult.message}</p> )}
                                </div>
                                <div className="flex gap-2 w-full max-w-xs">
                                    <button onClick={handleReset} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-wider hover:bg-white/10 transition-all flex items-center justify-center gap-1.5"><RotateCcw className="w-3.5 h-3.5" />{t('cimbar.reset')}</button>
                                    <button onClick={handleImport} disabled={isImporting} className="flex-[2] py-2.5 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"><LogIn className="w-3.5 h-3.5" />{isImporting ? t('common.loading') : 'Import'}</button>
                                </div>
                            </>
                        )}
                    </div>
                )}
                {!isFinished && !isError && (
                    <div className="absolute top-4 right-4 flex gap-1 p-1 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 z-50">
                        {Object.keys(MODE_MAP).map(m => (
                            <button key={m} onClick={() => setDecodeMode(m)} className={cn("px-3 py-1 text-[9px] font-black uppercase rounded-lg transition-all", decodeMode === m ? "bg-white text-blue-600 shadow-sm" : "text-white/50 hover:text-white")}>{m}</button>
                        ))}
                    </div>
                )}
            </div>
            <div className="flex gap-2 shrink-0">
                {!isFinished && !isError && (
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
            {progress > 0 && !isFinished && !isError && ( <div className="px-1 shrink-0"><div className="h-1 w-full bg-gray-50 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${progress}%` }} /></div></div> )}
            {message && !isFinished && !isError && ( <div className={cn("text-[10px] font-black uppercase text-center py-2.5 px-4 rounded-xl border transition-all shrink-0", progress === 100 ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-blue-600 bg-blue-50 border-blue-100')}>{message}</div> )}
        </div>
    );
}
