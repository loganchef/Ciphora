import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { QrCode, Lock, Maximize2, X, Check, Shield, RefreshCw, Eye, EyeOff, Search, ChevronRight, ChevronDown, ListChecks, HelpCircle } from 'lucide-react';
import CimbarQRCode from './CimbarQRCode';
import CimbarDecoder from './CimbarDecoder';
import { tauriAPI } from '@/api/tauri-api';
import { useTranslation } from 'react-i18next';
import { useGroups } from '@/hooks/useGroups';
import { cn } from '@/lib/utils';

const PasswordItem = memo(({ item, isSelected, onToggle }) => {
    return (
        <div 
            onClick={() => onToggle(String(item.id || item._id))}
            className={cn(
                "flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all",
                isSelected ? "bg-blue-50/50" : "hover:bg-gray-50"
            )}
        >
            <div className={cn(
                "w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors shrink-0",
                isSelected ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
            )}>
                {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
            </div>
            <div className="flex-1 min-w-0">
                <p className={cn("text-xs font-bold truncate", isSelected ? "text-blue-700" : "text-gray-700")}>
                    {item.title || item.website}
                </p>
                <p className="text-[9px] text-gray-400 truncate font-medium">{item.username || 'No Username'}</p>
            </div>
        </div>
    );
});

export default function CimbarTransfer({ onClose, passwords = [], visible = false }) {
    const { t } = useTranslation();
    const { groups } = useGroups();
    const [mode, setMode] = useState('generate');
    const [sharePassword, setSharePassword] = useState('');
    const [passwordMode, setPasswordMode] = useState(
        () => localStorage.getItem('cimbar_passwordMode') || 'auto'
    );
    const [showPassword, setShowPassword] = useState(false);
    const [selectedIds, setSelectedIds] = useState(() => new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedGroups, setExpandedGroups] = useState(new Set());
    
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('info');
    const [payloadFile, setPayloadFile] = useState(null);
    const [payloadData, setPayloadData] = useState(null);
    const [isZoomed, setIsZoomed] = useState(false);

    const rebuildTimer = useRef(null);

    const availablePasswords = useMemo(
        () => (passwords || []).filter((item) => item && (item.id || item._id)),
        [passwords]
    );

    const groupMap = useMemo(() => {
        const map = {};
        groups.forEach(g => { map[g.id] = g.name; });
        return map;
    }, [groups]);

    const groupedPasswords = useMemo(() => {
        const result = {};
        availablePasswords.forEach(p => {
            const groupName = p.groupId ? (groupMap[p.groupId] || t('common.unknownGroup')) : t('common.unbound');
            if (!result[groupName]) result[groupName] = [];
            
            const title = (p.title || p.website || '').toLowerCase();
            const username = (p.username || '').toLowerCase();
            const search = searchTerm.toLowerCase();
            
            if (!searchTerm || title.includes(search) || username.includes(search)) {
                result[groupName].push(p);
            }
        });
        return result;
    }, [availablePasswords, groupMap, t, searchTerm]);

    const toggleId = useCallback((id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const toggleGroup = useCallback((groupName, items) => {
        const itemIds = items.map(item => String(item.id || item._id));
        const allSelected = itemIds.every(id => selectedIds.has(id));
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (allSelected) itemIds.forEach(id => next.delete(id));
            else itemIds.forEach(id => next.add(id));
            return next;
        });
    }, [selectedIds]);

    const toggleAll = useCallback(() => {
        const allIds = availablePasswords.map(p => String(p.id || p._id));
        const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id));
        setSelectedIds(allSelected ? new Set() : new Set(allIds));
    }, [availablePasswords, selectedIds]);

    const generateRandomPassword = useCallback(async () => {
        try {
            const result = await tauriAPI.generatePassword({ length: 12 });
            setSharePassword(result);
        } catch (error) {
            console.error('Failed to generate password:', error);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('cimbar_passwordMode', passwordMode);
        if (passwordMode === 'auto') generateRandomPassword();
        else if (passwordMode === 'none') setSharePassword('');
    }, [passwordMode, generateRandomPassword]);

    // Default: select all when passwords load for the first time
    const didAutoSelectRef = useRef(false);
    useEffect(() => {
        if (availablePasswords.length > 0 && !didAutoSelectRef.current) {
            didAutoSelectRef.current = true;
            setSelectedIds(new Set(availablePasswords.map(p => String(p.id || p._id))));
        }
    }, [availablePasswords]);

    useEffect(() => {
        const names = Object.keys(groupedPasswords);
        setExpandedGroups(new Set(names));
    }, [availablePasswords.length === 0]);

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && isZoomed) setIsZoomed(false);
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isZoomed]);

    // BUILD PAYLOAD - ONLY RUNS WHEN VISIBLE
    const buildPayload = useCallback(async () => {
        console.log('[Cimbar] buildPayload called', { visible, mode, selectedSize: selectedIds.size, avail: availablePasswords.length });
        if (!visible || mode !== 'generate') return; // STOP BACKGROUND WORK
        
        if (!availablePasswords.length || selectedIds.size === 0) {
            setMessage(t('cimbar.selectAtLeastOne'));
            setPayloadFile(null);
            setPayloadData(null);
            return;
        }

        setMessage(t('cimbar.updatingStream'));
        try {
            const result = await tauriAPI.prepareCimbarPayload({
                selectedIds: Array.from(selectedIds),
                sharePassword: sharePassword || null
            });

            if (!result || result.success === false) throw new Error(result?.message || t('cimbar.generateFailed'));

            const jsonStr = JSON.stringify(result);
            const encoded = new TextEncoder().encode(jsonStr);
            
            setPayloadFile(new File([encoded], `vault-${Date.now()}.ciphora`, { type: 'text/plain' }));
            setPayloadData(encoded);
            setMessage(t('cimbar.transferReady', { count: selectedIds.size }));
            setMessageType('success');
        } catch (error) {
            console.error('生成失败:', error);
            setMessage(t('cimbar.generateFailed') + ': ' + error.message);
            setMessageType('error');
            setPayloadFile(null);
            setPayloadData(null);
        }
    }, [availablePasswords.length, selectedIds, sharePassword, t, visible, mode]);

    useEffect(() => {
        if (rebuildTimer.current) clearTimeout(rebuildTimer.current);
        rebuildTimer.current = setTimeout(buildPayload, 800);
    }, [selectedIds, sharePassword, mode, buildPayload, visible]);

    const handleDecoded = useCallback(({ filename, data }) => {
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url; a.download = filename || 'vault.ciphora'; a.click();
        URL.revokeObjectURL(url);
        setMessage(t('cimbar.decodeSuccess'));
        setMessageType('success');
    }, [t]);

    return (
        <div className="relative h-full w-full bg-white flex flex-col overflow-hidden">
            {/* Full Screen Mode Overlay */}
            {isZoomed && (
                <div className="absolute inset-0 z-[200] bg-black flex flex-col items-center justify-center p-4 md:p-8 animate-in zoom-in-95 duration-300">
                    <button 
                        onClick={() => setIsZoomed(false)}
                        className="absolute top-8 right-8 p-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl z-[210] transition-all"
                    >
                        <X className="w-8 h-8" />
                    </button>
                    <div className="w-full max-w-[95vw] h-full max-h-[90vh] flex items-center justify-center overflow-hidden">
                         <CimbarQRCode
                            data={payloadData}
                            filename={payloadFile?.name || 'vault.ciphora'}
                            className="w-full h-full"
                            visible={visible && isZoomed}
                        />
                    </div>
                    <p className="mt-8 text-white/30 font-black tracking-[0.5em] uppercase text-[10px] animate-pulse">{t('cimbar.opticalStreamProtocol')}</p>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between px-8 py-4 border-b border-gray-100 bg-white z-[150] shrink-0">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-100">
                        <QrCode className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 leading-tight">{t('cimbar.title')}</h2>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider italic">{t('cimbar.secureOfflineTransfer')}</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-6">
                    <div className="bg-gray-100 p-1 rounded-xl flex items-center">
                        <button
                            onClick={() => setMode('generate')}
                            className={cn(
                                "px-6 py-1.5 text-xs font-bold rounded-lg transition-all",
                                mode === 'generate' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            {t('actions.generate')}
                        </button>
                        <button
                            onClick={() => setMode('decode')}
                            className={cn(
                                "px-6 py-1.5 text-xs font-bold rounded-lg transition-all",
                                mode === 'decode' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            {t('cimbar.decode')}
                        </button>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-red-50 hover:text-red-500 text-gray-400 rounded-xl transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden relative">
                
                <div className={cn(
                    "flex-1 flex transition-opacity duration-300",
                    mode === 'generate' ? "opacity-100 visible" : "opacity-0 invisible absolute inset-0"
                )}>
                    {/* Left Sidebar */}
                    <div className="w-[360px] border-r border-gray-100 flex flex-col bg-white shrink-0">
                        <div className="p-6 space-y-8 flex-1 overflow-y-auto min-h-0 custom-scrollbar">
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-blue-600" />
                                    <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Encryption</h3>
                                </div>
                                <div className="grid grid-cols-3 gap-1 p-1 bg-gray-50 rounded-lg">
                                    {['none', 'fixed', 'auto'].map(m => (
                                        <button
                                            key={m}
                                            onClick={() => setPasswordMode(m)}
                                            className={cn(
                                                "py-1.5 text-[10px] font-bold rounded-md transition-all",
                                                passwordMode === m ? "bg-white text-blue-600 shadow-sm" : "text-gray-400"
                                            )}
                                        >
                                            {m === 'none' ? t('cimbar.encryptionNone') : m === 'fixed' ? t('cimbar.encryptionFixed') : t('cimbar.encryptionAuto')}
                                        </button>
                                    ))}
                                </div>
                                {passwordMode !== 'none' && (
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={sharePassword}
                                            onChange={(e) => setSharePassword(e.target.value)}
                                            disabled={passwordMode === 'auto'}
                                            className="w-full bg-gray-50 border-gray-100 rounded-lg pl-10 pr-20 py-2.5 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                                            placeholder="密钥..."
                                        />
                                        <Lock className="absolute left-3.5 top-3 w-4 h-4 text-gray-300" />
                                        <div className="absolute right-2 top-1.5 flex">
                                            <button onClick={() => setShowPassword(!showPassword)} className="p-1.5 text-gray-400">
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                            {passwordMode === 'auto' && (
                                                <button onClick={generateRandomPassword} className="p-1.5 text-blue-500">
                                                    <RefreshCw className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4 flex flex-col flex-1 min-h-0">
                                <div className="flex items-center justify-between px-1">
                                    <div className="flex items-center gap-2">
                                        <ListChecks className="w-4 h-4 text-blue-600" />
                                        <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Payload</h3>
                                    </div>
                                    <button onClick={toggleAll} className="text-[10px] font-bold text-blue-600">
                                        {selectedIds.size === availablePasswords.length ? t('cimbar.deselectAll') : t('cimbar.selectAll')}
                                    </button>
                                </div>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder={t('cimbar.search')}
                                        className="w-full bg-gray-50 border-none rounded-lg pl-10 pr-4 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-blue-500/10 outline-none"
                                    />
                                    <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-gray-300" />
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-1">
                                    {Object.entries(groupedPasswords).map(([groupName, items]) => (
                                        <div key={groupName} className="space-y-0.5">
                                            <div 
                                                className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md cursor-pointer group"
                                                onClick={() => {
                                                    const next = new Set(expandedGroups);
                                                    if (next.has(groupName)) next.delete(groupName);
                                                    else next.add(groupName);
                                                    setExpandedGroups(next);
                                                }}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {expandedGroups.has(groupName) ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{groupName}</span>
                                                </div>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); toggleGroup(groupName, items); }}
                                                    className="text-[9px] font-bold text-blue-500 opacity-0 group-hover:opacity-100"
                                                >
                                                    {items.every(it => selectedIds.has(String(it.id || it._id))) ? t('cimbar.clearGroup') : t('cimbar.setGroup')}
                                                </button>
                                            </div>
                                            {expandedGroups.has(groupName) && items.map(item => (
                                                <PasswordItem 
                                                    key={String(item.id || item._id)}
                                                    item={item}
                                                    isSelected={selectedIds.has(String(item.id || item._id))}
                                                    onToggle={toggleId}
                                                />
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-4 bg-gray-50 border-t border-gray-100 shrink-0">
                            <div className={cn(
                                "px-4 py-2 rounded-lg border text-[10px] font-black uppercase transition-all", 
                                messageType === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-white border-gray-200 text-gray-400"
                            )}>
                                {message || 'Ready'}
                            </div>
                        </div>
                    </div>

                    {/* Right QR Area */}
                    <div className="flex-1 bg-white flex flex-col items-center justify-center p-8 lg:p-12 relative overflow-hidden">
                        {/* QR Container - Fixed sizing & balance */}
                        <div className="w-full max-w-[560px] min-h-[300px] flex items-center justify-center bg-white relative group border border-gray-100 shadow-sm rounded-2xl overflow-hidden transition-all duration-500">
                            <CimbarQRCode
                                data={payloadData}
                                filename={payloadFile?.name || 'vault.ciphora'}
                                className="w-full h-full"
                                visible={visible}
                            />
                            {!payloadData && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white z-20">
                                    <div className="w-10 h-10 border-2 border-blue-50 border-t-blue-600 rounded-full animate-spin" />
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Generating Stream</p>
                                </div>
                            )}
                            {payloadData && (
                                <button 
                                    onClick={() => setIsZoomed(true)}
                                    className="absolute -bottom-2 -right-2 p-4 bg-gray-900 text-white rounded-2xl shadow-2xl transition-all hover:scale-110 active:scale-95 opacity-0 group-hover:opacity-100 z-30 flex items-center gap-2"
                                >
                                    <Maximize2 className="w-5 h-5" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Zoom</span>
                                </button>
                            )}
                        </div>
                        {payloadData && (
                            <div className="mt-12 text-center space-y-2">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-[0.2em]">{t('cimbar.waveformActive')}</p>
                                <div className="flex justify-center gap-1.5 opacity-30">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className={cn(
                    "flex-1 flex bg-white transition-opacity duration-300 z-40",
                    mode === 'decode' ? "opacity-100 visible" : "opacity-0 invisible absolute inset-0"
                )}>
                    <div className="flex-1 flex flex-col p-8 lg:p-12 border-r border-gray-50">
                        <div className="mb-8 flex items-center justify-between">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-1">{t('cimbar.scanningStream')}</h3>
                                <p className="text-sm font-medium text-gray-400 italic">{t('cimbar.scanningStreamDesc')}</p>
                            </div>
                            <div className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full uppercase tracking-widest border border-emerald-100">
                                {t('cimbar.linkActive')}
                            </div>
                        </div>
                        <div className="flex-1 min-h-0 bg-gray-50 rounded-3xl overflow-hidden border border-gray-100 relative shadow-inner">
                            {mode === 'decode' && (
                                <CimbarDecoder
                                    onDecoded={handleDecoded}
                                    onError={(err) => { setMessage(err.message); setMessageType('error'); }}
                                />
                            )}
                        </div>
                    </div>
                    
                    <div className="w-[360px] p-8 lg:p-12 flex flex-col justify-center shrink-0">
                        <div className="max-w-md mx-auto space-y-10">
                            <div className="space-y-4">
                                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                                    <HelpCircle className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 tracking-tight">{t('cimbar.usageGuide')}</h3>
                            </div>
                            
                            <div className="space-y-6">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="flex gap-5 group">
                                        <div className="shrink-0 w-6 h-6 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-[10px] font-black text-blue-600 shadow-sm group-hover:border-blue-500 transition-colors">{i}</div>
                                        <p className="text-xs font-bold text-gray-500 leading-relaxed group-hover:text-gray-700 transition-colors">{t(`cimbar.tips.item${i}`)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
