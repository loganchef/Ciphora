import React, { useState, useRef, useEffect } from 'react';
import { PlusIcon, FunnelIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

function resolveIcon(icon) {
  if (!icon) return null;
  if (icon.includes('/')) {
    const [folder, stem] = icon.split('/');
    return `/icons/${folder.replace(/ /g, '%20')}/${stem}.svg`;
  }
  return null;
}

const GroupTabs = ({ selectedGroupIds, onGroupFilterChange, groups, onManageGroups, passwords }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const totalCount = passwords?.length || 0;
  const ungroupedCount = passwords?.filter(p => !p.groupId)?.length || 0;
  const getGroupCount = (groupId) => passwords?.filter(p => p.groupId === groupId)?.length || 0;

  // selectedGroupIds: [] means "all", otherwise array of ids (may include 'ungrouped')
  const isAll = selectedGroupIds.length === 0;

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const toggleGroup = (id) => {
    if (selectedGroupIds.includes(id)) {
      const next = selectedGroupIds.filter(x => x !== id);
      onGroupFilterChange(next);
    } else {
      onGroupFilterChange([...selectedGroupIds, id]);
    }
  };

  const selectAll = () => onGroupFilterChange([]);

  // Label for the button
  const label = () => {
    if (isAll) return t('groups.allGroups');
    if (selectedGroupIds.length === 1) {
      const id = selectedGroupIds[0];
      if (id === 'ungrouped') return t('common.ungrouped');
      const g = groups.find(g => g.id === id);
      return g ? g.name : t('groups.selectCount', { count: 1 });
    }
    return t('groups.selectCount', { count: selectedGroupIds.length });
  };

  // Filtered count
  const filteredCount = isAll
    ? totalCount
    : passwords?.filter(p => {
      for (const id of selectedGroupIds) {
        if (id === 'ungrouped' && !p.groupId) return true;
        if (p.groupId === id) return true;
      }
      return false;
    })?.length || 0;

  return (
    <div className="relative flex items-center gap-2" ref={ref}>
      {/* Filter button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-3 py-1.5 ml-8 rounded-md text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${!isAll
            ? 'bg-blue-600 text-white shadow-sm'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
      >
        <FunnelIcon className="w-3.5 h-3.5" />
        <span>{label()}</span>
        <span className="opacity-75 text-xs">({filteredCount})</span>
      </button>

      {/* Manage groups button */}
      <button
        onClick={onManageGroups}
        className="w-7 h-7 rounded-md flex items-center justify-center bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors flex-shrink-0"
        title={t('groups.manageGroups')}
      >
        <PlusIcon className="w-3.5 h-3.5" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 min-w-[180px]">
          {/* All option */}
          <button
            onClick={selectAll}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${isAll ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:bg-gray-50'
              }`}
          >
            <span className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border ${isAll ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
              {isAll && <CheckIcon className="w-3 h-3 text-white" />}
            </span>
            <span className="flex-1 text-left">{t('common.all')}</span>
            <span className="text-xs text-gray-400">({totalCount})</span>
          </button>

          {/* Divider */}
          <div className="my-1 border-t border-gray-100" />

          {/* Ungrouped */}
          <button
            onClick={() => toggleGroup('ungrouped')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${selectedGroupIds.includes('ungrouped') ? 'text-gray-700 bg-gray-50' : 'text-gray-700 hover:bg-gray-50'
              }`}
          >
            <span className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border ${selectedGroupIds.includes('ungrouped') ? 'bg-gray-600 border-gray-600' : 'border-gray-300'}`}>
              {selectedGroupIds.includes('ungrouped') && <CheckIcon className="w-3 h-3 text-white" />}
            </span>
            <span className="flex-1 text-left">{t('common.ungrouped')}</span>
            <span className="text-xs text-gray-400">({ungroupedCount})</span>
          </button>

          {/* Custom groups */}
          {groups.map(group => {
            const active = selectedGroupIds.includes(group.id);
            const iconUrl = resolveIcon(group.icon);
            const count = getGroupCount(group.id);
            return (
              <button
                key={group.id}
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-gray-50"
              >
                <span
                  className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border"
                  style={active ? { backgroundColor: group.color, borderColor: group.color } : { borderColor: '#d1d5db' }}
                >
                  {active && <CheckIcon className="w-3 h-3 text-white" />}
                </span>
                {/* Group icon */}
                {iconUrl ? (
                  <div
                    className="w-3.5 h-3.5 flex-shrink-0"
                    style={{
                      backgroundColor: group.iconColor || group.color,
                      maskImage: `url(${iconUrl})`,
                      WebkitMaskImage: `url(${iconUrl})`,
                      maskSize: '100% 100%',
                      WebkitMaskSize: '100% 100%',
                    }}
                  />
                ) : group.icon ? (
                  <span className="text-xs">{group.icon}</span>
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: group.color }} />
                )}
                <span className="flex-1 text-left text-gray-700">{group.name}</span>
                <span className="text-xs text-gray-400">({count})</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GroupTabs;
