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
    const [archivedSpaces, setArchivedSpaces] = useState([]);
    const [currentSpace, setCurrentSpace] = useState('');
    const [dialogConfig, setDialogConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        detail: '',
        type: 'warning',
        buttons: [t('common.confirm'), t('common.cancel')],
        onConfirm: null
    });

    // 加载数据
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [spaces, current] = await Promise.all([
                    window.api.listSpaces(),
                    window.api.getCurrentSpace()
                ]);
                setArchivedSpaces(spaces);
                setCurrentSpace(current);
            } catch (err) {
                console.error('加载数据失败:', err);
            }
        };
        fetchData();
    }, []);

    const handleRestoreSpace = async (spaceName) => {
        setDialogConfig({
            isOpen: true,
            title: t('login.switchVaultTitle') || '切换密码本',
            message: t('login.switchVaultMessage') || `确认切换到密码本 [${spaceName.replace('archive_', '')}] 吗？当前工作空间将被自动存档。`,
            type: 'warning',
            buttons: [t('common.confirm'), t('common.cancel')],
            onConfirm: async (btnIdx) => {
                if (btnIdx === 0) {
                    try {
                        setIsLoading(true);
                        await window.api.restoreSpace(spaceName);
                    } catch (err) {
                        setError(err.message);
                        setIsLoading(false);
                        setDialogConfig(prev => ({ ...prev, isOpen: false }));
                    }
                } else {
                    setDialogConfig(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const handleDeleteSpace = async (spaceName) => {
        setDialogConfig({
            isOpen: true,
            title: t('common.delete') || '删除',
            message: `确定要永久删除密码本 [${spaceName.replace('archive_', '')}] 吗？`,
            detail: '此操作不可撤销，其中的所有密码数据将永久丢失。',
            type: 'error',
            buttons: [t('common.delete'), t('common.cancel')],
            onConfirm: async (btnIdx) => {
                if (btnIdx === 0) {
                    try {
                        await window.api.deleteSpace(spaceName);
                        // 刷新列表
                        const spaces = await window.api.listSpaces();
                        setArchivedSpaces(spaces);
                        setDialogConfig(prev => ({ ...prev, isOpen: false }));
                    } catch (err) {
                        setError(err.message);
                        setDialogConfig(prev => ({ ...prev, isOpen: false }));
                    }
                } else {
                    setDialogConfig(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const handleForgotPassword = () => {
        setDialogConfig({
            isOpen: true,
            title: t('login.forgotTitle') || '忘记主密码？',
            message: t('login.forgotMessage') || '我们将为你封存当前密码本，并引导你创建一个全新的密码本。以后想起了旧密码，随时可以切回来。',
            type: 'warning',
            buttons: [t('login.createNewVault') || '创建新密码本', t('common.cancel')],
            onConfirm: async (buttonIndex) => {
                if (buttonIndex === 0) {
                    try {
                        setIsLoading(true);
                        const result = await window.api.resetAllData('RESET ALL DATA');
                        if (result.success) {
                            window.location.reload();
                        } else {
                            setError(result.message);
                            setIsLoading(false);
                            setDialogConfig(prev => ({ ...prev, isOpen: false }));
                        }
                    } catch (error) {
                        setError(error.message);
                        setIsLoading(false);
                        setDialogConfig(prev => ({ ...prev, isOpen: false }));
                    }
                } else {
                    setDialogConfig(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

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
            const result = await window.api.login(password);
            if (result.success) {
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

    return (
        <>
            <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 overflow-hidden">
                <div className="flex flex-1 flex-col justify-center px-4 py-10 lg:px-6">
                    <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                        <h2 className="text-center text-xl font-semibold text-gray-900">
                            {t('login.welcomeBack')}
                        </h2>
                        {currentSpace && currentSpace !== 'default' && (
                            <p className="text-center text-[10px] text-blue-500 font-medium mt-1 mb-6">
                                📂 {t('login.currentVault') || '当前密码本'}: {currentSpace.replace('archive_', '')}
                            </p>
                        )}
                        {!currentSpace || currentSpace === 'default' ? <div className="mb-6"></div> : null}

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
                            
                            {archivedSpaces.length > 0 && (
                                <div className="mt-6 pt-6 border-t border-gray-100">
                                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                                        {t('login.archivedVaults') || '已封存的密码本'}
                                    </h3>
                                    <div className="space-y-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                                        {archivedSpaces.map(space => (
                                            <div key={space} className="flex items-center gap-2 group">
                                                <button
                                                    onClick={() => handleRestoreSpace(space)}
                                                    className="flex-1 text-left px-3 py-2 text-xs text-gray-600 bg-gray-50 hover:bg-gray-100 rounded border border-gray-100 transition-colors duration-200 flex items-center justify-between"
                                                >
                                                    <span>{space.replace('archive_', '')}</span>
                                                    <span className="text-[10px] text-gray-400 group-hover:text-blue-500 font-medium">
                                                        {t('login.open') || '打开'} →
                                                    </span>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteSpace(space)}
                                                    className="p-2 text-gray-400 hover:text-red-500 transition-colors duration-200"
                                                    title={t('common.delete')}
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mt-4">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleForgotPassword();
                                    }}
                                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors duration-200 hover:underline cursor-pointer"
                                >
                                    {t('login.havingTrouble') || '遇到问题？忘记密码了？'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

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
