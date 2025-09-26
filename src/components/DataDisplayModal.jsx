import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import CopyButton from './CopyButton';

const DataDisplayModal = ({ isOpen, onClose, title, data, type = 'text' }) => {
    const [decodedData, setDecodedData] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && data) {
            setError('');
            setDecodedData('');

            if (type === 'base64') {
                try {
                    const decoded = atob(data);
                    setDecodedData(decoded);
                } catch (err) {
                    setError('Base64解码失败: ' + err.message);
                }
            } else if (type === 'json') {
                try {
                    const parsed = JSON.parse(data);
                    const formatted = JSON.stringify(parsed, null, 2);
                    setDecodedData(formatted);
                } catch (err) {
                    setError('JSON格式化失败: ' + err.message);
                }
            }
        }
    }, [isOpen, data, type]);

    if (!isOpen) return null;

    const modalContent = (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4" style={{ zIndex: 999999 }}>
            {/* 背景遮罩 */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* 模态框 */}
            <div className="relative bg-white rounded-lg shadow-xl border border-gray-200 max-w-xl w-full max-h-[70vh] flex flex-col" style={{ zIndex: 1000000 }}>
                {/* 头部 */}
                <div className="flex items-center justify-between p-3 border-b border-gray-200">
                    <h3 className="text-base font-semibold text-gray-900">
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                    >
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                </div>

                {/* 内容 */}
                <div className="flex-1 p-3 overflow-hidden">
                    {error ? (
                        <div className="bg-red-50 border border-red-200 rounded p-3">
                            <p className="text-red-700 text-sm">{error}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* 解码/格式化后的数据 */}
                            {decodedData && (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-gray-700">
                                            {type === 'base64' ? '解码结果' : '格式化结果'}
                                        </span>
                                        <CopyButton text={decodedData} label="复制" />
                                    </div>
                                    <div className="bg-gray-50 rounded border border-gray-200 p-3 max-h-48 overflow-y-auto">
                                        <pre className="text-sm font-mono whitespace-pre-wrap break-words">
                                            {decodedData}
                                        </pre>
                                    </div>
                                </div>
                            )}

                            {/* 原始数据 */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-500">原始数据</span>
                                    <CopyButton text={data} label="复制原始" />
                                </div>
                                <div className="bg-gray-100 rounded border border-gray-200 p-3 max-h-20 overflow-y-auto">
                                    <pre className="text-xs font-mono whitespace-pre-wrap break-words text-gray-600">
                                        {data}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 底部按钮 */}
                <div className="flex justify-end p-3 border-t border-gray-200">
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors"
                    >
                        关闭
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default DataDisplayModal;