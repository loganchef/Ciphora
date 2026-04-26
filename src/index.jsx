import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App';
import './input.css';
import './api/tauri-api';
import i18n from './i18n';

// 添加一些调试信息
console.log('React app starting...');

// 修复在部分系统下无法删除字符的问题
window.addEventListener('keydown', (e) => {
    const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable;
    if (isInput && (e.key === 'Backspace' || e.key === 'Delete')) {
        // 强制停止冒泡和同级监听器，确保事件留在输入框内
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    }
}, true); // 使用捕获阶段优先处理

const renderApp = async () => {
    // 尝试获取系统语言并初始化 i18n
    try {
        if (window.api && window.api.getSystemLocale) {
            const locale = await window.api.getSystemLocale();
            console.log('System locale detected:', locale);
            if (locale) {
                // 如果本地存储没有设置语言，则使用系统语言
                if (!localStorage.getItem('i18nextLng')) {
                    await i18n.changeLanguage(locale);
                }
            }
        }
    } catch (error) {
        console.error('Failed to initialize language from system:', error);
    }

    const root = ReactDOM.createRoot(document.getElementById('app'));
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
};

renderApp(); 