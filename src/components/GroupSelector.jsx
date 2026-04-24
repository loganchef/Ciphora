import React from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import Icon from './Icon';

const GroupSelector = ({ value, onChange, groups, passwords }) => {
  const totalCount = passwords?.length || 0;
  const ungroupedCount = passwords?.filter(p => !p.groupId)?.length || 0;

  const getGroupCount = (groupId) => {
    return passwords?.filter(p => p.groupId === groupId)?.length || 0;
  };

  const getDisplayName = () => {
    if (value === 'all') return (
      <span className="flex items-center gap-2">
        <Icon path="System/folder-fill" className="w-4 h-4 text-gray-600" />
        全部 ({totalCount})
      </span>
    );
    if (value === 'ungrouped') return (
      <span className="flex items-center gap-2">
        <Icon path="System/folder-open-fill" className="w-4 h-4 text-gray-600" />
        未分组 ({ungroupedCount})
      </span>
    );
    const group = groups.find(g => g.id === value);
    if (group) {
      const count = getGroupCount(group.id);
      return (
        <span className="flex items-center gap-2">
          <div
            className="w-4 h-4"
            style={{
              backgroundColor: group.iconColor || group.color,
              maskImage: `url(/icons/${group.icon}.svg)`,
              WebkitMaskImage: `url(/icons/${group.icon}.svg)`,
              maskSize: '100% 100%',
              WebkitMaskSize: '100% 100%',
            }}
          />
          {group.name} ({count})
        </span>
      );
    }
    return '选择分组';
  };

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue>{getDisplayName()}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          <span className="flex items-center gap-2">
            <Icon path="System/folder-fill" className="w-4 h-4 text-gray-600" />
            全部 ({totalCount})
          </span>
        </SelectItem>
        <SelectItem value="ungrouped">
          <span className="flex items-center gap-2">
            <Icon path="System/folder-open-fill" className="w-4 h-4 text-gray-600" />
            未分组 ({ungroupedCount})
          </span>
        </SelectItem>
        {groups.map(group => (
          <SelectItem key={group.id} value={group.id}>
            <span className="flex items-center gap-2" style={{ color: group.color }}>
              <div
                className="w-4 h-4"
                style={{
                  backgroundColor: group.iconColor || group.color,
                  maskImage: `url(/icons/${group.icon}.svg)`,
                  WebkitMaskImage: `url(/icons/${group.icon}.svg)`,
                  maskSize: '100% 100%',
                  WebkitMaskSize: '100% 100%',
                }}
              />
              {group.name} ({getGroupCount(group.id)})
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default GroupSelector;
