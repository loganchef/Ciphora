import React, { useState } from 'react';
import { XMarkIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const PasswordInputModal = ({ isOpen, onClose, onConfirm, title, message, placeholder = "请输入密码" }) => {
    const [password, setPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const handleConfirm = () => {
        if (password.trim()) {
            onConfirm(password);
            setPassword('');
            onClose();
        }
    };

    const handleCancel = () => {
        setPassword('');
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
                            {title || '🔐 密码输入'}
                        </h2>
                        {message && (
                            <p className="text-sm text-gray-500 mt-1">
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
                                密码
                            </label>
                            <div className="relative">
                                <input
                                    type={isPasswordVisible ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder={placeholder}
                                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {isPasswordVisible ? (
                                        <EyeSlashIcon className="w-5 h-5" />
                                    ) : (
                                        <EyeIcon className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
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
                        disabled={!password.trim()}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        确认
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PasswordInputModal;