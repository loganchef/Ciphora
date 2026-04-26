import React, { useState } from 'react';
import {
    CogIcon,
    ShieldCheckIcon,
    HomeIcon,
} from '@heroicons/react/24/outline';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { useMobile } from '../hooks/useMobile';
import { useTranslation } from 'react-i18next';

const Header = ({ onLogout, currentView = 'main', onViewChange }) => {
    const { t } = useTranslation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { isMobile } = useMobile();

    const handleTabChange = (newValue) => {
        if (newValue === 'vault') {
            onViewChange('main');
        } else if (newValue === 'dashboard') {
            onViewChange('dashboard');
        } else if (newValue === 'settings') {
            onViewChange('settings');
        }
    };

    return (
        <header className="top-0 z-40 desktop-only border-b border-transparent bg-transparent">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col">
                    {/* Top Row - Logo and User Actions */}
                    <div className="flex justify-between items-center h-16">
                        {/* Left side - Logo and Back button */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3">
                                <img src="/res/logo.png" alt="Ciphora" className="w-10 h-10 rounded-lg" />
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ciphora</h1>
                            </div>
                        </div>
                        {/* Navigation Row - Tabs (桌面端) */}
                        {!isMobile && (
                            <div className="flex justify-center py-4">
                                <Tabs
                                    defaultValue={currentView === 'main' ? 'vault' : currentView === 'dashboard' ? 'dashboard' : 'settings'}
                                    className="text-sm text-gray-600"
                                    onChange={handleTabChange}
                                >
                                    <TabsList variant="line" className="w-auto grid grid-cols-3 gap-6 border-none">
                                        <TabsTrigger tabValue="vault" className="mx-1">
                                            <HomeIcon className="w-4 h-4 mr-2" />
                                            {t('header.vault')}
                                        </TabsTrigger>
                                        <TabsTrigger tabValue="dashboard" className="mx-1">
                                            <ShieldCheckIcon className="w-4 h-4 mr-2" />
                                            {t('header.dashboard')}
                                        </TabsTrigger>
                                        <TabsTrigger tabValue="settings" className="mx-1">
                                            <CogIcon className="w-4 h-4 mr-2" />
                                            {t('settings.title')}
                                        </TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>
                        )}

                        {/* Right side - User menu and Logout */}
                        <div className="flex items-center gap-4">
                            {/* Logout button */}
                            <button
                                onClick={onLogout}
                                className="flex items-center gap-1 px-3 py-2 bg-white hover:bg-gray-100 rounded-lg transition-all duration-200 text-gray-700"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                    <polyline points="16 17 21 12 16 7"></polyline>
                                    <line x1="21" y1="12" x2="9" y2="12"></line>
                                </svg>
                                <span className="hidden sm:block text-sm font-medium">{t('header.logout')}</span>
                            </button>
                        </div>
                    </div>


                </div>
            </div>
        </header>
    );
};

export default Header;