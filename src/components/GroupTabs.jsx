import React from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';

// Resolve icon path: supports "Folder/stem" format or legacy emoji strings
function resolveIcon(icon) {
  if (!icon) return null;
  if (icon.includes('/')) {
    const [folder, stem] = icon.split('/');
    return `/icons/${encodeURIComponent(folder)}/${stem}.svg`;
  }
  return null; // emoji — render as text
}

const GroupTabs = ({ currentGroupId, onGroupChange, groups, onManageGroups, passwords }) => {
  const totalCount = passwords?.length || 0;
  const ungroupedCount = passwords?.filter(p => !p.groupId)?.length || 0;

  const getGroupCount = (groupId) =>
    passwords?.filter(p => p.groupId === groupId)?.length || 0;

  return (
    <div className="flex items-center gap-1.5 flex-nowrap">
      {/* All */}
      <button
        onClick={() => onGroupChange('all')}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
          currentGroupId === 'all'
            ? 'bg-blue-600 text-white shadow-sm'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        全部 <span className="opacity-75 text-xs">({totalCount})</span>
      </button>

      {/* Ungrouped */}
      <button
        onClick={() => onGroupChange('ungrouped')}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
          currentGroupId === 'ungrouped'
            ? 'bg-gray-600 text-white shadow-sm'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        未分组 <span className="opacity-75 text-xs">({ungroupedCount})</span>
      </button>

      {/* Custom groups */}
      {groups.map(group => {
        const iconUrl = resolveIcon(group.icon);
        const active = currentGroupId === group.id;
        return (
          <button
            key={group.id}
            onClick={() => onGroupChange(group.id)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
              active ? 'text-white shadow-sm' : 'hover:opacity-90'
            }`}
            style={
              active
                ? { backgroundColor: group.color }
                : { backgroundColor: group.color + '18', color: group.color }
            }
          >
            {iconUrl ? (
              <img
                src={iconUrl}
                alt=""
                className="w-3.5 h-3.5 flex-shrink-0"
                style={{ opacity: active ? 0.9 : 0.75 }}
              />
            ) : (
              <span className="text-xs">{group.icon}</span>
            )}
            <span>{group.name}</span>
            <span className="text-xs opacity-75">({getGroupCount(group.id)})</span>
          </button>
        );
      })}

      {/* Manage groups button */}
      <button
        onClick={onManageGroups}
        className="w-7 h-7 rounded-md flex items-center justify-center bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors flex-shrink-0"
        title="管理分组"
      >
        <PlusIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default GroupTabs;
