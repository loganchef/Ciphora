import React, { useState, useEffect } from 'react';
import { EyeIcon, EyeSlashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import CustomDialog from './CustomDialog';
import { useTranslation } from 'react-i18next';

const LoginView = ({ onSuccess }) => {
    const { t } = useTranslation();
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [dialogConfig, setDialogConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        detail: '',
        type: 'warning',
        buttons: [t('common.confirm'), t('common.cancel')],
        onConfirm: null
    });

    // Update buttons when language changes
    useEffect(() => {
        setDialogConfig(prev => ({
            ...prev,
            buttons: prev.buttons.length === 2 ? [t('common.confirm'), t('common.cancel')] : prev.buttons
        }));
    }, [t]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password.length === 0) {
            setError(t('login.enterPassword'));
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
                setError(result.message || t('login.loginFailed'));
                setIsLoading(false);
            }
        } catch (error) {
            console.error('登录失败:', error);
            setError(t('login.loginError'));
            setIsLoading(false);
        }
    };

    const handleForgotPassword = () => {
        console.log('忘记密码按钮被点击');

        setDialogConfig({
            isOpen: true,
            title: t('login.forgotTitle'),
            message: t('login.forgotMessage'),
            detail: t('login.forgotDetail'),
            type: 'warning',
            buttons: [t('common.continue'), t('common.cancel')],
            onConfirm: (buttonIndex) => {
                if (buttonIndex === 0) {
                    // 用户点击了"继续"，显示第二次确认
                    setDialogConfig({
                        isOpen: true,
                        title: t('login.resetConfirmTitle'),
                        message: t('login.resetConfirmMessage'),
                        detail: t('login.resetConfirmDetail'),
                        type: 'error',
                        buttons: [t('login.confirmReset'), t('common.cancel')],
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
                                            title: t('login.resetSuccessTitle'),
                                            message: t('login.resetSuccessMessage'),
                                            detail: t('login.resetSuccessDetail'),
                                            type: 'success',
                                            buttons: [t('common.confirm')],
                                            onConfirm: () => {
                                                setDialogConfig(prev => ({ ...prev, isOpen: false }));
                                                // 重新加载页面，让用户重新设置
                                                window.location.reload();
                                            }
                                        });
                                    } else {
                                        setDialogConfig({
                                            isOpen: true,
                                            title: t('login.resetFailedTitle'),
                                            message: t('login.resetFailedMessage'),
                                            detail: result.message,
                                            type: 'error',
                                            buttons: [t('common.confirm')],
                                            onConfirm: () => setDialogConfig(prev => ({ ...prev, isOpen: false }))
                                        });
                                    }
                                } catch (error) {
                                    console.error('重置数据失败:', error);
                                    setDialogConfig({
                                        isOpen: true,
                                        title: t('common.error'),
                                        message: t('login.resetError'),
                                        detail: error.message,
                                        type: 'error',
                                        buttons: [t('common.confirm')],
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
                            {t('login.welcomeBack')}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="loginPassword" className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('setup.masterPassword')}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        id="loginPassword"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm transition-all duration-200"
                                        placeholder={t('setup.masterPasswordPlaceholder')}
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
                                        <span>{t('login.verifying')}</span>
                                    </div>
                                ) : (
                                    <span>{t('login.unlockVault')}</span>
                                )}
                            </button>
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-xs text-gray-500">
                                {t('setup.tagline')}
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
                                    title={t('login.forgotPasswordHint')}
                                >
                                    {t('login.havingTrouble')}
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