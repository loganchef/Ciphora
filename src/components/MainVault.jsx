import React, { useState } from 'react';
import PasswordCard from './PasswordCard';
import SearchBox from './SearchBox';
import {
    PlusIcon,
    ArrowUpTrayIcon,
    ArrowDownTrayIcon,
    TrashIcon,
} from '@heroicons/react/24/outline';
import { useMobile } from '../hooks/useMobile';

const MainVault = ({ passwords = [], isLoading = false, onAddPassword, onEditPassword, onDeletePassword, hideSensitiveButtons = false }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const { isMobile } = useMobile();

    const filteredPasswords = passwords.filter(password =>
        (password.website?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (password.username?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (password.description?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (password.type?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    const handleDelete = (password) => {
        if (confirm(`确定要删除 "${password.website}" 的记录吗？此操作无法撤销。`)) {
            onDeletePassword(password.id);
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Fixed Header with Search */}
            <div className={`flex-shrink-0 ${isMobile ? 'p-3 safe-area-top' : 'p-4'}`}>
                <div className={`max-w-7xl mx-auto flex ${isMobile ? 'flex-col gap-3' : 'justify-end items-center'}`}>
                    <div className={`flex ${isMobile ? 'w-full gap-2' : 'items-center'}`}>
                        <div className={isMobile ? 'flex-1' : ''}>
                            <SearchBox
                                value={searchQuery}
                                onChange={setSearchQuery}
                            />
                        </div>
                        <button
                            onClick={onAddPassword}
                            disabled={isLoading}
                            className={`inline-flex items-center gap-2 ${isMobile ? 'px-4 py-3 flex-1 justify-center' : 'px-3 py-2 ml-4'} bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            <PlusIcon className="w-5 h-5" />
                            <span>{isLoading ? '加载中...' : '添加'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto swipe-container">
                <div className={`max-w-7xl mx-auto ${isMobile ? 'px-3 pt-4 pb-24' : 'px-4 sm:px-6 lg:px-8 pt-6 pb-24'}`}>
                    {isLoading ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-gray-600">加载中...</p>
                        </div>
                    ) : filteredPasswords.length > 0 ? (
                        <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'}`}>
                            {filteredPasswords.map((password) => (
                                <PasswordCard
                                    key={password.id}
                                    password={password}
                                    onEdit={onEditPassword}
                                    onDelete={handleDelete}
                                    hideSensitiveButtons={hideSensitiveButtons}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                                <PlusIcon className="w-12 h-12 text-gray-400" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-600 mb-2">
                                {searchQuery ? '没有找到匹配的密码' : '还没有保存任何密码'}
                            </h3>
                            <p className="text-gray-500 mb-6">
                                {searchQuery ? '尝试使用不同的搜索关键词' : '点击"添加密码"按钮开始创建您的第一个密码条目'}
                            </p>
                            {!searchQuery && (
                                <button
                                    onClick={onAddPassword}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                    <span>添加第一个密码</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MainVault; 