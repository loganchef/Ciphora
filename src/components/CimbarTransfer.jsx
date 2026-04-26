import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { QrCode, Lock, Maximize2, X, Check, Shield, RefreshCw, Eye, EyeOff, Search, ChevronRight, ChevronDown, ListChecks, Zap, Activity } from "lucide-react";
import CimbarQRCode from "./CimbarQRCode";
import CimbarDecoder from "./CimbarDecoder";
import ImportPreviewModal from "./ImportPreviewModal";
import { tauriAPI } from "@/api/tauri-api";
import { useTranslation } from "react-i18next";
import { useGroups } from "@/hooks/useGroups";
import { cn } from "@/lib/utils";
import { loadCimbarEngine, updateCimbarFPS, updateCimbarMode, resetEncoderCache } from "@/lib/cimbar-engine";

const PasswordItem = memo(({ item, isSelected, onToggle }) => {
    return (
        <div onClick={() => onToggle(String(item.id || item._id))} className={cn("flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all", isSelected ? "bg-blue-50/50" : "hover:bg-gray-50")}>
            <div className={cn("w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors shrink-0", isSelected ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200")}>{isSelected && <Check className="w-2.5 h-2.5 text-white" />}</div>
            <div className="flex-1 min-w-0">
                <p className={cn("text-xs font-bold truncate", isSelected ? "text-blue-700" : "text-gray-700")}>{item.title || item.website}</p>
                <p className="text-[9px] text-gray-400 truncate font-medium">{item.username || "No Username"}</p>
            </div>
        </div>
    );
});

export default function CimbarTransfer({ onClose, onRefresh, passwords = [], visible = false }) {
    const { t } = useTranslation();
    const { groups } = useGroups();
    const [mode, setMode] = useState("generate");
    const [sharePassword, setSharePassword] = useState("");
    const [passwordMode, setPasswordMode] = useState(() => localStorage.getItem("cimbar_passwordMode") || "auto");
    const [densityMode, setDensityMode] = useState(() => localStorage.getItem("cimbar_densityMode") || "bu");
    const [fps, setFps] = useState(() => parseInt(localStorage.getItem("cimbar_fps") || "12"));
    const [showPassword, setShowPassword] = useState(false);
    const [selectedIds, setSelectedIds] = useState(() => new Set());
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedGroups, setExpandedGroups] = useState(new Set());
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("info");
    const [payloadFile, setPayloadFile] = useState(null);
    const [payloadData, setPayloadData] = useState(null);
    const [isZoomed, setIsZoomed] = useState(false);
    const [isEngineRestarting, setIsEngineRestarting] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    // 导入预览相关状态
    const [importPreview, setImportPreview] = useState({
        isOpen: false,
        data: [],
        conflicts: []
    });

    const rebuildTimer = useRef(null);
    const availablePasswords = useMemo(() => (passwords || []).filter((item) => item && (item.id || item._id)), [passwords]);
    const groupMap = useMemo(() => {
        const map = {};
        groups.forEach((g) => { map[g.id] = g.name; });
        return map;
    }, [groups]);

    const groupedPasswords = useMemo(() => {
        const result = {};
        availablePasswords.forEach((p) => {
            const groupName = p.groupId ? groupMap[p.groupId] || t("common.unknownGroup") : t("common.unbound");
            if (!result[groupName]) result[groupName] = [];
            const title = String(p.title || p.website || "").toLowerCase();
            const username = String(p.username || "").toLowerCase();
            const search = searchTerm.toLowerCase();
            if (!searchTerm || title.includes(search) || username.includes(search)) result[groupName].push(p);
        });
        return result;
    }, [availablePasswords, groupMap, t, searchTerm]);

    const toggleId = useCallback((id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const toggleAll = useCallback(() => {
        const allIds = availablePasswords.map((p) => String(p.id || p._id));
        const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
        setSelectedIds(allSelected ? new Set() : new Set(allIds));
    }, [availablePasswords, selectedIds]);

    const generateRandomPassword = useCallback(async () => {
        try {
            const result = await tauriAPI.generatePassword({ length: 12 });
            setSharePassword(result);
        } catch (error) { console.error(error); }
    }, []);

    const isInitializedRef = useRef(false);
    useEffect(() => {
        if (availablePasswords.length > 0 && !isInitializedRef.current) {
            setSelectedIds(new Set(availablePasswords.map((p) => String(p.id || p._id))));
            setExpandedGroups(new Set(Object.keys(groupedPasswords)));
            isInitializedRef.current = true;
        }
    }, [availablePasswords, groupedPasswords]);

    const buildPayload = useCallback(async () => {
        if (!visible || mode !== "generate" || isEngineRestarting) return;
        
        // 优化：如果没有可用密码，或者 selectedIds 尚未初始化完成，不要弹错
        if (!availablePasswords.length) {
            setMessage(""); // 保持安静
            setPayloadData(null);
            return;
        }

        if (selectedIds.size === 0) {
            // 只有当有密码可用但用户明确一个都没选时才提示
            setMessage(t("cimbar.selectAtLeastOne"));
            setPayloadData(null);
            return;
        }

        setMessage(t("cimbar.updatingStream"));
        try {
            const result = await tauriAPI.prepareCimbarPayload({ 
                selectedIds: Array.from(selectedIds), 
                sharePassword: sharePassword || null 
            });
            if (!result || result.success === false) throw new Error(result?.message || t("cimbar.generateFailed"));
            const encoded = new TextEncoder().encode(JSON.stringify(result));
            setPayloadFile(new File([encoded], `vault-${Date.now()}.ciphora`, { type: "text/plain" }));
            setPayloadData(encoded);
            setMessage(t("cimbar.transferReady", { count: selectedIds.size }));
            setMessageType("success");
        } catch (error) {
            setMessage(t("cimbar.generateFailed"));
            setPayloadData(null);
        }
    }, [availablePasswords.length, selectedIds, sharePassword, t, visible, mode, isEngineRestarting]);

    useEffect(() => {
        if (rebuildTimer.current) clearTimeout(rebuildTimer.current);
        rebuildTimer.current = setTimeout(buildPayload, 800);
    }, [selectedIds, sharePassword, mode, buildPayload, visible]);

    const handleDecoded = useCallback(async ({ filename, data, isPayload }) => {
        if (isPayload) {
            // 核心修复：如果是密码本负载，开启导入预览
            try {
                setMessage(t('common.loading'));
                const response = await window.api.invoke('analyze_import_data', {
                    passwords: data,
                    masterPassword: window.__masterPassword || ''
                });

                // 后端返回结构: { success, requiresPreview, analysis: { total, new, conflicts, existing } }
                const analysis = response?.analysis || {};
                const conflicts = analysis.conflicts || [];
                // 合并 new + conflicts.imported 重建完整展示列表，顺序：先冲突项再新增项
                const conflictItems = conflicts.map(c => c.imported);
                const newItems = analysis.new || [];
                const allItems = [...conflictItems, ...newItems];

                setImportPreview({
                    isOpen: true,
                    data: allItems.length > 0 ? allItems : data,
                    conflicts,
                });
                setMessage("");
            } catch (err) {
                console.error("Analysis failed:", err);
                setMessage(t('errors.importFailed'));
            }
        } else {
            // 普通文件下载逻辑
            const url = URL.createObjectURL(data);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename || "vault.ciphora";
            a.click();
            URL.revokeObjectURL(url);
            setMessage(t("cimbar.decodeSuccess"));
            setMessageType("success");
        }
    }, [t]);

    const handleConfirmImport = async (resolution) => {
        try {
            const result = await window.api.invoke('process_import_with_resolution', {
                passwords: importPreview.data,
                resolution,
                masterPassword: window.__masterPassword || ''
            });
            
            if (result.success) {
                setImportPreview(prev => ({ ...prev, isOpen: false }));
                setMessage(t('common.importSuccess'));
                setMessageType("success");
                if (onRefresh) onRefresh();
            } else {
                alert(result.message);
            }
        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <div className="relative h-full w-full bg-white flex flex-col overflow-hidden text-gray-900 font-sans">
            {isZoomed && (
                <div className="absolute inset-0 z-[200] bg-black flex flex-col items-center justify-center p-4 animate-in zoom-in-95 duration-300">
                    <button onClick={() => setIsZoomed(false)} className="absolute top-8 right-8 p-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl z-[210] transition-all"><X className="w-8 h-8" /></button>
                    <div className="w-full max-w-[95vw] h-full max-h-[90vh] flex items-center justify-center overflow-hidden">
                        <CimbarQRCode key={`zoomed-${refreshKey}`} data={payloadData} filename={payloadFile?.name} className="w-full h-full" visible={visible && isZoomed} densityMode={densityMode} />
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between px-8 py-4 border-b border-gray-100 bg-white shrink-0">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-100"><QrCode className="w-5 h-5 text-white" /></div>
                    <div>
                        <h2 className="text-lg font-bold leading-tight">{t("cimbar.title")}</h2>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider italic">{t("cimbar.secureOfflineTransfer")}</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="bg-gray-100 p-1 rounded-xl flex items-center">
                        <button onClick={() => setMode("generate")} className={cn("px-6 py-1.5 text-xs font-bold rounded-lg transition-all", mode === "generate" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700")}>{t("actions.generate")}</button>
                        <button onClick={() => setMode("decode")} className={cn("px-6 py-1.5 text-xs font-bold rounded-lg transition-all", mode === "decode" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700")}>{t("cimbar.decode")}</button>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-red-50 hover:text-red-500 text-gray-400 rounded-xl transition-all"><X className="w-5 h-5" /></button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden relative">
                <div className={cn("flex-1 flex transition-opacity duration-300", mode === "generate" ? "opacity-100 visible" : "opacity-0 invisible absolute inset-0")}>
                    <div className="w-[360px] border-r border-gray-100 flex flex-col bg-white shrink-0">
                        <div className="p-6 space-y-8 flex-1 overflow-y-auto min-h-0 custom-scrollbar">
                            <div className="space-y-4">
                                <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-blue-600" /><h3 className="text-[10px] font-black uppercase tracking-widest">Security</h3></div>
                                <div className="grid grid-cols-3 gap-1 p-1 bg-gray-50 rounded-lg">
                                    {["none", "fixed", "auto"].map((m) => (
                                        <button key={m} onClick={() => setPasswordMode(m)} className={cn("py-1.5 text-[10px] font-bold rounded-md transition-all", passwordMode === m ? "bg-white text-blue-600 shadow-sm" : "text-gray-400")}>{m === "none" ? t("cimbar.encryptionNone") : m === "fixed" ? t("cimbar.encryptionFixed") : t("cimbar.encryptionAuto")}</button>
                                    ))}
                                </div>
                                {passwordMode !== "none" && (
                                    <div className="relative">
                                        <input type={showPassword ? "text" : "password"} value={sharePassword} onChange={(e) => setSharePassword(e.target.value)} disabled={passwordMode === "auto"} className="w-full bg-gray-50 border-gray-100 rounded-lg pl-10 pr-20 py-2.5 text-sm font-medium outline-none" placeholder="密钥..." />
                                        <Lock className="absolute left-3.5 top-3 w-4 h-4 text-gray-300" />
                                        <div className="absolute right-2 top-1.5 flex">
                                            <button onClick={() => setShowPassword(!showPassword)} className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                                            {passwordMode === "auto" && <button onClick={generateRandomPassword} className="p-1.5 text-blue-500 hover:text-blue-700 transition-colors"><RefreshCw className="w-4 h-4" /></button>}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-blue-600" /><h3 className="text-[10px] font-black uppercase tracking-widest">{t("cimbar.densityLabel")}</h3></div>
                                <div className="grid grid-cols-4 gap-1 p-1 bg-gray-50 rounded-lg">
                                    {["b", "bm", "bu", "4c"].map((m) => ( <button key={m} onClick={() => { setDensityMode(m); updateCimbarMode(m); resetEncoderCache(); setRefreshKey(k => k+1); }} className={cn("py-1.5 text-[10px] font-bold rounded-md transition-all", densityMode === m ? "bg-white text-blue-600 shadow-sm" : "text-gray-400")}>{m.toUpperCase()}</button> ))}
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Activity className="w-4 h-4 text-blue-600" /><h3 className="text-[10px] font-black uppercase tracking-widest">Framerate</h3></div><span className="text-[10px] font-black text-blue-600 tabular-nums bg-blue-50 px-2 py-0.5 rounded-md">{fps} FPS</span></div>
                                <input type="range" min="5" max="30" step="1" value={fps} onChange={(e) => { const v = parseInt(e.target.value); setFps(v); updateCimbarFPS(v); }} className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                            </div>
                            <div className="space-y-4 flex flex-col flex-1 min-h-0">
                                <div className="flex items-center justify-between px-1"><div className="flex items-center gap-2"><ListChecks className="w-4 h-4 text-blue-600" /><h3 className="text-[10px] font-black uppercase tracking-widest">Payload</h3></div><button onClick={toggleAll} className="text-[10px] font-bold text-blue-600">{selectedIds.size === availablePasswords.length ? t("cimbar.deselectAll") : t("cimbar.selectAll")}</button></div>
                                <div className="relative"><input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={t("cimbar.search")} className="w-full bg-gray-50 border-none rounded-lg pl-10 pr-4 py-2 text-xs outline-none" /><Search className="absolute left-3.5 top-2.5 w-4 h-4 text-gray-300" /></div>
                                <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                                    {Object.entries(groupedPasswords).map(([groupName, items]) => (
                                        <div key={groupName} className="space-y-0.5">
                                            <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md cursor-pointer group" onClick={() => { const next = new Set(expandedGroups); if (next.has(groupName)) next.delete(groupName); else next.add(groupName); setExpandedGroups(next); }}>
                                                <div className="flex items-center gap-2">{expandedGroups.has(groupName) ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}<span className="text-[10px] font-bold text-gray-400 uppercase">{groupName}</span></div>
                                            </div>
                                            {expandedGroups.has(groupName) && items.map((item) => <PasswordItem key={String(item.id || item._id)} item={item} isSelected={selectedIds.has(String(item.id || item._id))} onToggle={toggleId} />)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 bg-white flex flex-col items-center justify-center relative overflow-hidden">
                        <div className="w-full max-w-[560px] aspect-square flex items-center justify-center bg-white relative group border border-gray-100 shadow-sm rounded-2xl overflow-hidden transition-all duration-500">
                            <CimbarQRCode key={`normal-${refreshKey}`} data={payloadData} filename={payloadFile?.name} className="w-full h-full" visible={visible && mode === "generate"} densityMode={densityMode} />
                            {payloadData && <button onClick={() => setIsZoomed(true)} className="absolute -bottom-2 -right-2 p-4 bg-gray-900 text-white rounded-2xl shadow-2xl transition-all opacity-0 group-hover:opacity-100 z-30 flex items-center gap-2"><Maximize2 className="w-5 h-5" /><span className="text-[10px] font-black uppercase">Zoom</span></button>}
                        </div>
                    </div>
                </div>
                <div className={cn("flex-1 flex bg-white transition-opacity duration-300 z-40", mode === "decode" ? "opacity-100 visible" : "opacity-0 invisible absolute inset-0")}>
                    <div className="flex-1 flex flex-col p-8 border-r border-gray-50">
                        <div className="flex-1 min-h-0 bg-gray-50 rounded-3xl overflow-hidden border border-gray-100 relative shadow-inner">
                            {mode === "decode" && <CimbarDecoder onDecoded={handleDecoded} onError={(err) => { setMessage(err.message); setMessageType("error"); }} />}
                        </div>
                    </div>
                </div>
            </div>

            <ImportPreviewModal
                isOpen={importPreview.isOpen}
                onClose={() => setImportPreview(prev => ({ ...prev, isOpen: false }))}
                onConfirm={handleConfirmImport}
                importData={importPreview.data}
                existingData={[]} 
                conflicts={importPreview.conflicts}
            />

            {mode === "generate" && message && (
                <div className={cn("absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl shadow-2xl text-xs font-black uppercase tracking-widest z-[100] animate-in slide-in-from-bottom-4", messageType === "success" ? "bg-emerald-600 text-white" : "bg-gray-900 text-white")}>
                    {message}
                </div>
            )}
        </div>
    );
}
