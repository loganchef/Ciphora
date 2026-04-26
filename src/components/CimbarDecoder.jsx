import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, CheckCircle2, RotateCcw, FileVideo, Upload, Monitor, Lock, Eye, EyeOff, LogIn, AlertTriangle, RefreshCw } from 'lucide-react';
import { loadCimbarEngine } from '@/lib/cimbar-engine';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { tauriAPI } from '@/api/tauri-api';
import { readFile } from '@tauri-apps/plugin-fs';

const MODE_MAP = { 'auto': 0, 'b': 68, 'bm': 67, 'bu': 66, '4c': 4 };
const MODE_VALS = [66, 68, 67, 4];

// --- Worker management ---
function createDecodeWorker() {
    return new Promise((resolve, reject) => {
        const worker = new Worker('/wasm/cimbar-worker.js');
        const timeout = setTimeout(() => {
            worker.terminate();
            reject(new Error('Worker init timeout'));
        }, 15000);
        worker.onmessage = (e) => {
            if (e.data.type === 'ready') {
                clearTimeout(timeout);
                resolve(worker);
            }
        };
        worker.onerror = (err) => { clearTimeout(timeout); reject(err); };
    });
}

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
    const frameCounterRef = useRef(0);
    const lastProgressRef = useRef(0);
    const lastProgressTimeRef = useRef(0);
    const timeoutCheckTimer = useRef(null);
    const workerRef = useRef(null);
    const workerReadyRef = useRef(false);
    const decodeModeRef = useRef('auto');

    // Keep decodeMode ref in sync
    useEffect(() => { decodeModeRef.current = decodeMode; }, [decodeMode]);

    // Initialize worker
    const initWorker = useCallback(async () => {
        if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
            workerReadyRef.current = false;
        }
        setStatus('loading');
        try {
            const worker = await createDecodeWorker();
            workerRef.current = worker;
            workerReadyRef.current = true;

            worker.onmessage = null; // Will be set per-session in startDecode

            if (isMountedRef.current) setStatus('ready');
        } catch (e) {
            if (isMountedRef.current) setStatus('error');
        }
    }, []);

    // Also init the main-thread engine (for encoder/render side)
    const init = useCallback((retry = false) => {
        loadCimbarEngine(retry).catch(() => {});
        initWorker();
    }, [initWorker]);

    const handleReset = useCallback(async () => {
        isDecodingRef.current = false;
        setIsDecoding(false);
        if (timeoutCheckTimer.current) clearInterval(timeoutCheckTimer.current);

        setIsFinished(false);
        setIsError(false);
        setDecodedPayload(null);
        setImportPassword('');
        setImportResult(null);
        setProgress(0);
        setMessage('');
        frameCounterRef.current = 0;
        lastProgressRef.current = 0;

        if (videoRef.current) {
            videoRef.current.src = '';
            videoRef.current.srcObject = null;
            try { videoRef.current.load(); } catch(e) {}
        }

        // Restart the worker to fully clear WASM fountain decoder state
        await initWorker();
    }, [initWorker]);

    const stopDecoding = useCallback(() => {
        isDecodingRef.current = false;
        setIsDecoding(false);
        if (timeoutCheckTimer.current) clearInterval(timeoutCheckTimer.current);
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    }, []);

    // Send a frame to the worker and handle the result
    const sendFrame = useCallback((imageData, width, height, sessionId) => {
        const worker = workerRef.current;
        if (!worker || !workerReadyRef.current || !isDecodingRef.current) return;

        const mode = decodeModeRef.current;
        const activeMode = MODE_MAP[mode] || (MODE_VALS[Math.floor(frameCounterRef.current / 3) % MODE_VALS.length]);
        frameCounterRef.current += 1;

        const pixels = imageData.data.buffer.slice(0);

        return new Promise((resolve) => {
            const msgId = frameCounterRef.current;
            const handler = (e) => {
                const msg = e.data;
                if (msg.id !== msgId) return;
                worker.removeEventListener('message', handler);

                if (msg.type === 'file_complete') {
                    resolve({ complete: true, filename: msg.filename, data: msg.data });
                } else {
                    if (msg.progress !== null && msg.progress !== undefined) {
                        if (msg.progress > lastProgressRef.current) {
                            lastProgressRef.current = msg.progress;
                            lastProgressTimeRef.current = Date.now();
                            setProgress(msg.progress);
                            setMessage(t('cimbar.analyzing', { frame: frameCounterRef.current }));
                        }
                    }
                    resolve({ complete: false });
                }
            };
            worker.addEventListener('message', handler);
            worker.postMessage({ type: 'decode_frame', id: msgId, payload: { pixels, width, height, mode: activeMode, frameCount: frameCounterRef.current } }, [pixels]);
        });
    }, [t]);

    const handleFileComplete = useCallback((filename, dataBuffer, video) => {
        isDecodingRef.current = false;
        setIsDecoding(false);
        if (timeoutCheckTimer.current) clearInterval(timeoutCheckTimer.current);

        if (video && video.srcObject) {
            video.srcObject.getTracks().forEach(tr => tr.stop());
            video.srcObject = null;
        }
        if (video) video.pause();

        setIsFinished(true);
        setProgress(100);

        const finalData = new Uint8Array(dataBuffer);
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
    }, [onDecoded, t]);

    const processFrame = useCallback(async (video, tempCanvas, ctx) => {
        if (!isDecodingRef.current || !isMountedRef.current) return;

        if (video.ended && !video.srcObject) {
            if (lastProgressRef.current < 100) {
                setIsError(true);
                setMessage(t('cimbar.videoEndedUnfinished'));
                stopDecoding();
                return;
            }
        }

        const vw = video.videoWidth;
        const vh = video.videoHeight;
        if (!vw || !vh) {
            requestAnimationFrame(() => processFrame(video, tempCanvas, ctx));
            return;
        }

        const targetSize = 512;
        if (tempCanvas.width !== targetSize || tempCanvas.height !== targetSize) {
            tempCanvas.width = targetSize;
            tempCanvas.height = targetSize;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(video, 0, 0, vw, vh, 0, 0, targetSize, targetSize);
        const imageData = ctx.getImageData(0, 0, targetSize, targetSize);

        const result = await sendFrame(imageData, targetSize, targetSize);
        if (result?.complete) {
            handleFileComplete(result.filename, result.data, video);
            return;
        }

        if (isDecodingRef.current) {
            requestAnimationFrame(() => processFrame(video, tempCanvas, ctx));
        }
    }, [sendFrame, handleFileComplete, stopDecoding, t]);

    const processFrameFromImage = useCallback(async (img, tempCanvas, ctx) => {
        if (!isDecodingRef.current) return;

        const targetSize = 512;
        tempCanvas.width = targetSize;
        tempCanvas.height = targetSize;
        ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, targetSize, targetSize);
        const imageData = ctx.getImageData(0, 0, targetSize, targetSize);

        const result = await sendFrame(imageData, targetSize, targetSize);
        if (result?.complete) {
            handleFileComplete(result.filename, result.data, null);
            return;
        }

        if (isDecodingRef.current) {
            requestAnimationFrame(() => processFrameFromImage(img, tempCanvas, ctx));
        }
    }, [sendFrame, handleFileComplete]);

    const startVideoDecoding = useCallback(async (stream) => {
        const video = videoRef.current;
        if (!video || !workerReadyRef.current) return;

        isDecodingRef.current = true;
        setIsDecoding(true);
        setStatus('decoding');
        frameCounterRef.current = 0;
        lastProgressRef.current = 0;
        lastProgressTimeRef.current = Date.now();

        video.srcObject = stream;
        try {
            await video.play();
            if (timeoutCheckTimer.current) clearInterval(timeoutCheckTimer.current);
            timeoutCheckTimer.current = setInterval(() => {
                const idleElapsed = (Date.now() - lastProgressTimeRef.current) / 1000;
                if (lastProgressRef.current > 0 && lastProgressRef.current < 100 && idleElapsed > 20) {
                    setIsError(true);
                    setMessage(t('cimbar.timeoutStuck'));
                    stopDecoding();
                }
            }, 3000);
        } catch(e) {
            stopDecoding();
            return;
        }

        const tempCanvas = document.createElement('canvas');
        const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });
        processFrame(video, tempCanvas, ctx);
    }, [processFrame, stopDecoding, t]);

    const startCameraDecoding = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: { facingMode: 'environment', width: { min: 720, ideal: 1280 }, height: { min: 720, ideal: 720 } }
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
                video: { width: { ideal: 1280 } }
            });
            stream.getVideoTracks()[0].addEventListener('ended', () => { if (isDecodingRef.current) stopDecoding(); });
            await startVideoDecoding(stream);
        } catch (error) {
            setIsDecoding(false);
        }
    }, [startVideoDecoding, stopDecoding]);

    const handleImportVideo = async () => {
        try {
            const res = await tauriAPI.selectFile([{ name: 'Media Files', extensions: ['webm', 'mp4', 'mkv', 'mov', 'gif'] }]);
            if (!res.success || !res.filePath) return;

            // Reset state but keep worker alive (it's already clean)
            isDecodingRef.current = false;
            setIsDecoding(false);
            setIsFinished(false);
            setIsError(false);
            setDecodedPayload(null);
            setProgress(0);
            setMessage('');
            frameCounterRef.current = 0;
            lastProgressRef.current = 0;

            setIsDecoding(true);
            setStatus('decoding');
            setMessage(t('cimbar.videoParsingFile'));
            isDecodingRef.current = true;

            const binaryData = await readFile(res.filePath);
            const blobUrl = URL.createObjectURL(new Blob([binaryData]));
            const isGif = res.filePath.toLowerCase().endsWith('.gif');
            const video = videoRef.current;
            const tempCanvas = document.createElement('canvas');
            const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });

            if (isGif) {
                const img = new Image();
                img.onload = () => processFrameFromImage(img, tempCanvas, ctx);
                img.src = blobUrl;
            } else {
                video.srcObject = null;
                video.src = blobUrl;
                video.loop = false;
                video.muted = true;
                await video.play();
                processFrame(video, tempCanvas, ctx);
            }
        } catch (err) {
            setIsDecoding(false);
        }
    };

    const handleImport = useCallback(async () => {
        if (!decodedPayload) return;
        setIsImporting(true); setImportResult(null);
        try {
            const sharePasswordSet = decodedPayload.meta?.sharePasswordSet === true;
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
        } finally {
            setIsImporting(false);
        }
    }, [decodedPayload, importPassword, onDecoded, t]);

    useEffect(() => {
        isMountedRef.current = true;
        init();
        return () => {
            isMountedRef.current = false;
            isDecodingRef.current = false;
            if (timeoutCheckTimer.current) clearInterval(timeoutCheckTimer.current);
            if (workerRef.current) { workerRef.current.terminate(); workerRef.current = null; }
        };
    }, [init]);

    return (
        <div className="flex flex-col gap-4 h-full relative">
            <div className="relative flex-1 bg-black rounded-3xl overflow-hidden shadow-inner border border-gray-100">
                <video ref={videoRef} className="w-full h-full object-contain" autoPlay playsInline muted />

                {/* 默认占位图 */}
                {!isDecoding && !isFinished && !isError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/40 backdrop-blur-[2px]">
                        <FileVideo className="w-16 h-16 text-white/30" />
                    </div>
                )}

                {/* 错误反馈界面 */}
                {isError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/90 backdrop-blur-xl p-6 text-center">
                        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
                        <h4 className="text-white font-bold mb-2">{t('cimbar.decodeFailed') || '解码失败'}</h4>
                        <p className="text-xs text-gray-400 mb-8 max-w-[240px] leading-relaxed">{message}</p>
                        <button onClick={handleReset} className="px-8 py-3 bg-white text-black text-xs font-black rounded-full hover:bg-gray-200 transition-all flex items-center gap-2 shadow-xl">
                            <RefreshCw className="w-4 h-4" />{t('cimbar.retry') || '重试'}
                        </button>
                    </div>
                )}

                {/* 完成/导入界面 */}
                {isFinished && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/90 backdrop-blur-xl animate-in fade-in duration-500 p-6 overflow-y-auto z-50">
                        {importResult?.success ? (
                            <div className="flex flex-col items-center text-center">
                                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
                                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                                </div>
                                <h4 className="text-xl font-black text-white uppercase tracking-widest mb-2">{t('common.importSuccess')}</h4>
                                <p className="text-xs text-gray-400 mb-8">{t('cimbar.importSuccessDesc') || '解密成功，正在打开预览页面'}</p>
                                <button onClick={handleReset} className="px-10 py-3 bg-emerald-600 text-white text-xs font-black rounded-full hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/20">
                                    <RotateCcw className="w-4 h-4" />{t('cimbar.reset')}
                                </button>
                            </div>
                        ) : (
                            <div className="w-full max-w-sm flex flex-col items-center">
                                <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
                                <h4 className="text-lg font-black text-white uppercase tracking-widest mb-2">{t('cimbar.received')}</h4>

                                <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 text-left backdrop-blur-md">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{t('cimbar.payloadLabel') || 'Payload'}</p>
                                    <p className="text-sm font-bold text-white truncate">{decodedPayload?.filename || 'vault.ciphora'}</p>
                                </div>

                                <div className="w-full mb-8">
                                    <div className="flex items-center justify-between mb-2 px-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                            <Lock className="w-3 h-3" />
                                            {decodedPayload?.meta?.sharePasswordSet ? t('cimbar.passwordRequired') || 'Password Required' : t('cimbar.passwordIfSet') || 'Password (if set)'}
                                        </label>
                                    </div>
                                    <div className="relative group">
                                        <input
                                            type={showImportPassword ? 'text' : 'password'}
                                            value={importPassword}
                                            onChange={e => setImportPassword(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleImport()}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 py-3.5 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="••••••••"
                                        />
                                        <button onClick={() => setShowImportPassword(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white p-1 transition-colors">
                                            {showImportPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {importResult?.success === false && (
                                        <p className="text-xs text-red-400 mt-2 px-1 font-medium">{importResult.message}</p>
                                    )}
                                </div>

                                <div className="flex gap-3 w-full">
                                    <button onClick={handleReset} className="flex-1 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-wider hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                                        <RotateCcw className="w-3.5 h-3.5" /> {t('cimbar.reset')}
                                    </button>
                                    <button onClick={handleImport} disabled={isImporting} className="flex-[2] py-3.5 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 disabled:opacity-50">
                                        <LogIn className="w-3.5 h-3.5" />
                                        {isImporting ? t('common.loading') : t('actions.confirmImport') || 'Import'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 模式选择浮层 */}
                {!isFinished && !isError && (
                    <div className="absolute top-4 right-4 flex gap-1 p-1 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 z-40 shadow-2xl">
                        {Object.keys(MODE_MAP).map(m => (
                            <button key={m} onClick={() => setDecodeMode(m)} className={cn("px-3 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all", decodeMode === m ? "bg-white text-blue-600 shadow-sm" : "text-white/50 hover:text-white")}>{m}</button>
                        ))}
                    </div>
                )}
            </div>

            {/* 控制按钮栏 */}
            <div className="flex gap-2 shrink-0">
                {!isFinished && !isError && (
                    <>
                        <button onClick={isDecoding ? stopDecoding : startCameraDecoding} disabled={status === 'loading'} className={cn("flex-[2] py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-lg", isDecoding ? "bg-red-500 text-white shadow-red-500/20" : "bg-blue-600 text-white shadow-blue-600/20")}>
                            <Camera className="w-4 h-4" />
                            {isDecoding ? t('cimbar.stop') : t('cimbar.openCamera')}
                        </button>
                        {!isDecoding && (
                            <>
                                <button onClick={startScreenDecoding} className="flex-1 py-4 rounded-2xl bg-slate-800 text-white font-black text-[10px] uppercase tracking-[0.1em] hover:bg-slate-700 transition-all flex items-center justify-center gap-2 shadow-lg">
                                    <Monitor className="w-4 h-4" /> {t('cimbar.screenRecord')}
                                </button>
                                <button onClick={handleImportVideo} className="flex-1 py-4 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.1em] hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg border border-white/5">
                                    <Upload className="w-4 h-4" /> {t('cimbar.importFile')}
                                </button>
                            </>
                        )}
                    </>
                )}
            </div>

            {/* 进度与消息 */}
            {progress > 0 && !isFinished && !isError && (
                <div className="px-1 shrink-0">
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                        <div className="h-full bg-emerald-500 transition-all duration-300 shadow-[0_0_8px_rgba(16,185,129,0.5)]" style={{ width: `${progress}%` }} />
                    </div>
                </div>
            )}
            {message && !isFinished && !isError && (
                <div className={cn("text-[10px] font-bold uppercase text-center py-3 px-4 rounded-2xl border transition-all shrink-0 shadow-sm", progress === 100 ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-blue-600 bg-blue-50 border-blue-100')}>
                    {message}
                </div>
            )}
        </div>
    );
}
