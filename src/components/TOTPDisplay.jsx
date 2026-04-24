import React, { useState, useEffect } from 'react';
import { KeyIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import CopyButton from './CopyButton';

const TOTPDisplay = ({ secret, issuer = 'Ciphora', accountName = 'Account' }) => {
    const [totp, setTotp] = useState('');
    const [nextTotp, setNextTotp] = useState('');
    const [timeLeft, setTimeLeft] = useState(30);
    const [isLoading, setIsLoading] = useState(true);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    // 生成 TOTP 码的函数
    const generateTOTP = async (secret) => {
        try {
            // 调用后端的 TOTP 生成函数
            if (window.api && window.api.generateTOTP) {
                const result = await window.api.generateTOTP(secret);
                if (result.success) {
                    setTotp(result.totp);
                } else {
                    setTotp('ERROR');
                }
            } else {
                // 如果后端 API 不可用，显示错误
                setTotp('API_ERROR');
            }
            setIsLoading(false);
        } catch (error) {
            console.error('生成 TOTP 失败:', error);
            setTotp('ERROR');
            setIsLoading(false);
        }
    };

    // 生成下一组 TOTP 码的函数
    const generateNextTOTP = async (secret) => {
        try {
            // 调用后端的下一组 TOTP 生成函数
            if (window.api && window.api.generateNextTOTP) {
                const result = await window.api.generateNextTOTP(secret);
                if (result.success) {
                    setNextTotp(result.totp);
                } else {
                    setNextTotp('ERROR');
                }
            } else {
                setNextTotp('API_ERROR');
            }
        } catch (error) {
            console.error('生成下一组 TOTP 失败:', error);
            setNextTotp('ERROR');
        }
    };

    // 计算当前时间步长和剩余时间
    const getTimeInfo = () => {
        const now = Math.floor(Date.now() / 1000);
        const timeStep = Math.floor(now / 30);
        const timeInStep = now % 30;
        const timeLeft = 30 - timeInStep;
        return { timeStep, timeLeft };
    };

    // 倒计时效果
    useEffect(() => {
        if (!secret) return;

        let lastTimeStep = -1;

        // 初始化时间信息
        const { timeLeft, timeStep } = getTimeInfo();
        setTimeLeft(timeLeft);
        lastTimeStep = timeStep;

        // 初始生成 TOTP
        generateTOTP(secret);
        generateNextTOTP(secret);

        // 设置倒计时，每 100ms 更新一次以确保精确同步
        const timer = setInterval(() => {
            const { timeLeft, timeStep } = getTimeInfo();
            setTimeLeft(timeLeft);

            // 如果时间步长发生变化，重新生成 TOTP
            if (timeStep !== lastTimeStep) {
                lastTimeStep = timeStep;
                generateTOTP(secret);
                generateNextTOTP(secret);
            }
        }, 100);

        return () => clearInterval(timer);
    }, [secret]);

    // 复制 TOTP 码
    const copyTOTP = async () => {
        try {
            await navigator.clipboard.writeText(totp);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error('复制失败:', err);
        }
    };

    if (!secret) {
        return (
            <div className="text-center py-4 text-gray-500">
                未配置 MFA 密钥
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">MFA密钥</label>
                <div className="flex items-center gap-2 w-full">
                    {/* <div className="flex-1 bg-gray-50 px-3 py-2 rounded-xl font-mono text-sm border border-gray-200">
                            {secret}
                        </div>
                        <button
                            onClick={() => navigator.clipboard.writeText(secret)}
                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-all duration-200 border border-gray-200"
                        >
                            复制密钥
                        </button> */}
                    {/* <div className="flex items-center gap-2 text-sm text-gray-600">
                        <KeyIcon className="w-4 h-4" />
                        <span>MFA密钥</span>
                    </div> */}
                    <div className="flex-1 bg-gray-50 px-4 py-3 rounded-xl font-mono text-sm border border-gray-200 flex items-center justify-between">
                        <span className={isPasswordVisible ? '' : 'select-none'}>
                            {isPasswordVisible ? secret : '••••••••••••••••'}
                        </span>
                        <button
                            onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            {isPasswordVisible ? (
                                <EyeSlashIcon className="w-4 h-4" />
                            ) : (
                                <EyeIcon className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                    <CopyButton text={secret} label=" 复制密钥" />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">当前验证码</label>
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div
                            className={`font-mono flex-col items-start justify-start gap-1 text-3xl font-bold tracking-wider cursor-pointer transition-all duration-200 select-none ${isCopied
                                ? 'text-green-600 transform scale-105'
                                : 'text-gray-800 hover:text-blue-600 hover:scale-105'
                                }`}
                            onClick={copyTOTP}
                            title="点击复制验证码"
                        >
                            {isLoading ? '...' : totp}
                            {/* 下一组验证码预告 */}
                            {nextTotp && (
                                <div className="text-left">
                                    <div className="font-mono text-sm text-gray-400 select-none">
                                        {nextTotp}<span className="text-xs text-gray-400">({timeLeft}s)</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 复制按钮 */}
                        <CopyButton text={totp} label=" 复制" />
                    </div>



                    {/* 倒计时 */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1">
                            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                <div
                                    className="h-2 rounded-full transition-all duration-1000 ease-out"
                                    style={{
                                        width: `${(timeLeft / 30) * 100}%`,
                                        background: `linear-gradient(to right, 
                                            ${timeLeft > 20 ? '#10b981' : timeLeft > 10 ? '#f59e0b' : '#ef4444'}, 
                                            ${timeLeft > 20 ? '#3b82f6' : timeLeft > 10 ? '#f97316' : '#ec4899'}
                                        )`
                                    }}
                                />
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-sm font-medium text-gray-700">
                                {timeLeft}s
                            </span>
                        </div>
                    </div>
                </div>
            </div >

            <div className="text-xs text-gray-500 text-center bg-gray-50 rounded-lg p-2">
                <div className="font-medium">验证码每 30 秒更新一次</div>
                <div className="text-gray-400 text-xs">
                    {issuer !== 'Ciphora' || accountName !== 'Account'
                        ? `适用于 ${issuer} - ${accountName}`
                        : '请确保时间同步准确'
                    }
                </div>
            </div>
        </div >
    );
};

export default TOTPDisplay; 