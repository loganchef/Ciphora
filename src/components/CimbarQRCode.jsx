import { useState, useEffect, useRef, useCallback, memo } from "react";
import { loadCimbarEngine, subscribeToCimbarRender, updateCimbarMode } from "@/lib/cimbar-engine";
import { Video, StopCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { tauriAPI } from "@/api/tauri-api";

let GLOBAL_ENCODING = false;
let GLOBAL_LAST_DATA = null;

export default function CimbarQRCode({ data, filename = "vault.ciphora", className = "", style, onError, onReady, visible = true, densityMode = "bu" }) {
    const [status, setStatus] = useState("initializing");
    const [message, setMessage] = useState("连接引擎...");
    const [progress, setProgress] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [aspectRatio, setAspectRatio] = useState(1.0);
    const lastDensityRef = useRef(densityMode);

    const [recordElapsed, setRecordElapsed] = useState(0);
    const [recordTotalNeeded, setRecordTotalNeeded] = useState(0);
    const recordTimerRef = useRef(null);

    const localCanvasRef = useRef(null);
    const isMountedRef = useRef(true);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const currentTaskRef = useRef(0);
    const engineReadyRef = useRef(false);

    useEffect(() => {
        const handleReset = () => {
            GLOBAL_ENCODING = false;
            GLOBAL_LAST_DATA = null;
            if (window.Module && window.Module._cimbare_encode_bufsize) {
                setStatus("ready");
            } else {
                setStatus("initializing");
            }
        };
        const handleAspectRatio = (e) => {
            setAspectRatio(e.detail.ratio);
        };
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
        if (!window.Module || !window.Module._malloc) return null;
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
            if (!window.Module || !window.Module._cimbare_encode_bufsize) return;
            try {
                const chunkSize = window.Module._cimbare_encode_bufsize();
                const reader = new FileReader();
                const wasmFn = copyToWasmHeap(new TextEncoder().encode(file.name));

                if (wasmFn) {
                    // 遵循官方示例：init_encode 第三个参数固定为 -1
                    // 模式由外部的 _cimbare_configure 统一控制
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
                        console.log("✅ [WASM] Official Encode Stream Ready");
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
                setStatus("error");
            }
        },
        [copyToWasmHeap],
    );

    const startEncode = useCallback(
        (currentData, currentFilename, mode) => {
            const engineReady = engineReadyRef.current || !!(window.Module && window.Module._cimbare_encode_bufsize);
            if (!currentData || !engineReady || GLOBAL_ENCODING) return;

            // 模式变化时必须重新 encode，即使 data 相同
            if (GLOBAL_LAST_DATA === currentData && lastDensityRef.current === mode) {
                setStatus("ready");
                return;
            }

            // 模式变化：先切换 WASM 模式再 encode
            if (lastDensityRef.current !== mode) {
                updateCimbarMode(mode);
            }

            const taskId = Date.now();
            currentTaskRef.current = taskId;
            GLOBAL_ENCODING = true;
            GLOBAL_LAST_DATA = currentData;
            lastDensityRef.current = mode;

            setStatus("encoding");
            importFile(new File([new Blob([currentData instanceof ArrayBuffer ? new Uint8Array(currentData) : currentData])], currentFilename), taskId);
        },
        [importFile],
    );

    const init = useCallback(() => {
        if (window.Module && window.Module._cimbare_encode_bufsize) {
            engineReadyRef.current = true;
            setStatus("ready");
            return;
        }
        setStatus("initializing");
        loadCimbarEngine()
            .then(() => {
                if (isMountedRef.current) {
                    engineReadyRef.current = true;
                    setStatus("ready");
                }
            })
            .catch(() => {
                if (isMountedRef.current) setStatus("error");
            });
    }, []);

    useEffect(() => {
        isMountedRef.current = true;
        init();
        const unsub = subscribeToCimbarRender(onRenderTick);
        return () => {
            isMountedRef.current = false;
            unsub();
        };
    }, [onRenderTick, init]);

    useEffect(() => {
        if (visible && data && status === "ready") {
            startEncode(data, filename, densityMode);
        }
    }, [visible, status, data, filename, densityMode, startEncode]);

    useEffect(() => {
        if (!data) return;
        const timer = setTimeout(() => {
            if (isMountedRef.current) startEncode(data, filename, densityMode);
        }, 100);
        return () => clearTimeout(timer);
    }, [data, filename, densityMode, startEncode]);

    const startRecording = () => {
        if (!localCanvasRef.current || !data) return;
        const densityFactor = densityMode === "4c" ? 2.0 : 4.0;
        const estimatedSeconds = Math.ceil((data.length / (800 * 12.5)) * densityFactor) + 3;
        setRecordTotalNeeded(Math.max(5, estimatedSeconds));
        setRecordElapsed(0);
        chunksRef.current = [];
        const recorder = new MediaRecorder(localCanvasRef.current.captureStream(20), { mimeType: "video/webm;codecs=vp9" });
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.onstop = async () => {
            const blob = new Blob(chunksRef.current, { type: "video/webm" });
            try {
                const saveRes = await tauriAPI.saveFile([{ name: "Video", extensions: ["webm"] }], `cimbar-${densityMode}.webm`);
                if (saveRes.success && saveRes.filePath) {
                    await tauriAPI.writeBinaryFile(saveRes.filePath, new Uint8Array(await blob.arrayBuffer()));
                }
            } catch (err) {
                console.error(err);
            }
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
        if (recordTimerRef.current) clearInterval(recordTimerRef.current);
        recordTimerRef.current = setInterval(() => {
            setRecordElapsed((prev) => prev + 1);
        }, 1000);
    };

    return (
        <div className={cn("relative flex items-center justify-center bg-black overflow-hidden shadow-inner", className)} style={style}>
            <canvas ref={localCanvasRef} style={{ imageRendering: "pixelated", display: "block", width: "100%", height: "100%", objectFit: "contain", backgroundColor: "#000" }} />
            {data && status === "ready" && visible && !isRecording && (
                <button onClick={startRecording} className="absolute top-4 left-4 p-2 bg-white/10 hover:bg-blue-600 text-white rounded-full transition-all opacity-0 group-hover:opacity-100 z-30 flex items-center gap-2 backdrop-blur-md border border-white/10" title="录制完整数据动画">
                    <Video className="w-4 h-4" />
                </button>
            )}
            {isRecording && (
                <div className="absolute top-4 left-4 flex items-center gap-3 z-30">
                    <button
                        onClick={() => {
                            mediaRecorderRef.current?.stop();
                            setIsRecording(false);
                            if (recordTimerRef.current) clearInterval(recordTimerRef.current);
                        }}
                        className={cn("p-2 rounded-full transition-all flex items-center gap-2 shadow-lg", recordElapsed >= recordTotalNeeded ? "bg-emerald-600" : "bg-red-600 animate-pulse")}
                    >
                        {recordElapsed >= recordTotalNeeded ? <CheckCircle2 className="w-4 h-4" /> : <StopCircle className="w-4 h-4" />}
                        <span className="text-[10px] font-black pr-1 uppercase tracking-widest text-white">{recordElapsed >= recordTotalNeeded ? "Ready" : "Recording"}</span>
                    </button>
                    <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5 flex items-center gap-3">
                        <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className={cn("h-full transition-all duration-1000", recordElapsed >= recordTotalNeeded ? "bg-emerald-50" : "bg-blue-500")} style={{ width: `${Math.min(100, Math.round((recordElapsed / recordTotalNeeded) * 100))}%` }} />
                        </div>
                        <span className="text-[9px] font-bold text-white/70 tabular-nums">{Math.min(100, Math.round((recordElapsed / recordTotalNeeded) * 100))}%</span>
                    </div>
                </div>
            )}
            {status === "encoding" && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full z-10">
                    <div className="w-3 h-3 border border-blue-400/40 border-t-blue-500 rounded-full animate-spin" />
                    <p className="text-[9px] font-black text-white/50 uppercase tracking-widest">Encoding{progress > 0 && progress < 100 ? ` ${progress}%` : "..."}</p>
                </div>
            )}
            {status === "initializing" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-10">
                    <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-600 rounded-full animate-spin" />
                </div>
            )}
        </div>
    );
}
