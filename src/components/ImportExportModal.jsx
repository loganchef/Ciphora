import React, { useState } from 'react';
import Icon from './Icon';

const ImportExportModal = ({ isOpen, onClose, onImport, onExport, type }) => {
    const [selectedFormat, setSelectedFormat] = useState('');

    // 根据类型显示不同的格式选项和描述
    const getFormats = () => {
        if (type === 'import') {
            return [
                { id: 'excel', name: 'Excel文件', description: '从 .xlsx/.xls 文件导入数据', icon: 'Document/file-excel-2-fill' },
                { id: 'csv', name: 'CSV文件', description: '从 .csv/.txt 文件导入数据', icon: 'Document/file-text-fill' },
                { id: 'ciphora', name: 'Ciphora备份文件', description: '从 .ciphora 备份文件恢复', icon: 'System/lock-fill' }
            ];
        } else {
            return [
                { id: 'excel', name: 'Excel文件', description: '导出为 .xlsx 格式', icon: 'Document/file-excel-2-fill' },
                { id: 'csv', name: 'CSV文件', description: '导出为 .csv 格式', icon: 'Document/file-text-fill' },
                { id: 'ciphora', name: 'Ciphora备份文件', description: '导出为 .ciphora 备份格式', icon: 'System/lock-fill' }
            ];
        }
    };

    const formats = getFormats();

    const handleConfirm = () => {
        console.log('确认按钮被点击，选择的格式:', selectedFormat);
        if (!selectedFormat) {
            console.log('没有选择格式，操作被阻止');
            return;
        }

        if (type === 'import') {
            console.log('开始导入，格式:', selectedFormat);
            onImport(selectedFormat);
        } else {
            console.log('开始导出，格式:', selectedFormat);
            onExport(selectedFormat);
        }
        onClose();
    };

    const handleDownloadTemplate = async (format) => {
        try {
            let templateType, filters, defaultName;
            if (format === 'excel') {
                templateType = 'excel';
                filters = [{ name: 'Excel文件', extensions: ['xlsx'] }];
                defaultName = 'Ciphora导入模板.xlsx';
            } else if (format === 'csv') {
                templateType = 'csv';
                filters = [{ name: 'CSV文件', extensions: ['csv'] }];
                defaultName = 'Ciphora导入模板.csv';
            } else {
                alert('该格式不支持模板下载');
                return;
            }

            // 使用 Tauri 文件保存对话框
            const saveResult = await window.api.saveFile(filters, defaultName);
            if (!saveResult.success) {
                return; // 用户取消
            }

            const result = await window.api.generateImportTemplate(templateType);
            if (result.success) {
                // 写入文件
                if (templateType === 'excel') {
                    await window.api.writeBinaryFile(saveResult.filePath, new Uint8Array(result.data));
                } else {
                    await window.api.writeTextFile(saveResult.filePath, result.data);
                }
                alert(`模板下载成功：${saveResult.filePath}`);
            } else {
                alert(`模板生成失败：${result.message}`);
            }
        } catch (error) {
            console.error('下载模板失败:', error);
            alert(`下载模板失败：${error.message}`);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in safe-area-top safe-area-bottom">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${type === 'import' ? 'bg-blue-100' : 'bg-green-100'}`}>
                            <Icon path={type === 'import' ? 'System/download-2-fill' : 'System/upload-2-fill'} className={`w-5 h-5 ${type === 'import' ? 'text-blue-600' : 'text-green-600'}`} />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">
                                {type === 'import' ? '导入数据' : '导出数据'}
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">
                                {type === 'import' ? '选择要导入的文件格式' : '选择要导出的文件格式'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <Icon path="System/close-line" className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="text-gray-600 mb-4">
                        {type === 'import'
                            ? '请选择要导入的文件格式：'
                            : '请选择要导出的文件格式：'
                        }
                    </p>

                    <div className="space-y-3">
                        {formats.map((format) => (
                            <div
                                key={format.id}
                                onClick={() => {
                                    console.log('选择格式:', format.id);
                                    setSelectedFormat(format.id);
                                }}
                                className={`flex items-center p-4 border rounded-lg transition-all cursor-pointer ${selectedFormat === format.id
                                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                <div className="flex items-center space-x-3 flex-1">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedFormat === format.id
                                        ? 'border-blue-500 bg-blue-500'
                                        : 'border-gray-300'
                                        }`}>
                                        {selectedFormat === format.id && (
                                            <div className="w-2 h-2 rounded-full bg-white"></div>
                                        )}
                                    </div>
                                    <Icon path={format.icon} className="w-6 h-6 text-gray-600" />
                                    <div>
                                        <div className="font-medium text-gray-900">
                                            {format.name}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {format.description}
                                        </div>
                                    </div>
                                </div>

                                {/* 模板下载按钮 - 仅导入模式且支持模板的格式显示 */}
                                {type === 'import' && (format.id === 'excel' || format.id === 'csv') && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownloadTemplate(format.id);
                                        }}
                                        className="ml-3 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="下载模板"
                                    >
                                        <Icon path="System/download-2-line" className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!selectedFormat}
                        className={`px-6 py-2 rounded-lg transition-colors flex items-center gap-2 ${selectedFormat
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                    >
                        {selectedFormat && (
                            <Icon path={type === 'import' ? 'System/download-2-fill' : 'System/upload-2-fill'} className="w-4 h-4" />
                        )}
                        {selectedFormat
                            ? (type === 'import' ? '开始导入' : '开始导出')
                            : '请先选择格式'
                        }
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImportExportModal;