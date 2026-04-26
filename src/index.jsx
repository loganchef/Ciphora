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

const renderApp = () => {
    const root = ReactDOM.createRoot(document.getElementById('app'));
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );

    // 异步获取语言，不阻塞首屏渲染
    if (window.api && window.api.getSystemLocale) {
        window.api.getSystemLocale().then(locale => {
            console.log('System locale detected:', locale);
            if (locale && !localStorage.getItem('i18nextLng')) {
                i18n.changeLanguage(locale);
            }
        }).catch(err => console.error('Failed to get locale:', err));
    }
};

renderApp(); 