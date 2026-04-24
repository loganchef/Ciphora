import React from 'react';

const GroupItem = ({ icon, name, color, count, active, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
        active ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-medium" style={color ? { color } : {}}>
          {name}
        </span>
      </div>
      {count !== undefined && (
        <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </button>
  );
};

export default GroupItem;
