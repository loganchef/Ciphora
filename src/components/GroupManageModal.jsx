import React, { useState, useMemo } from 'react';
import { XMarkIcon, PencilSquareIcon, TrashIcon, FolderPlusIcon, CheckIcon } from '@heroicons/react/24/outline';

// ─── Icon catalogue ─────────────────────────────────────────────────────────
// Each entry: [category-label, folder, [file-stems (fill variant)]]
// For mixed-folder icons we use "folder|stem" notation processed in iconUrl()
const ICON_CATEGORIES = [
  ['常用', 'System', [
    'apps-2-fill', 'settings-3-fill', 'lock-password-fill', 'shield-keyhole-fill',
    'star-fill', 'lock-fill', 'shield-fill', 'shield-star-fill',
  ]],
  ['工作', 'Business', [
    'briefcase-4-fill', 'bar-chart-box-fill', 'calendar-fill', 'bookmark-3-fill',
    'award-fill', 'archive-fill', 'cloud-fill', 'customer-service-2-fill',
  ]],
  ['建筑', 'Buildings', [
    'home-fill', 'home-office-fill', 'building-fill', 'bank-fill',
    'school-fill', 'hospital-fill', 'store-fill', 'government-fill',
  ]],
  ['金融', 'Finance', [
    'bank-card-fill', 'wallet-3-fill', 'money-dollar-circle-fill', 'coin-fill',
    'gift-fill', 'shopping-cart-2-fill', 'exchange-fill', 'safe-fill',
  ]],
  ['设备', 'Device', [
    'computer-fill', 'phone-fill', 'database-2-fill', 'fingerprint-fill',
    'qr-code-fill', 'hard-drive-fill', 'cpu-fill', 'gamepad-fill',
  ]],
  ['地图', 'Map', [
    'map-pin-fill', 'earth-fill', 'plane-fill', 'compass-fill',
    'car-fill', 'passport-fill', 'hotel-bed-fill', 'globe-fill',
  ]],
  ['用户', 'User & Faces', [
    'user-2-fill', 'group-fill', 'admin-fill', 'team-fill',
    'spy-fill', 'robot-fill', 'account-circle-fill', 'contacts-fill',
  ]],
  ['娱乐', 'Game & Sports', [
    'game-fill', 'basketball-fill', 'football-fill', 'chess-fill',
    'sword-fill', 'target-fill', 'dice-fill', 'billiards-fill',
  ]],
  ['其他', 'Others', [
    'key-fill', 'lightbulb-flash-fill', 'graduation-cap-fill', 'leaf-fill',
    'bell-fill', 'handbag-fill', 'door-lock-fill', 'lock-fill',
  ]],
];

// Fallback stems that may not exist — they'll just show broken icon gracefully
function iconUrl(folder, stem) {
  return `/icons/${encodeURIComponent(folder)}/${stem}.svg`;
}

// ─── Colour palette ──────────────────────────────────────────────────────────
const COLORS = [
  { hex: '#3B82F6', name: '蓝色' },
  { hex: '#6366F1', name: '靛蓝' },
  { hex: '#8B5CF6', name: '紫色' },
  { hex: '#EC4899', name: '粉色' },
  { hex: '#EF4444', name: '红色' },
  { hex: '#F97316', name: '橙色' },
  { hex: '#F59E0B', name: '黄色' },
  { hex: '#10B981', name: '绿色' },
  { hex: '#14B8A6', name: '青绿' },
  { hex: '#06B6D4', name: '青色' },
  { hex: '#64748B', name: '灰蓝' },
  { hex: '#71717A', name: '灰色' },
];

// ─── Component ───────────────────────────────────────────────────────────────
const GroupManageModal = ({ isOpen, onClose, groups, onAdd, onUpdate, onDelete }) => {
  const defaultForm = { name: '', color: '#3B82F6', icon: 'System/apps-2-fill' };
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(defaultForm);
  const [activeTab, setActiveTab] = useState(ICON_CATEGORIES[0][0]);
  const [saving, setSaving] = useState(false);

  // resolve current icon display
  const currentIconFolder = formData.icon.includes('/') ? formData.icon.split('/')[0] : 'System';
  const currentIconStem   = formData.icon.includes('/') ? formData.icon.split('/')[1] : formData.icon;
  const currentIconUrl    = iconUrl(currentIconFolder, currentIconStem);

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await onUpdate(editingId, formData.name, formData.color, formData.icon);
      } else {
        await onAdd(formData.name, formData.color, formData.icon);
      }
      setFormData(defaultForm);
      setEditingId(null);
    } catch (err) {
      alert('操作失败: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (g) => {
    setEditingId(g.id);
    setFormData({ name: g.name, color: g.color, icon: g.icon });
    // set active tab to match the group's icon category
    const cat = ICON_CATEGORIES.find(([, folder]) => g.icon.startsWith(folder + '/'));
    if (cat) setActiveTab(cat[0]);
  };

  const handleDelete = async (id) => {
    if (!confirm('确定删除此分组？分组内密码将归入"未分组"')) return;
    try { await onDelete(id); } catch (e) { alert('删除失败: ' + e.message); }
  };

  const handleCancel = () => { setFormData(defaultForm); setEditingId(null); };

  const activeCategory = ICON_CATEGORIES.find(([label]) => label === activeTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center shadow-sm">
              <FolderPlusIcon className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">
              {editingId ? '编辑分组' : '管理分组'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* ── Form ── */}
          <div className="p-5 space-y-5 border-b border-gray-100">

            {/* Name + live preview */}
            <div className="flex items-center gap-3">
              {/* Icon preview badge */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                style={{ backgroundColor: formData.color + '22', border: `2px solid ${formData.color}44` }}
              >
                <img
                  src={currentIconUrl}
                  alt=""
                  className="w-6 h-6"
                  style={{ filter: `drop-shadow(0 0 0 ${formData.color})` }}
                  onError={(e) => { e.target.style.opacity = '0.3'; }}
                />
              </div>
              <input
                type="text"
                placeholder="分组名称，如「工作」「个人」"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                className="flex-1 h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-300 transition-colors"
              />
            </div>

            {/* Color picker */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">标签颜色</p>
              <div className="flex flex-wrap gap-2">
                {COLORS.map(({ hex, name }) => (
                  <button
                    key={hex}
                    title={name}
                    onClick={() => setFormData({ ...formData, color: hex })}
                    className="w-7 h-7 rounded-full transition-transform hover:scale-110 relative flex items-center justify-center"
                    style={{ backgroundColor: hex }}
                  >
                    {formData.color === hex && (
                      <CheckIcon className="w-3.5 h-3.5 text-white drop-shadow" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Icon picker */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">分组图标</p>

              {/* Category tabs */}
              <div className="flex gap-1 overflow-x-auto pb-1 mb-3 scrollbar-hide">
                {ICON_CATEGORIES.map(([label]) => (
                  <button
                    key={label}
                    onClick={() => setActiveTab(label)}
                    className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                      activeTab === label
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Icon grid */}
              {activeCategory && (
                <div className="grid grid-cols-8 gap-1.5">
                  {activeCategory[2].map((stem) => {
                    const key = `${activeCategory[1]}/${stem}`;
                    const selected = formData.icon === key;
                    return (
                      <button
                        key={stem}
                        onClick={() => setFormData({ ...formData, icon: key })}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                          selected
                            ? 'ring-2 ring-offset-1 shadow-sm'
                            : 'hover:bg-gray-100'
                        }`}
                        style={selected ? {
                          backgroundColor: formData.color + '18',
                          ringColor: formData.color,
                          boxShadow: `0 0 0 2px ${formData.color}`,
                        } : {}}
                        title={stem.replace(/-fill$/, '').replace(/-/g, ' ')}
                      >
                        <img
                          src={iconUrl(activeCategory[1], stem)}
                          alt=""
                          className="w-5 h-5 opacity-70"
                          onError={(e) => { e.target.style.opacity = '0.15'; }}
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              {editingId && (
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  取消编辑
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={!formData.name.trim() || saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium shadow-sm"
              >
                {saving ? '保存中…' : editingId ? '保存更改' : '创建分组'}
              </button>
            </div>
          </div>

          {/* ── Existing groups list ── */}
          <div className="p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
              已创建分组 {groups.length > 0 && `(${groups.length})`}
            </p>

            {groups.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">
                暂无分组，创建第一个分组吧
              </div>
            ) : (
              <div className="space-y-1.5">
                {groups.map((g) => {
                  const iconFolder = g.icon.includes('/') ? g.icon.split('/')[0] : 'System';
                  const iconStem   = g.icon.includes('/') ? g.icon.split('/')[1] : g.icon;
                  return (
                    <div
                      key={g.id}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors ${
                        editingId === g.id
                          ? 'border-blue-200 bg-blue-50'
                          : 'border-transparent hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Icon badge */}
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: g.color + '20' }}
                        >
                          <img
                            src={iconUrl(iconFolder, iconStem)}
                            alt=""
                            className="w-4 h-4"
                            onError={(e) => { e.target.style.opacity = '0.2'; }}
                          />
                        </div>
                        <span
                          className="text-sm font-medium truncate"
                          style={{ color: g.color }}
                        >
                          {g.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleEdit(g)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          <PencilSquareIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(g.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupManageModal;
