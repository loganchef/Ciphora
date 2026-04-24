import React, { useState } from 'react';
import Icon from './Icon';
import { useTranslation } from 'react-i18next';

const ImportPreviewModal = ({
    isOpen,
    onClose,
    onConfirm,
    importData,
    existingData,
    conflicts = []
}) => {
    const { t, i18n } = useTranslation();
    const [selectedConflicts, setSelectedConflicts] = useState({});
    const [importMode, setImportMode] = useState('add');
    const [showPasswords, setShowPasswords] = useState({});

    const togglePasswordVisibility = (id, type) => {
        const key = `${id}_${type}`;
        setShowPasswords(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const getSensitiveLabel = (type) => {
        switch (type) {
            case 'mfa': return t('fields.secret');
            case 'base64': return t('fields.base64Data');
            case 'string': return t('fields.stringData');
            case 'json': return t('fields.jsonData');
            default: return t('fields.password');
        }
    };

    const getSensitiveValue = (entry) => {
        switch (entry.type) {
            case 'mfa': return entry.secret || '';
            case 'base64': return entry.base64Data || '';
            case 'string': return entry.stringData || '';
            case 'json': return entry.jsonData || '';
            default: return entry.password || '';
        }
    };

    // 当导入模式改变时，自动更新下方冲突的处理方式
    const handleModeChange = (mode) => {
        setImportMode(mode);
        const newResolutions = {};
        
        conflicts.forEach(conflict => {
            const id = conflict.imported.id;
            if (mode === 'keep') {
                newResolutions[id] = 'keep';
            } else if (mode === 'latest') {
                newResolutions[id] = 'replace';
            } else if (mode === 'both') {
                newResolutions[id] = 'both';
            } else if (mode === 'smart') {
                // 智能更新：比较更新时间
                const importedTime = new Date(conflict.imported.updatedAt || 0).getTime();
                const existingTime = new Date(conflict.existing.updatedAt || 0).getTime();
                newResolutions[id] = importedTime > existingTime ? 'replace' : 'keep';
            }
        });
        
        setSelectedConflicts(newResolutions);
    };

    // 初始化默认选择
    React.useEffect(() => {
        if (isOpen && conflicts.length > 0) {
            handleModeChange('smart'); // 默认使用智能更新
        }
    }, [isOpen]);

    const handleConflictResolution = (conflictId, choice) => {
        setSelectedConflicts(prev => ({
            ...prev,
            [conflictId]: choice
        }));
    };

    const handleConfirm = () => {
        const resolution = {
            mode: 'update', // 统一使用 update 模式来驱动后端的分支逻辑
            conflicts: selectedConflicts
        };
        onConfirm(resolution);
    };

    const formatDate = (dateString) => {
        if (!dateString) return t('common.none');
        const date = new Date(dateString);
        return date.toLocaleDateString(i18n.language === 'zh-CN' ? 'zh-CN' : 'en-US', {
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!isOpen) return null;

    const renderEntryDetails = (entry, id, type, isSelected) => {
        const sensitiveValue = getSensitiveValue(entry);
        const isVisible = showPasswords[`${id}_${type}`];

        return (
            <button
                onClick={() => handleConflictResolution(id, type)}
                className={`group relative p-3 rounded-xl border-2 text-left transition-all ${
                    isSelected
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                        : 'border-gray-100 bg-white hover:border-gray-300'
                }`}
            >
                <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-bold tracking-wider uppercase ${isSelected ? 'text-blue-600' : 'text-gray-500'}`}>
                        {type === 'existing' ? t('modals.importPreview.keepExisting') : t('modals.importPreview.useImported')}
                    </span>
                    <Icon 
                        path={type === 'existing' ? 'Map/pushpin-fill' : 'System/download-2-fill'} 
                        className={`w-3 h-3 ${isSelected ? (type === 'existing' ? 'text-gray-700' : 'text-blue-600') : 'text-gray-300'}`} 
                    />
                </div>
                
                {/* Sensitive Field */}
                <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="text-sm font-mono text-gray-700 truncate flex-1">
                        {isVisible ? sensitiveValue : '••••••••'}
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); togglePasswordVisibility(id, type); }}
                        className={`p-1 rounded-md transition-colors ${isSelected ? 'hover:bg-blue-100' : 'hover:bg-gray-100'}`}
                        title={t('actions.show')}
                    >
                        <Icon path={isVisible ? 'System/eye-off-line' : 'System/eye-line'} className={`w-3 h-3 ${isSelected ? 'text-blue-400' : 'text-gray-400'}`} />
                    </button>
                </div>

                {/* Metadata */}
                <div className="space-y-1">
                    <div className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                        <Icon path="System/time-line" className="w-2.5 h-2.5" />
                        {formatDate(entry.updatedAt)}
                    </div>
                    {entry.notes && (
                        <div className="text-[10px] text-gray-500 truncate" title={entry.notes}>
                            <span className="opacity-60">{t('fields.notes')}:</span> {entry.notes}
                        </div>
                    )}
                </div>
            </button>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fade-in safe-area-top safe-area-bottom">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-200 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Icon path="Document/file-list-3-fill" className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">{t('modals.importPreview.title')}</h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {t('modals.importPreview.countEntries', { count: importData.length })} {conflicts.length > 0 && `· ${t('modals.importPreview.conflictCount', { count: conflicts.length })}`}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                        <Icon path="System/close-line" className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Import Mode Selection */}
                <div className="p-4 bg-slate-50 border-b border-gray-100 flex-shrink-0">
                    <div className="flex gap-2">
                        {[
                            { id: 'keep', icon: 'Map/pushpin-fill', color: 'text-gray-700', border: 'border-gray-500', label: 'modeKeep' },
                            { id: 'smart', icon: 'System/refresh-fill', color: 'text-blue-600', border: 'border-blue-500', label: 'modeSmart' },
                            { id: 'latest', icon: 'System/download-2-fill', color: 'text-orange-600', border: 'border-orange-500', label: 'modeLatest' },
                            { id: 'both', icon: 'System/add-circle-fill', color: 'text-green-600', border: 'border-green-500', label: 'modeBoth' }
                        ].map(mode => (
                            <button
                                key={mode.id}
                                onClick={() => handleModeChange(mode.id)}
                                className={`flex-1 flex flex-col items-center gap-1 p-2 border-2 rounded-xl transition-all ${
                                    importMode === mode.id ? `${mode.border} bg-white shadow-sm scale-[1.02]` : 'border-transparent text-gray-500 hover:bg-gray-100'
                                }`}
                            >
                                <Icon path={mode.icon} className={`w-4 h-4 ${importMode === mode.id ? mode.color : 'text-gray-400'}`} />
                                <span className="text-xs font-bold">{t(`modals.importPreview.${mode.label}`)}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Data List */}
                <div className="flex-1 overflow-y-auto p-5 bg-slate-50/30">
                    <div className="space-y-4">
                        {importData.map((item, index) => {
                            const conflict = conflicts.find(c => c.imported.id === item.id);
                            return (
                                <div key={index} className={`rounded-xl overflow-hidden shadow-sm border ${conflict ? 'border-amber-200' : 'border-gray-100 bg-white'}`}>
                                    {conflict ? (
                                        <div className="bg-white">
                                            <div className="p-3 bg-amber-50/50 flex items-center justify-between border-b border-amber-100">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <Icon path="System/error-warning-fill" className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                                    <span className="font-bold text-gray-900 truncate">{item.website || t('common.unknown')}</span>
                                                    <span className="text-xs text-gray-500 truncate">{item.username || t('common.optional')}</span>
                                                    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[9px] font-bold uppercase">{item.type}</span>
                                                </div>
                                                <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium flex-shrink-0">Conflict</span>
                                            </div>
                                            <div className="p-3 grid grid-cols-3 gap-3">
                                                {renderEntryDetails(conflict.existing, item.id, 'existing', selectedConflicts[item.id] === 'keep')}
                                                {renderEntryDetails(conflict.imported, item.id, 'imported', selectedConflicts[item.id] === 'replace')}

                                                <button
                                                    onClick={() => handleConflictResolution(item.id, 'both')}
                                                    className={`group relative p-3 rounded-xl border-2 text-left transition-all ${
                                                        selectedConflicts[item.id] === 'both'
                                                            ? 'border-green-500 bg-green-50 ring-2 ring-green-100'
                                                            : 'border-gray-100 bg-white hover:border-gray-300'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-[10px] font-bold text-green-600 tracking-wider uppercase">{t('modals.importPreview.keepBoth')}</span>
                                                        <Icon path="System/add-circle-fill" className={`w-3 h-3 ${selectedConflicts[item.id] === 'both' ? 'text-green-600' : 'text-gray-300'}`} />
                                                    </div>
                                                    <div className="text-[10px] text-gray-600 font-medium italic leading-tight mb-2">Will rename imported entry</div>
                                                    <div className="text-[9px] text-gray-400 font-medium">{t('common.newAccount')}</div>
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-4 flex items-center gap-4 bg-white">
                                            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                                <Icon path="System/checkbox-circle-fill" className="w-6 h-6 text-green-500" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold text-sm text-gray-900">{item.website || t('common.unknown')}</span>
                                                    <span className="text-xs text-gray-400">·</span>
                                                    <span className="text-xs text-gray-500 truncate">{item.username || t('common.optional')}</span>
                                                    <span className="px-1.5 py-0.5 bg-gray-50 text-gray-400 rounded text-[9px] font-bold uppercase">{item.type}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[10px] text-gray-400">{getSensitiveLabel(item.type)}:</span>
                                                        <span className="text-xs font-mono text-gray-600">
                                                            {showPasswords[`${item.id}_new`] ? getSensitiveValue(item) : '••••••••'}
                                                        </span>
                                                        <button 
                                                            onClick={() => togglePasswordVisibility(item.id, 'new')}
                                                            className="p-0.5 hover:bg-gray-100 rounded transition-colors"
                                                        >
                                                            <Icon path={showPasswords[`${item.id}_new`] ? 'System/eye-off-line' : 'System/eye-line'} className="w-2.5 h-2.5 text-gray-400" />
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                                                        <Icon path="System/time-line" className="w-2.5 h-2.5" />
                                                        {formatDate(item.updatedAt)}
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="text-[10px] px-2 py-1 bg-green-100 text-green-700 rounded-full font-bold uppercase tracking-wider">New</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-200 bg-white flex-shrink-0">
                    <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">{t('common.cancel')}</button>
                    <button onClick={handleConfirm} className="px-8 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95">{t('modals.importPreview.confirmImport')}</button>
                </div>
            </div>
        </div>
    );
};

export default ImportPreviewModal;