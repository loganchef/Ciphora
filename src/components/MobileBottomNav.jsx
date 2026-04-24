import React from 'react';
import {
  HomeIcon,
  ShieldCheckIcon,
  CogIcon,
  QrCodeIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  ShieldCheckIcon as ShieldCheckIconSolid,
  CogIcon as CogIconSolid,
} from '@heroicons/react/24/solid';

export default function MobileBottomNav({ currentView, onViewChange, onShowCimbar }) {
  const navItems = [
    {
      id: 'main',
      label: '保险库',
      icon: HomeIcon,
      iconSolid: HomeIconSolid,
      view: 'main',
    },
    {
      id: 'dashboard',
      label: '操作面板',
      icon: ShieldCheckIcon,
      iconSolid: ShieldCheckIconSolid,
      view: 'dashboard',
    },
    {
      id: 'cimbar',
      label: '数据传输',
      icon: QrCodeIcon,
      iconSolid: QrCodeIcon,
      view: null,
      action: onShowCimbar,
    },
    {
      id: 'settings',
      label: '设置',
      icon: CogIcon,
      iconSolid: CogIconSolid,
      view: 'settings',
    },
  ];

  return (
    <nav className="mobile-only bottom-nav safe-area-bottom">
      {navItems.map((item) => {
        const isActive = currentView === item.view;
        const Icon = isActive ? item.iconSolid : item.icon;

        return (
          <button
            key={item.id}
            onClick={() => {
              if (item.action) {
                item.action();
              } else if (item.view) {
                onViewChange(item.view);
              }
            }}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors ${
              isActive
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <Icon className="w-6 h-6" />
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}




