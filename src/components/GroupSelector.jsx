import React from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';

const GroupSelector = ({ value, onChange, groups, passwords }) => {
  const totalCount = passwords?.length || 0;
  const ungroupedCount = passwords?.filter(p => !p.groupId)?.length || 0;

  const getGroupCount = (groupId) => {
    return passwords?.filter(p => p.groupId === groupId)?.length || 0;
  };

  const getDisplayName = () => {
    if (value === 'all') return `📁 全部 (${totalCount})`;
    if (value === 'ungrouped') return `📂 未分组 (${ungroupedCount})`;
    const group = groups.find(g => g.id === value);
    if (group) {
      const count = getGroupCount(group.id);
      return `${group.icon} ${group.name} (${count})`;
    }
    return '选择分组';
  };

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue>{getDisplayName()}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">📁 全部 ({totalCount})</SelectItem>
        <SelectItem value="ungrouped">📂 未分组 ({ungroupedCount})</SelectItem>
        {groups.map(group => (
          <SelectItem key={group.id} value={group.id}>
            <span style={{ color: group.color }}>
              {group.icon} {group.name} ({getGroupCount(group.id)})
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default GroupSelector;
