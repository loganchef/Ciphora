import React from 'react';
import { XMarkIcon, ExclamationTriangleIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

const CustomDialog = ({
    isOpen,
    onClose,
    title,
    message,
    detail,
    type = 'warning', // warning, success, error, info
    buttons = ['确定', '取消'],
    onButtonClick
}) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircleIcon className="w-8 h-8 text-green-500" />;
            case 'error':
                return <XCircleIcon className="w-8 h-8 text-red-500" />;
            case 'warning':
                return <ExclamationTriangleIcon className="w-8 h-8 text-orange-500" />;
            default:
                return <ExclamationTriangleIcon className="w-8 h-8 text-blue-500" />;
        }
    };

    const getButtonStyles = (index) => {
        const isPrimary = index === 0;
        const isDanger = type === 'error' || (type === 'warning' && index === 0);

        if (isDanger) {
            return isPrimary
                ? "bg-red-500 hover:bg-red-600 text-white shadow-sm"
                : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200";
        }

        if (isPrimary) {
            return "bg-blue-500 hover:bg-blue-600 text-white shadow-sm";
        }

        return "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200";
    };

    return (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4" style={{ zIndex: 999999 }}>
            {/* 极轻量背景遮罩 */}
            <div
                className="absolute inset-0 bg-gray-100/30 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* 对话框 */}
            <div className="relative bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200/50 max-w-md w-full transform transition-all duration-300 scale-100 animate-fade-in">
                {/* 头部 */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        {getIcon()}
                        <h3 className="text-lg font-semibold text-gray-900">
                            {title}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* 内容 */}
                <div className="p-6">
                    <p className="text-gray-700 mb-4 select-text">
                        {message}
                    </p>
                    {detail && (
                        <div className="bg-gray-50/50 rounded-lg p-4 mb-6 border border-gray-100">
                            <pre className="text-sm text-gray-600 whitespace-pre-wrap font-sans select-text">
                                {detail}
                            </pre>
                        </div>
                    )}
                </div>

                {/* 按钮 */}
                <div className="flex gap-3 p-6 pt-0">
                    {buttons.map((button, index) => (
                        <button
                            key={index}
                            onClick={() => onButtonClick(index)}
                            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${getButtonStyles(index)}`}
                        >
                            {button}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CustomDialog;