import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const ConfirmInputModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    placeholder = "请输入确认文本",
    confirmText = "确认",
    requiredText = null
}) => {
    const [inputValue, setInputValue] = useState('');

    const handleConfirm = () => {
        if (requiredText && inputValue !== requiredText) {
            alert(`请输入 "${requiredText}" 来确认操作`);
            return;
        }
        if (inputValue.trim()) {
            onConfirm(inputValue);
            setInputValue('');
            onClose();
        }
    };

    const handleCancel = () => {
        setInputValue('');
        onClose();
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleConfirm();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fade-in safe-area-top safe-area-bottom">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                            {title || '⚠️ 确认操作'}
                        </h2>
                        {message && (
                            <p className="text-sm text-gray-500 mt-1 whitespace-pre-line">
                                {message}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={handleCancel}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {requiredText ? `请输入 "${requiredText}" 来确认操作` : '确认文本'}
                            </label>
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder={placeholder}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors placeholder:text-gray-400 placeholder:opacity-100"
                                autoFocus
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                    <button
                        onClick={handleCancel}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!inputValue.trim()}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmInputModal;