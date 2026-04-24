import React, { useState } from 'react';
import { PlusIcon, ChevronRightIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';

// Resolve icon path: supports "Folder/stem" format or legacy emoji strings
function resolveIcon(icon) {
  if (!icon) return null;
  if (icon.includes('/')) {
    const [folder, stem] = icon.split('/');
    return `/icons/${folder.replace(/ /g, '%20')}/${stem}.svg`;
  }
  return null; // emoji — render as text
}

const GroupTabs = ({ currentGroupId, onGroupChange, groups, onManageGroups, passwords }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const totalCount = passwords?.length || 0;
  const ungroupedCount = passwords?.filter(p => !p.groupId)?.length || 0;

  const getGroupCount = (groupId) =>
    passwords?.filter(p => p.groupId === groupId)?.length || 0;

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="relative flex items-center gap-2">
      {/* Scrollable tabs container */}
      <div className="group-tabs-scroll flex items-center gap-1.5 overflow-x-auto flex-1 min-w-0 pb-1">
        <div className="flex items-center gap-1.5 flex-nowrap mr-8">
          {/* All - always visible */}
          <button
            onClick={() => onGroupChange('all')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${currentGroupId === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            全部 <span className="opacity-75 text-xs">({totalCount})</span>
          </button>

          {/* Ungrouped - animated visibility */}
          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-w-[200px] opacity-100' : 'max-w-0 opacity-0'
              }`}
          >
            <button
              onClick={() => onGroupChange('ungrouped')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${currentGroupId === 'ungrouped'
                  ? 'bg-gray-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              未分组 <span className="opacity-75 text-xs">({ungroupedCount})</span>
            </button>
          </div>

          {/* Custom groups - animated visibility */}
          {groups.map(group => {
            const iconUrl = resolveIcon(group.icon);
            const active = currentGroupId === group.id;
            return (
              <div
                key={group.id}
                className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-w-[200px] opacity-100' : 'max-w-0 opacity-0'
                  }`}
              >
                <button
                  onClick={() => onGroupChange(group.id)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1.5 flex-shrink-0 ${active ? 'text-white shadow-sm' : 'hover:opacity-90'
                    }`}
                  style={
                    active
                      ? { backgroundColor: group.color }
                      : { backgroundColor: group.color + '18', color: group.color }
                  }
                >
                  {iconUrl ? (
                    <div
                      className="w-3.5 h-3.5 flex-shrink-0"
                      style={{
                        backgroundColor: active ? (group.iconColor || '#ffffff') : (group.iconColor || group.color),
                        maskImage: `url(${iconUrl})`,
                        WebkitMaskImage: `url(${iconUrl})`,
                        maskSize: '100% 100%',
                        WebkitMaskSize: '100% 100%',
                      }}
                    />
                  ) : (
                    <span className="text-xs">{group.icon}</span>
                  )}
                  <span>{group.name}</span>
                  <span className="text-xs opacity-75">({getGroupCount(group.id)})</span>
                </button>
              </div>
            );
          })}

          {/* Expand/Collapse button - after tags */}
          <button
            onClick={handleToggle}
            className={`w-7 h-7 rounded-md flex items-center justify-center transition-all duration-300 flex-shrink-0 shadow-sm hover:shadow-md ${isExpanded
                ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
            title={isExpanded ? '收起' : '展开分组'}
          >
            {isExpanded ? (
              <ChevronLeftIcon className="w-3.5 h-3.5" />
            ) : (
              <ChevronRightIcon className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Manage groups button - always visible */}
          <button
            onClick={onManageGroups}
            className="w-7 h-7 rounded-md flex items-center justify-center bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors flex-shrink-0"
            title="管理分组"
          >
            <PlusIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupTabs;
