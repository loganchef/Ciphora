import React, { useState } from 'react';
import Icon from './Icon';

const ImportPreviewModal = ({
    isOpen,
    onClose,
    onConfirm,
    importData,
    existingData,
    conflicts = []
}) => {
    const [selectedConflicts, setSelectedConflicts] = useState({});
    const [importMode, setImportMode] = useState('add');

    const handleConflictResolution = (conflictId, choice) => {
        setSelectedConflicts(prev => ({
            ...prev,
            [conflictId]: choice
        }));
    };

    const handleConfirm = () => {
        const resolution = {
            mode: importMode,
            conflicts: selectedConflicts
        };
        onConfirm(resolution);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '未知';
        return new Date(dateString).toLocaleString('zh-CN');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fade-in safe-area-top safe-area-bottom">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-200 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Icon path="Document/file-list-3-fill" className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">导入预览</h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                共 {importData.length} 条 {conflicts.length > 0 && `· ${conflicts.length} 个冲突`}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                        <Icon path="System/close-line" className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Import Mode */}
                <div className="p-5 border-b border-gray-100 flex-shrink-0">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setImportMode('add')}
                            className={`flex-1 flex items-center justify-center gap-2 p-3 border-2 rounded-lg transition-all ${
                                importMode === 'add' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <Icon path="System/add-circle-fill" className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium">仅添加</span>
                        </button>
                        <button
                            onClick={() => setImportMode('update')}
                            className={`flex-1 flex items-center justify-center gap-2 p-3 border-2 rounded-lg transition-all ${
                                importMode === 'update' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <Icon path="System/refresh-fill" className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium">智能更新</span>
                        </button>
                        <button
                            onClick={() => setImportMode('replace')}
                            className={`flex-1 flex items-center justify-center gap-2 p-3 border-2 rounded-lg transition-all ${
                                importMode === 'replace' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <Icon path="System/error-warning-fill" className="w-4 h-4 text-red-600" />
                            <span className="text-sm font-medium">完全替换</span>
                        </button>
                    </div>
                </div>

                {/* Data List */}
                <div className="flex-1 overflow-y-auto p-5">
                    <div className="space-y-3">
                        {importData.map((item, index) => {
                            const conflict = conflicts.find(c => c.imported.id === item.id);
                            return (
                                <div key={index} className={`border rounded-lg ${conflict ? 'border-orange-200 bg-orange-50/50' : 'border-gray-200 bg-white'}`}>
                                    {conflict ? (
                                        <div className="p-4">
                                            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-orange-200">
                                                <Icon path="System/error-warning-fill" className="w-4 h-4 text-orange-600" />
                                                <span className="text-sm font-medium text-gray-900">{item.website || '未知网站'}</span>
                                                <span className="text-xs text-gray-500">· {item.username || '无用户名'}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    onClick={() => handleConflictResolution(item.id, 'keep')}
                                                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                                                        selectedConflicts[item.id] === 'keep'
                                                            ? 'border-blue-500 bg-blue-50 shadow-sm'
                                                            : 'border-gray-200 bg-white hover:border-blue-300'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-2">
                                                        <Icon path="System/pushpin-fill" className="w-3.5 h-3.5" />
                                                        保留现有
                                                    </div>
                                                    <div className="text-sm text-gray-700 mb-1">密码: {conflict.existing.password ? '••••••' : '无'}</div>
                                                    <div className="text-xs text-gray-400">更新: {formatDate(conflict.existing.updatedAt)}</div>
                                                </button>
                                                <button
                                                    onClick={() => handleConflictResolution(item.id, 'replace')}
                                                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                                                        selectedConflicts[item.id] === 'replace'
                                                            ? 'border-blue-500 bg-blue-50 shadow-sm'
                                                            : 'border-gray-200 bg-white hover:border-blue-300'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-2">
                                                        <Icon path="System/download-2-fill" className="w-3.5 h-3.5" />
                                                        使用导入
                                                    </div>
                                                    <div className="text-sm text-gray-700 mb-1">密码: {conflict.imported.password ? '••••••' : '无'}</div>
                                                    <div className="text-xs text-gray-400">更新: {formatDate(conflict.imported.updatedAt)}</div>
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-3 flex items-center gap-2">
                                            <Icon path="System/checkbox-circle-fill" className="w-4 h-4 text-green-500 flex-shrink-0" />
                                            <div className="min-w-0 flex-1">
                                                <span className="font-medium text-sm text-gray-900">{item.website || '未知'}</span>
                                                <span className="text-xs text-gray-500 ml-2">· {item.username || '无用户名'}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-200 flex-shrink-0">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">取消</button>
                    <button onClick={handleConfirm} className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">确认导入</button>
                </div>
            </div>
        </div>
    );
};

export default ImportPreviewModal;
