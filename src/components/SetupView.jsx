import React, { useState } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const SetupView = ({ onComplete }) => {
    const [masterPassword, setMasterPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (masterPassword !== confirmPassword) {
            setError('两次输入的密码不一致');
            return;
        }

        if (masterPassword.length < 1) {
            setError('密码长度不能为空');
            return;
        }

        setIsLoading(true);

        try {
            // 调用后端初始化API
            const result = await window.api.initialize(masterPassword);

            if (result.success) {
                // 保存主密码到全局变量（用于后续 API 调用）
                window.__masterPassword = masterPassword;
                setIsLoading(false);
                onComplete();
            } else {
                setError(result.message || '初始化失败');
                setIsLoading(false);
            }
        } catch (error) {
            console.error('初始化失败:', error);
            setError('初始化过程中发生错误');
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 overflow-hidden">
            <div className="flex flex-1 flex-col justify-center px-4 py-10 lg:px-6">
                <div className="sm:mx-auto sm:w-full sm:max-w-sm">

                    <h2 className="text-center text-xl font-semibold text-gray-900 mb-6">
                        设置主密码
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="masterPassword" className="block text-sm font-medium text-gray-700 mb-2">
                                主密码
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="masterPassword"
                                    value={masterPassword}
                                    onChange={(e) => setMasterPassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm transition-all duration-200"
                                    placeholder="输入您的主密码"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                                >
                                    {showPassword ? (
                                        <EyeSlashIcon className="w-4 h-4" />
                                    ) : (
                                        <EyeIcon className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                                确认密码
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    id="confirmPassword"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm transition-all duration-200"
                                    placeholder="再次输入您的主密码"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                                >
                                    {showConfirmPassword ? (
                                        <EyeSlashIcon className="w-4 h-4" />
                                    ) : (
                                        <EyeIcon className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-md">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading || masterPassword !== confirmPassword || masterPassword.length < 1}
                            className="mt-6 w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>初始化中...</span>
                                </div>
                            ) : (
                                <span>开始使用</span>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-xs text-gray-500">
                            离线存储 • 端到端加密 • 边缘安全 • 隐私优先
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SetupView; 