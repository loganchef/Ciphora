import React, { useState, useMemo } from 'react';
import PasswordCard from './PasswordCard';
import SearchBox from './SearchBox';
import GroupTabs from './GroupTabs';
import GroupManageModal from './GroupManageModal';
import { useGroups } from '../hooks/useGroups';
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useMobile } from '../hooks/useMobile';
import { useTranslation } from 'react-i18next';

const MainVault = ({ passwords = [], isLoading = false, onAddPassword, onEditPassword, onDeletePassword, onRefresh, hideSensitiveButtons = false, settings = null }) => {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const { isMobile } = useMobile();
    const { groups, addGroup, updateGroup, deleteGroup } = useGroups();
    const [selectedGroupIds, setSelectedGroupIds] = useState([]); // [] = all
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    const filteredByGroup = passwords.filter(password => {
        if (selectedGroupIds.length === 0) return true;
        return selectedGroupIds.some(id => {
            if (id === 'ungrouped') return !password.groupId;
            return password.groupId === id;
        });
    });

    const filteredPasswords = filteredByGroup.filter(password =>
        (password.website?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (password.username?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (password.description?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (password.type?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    // 排序逻辑
    const sortedPasswords = useMemo(() => {
        const order = settings?.ui?.cardOrder || 'usage';
        return [...filteredPasswords].sort((a, b) => {
            switch (order) {
                case 'usage':
                    return (b.usageCount || 0) - (a.usageCount || 0);
                case 'createdAt':
                    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                case 'updatedAt':
                    return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
                case 'username':
                    return (a.username || '').localeCompare(b.username || '');
                default:
                    return 0;
            }
        });
    }, [filteredPasswords, settings?.ui?.cardOrder]);

    // 分页逻辑
    const paginationEnabled = settings?.ui?.pagination?.enabled || false;
    const pageSize = settings?.ui?.pagination?.pageSize || 20;
    
    const totalPages = Math.ceil(sortedPasswords.length / pageSize);
    const paginatedPasswords = useMemo(() => {
        if (!paginationEnabled) return sortedPasswords;
        const start = (currentPage - 1) * pageSize;
        return sortedPasswords.slice(start, start + pageSize);
    }, [sortedPasswords, paginationEnabled, currentPage, pageSize]);

    // 当搜索或过滤变化时重置页码
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedGroupIds]);

    const handleDelete = (password) => {
        if (confirm(t('vault.deleteConfirm', { website: password.website }))) {
            onDeletePassword(password.id);
        }
    };

    const renderPagination = () => {
        if (!paginationEnabled || totalPages <= 1) return null;

        return (
            <div className="flex items-center justify-center gap-2 mt-8 pb-12">
                <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg bg-white border border-gray-200 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                    <ChevronLeftIcon className="w-5 h-5" />
                </button>
                
                <div className="flex items-center gap-1">
                    {[...Array(totalPages)].map((_, i) => {
                        const page = i + 1;
                        // 只显示当前页附近的页码
                        if (totalPages > 7) {
                            if (page !== 1 && page !== totalPages && Math.abs(page - currentPage) > 1) {
                                if (page === 2 || page === totalPages - 1) {
                                    return <span key={page} className="px-1 text-gray-400">...</span>;
                                }
                                return null;
                            }
                        }
                        
                        return (
                            <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`w-10 h-10 rounded-lg border text-sm font-medium transition-all ${
                                    currentPage === page
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                        : 'bg-white border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600'
                                }`}
                            >
                                {page}
                            </button>
                        );
                    }).filter(Boolean)}
                </div>

                <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg bg-white border border-gray-200 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                    <ChevronRightIcon className="w-5 h-5" />
                </button>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col">
            {/* Toolbar: group tabs | search | buttons in one row */}
            <div className={`flex-shrink-0 ${isMobile ? 'p-3 safe-area-top' : 'p-4'}`}>
                <div className={`max-w-7xl mx-auto ${isMobile ? 'space-y-3' : 'flex items-center gap-3'}`}>
                    {/* Group tabs — occupy remaining space */}
                    {isMobile ? (
                        <GroupTabs
                            selectedGroupIds={selectedGroupIds}
                            onGroupFilterChange={setSelectedGroupIds}
                            groups={groups}
                            passwords={passwords}
                            onManageGroups={() => setShowGroupModal(true)}
                        />
                    ) : (
                        <div className="flex-1 min-w-0">
                            <GroupTabs
                                selectedGroupIds={selectedGroupIds}
                                onGroupFilterChange={setSelectedGroupIds}
                                groups={groups}
                                passwords={passwords}
                                onManageGroups={() => setShowGroupModal(true)}
                            />
                        </div>
                    )}

                    {/* Search + add — fixed width on right */}
                    {!isMobile && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="w-96">
                                <SearchBox value={searchQuery} onChange={setSearchQuery} />
                            </div>
                            <div
                                onClick={onAddPassword}
                                disabled={isLoading}
                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                                <PlusIcon className="w-4 h-4" />
                                <span>{isLoading ? t('common.loading') : t('common.add')}</span>
                            </div>
                        </div>
                    )}

                    {/* Mobile: Search + add */}
                    {isMobile && (
                        <div className="flex items-center gap-2">
                            <div className="flex-1">
                                <SearchBox value={searchQuery} onChange={setSearchQuery} />
                            </div>
                            <button
                                onClick={onAddPassword}
                                disabled={isLoading}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                                <PlusIcon className="w-4 h-4" />
                                <span>{isLoading ? t('common.loading') : t('common.add')}</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Scrollable card grid */}
            <div className="flex-1 overflow-y-auto swipe-container">
                <div className={`max-w-7xl mx-auto ${isMobile ? 'px-3 pt-2 pb-24' : 'px-4 sm:px-6 lg:px-8 pt-4 pb-24'}`}>
                    {isLoading ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-gray-600">{t('common.loading')}</p>
                        </div>
                    ) : paginatedPasswords.length > 0 ? (
                        <>
                            <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'}`}>
                                {paginatedPasswords.map((password) => (
                                    <div key={password.id} className="relative h-full">
                                        <PasswordCard
                                            password={password}
                                            onEdit={onEditPassword}
                                            onDelete={handleDelete}
                                            hideSensitiveButtons={hideSensitiveButtons}
                                        />
                                    </div>
                                ))}
                            </div>
                            {renderPagination()}
                        </>
                    ) : (
                        <div className="text-center py-12">
                            <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                                <PlusIcon className="w-12 h-12 text-gray-400" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-600 mb-2">
                                {searchQuery ? t('vault.noResults') : t('vault.noPasswords')}
                            </h3>
                            <p className="text-gray-500 mb-6">
                                {searchQuery ? t('vault.noResultsDesc') : t('vault.noPasswordsDesc')}
                            </p>
                            {!searchQuery && (
                                <button
                                    onClick={onAddPassword}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                    <span>{t('vault.addFirstPassword')}</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

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
