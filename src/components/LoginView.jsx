import React, { useState } from 'react';
import { EyeIcon, EyeSlashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import CustomDialog from './CustomDialog';

const LoginView = ({ onSuccess }) => {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [dialogConfig, setDialogConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        detail: '',
        type: 'warning',
        buttons: ['确定', '取消'],
        onConfirm: null
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password.length === 0) {
            setError('请输入主密码');
            return;
        }

        setIsLoading(true);

        try {
            // 调用后端登录API
            const result = await window.api.login(password);

            if (result.success) {
                // 保存主密码到全局变量（用于后续 API 调用）
                window.__masterPassword = password;
                setIsLoading(false);
                onSuccess();
            } else {
                setError(result.message || '登录失败');
                setIsLoading(false);
            }
        } catch (error) {
            console.error('登录失败:', error);
            setError('登录过程中发生错误');
            setIsLoading(false);
        }
    };

    const handleForgotPassword = () => {
        console.log('忘记密码按钮被点击');

        setDialogConfig({
            isOpen: true,
            title: '忘记主密码解决方案',
            message: '如果您忘记了主密码，可以重置所有数据重新开始',
            detail: '此操作将：\n• 永久删除所有密码数据\n• 清除所有设置\n• 重置应用状态\n\n此操作无法撤销！\n\n请确认您要继续此操作。',
            type: 'warning',
            buttons: ['继续', '取消'],
            onConfirm: (buttonIndex) => {
                if (buttonIndex === 0) {
                    // 用户点击了"继续"，显示第二次确认
                    setDialogConfig({
                        isOpen: true,
                        title: '最后确认',
                        message: '您确定要重置所有数据吗？',
                        detail: '这将清除所有密码和设置，无法恢复！\n\n点击"确定重置"继续，点击"取消"中止操作。',
                        type: 'error',
                        buttons: ['确定重置', '取消'],
                        onConfirm: async (buttonIndex) => {
                            if (buttonIndex === 0) {
                                // 执行重置
                                try {
                                    console.log('开始调用重置API...');
                                    const result = await window.api.resetAllData('RESET ALL DATA');
                                    console.log('重置API返回结果:', result);

                                    if (result.success) {
                                        // 显示成功对话框
                                        setDialogConfig({
                                            isOpen: true,
                                            title: '重置完成',
                                            message: '所有数据已重置！',
                                            detail: '应用将重新启动，请重新设置主密码。',
                                            type: 'success',
                                            buttons: ['确定'],
                                            onConfirm: () => {
                                                setDialogConfig(prev => ({ ...prev, isOpen: false }));
                                                // 重新加载页面，让用户重新设置
                                                window.location.reload();
                                            }
                                        });
                                    } else {
                                        setDialogConfig({
                                            isOpen: true,
                                            title: '重置失败',
                                            message: '重置数据失败',
                                            detail: result.message,
                                            type: 'error',
                                            buttons: ['确定'],
                                            onConfirm: () => setDialogConfig(prev => ({ ...prev, isOpen: false }))
                                        });
                                    }
                                } catch (error) {
                                    console.error('重置数据失败:', error);
                                    setDialogConfig({
                                        isOpen: true,
                                        title: '错误',
                                        message: '重置数据过程中发生错误',
                                        detail: error.message,
                                        type: 'error',
                                        buttons: ['确定'],
                                        onConfirm: () => setDialogConfig(prev => ({ ...prev, isOpen: false }))
                                    });
                                }
                            } else {
                                setDialogConfig(prev => ({ ...prev, isOpen: false }));
                            }
                        }
                    });
                } else {
                    setDialogConfig(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    return (
        <>
            <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 overflow-hidden">
                <div className="flex flex-1 flex-col justify-center px-4 py-10 lg:px-6">
                    <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                        <h2 className="text-center text-xl font-semibold text-gray-900 mb-6">
                            欢迎回来
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="loginPassword" className="block text-sm font-medium text-gray-700 mb-2">
                                    主密码
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        id="loginPassword"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm transition-all duration-200"
                                        placeholder="输入您的主密码"
                                        autoFocus
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

                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-md">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="mt-6 w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>验证中...</span>
                                    </div>
                                ) : (
                                    <span>解锁保险库</span>
                                )}
                            </button>
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-xs text-gray-500">
                                离线存储 • 端到端加密 • 边缘安全 • 隐私优先
                            </p>
                            <div className="mt-2">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        console.log('按钮被点击了！');
                                        handleForgotPassword();
                                    }}
                                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors duration-200 hover:underline cursor-pointer"
                                    title="忘记主密码？"
                                >
                                    遇到问题？
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 自定义对话框 */}
            <CustomDialog
                isOpen={dialogConfig.isOpen}
                onClose={() => setDialogConfig(prev => ({ ...prev, isOpen: false }))}
                title={dialogConfig.title}
                message={dialogConfig.message}
                detail={dialogConfig.detail}
                type={dialogConfig.type}
                buttons={dialogConfig.buttons}
                onButtonClick={dialogConfig.onConfirm}
            />
        </>
    );
};

export default LoginView; 