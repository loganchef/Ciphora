import React, { useState } from 'react';
import PasswordCard from './PasswordCard';
import SearchBox from './SearchBox';
import GroupTabs from './GroupTabs';
import GroupManageModal from './GroupManageModal';
import { useGroups } from '../hooks/useGroups';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useMobile } from '../hooks/useMobile';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';

const MainVault = ({ passwords = [], isLoading = false, onAddPassword, onEditPassword, onDeletePassword, onRefresh, hideSensitiveButtons = false }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const { isMobile } = useMobile();
    const { groups, currentGroupId, setCurrentGroupId, addGroup, updateGroup, deleteGroup } = useGroups();
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);

    const filteredByGroup = passwords.filter(password => {
        if (currentGroupId === 'all') return true;
        if (currentGroupId === 'ungrouped') return !password.groupId;
        return password.groupId === currentGroupId;
    });

    const filteredPasswords = filteredByGroup.filter(password =>
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

    const handleBatchMove = async (targetGroupId) => {
        try {
            await window.api.movePasswordsToGroup(selectedIds, targetGroupId === 'ungrouped' ? null : targetGroupId);
            setSelectionMode(false);
            setSelectedIds([]);
            if (onRefresh) await onRefresh();
        } catch (error) {
            alert('批量移动失败: ' + error.message);
        }
    };

    const toggleSelection = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    return (
        <div className="h-full flex flex-col">
            {/* Toolbar: group tabs | search | add button */}
            <div className={`flex-shrink-0 ${isMobile ? 'p-3 safe-area-top' : 'p-4'}`}>
                <div className={`max-w-7xl mx-auto ${isMobile ? 'space-y-3' : 'grid grid-cols-[1fr_auto] gap-3 items-center'}`}>
                    {/* Group tabs — scroll horizontally if too many */}
                    <div className="overflow-x-auto">
                        <GroupTabs
                            currentGroupId={currentGroupId}
                            onGroupChange={setCurrentGroupId}
                            groups={groups}
                            passwords={passwords}
                            onManageGroups={() => setShowGroupModal(true)}
                        />
                    </div>

                    {/* Search + multi-select toggle + add */}
                    <div className={`flex items-center gap-2 ${isMobile ? 'w-full' : ''}`}>
                        <div className={isMobile ? 'flex-1' : 'w-56'}>
                            <SearchBox value={searchQuery} onChange={setSearchQuery} />
                        </div>
                        {!isMobile && (
                            <button
                                onClick={() => { setSelectionMode(!selectionMode); setSelectedIds([]); }}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                                    selectionMode
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                {selectionMode ? '取消' : '多选'}
                            </button>
                        )}
                        <button
                            onClick={onAddPassword}
                            disabled={isLoading}
                            className={`inline-flex items-center gap-1.5 ${isMobile ? 'px-4 py-2 flex-1 justify-center' : 'px-3 py-2'} bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap`}
                        >
                            <PlusIcon className="w-4 h-4" />
                            <span>{isLoading ? '加载中...' : '添加'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Scrollable card grid */}
            <div className="flex-1 overflow-y-auto swipe-container">
                <div className={`max-w-7xl mx-auto ${isMobile ? 'px-3 pt-2 pb-24' : 'px-4 sm:px-6 lg:px-8 pt-4 pb-24'}`}>
                    {isLoading ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-gray-600">加载中...</p>
                        </div>
                    ) : filteredPasswords.length > 0 ? (
                        <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'}`}>
                            {filteredPasswords.map((password) => (
                                <div key={password.id} className="relative">
                                    {selectionMode && (
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(password.id)}
                                            onChange={() => toggleSelection(password.id)}
                                            className="absolute top-2 left-2 z-10 w-5 h-5 cursor-pointer"
                                        />
                                    )}
                                    <PasswordCard
                                        password={password}
                                        onEdit={onEditPassword}
                                        onDelete={handleDelete}
                                        hideSensitiveButtons={hideSensitiveButtons}
                                    />
                                </div>
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

            {/* Batch move toolbar — docked at bottom when active */}
            {selectionMode && selectedIds.length > 0 && (
                <div className="flex-shrink-0 bg-white border-t shadow-lg px-4 py-3">
                    <div className="flex items-center justify-between max-w-7xl mx-auto">
                        <span className="text-sm text-gray-600">{selectedIds.length} 项已选择</span>
                        <div className="flex gap-2">
                            <Select onValueChange={handleBatchMove}>
                                <SelectTrigger className="w-40">
                                    <SelectValue placeholder="移动到..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ungrouped">📂 未分组</SelectItem>
                                    {groups.map(group => (
                                        <SelectItem key={group.id} value={group.id}>
                                            {group.icon} {group.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <button
                                onClick={() => { setSelectionMode(false); setSelectedIds([]); }}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                            >
                                取消
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <GroupManageModal
                isOpen={showGroupModal}
                onClose={() => setShowGroupModal(false)}
                groups={groups}
                onAdd={addGroup}
                onUpdate={updateGroup}
                onDelete={deleteGroup}
            />
        </div>
    );
};

export default MainVault;
