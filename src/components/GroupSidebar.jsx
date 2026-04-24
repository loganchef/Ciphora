import React from 'react';
import GroupItem from './GroupItem';
import Icon from './Icon';

const GroupSidebar = ({ currentGroupId, onGroupChange, groups, onManageGroups, passwords }) => {
  const totalCount = passwords?.length || 0;
  const ungroupedCount = passwords?.filter(p => !p.groupId)?.length || 0;

  const getGroupCount = (groupId) => {
    return passwords?.filter(p => p.groupId === groupId)?.length || 0;
  };

  return (
    <div className="w-64 border-r bg-gray-50 p-4 space-y-2 flex-shrink-0">
      <GroupItem
        icon="System/folder-fill"
        name="全部"
        count={totalCount}
        active={currentGroupId === 'all'}
        onClick={() => onGroupChange('all')}
      />
      <GroupItem
        icon="System/folder-open-fill"
        name="未分组"
        count={ungroupedCount}
        active={currentGroupId === 'ungrouped'}
        onClick={() => onGroupChange('ungrouped')}
      />
      <div className="border-t my-2" />
      {groups.map(group => (
        <GroupItem
          key={group.id}
          icon={group.icon}
          name={group.name}
          color={group.color}
          iconColor={group.iconColor}
          count={getGroupCount(group.id)}
          active={currentGroupId === group.id}
          onClick={() => onGroupChange(group.id)}
        />
      ))}
      <button
        onClick={onManageGroups}
        className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2"
      >
        <Icon path="System/add-line" className="w-4 h-4 text-blue-600" />
        <span>管理分组</span>
      </button>
    </div>
  );
};

export default GroupSidebar;
