import { useState, useEffect, useRef, useCallback } from "react";
import { loadCimbarEngine, subscribeToCimbarRender, updateCimbarMode } from "@/lib/cimbar-engine";
import { Video, StopCircle, CheckCircle2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { tauriAPI } from "@/api/tauri-api";

let GLOBAL_ENCODING = false;
let GLOBAL_LAST_DATA = null;

const EXPORT_FORMATS = [
    { id: "mp4",  label: "MP4",  ext: "mp4",  type: "video" },
    { id: "webm", label: "WebM", ext: "webm", type: "video" },
    { id: "gif",  label: "GIF",  ext: "gif",  type: "gif"   },
    { id: "webp", label: "WebP", ext: "webp", type: "webp"  },
];

// 检测当前浏览器支持的视频录制 mimeType
function getSupportedVideoMime() {
    const candidates = [
        "video/mp4;codecs=avc1",
        "video/mp4",
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm",
    ];
    for (const m of candidates) {
        if (MediaRecorder.isTypeSupported(m)) return m;
    }
    return "video/webm";
}

// 动态 WebP：逐帧抓取 canvas，用 canvas.toBlob 编码，拼装 RIFF WEBP 动画容器
// 浏览器不支持原生动态 WebP 编码，所以这里生成一个 WebP 序列 zip（用纯 JS）
// 实际上最兼容的方案：把每帧 WebP 打包成 zip
async function encodeWebpFrames(frames, delayMs) {
    // 用 JSZip 打包 — 如果没有 JSZip，回退为单帧
    // 这里用简单方案：直接导出 WebP 动画用 canvas 系列帧的第一帧（静态）
    // 动态 WebP 需要专用 encoder，改为导出所有帧作为 webp 时间序列，
    // 最终选择：使用 AVIF/WebP 静态快照 + 提示用户这是单帧
    if (frames.length === 0) return null;
    return new Promise(resolve => frames[0].toBlob(resolve, "image/webp", 0.92));
}

export default function CimbarQRCode({ data, filename = "vault.ciphora", className = "", style, onError, onReady, visible = true, densityMode = "bu" }) {
    const [status, setStatus] = useState("initializing");
    const [progress, setProgress] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [exportFormat, setExportFormat] = useState("mp4");
    const [showFormatMenu, setShowFormatMenu] = useState(false);
    const [recordElapsed, setRecordElapsed] = useState(0);
    const [recordTotalNeeded, setRecordTotalNeeded] = useState(0);
    const [exportProgress, setExportProgress] = useState(0); // GIF 编码进度
    const [isExporting, setIsExporting] = useState(false);
    const lastDensityRef = useRef(densityMode);

    const recordTimerRef = useRef(null);
    const localCanvasRef = useRef(null);
    const isMountedRef = useRef(true);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const gifFramesRef = useRef([]); // 存储 GIF/WebP 帧的 canvas 元素
    const gifCaptureTimerRef = useRef(null);
    const currentTaskRef = useRef(0);
    const engineReadyRef = useRef(false);

    useEffect(() => {
        const handleReset = () => {
            GLOBAL_ENCODING = false;
            GLOBAL_LAST_DATA = null;
            setStatus(window.Module?._cimbare_encode_bufsize ? "ready" : "initializing");
        };
        const handleAspectRatio = () => {}; // 由父组件处理
        window.addEventListener("cimbar-force-reset", handleReset);
        window.addEventListener("cimbar-aspect-ratio", handleAspectRatio);
        return () => {
            window.removeEventListener("cimbar-force-reset", handleReset);
            window.removeEventListener("cimbar-aspect-ratio", handleAspectRatio);
        };
    }, []);

    const onRenderTick = useCallback(
        (sharedCanvas) => {
            if (!isMountedRef.current || !localCanvasRef.current || !sharedCanvas) return;
            const localCanvas = localCanvasRef.current;
            if (localCanvas.offsetHeight === 0 && !visible) return;
            const ctx = localCanvas.getContext("2d", { alpha: false });
            if (ctx) {
                if (localCanvas.width !== sharedCanvas.width || localCanvas.height !== sharedCanvas.height) {
                    localCanvas.width = sharedCanvas.width;
                    localCanvas.height = sharedCanvas.height;
                }
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(sharedCanvas, 0, 0);
            }
        },
        [visible],
    );

    const copyToWasmHeap = useCallback((abuff) => {
        if (!window.Module?._malloc) return null;
        try {
            const ptr = window.Module._malloc(abuff.length);
            const view = new Uint8Array(window.Module.HEAPU8.buffer, ptr, abuff.length);
            view.set(abuff);
            return view;
        } catch (e) {
            return null;
        }
    }, []);

    const importFile = useCallback(
        (file, taskId) => {
            if (!window.Module?._cimbare_encode_bufsize) return;
            try {
                const chunkSize = window.Module._cimbare_encode_bufsize();
                const reader = new FileReader();
                const wasmFn = copyToWasmHeap(new TextEncoder().encode(file.name));
                if (wasmFn) {
                    window.Module._cimbare_init_encode(wasmFn.byteOffset, wasmFn.length, -1);
                    window.Module._free(wasmFn.byteOffset);
                }
                const ptr = window.Module._malloc(chunkSize);
                const heapBuffer = new Uint8Array(window.Module.HEAPU8.buffer, ptr, chunkSize);
                let offset = 0;

                reader.onload = function (event) {
                    if (!isMountedRef.current || taskId !== currentTaskRef.current) return;
                    const datalen = event.target.result.byteLength;
                    if (datalen > 0) {
                        heapBuffer.set(new Uint8Array(event.target.result));
                        window.Module._cimbare_encode(heapBuffer.byteOffset, datalen);
                        offset += chunkSize;
                        readNext();
                    } else {
                        window.Module._cimbare_encode(heapBuffer.byteOffset, 0);
                        window.Module._free(ptr);
                        GLOBAL_ENCODING = false;
                        setStatus("ready");
                    }
                };

                function readNext() {
                    if (!isMountedRef.current || taskId !== currentTaskRef.current) return;
                    reader.readAsArrayBuffer(file.slice(offset, offset + chunkSize));
                    setProgress(Math.min(100, Math.round((offset / file.size) * 100)));
                }
                readNext();
            } catch (err) {
                GLOBAL_ENCODING = false;
                setStatus("error");
            }
        },
        [copyToWasmHeap],
    );

    const startEncode = useCallback(
        (currentData, currentFilename, mode) => {
            const engineReady = engineReadyRef.current || !!(window.Module?._cimbare_encode_bufsize);
            if (!currentData || !engineReady || GLOBAL_ENCODING) return;
            if (GLOBAL_LAST_DATA === currentData && lastDensityRef.current === mode) {
                setStatus("ready");
                return;
            }
            if (lastDensityRef.current !== mode) updateCimbarMode(mode);
            const taskId = Date.now();
            currentTaskRef.current = taskId;
            GLOBAL_ENCODING = true;
            GLOBAL_LAST_DATA = currentData;
            lastDensityRef.current = mode;
            setStatus("encoding");
            importFile(
                new File([new Blob([currentData instanceof ArrayBuffer ? new Uint8Array(currentData) : currentData])], currentFilename),
                taskId,
            );
        },
        [importFile],
    );

    const init = useCallback(() => {
        if (window.Module?._cimbare_encode_bufsize) {
            engineReadyRef.current = true;
            setStatus("ready");
            return;
        }
        setStatus("initializing");
        loadCimbarEngine()
            .then(() => { if (isMountedRef.current) { engineReadyRef.current = true; setStatus("ready"); } })
            .catch(() => { if (isMountedRef.current) setStatus("error"); });
    }, []);

    useEffect(() => {
        isMountedRef.current = true;
        init();
        const unsub = subscribeToCimbarRender(onRenderTick);
        return () => { isMountedRef.current = false; unsub(); };
    }, [onRenderTick, init]);

    useEffect(() => {
        if (visible && data && status === "ready") startEncode(data, filename, densityMode);
    }, [visible, status, data, filename, densityMode, startEncode]);

    useEffect(() => {
        if (!data) return;
        const timer = setTimeout(() => { if (isMountedRef.current) startEncode(data, filename, densityMode); }, 100);
        return () => clearTimeout(timer);
    }, [data, filename, densityMode, startEncode]);

    // 计算录制时长估算
    const calcEstimatedSeconds = useCallback(() => {
        if (!data) return 10;
        const densityFactor = densityMode === "4c" ? 2.0 : 4.0;
        return Math.max(5, Math.ceil((data.length / (800 * 12.5)) * densityFactor) + 3);
    }, [data, densityMode]);

    const stopRecording = useCallback(() => {
        if (recordTimerRef.current) clearInterval(recordTimerRef.current);
        if (gifCaptureTimerRef.current) clearInterval(gifCaptureTimerRef.current);
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    }, []);

    // ── 视频录制 (MP4 / WebM) ──────────────────────────────────────────
    const startVideoRecording = useCallback((fmt) => {
        const canvas = localCanvasRef.current;
        if (!canvas || !data) return;

        const mime = getSupportedVideoMime();
        const ext = (fmt === "mp4" && mime.includes("mp4")) ? "mp4" : "webm";

        chunksRef.current = [];
        const recorder = new MediaRecorder(canvas.captureStream(20), { mimeType: mime });
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        recorder.onstop = async () => {
            const blob = new Blob(chunksRef.current, { type: mime });
            try {
                const saveRes = await tauriAPI.saveFile(
                    [{ name: fmt.toUpperCase(), extensions: [ext] }],
                    `cimbar-${densityMode}.${ext}`,
                );
                if (saveRes.success && saveRes.filePath) {
                    await tauriAPI.writeBinaryFile(saveRes.filePath, new Uint8Array(await blob.arrayBuffer()));
                }
            } catch (err) { console.error(err); }
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
    }, [data, densityMode]);

    // ── GIF 录制 ──────────────────────────────────────────────────────
    const startGifRecording = useCallback((fps = 12) => {
        const canvas = localCanvasRef.current;
        if (!canvas || !data) return;
        gifFramesRef.current = [];

        // 每帧复制一个 ImageData 快照
        const intervalMs = Math.round(1000 / fps);
        gifCaptureTimerRef.current = setInterval(() => {
            if (!localCanvasRef.current) return;
            const snap = document.createElement("canvas");
            snap.width = canvas.width;
            snap.height = canvas.height;
            snap.getContext("2d").drawImage(canvas, 0, 0);
            gifFramesRef.current.push(snap);
        }, intervalMs);
    }, [data]);

    const finishGifRecording = useCallback(async (fps = 12) => {
        if (gifCaptureTimerRef.current) clearInterval(gifCaptureTimerRef.current);
        const frames = gifFramesRef.current;
        if (!frames.length) return;

        setIsExporting(true);
        setExportProgress(0);

        try {
            const GIF = (await import("gif.js")).default;
            const delay = Math.round(1000 / fps);
            const gif = new GIF({
                workers: 2,
                quality: 10,
                workerScript: "/gif.worker.js",
                width: frames[0].width,
                height: frames[0].height,
            });
            for (const frame of frames) {
                gif.addFrame(frame, { delay, copy: true });
            }
            gif.on("progress", (p) => setExportProgress(Math.round(p * 100)));
            gif.on("finished", async (blob) => {
                try {
                    const saveRes = await tauriAPI.saveFile(
                        [{ name: "GIF", extensions: ["gif"] }],
                        `cimbar-${densityMode}.gif`,
                    );
                    if (saveRes.success && saveRes.filePath) {
                        await tauriAPI.writeBinaryFile(saveRes.filePath, new Uint8Array(await blob.arrayBuffer()));
                    }
                } catch (err) { console.error(err); }
                setIsExporting(false);
                setExportProgress(0);
            });
            gif.render();
        } catch (err) {
            console.error("GIF encode failed:", err);
            setIsExporting(false);
        }
    }, [densityMode]);

    // ── WebP 单帧导出 ──────────────────────────────────────────────────
    const exportWebP = useCallback(async () => {
        const canvas = localCanvasRef.current;
        if (!canvas) return;
        setIsExporting(true);
        try {
            const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", 0.95));
            const saveRes = await tauriAPI.saveFile(
                [{ name: "WebP Image", extensions: ["webp"] }],
                `cimbar-${densityMode}.webp`,
            );
            if (saveRes.success && saveRes.filePath) {
                await tauriAPI.writeBinaryFile(saveRes.filePath, new Uint8Array(await blob.arrayBuffer()));
            }
        } catch (err) { console.error(err); }
        setIsExporting(false);
    }, [densityMode]);

    // ── 统一开始录制 ────────────────────────────────────────────────────
    const startRecording = useCallback(() => {
        if (!localCanvasRef.current || !data) return;
        const estimated = calcEstimatedSeconds();
        setRecordTotalNeeded(estimated);
        setRecordElapsed(0);
        setIsRecording(true);

        if (exportFormat === "webp") {
            // WebP 不需要录制，直接导出当前帧
            exportWebP().then(() => setIsRecording(false));
            return;
        }

        if (exportFormat === "gif") {
            startGifRecording(12);
        } else {
            startVideoRecording(exportFormat);
        }

        if (recordTimerRef.current) clearInterval(recordTimerRef.current);
        recordTimerRef.current = setInterval(() => {
            setRecordElapsed((prev) => prev + 1);
        }, 1000);
    }, [data, exportFormat, calcEstimatedSeconds, exportWebP, startGifRecording, startVideoRecording]);

    // ── 停止录制 ────────────────────────────────────────────────────────
    const handleStop = useCallback(() => {
        if (recordTimerRef.current) clearInterval(recordTimerRef.current);
        setIsRecording(false);

        if (exportFormat === "gif") {
            if (gifCaptureTimerRef.current) clearInterval(gifCaptureTimerRef.current);
            finishGifRecording(12);
        } else if (exportFormat !== "webp") {
            mediaRecorderRef.current?.stop();
        }
    }, [exportFormat, finishGifRecording]);

    const canRecord = data && status === "ready" && visible && !isRecording && !isExporting;
    const recordDone = recordElapsed >= recordTotalNeeded;

    return (
        <div className={cn("relative flex items-center justify-center bg-black overflow-hidden shadow-inner", className)} style={style}>
            <canvas
                ref={localCanvasRef}
                style={{ imageRendering: "pixelated", display: "block", width: "100%", height: "100%", objectFit: "contain", backgroundColor: "#000" }}
            />

            {/* 格式选择 + 录制按钮 */}
            {canRecord && (
                <div className="absolute top-3 left-3 flex items-center gap-1.5 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* 格式下拉 */}
                    <div className="relative">
                        <button
                            onClick={() => setShowFormatMenu(v => !v)}
                            className="flex items-center gap-1 px-2 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur-md border border-white/10 text-[10px] font-bold uppercase tracking-widest transition-all"
                        >
                            {exportFormat}
                            <ChevronDown className="w-3 h-3 opacity-60" />
                        </button>
                        {showFormatMenu && (
                            <div className="absolute top-full mt-1 left-0 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden z-50 min-w-[72px]">
                                {EXPORT_FORMATS.map(f => (
                                    <button
                                        key={f.id}
                                        onClick={() => { setExportFormat(f.id); setShowFormatMenu(false); }}
                                        className={cn(
                                            "w-full px-3 py-1.5 text-left text-[10px] font-bold uppercase tracking-widest transition-colors",
                                            exportFormat === f.id ? "bg-blue-600 text-white" : "text-white/70 hover:bg-white/10"
                                        )}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 录制按钮 */}
                    <button
                        onClick={startRecording}
                        className="p-1.5 bg-white/10 hover:bg-blue-600 text-white rounded-lg transition-all flex items-center gap-1.5 backdrop-blur-md border border-white/10"
                        title={exportFormat === "webp" ? "导出 WebP 截图" : "开始录制"}
                    >
                        <Video className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold pr-0.5">
                            {exportFormat === "webp" ? "截图" : "录制"}
                        </span>
                    </button>
                </div>
            )}

            {/* 录制中状态 */}
            {isRecording && exportFormat !== "webp" && (
                <div className="absolute top-3 left-3 flex items-center gap-2 z-30">
                    <button
                        onClick={handleStop}
                        className={cn(
                            "px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-lg text-white",
                            recordDone ? "bg-emerald-600" : "bg-red-600 animate-pulse"
                        )}
                    >
                        {recordDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <StopCircle className="w-3.5 h-3.5" />}
                        <span className="text-[10px] font-black uppercase tracking-widest">
                            {recordDone ? "完成" : exportFormat.toUpperCase()}
                        </span>
                    </button>
                    <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5 flex items-center gap-2.5">
                        <div className="w-20 h-1 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className={cn("h-full transition-all duration-1000", recordDone ? "bg-emerald-400" : "bg-blue-500")}
                                style={{ width: `${Math.min(100, Math.round((recordElapsed / recordTotalNeeded) * 100))}%` }}
                            />
                        </div>
                        <span className="text-[9px] font-bold text-white/60 tabular-nums">
                            {recordElapsed}s / {recordTotalNeeded}s
                        </span>
                    </div>
                </div>
            )}

            {/* GIF / 导出进度 */}
            {isExporting && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm z-40">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                        <p className="text-[11px] font-bold text-white/70 uppercase tracking-widest">
                            {exportFormat === "gif" ? `编码 GIF ${exportProgress}%` : "导出中..."}
                        </p>
                        {exportFormat === "gif" && exportProgress > 0 && (
                            <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 transition-all" style={{ width: `${exportProgress}%` }} />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Encoding 进度 */}
            {status === "encoding" && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full z-10">
                    <div className="w-3 h-3 border border-blue-400/40 border-t-blue-500 rounded-full animate-spin" />
                    <p className="text-[9px] font-black text-white/50 uppercase tracking-widest">
                        Encoding{progress > 0 && progress < 100 ? ` ${progress}%` : "..."}
                    </p>
                </div>
            )}

            {/* 引擎加载中 */}
            {status === "initializing" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-10">
                    <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-600 rounded-full animate-spin" />
                </div>
            )}
        </div>
    );
}
