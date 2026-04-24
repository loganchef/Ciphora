import React, { useState } from 'react';
import { XMarkIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Label } from './ui/label';

const GroupManageModal = ({ isOpen, onClose, groups, onAdd, onUpdate, onDelete }) => {
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', color: '#3B82F6', icon: '📁' });

  const presetColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
  const presetIcons = ['📁', '💼', '🏠', '🎮', '🎓', '💰', '🔒', '🌐'];

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('请输入分组名称');
      return;
    }

    try {
      if (editingId) {
        await onUpdate(editingId, formData.name, formData.color, formData.icon);
      } else {
        await onAdd(formData.name, formData.color, formData.icon);
      }
      setFormData({ name: '', color: '#3B82F6', icon: '📁' });
      setEditingId(null);
    } catch (error) {
      alert('操作失败: ' + error.message);
    }
  };

  const handleEdit = (group) => {
    setEditingId(group.id);
    setFormData({ name: group.name, color: group.color, icon: group.icon });
  };

  const handleDelete = async (id) => {
    if (confirm('确定删除此分组？分组内的密码将移至"未分组"')) {
      try {
        await onDelete(id);
      } catch (error) {
        alert('删除失败: ' + error.message);
      }
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', color: '#3B82F6', icon: '📁' });
    setEditingId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">管理分组</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
            <h3 className="font-medium">{editingId ? '编辑分组' : '新建分组'}</h3>
            <div>
              <Label>分组名称</Label>
              <input
                type="text"
                placeholder="输入分组名称"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg mt-1"
              />
            </div>
            <div>
              <Label>颜色</Label>
              <div className="flex gap-2 mt-1">
                {presetColors.map(color => (
                  <button
                    key={color}
                    className={`w-10 h-10 rounded-full border-2 ${formData.color === color ? 'border-gray-800' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label>图标</Label>
              <div className="flex gap-2 mt-1">
                {presetIcons.map(icon => (
                  <button
                    key={icon}
                    className={`text-2xl w-10 h-10 rounded-lg ${formData.icon === icon ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                    onClick={() => setFormData({ ...formData, icon })}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingId ? '更新' : '添加'}
              </button>
              {editingId && (
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  取消
                </button>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-3">已有分组</h3>
            <div className="space-y-2">
              {groups.length === 0 ? (
                <p className="text-gray-500 text-sm">暂无分组</p>
              ) : (
                groups.map(group => (
                  <div
                    key={group.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{group.icon}</span>
                      <span className="font-medium" style={{ color: group.color }}>
                        {group.name}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(group)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(group.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupManageModal;
