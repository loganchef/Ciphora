import React, { useState, useMemo } from 'react';
import { XMarkIcon, PencilSquareIcon, TrashIcon, FolderPlusIcon, CheckIcon } from '@heroicons/react/24/outline';

// ─── Icon catalogue ─────────────────────────────────────────────────────────
// Each entry: [category-label, folder, [file-stems (fill variant)]]
// For mixed-folder icons we use "folder|stem" notation processed in iconUrl()
const ICON_CATEGORIES = [
  ['常用', 'System', [
    'apps-2-fill', 'apps-fill', 'star-fill', 'lock-fill', 'lock-password-fill', 'lock-2-fill', 'lock-unlock-fill', 'lock-star-fill',
    'shield-fill', 'shield-keyhole-fill', 'shield-star-fill', 'shield-check-fill', 'shield-cross-fill', 'shield-flash-fill', 'shield-user-fill',
    'settings-fill', 'settings-2-fill', 'settings-3-fill', 'settings-4-fill', 'settings-5-fill', 'settings-6-fill',
    'search-fill', 'search-2-fill', 'search-eye-fill', 'filter-fill', 'filter-2-fill', 'filter-3-fill', 'filter-off-fill',
    'eye-fill', 'eye-2-fill', 'eye-close-fill', 'eye-off-fill', 'history-fill', 'time-fill', 'timer-fill', 'timer-2-fill', 'timer-flash-fill',
    'alarm-fill', 'alarm-add-fill', 'alarm-snooze-fill', 'alarm-warning-fill',
    'notification-badge-fill', 'information-fill', 'information-2-fill', 'error-warning-fill', 'alert-fill', 'question-fill',
    'check-fill', 'check-double-fill', 'close-fill', 'close-circle-fill', 'close-large-fill',
    'add-fill', 'add-box-fill', 'add-circle-fill', 'add-large-fill', 'delete-bin-fill', 'delete-bin-2-fill', 'delete-bin-5-fill',
    'refresh-fill', 'loop-left-fill', 'loop-right-fill', 'reset-left-fill', 'reset-right-fill',
    'download-fill', 'download-cloud-fill', 'upload-fill', 'upload-cloud-fill',
    'share-fill', 'share-box-fill', 'share-circle-fill', 'share-forward-fill',
    'login-box-fill', 'login-circle-fill', 'logout-box-fill', 'logout-circle-fill',
    'menu-fill', 'menu-2-fill', 'menu-3-fill', 'menu-4-fill', 'more-fill', 'more-2-fill',
    'toggle-fill', 'radio-button-fill', 'checkbox-fill', 'checkbox-circle-fill',
    'dashboard-fill', 'dashboard-horizontal-fill', 'hourglass-fill', 'hourglass-2-fill',
    'star-half-fill', 'star-s-fill', 'star-off-fill', 'thumb-up-fill', 'thumb-down-fill',
    'spam-fill', 'spam-2-fill', 'spam-3-fill', 'forbid-fill', 'forbid-2-fill', 'prohibited-fill',
    'zoom-in-fill', 'zoom-out-fill', 'external-link-fill', 'export-fill', 'import-fill',
    'loader-fill', 'progress-1-fill', 'progress-4-fill', 'progress-8-fill', 'function-fill',
  ]],
  ['工作', 'Business', [
    'briefcase-fill', 'briefcase-2-fill', 'briefcase-3-fill', 'briefcase-4-fill', 'briefcase-5-fill',
    'calendar-fill', 'calendar-2-fill', 'calendar-check-fill', 'calendar-event-fill', 'calendar-schedule-fill', 'calendar-todo-fill', 'calendar-close-fill',
    'mail-fill', 'mail-open-fill', 'mail-send-fill', 'mail-add-fill', 'mail-check-fill', 'mail-close-fill', 'mail-star-fill', 'mail-unread-fill', 'mail-lock-fill',
    'inbox-fill', 'inbox-2-fill', 'inbox-archive-fill', 'inbox-unarchive-fill',
    'archive-fill', 'archive-2-fill', 'archive-drawer-fill', 'archive-stack-fill',
    'bookmark-fill', 'bookmark-2-fill', 'bookmark-3-fill', 'flag-fill', 'flag-2-fill', 'triangular-flag-fill',
    'bar-chart-fill', 'bar-chart-2-fill', 'bar-chart-box-fill', 'bar-chart-grouped-fill', 'bar-chart-horizontal-fill',
    'pie-chart-fill', 'pie-chart-2-fill', 'pie-chart-box-fill', 'line-chart-fill', 'area-chart-fill', 'donut-chart-fill',
    'presentation-fill', 'slideshow-fill', 'slideshow-2-fill', 'slideshow-3-fill', 'slideshow-4-fill',
    'cloud-fill', 'cloud-off-fill', 'global-fill', 'global-off-fill', 'links-fill',
    'award-fill', 'medal-fill', 'medal-2-fill', 'honour-fill', 'verified-badge-fill',
    'customer-service-fill', 'customer-service-2-fill', 'service-fill', 'shake-hands-fill',
    'send-plane-fill', 'send-plane-2-fill', 'reply-fill', 'reply-all-fill',
    'printer-fill', 'printer-cloud-fill', 'projector-fill', 'projector-2-fill',
    'profile-fill', 'id-card-fill', 'info-card-fill', 'pass-valid-fill', 'pass-pending-fill', 'pass-expired-fill',
    'stack-fill', 'window-fill', 'window-2-fill', 'advertisement-fill', 'seo-fill',
    'calculator-fill', 'at-fill', 'attachment-fill', 'record-mail-fill',
    'copyright-fill', 'registered-fill', 'trademark-fill', 'copyleft-fill',
  ]],
  ['建筑', 'Buildings', [
    'home-fill', 'home-2-fill', 'home-3-fill', 'home-4-fill', 'home-5-fill', 'home-6-fill', 'home-7-fill', 'home-8-fill', 'home-9-fill',
    'home-office-fill', 'home-gear-fill', 'home-heart-fill', 'home-smile-fill', 'home-smile-2-fill', 'home-wifi-fill',
    'building-fill', 'building-2-fill', 'building-3-fill', 'building-4-fill',
    'bank-fill', 'government-fill', 'school-fill', 'hospital-fill', 'hotel-fill',
    'store-fill', 'store-2-fill', 'store-3-fill', 'community-fill',
    'ancient-gate-fill', 'ancient-pavilion-fill', 'tent-fill',
  ]],
  ['金融', 'Finance', [
    'wallet-fill', 'wallet-2-fill', 'wallet-3-fill',
    'bank-card-fill', 'bank-card-2-fill', 'no-credit-card-fill',
    'money-dollar-circle-fill', 'money-dollar-box-fill', 'money-cny-circle-fill', 'money-cny-box-fill',
    'money-euro-circle-fill', 'money-euro-box-fill', 'money-pound-circle-fill', 'money-pound-box-fill', 'money-rupee-circle-fill',
    'coin-fill', 'coins-fill', 'copper-coin-fill', 'copper-diamond-fill',
    'gift-fill', 'gift-2-fill', 'coupon-fill', 'coupon-2-fill', 'coupon-3-fill', 'coupon-4-fill', 'coupon-5-fill',
    'shopping-cart-fill', 'shopping-cart-2-fill', 'shopping-bag-fill', 'shopping-bag-2-fill', 'shopping-bag-3-fill', 'shopping-bag-4-fill',
    'shopping-basket-fill', 'shopping-basket-2-fill',
    'exchange-fill', 'exchange-2-fill', 'exchange-box-fill', 'exchange-dollar-fill', 'exchange-cny-fill', 'exchange-funds-fill',
    'safe-fill', 'safe-2-fill', 'safe-3-fill', 'trophy-fill',
    'cash-fill', 'funds-fill', 'funds-box-fill', 'stock-fill', 'percent-fill', 'discount-percent-fill',
    'price-tag-fill', 'price-tag-2-fill', 'price-tag-3-fill', 'ticket-fill', 'ticket-2-fill',
    'vip-fill', 'vip-crown-fill', 'vip-crown-2-fill', 'vip-diamond-fill',
    'diamond-fill', 'diamond-ring-fill', 'jewelry-fill',
    'hand-coin-fill', 'hand-heart-fill', 'red-packet-fill', 'refund-fill', 'refund-2-fill',
    'auction-fill', 'bit-coin-fill', 'btc-fill', 'eth-fill', 'bnb-fill', 'xrp-fill', 'xtz-fill', 'nft-fill',
    'swap-fill', 'swap-2-fill', 'swap-3-fill', 'swap-box-fill', 'token-swap-fill', 'p2p-fill',
    'secure-payment-fill', 'water-flash-fill', 'increase-decrease-fill', 'currency-fill',
    '24-hours-fill', 'luggage-deposit-fill',
  ]],
  ['设备', 'Device', [
    'computer-fill', 'mac-fill', 'macbook-fill', 'tablet-fill', 'smartphone-fill', 'phone-fill', 'cellphone-fill',
    'tv-fill', 'tv-2-fill', 'remote-control-fill', 'remote-control-2-fill',
    'keyboard-fill', 'keyboard-box-fill', 'mouse-fill',
    'database-fill', 'database-2-fill', 'server-fill', 'hard-drive-fill', 'hard-drive-2-fill', 'hard-drive-3-fill',
    'cpu-fill', 'ram-fill', 'ram-2-fill', 'sd-card-fill', 'sd-card-mini-fill', 'u-disk-fill', 'usb-fill',
    'fingerprint-fill', 'fingerprint-2-fill', 'qr-code-fill', 'qr-scan-fill', 'qr-scan-2-fill', 'qr-scan-ai-fill',
    'barcode-fill', 'barcode-box-fill', 'rfid-fill', 'sensor-fill', 'radar-fill',
    'gamepad-fill', 'device-fill', 'device-recover-fill',
    'bluetooth-fill', 'bluetooth-connect-fill', 'wifi-fill', 'wifi-off-fill',
    'signal-wifi-fill', 'signal-wifi-1-fill', 'signal-wifi-2-fill', 'signal-wifi-3-fill', 'signal-wifi-off-fill', 'signal-wifi-error-fill',
    'signal-cellular-1-fill', 'signal-cellular-2-fill', 'signal-cellular-3-fill', 'signal-cellular-off-fill',
    'battery-fill', 'battery-2-fill', 'battery-charge-fill', 'battery-2-charge-fill', 'battery-low-fill', 'battery-saver-fill', 'battery-share-fill',
    'airplay-fill', 'cast-fill', 'hotspot-fill', 'base-station-fill', 'router-fill', 'rss-fill',
    'gps-fill', 'network-fill', 'network-error-fill', 'network-off-fill',
    'save-fill', 'save-2-fill', 'save-3-fill', 'scan-fill', 'scan-2-fill',
    'install-fill', 'uninstall-fill', 'instance-fill', 'shut-down-fill', 'restart-fill',
    'rotate-lock-fill', 'phone-find-fill', 'phone-lock-fill',
    'connector-fill', 'sim-card-fill', 'sim-card-2-fill', 'sim-card-warning-fill',
    'dual-sim-1-fill', 'dual-sim-2-fill', 'wireless-charging-fill',
    'mobile-download-fill', 'dashboard-2-fill', 'dashboard-3-fill', 'gradienter-fill',
  ]],
  ['地图', 'Map', [
    'map-fill', 'map-2-fill', 'road-map-fill', 'treasure-map-fill',
    'map-pin-fill', 'map-pin-2-fill', 'map-pin-3-fill', 'map-pin-4-fill', 'map-pin-5-fill',
    'map-pin-add-fill', 'map-pin-range-fill', 'map-pin-time-fill', 'map-pin-user-fill',
    'navigation-fill', 'direction-fill', 'compass-fill', 'compass-2-fill', 'compass-3-fill', 'compass-4-fill', 'compass-discover-fill',
    'guide-fill', 'signpost-fill', 'route-fill', 'pin-distance-fill', 'pushpin-fill', 'pushpin-2-fill', 'unpin-fill',
    'earth-fill', 'globe-fill', 'planet-fill', 'time-zone-fill',
    'plane-fill', 'flight-takeoff-fill', 'flight-land-fill',
    'car-fill', 'police-car-fill', 'bus-fill', 'bus-2-fill', 'taxi-fill', 'taxi-wifi-fill', 'bus-wifi-fill',
    'train-fill', 'train-wifi-fill', 'subway-fill', 'subway-wifi-fill', 'china-railway-fill',
    'truck-fill', 'motorbike-fill', 'bike-fill', 'e-bike-fill', 'e-bike-2-fill',
    'ship-fill', 'ship-2-fill', 'sailboat-fill', 'rocket-fill', 'rocket-2-fill', 'space-ship-fill', 'space-ship-2-fill',
    'caravan-fill', 'roadster-fill',
    'passport-fill', 'hotel-bed-fill', 'suitcase-fill', 'suitcase-2-fill', 'suitcase-3-fill',
    'luggage-cart-fill', 'lifebuoy-fill', 'anchor-fill', 'barricade-fill',
    'gas-station-fill', 'charging-pile-fill', 'charging-pile-2-fill', 'oil-fill',
    'parking-fill', 'parking-box-fill', 'traffic-light-fill', 'steering-fill', 'steering-2-fill',
    'run-fill', 'walk-fill', 'riding-fill', 'footprint-fill',
    'takeaway-fill', 'signal-tower-fill',
  ]],
  ['用户', 'User & Faces', [
    'user-fill', 'user-2-fill', 'user-3-fill', 'user-4-fill', 'user-5-fill', 'user-6-fill',
    'user-add-fill', 'user-follow-fill', 'user-unfollow-fill', 'user-forbid-fill', 'user-heart-fill',
    'user-location-fill', 'user-minus-fill', 'user-search-fill', 'user-settings-fill', 'user-star-fill',
    'user-received-fill', 'user-received-2-fill', 'user-shared-fill', 'user-shared-2-fill',
    'user-smile-fill', 'user-voice-fill', 'user-community-fill',
    'account-circle-fill', 'account-circle-2-fill', 'account-box-fill', 'account-box-2-fill',
    'account-pin-circle-fill', 'account-pin-box-fill',
    'group-fill', 'group-2-fill', 'group-3-fill', 'team-fill',
    'admin-fill', 'spy-fill', 'criminal-fill', 'contacts-fill', 'parent-fill', 'open-arm-fill',
    'robot-fill', 'robot-2-fill', 'robot-3-fill', 'ai-agent-fill',
    'emotion-fill', 'emotion-2-fill', 'emotion-add-fill', 'emotion-happy-fill', 'emotion-laugh-fill',
    'emotion-normal-fill', 'emotion-sad-fill', 'emotion-unhappy-fill',
    'ghost-fill', 'ghost-2-fill', 'ghost-3-fill', 'ghost-4-fill', 'ghost-smile-fill',
    'skull-fill', 'skull-2-fill', 'aliens-fill', 'mickey-fill', 'bear-smile-fill', 'star-smile-fill',
    'men-fill', 'women-fill', 'genderless-fill', 'travesti-fill',
    'body-scan-fill', 'voice-recognition-fill',
  ]],
  ['娱乐', 'Game & Sports', [
    'game-fill', 'game-2-fill',
    'basketball-fill', 'football-fill', 'baseball-fill', 'golf-ball-fill',
    'billiards-fill', 'ping-pong-fill', 'boxing-fill',
    'chess-fill', 'sword-fill', 'target-fill',
    'dice-fill', 'dice-1-fill', 'dice-2-fill', 'dice-3-fill', 'dice-4-fill', 'dice-5-fill', 'dice-6-fill',
    'poker-clubs-fill', 'poker-diamonds-fill', 'poker-hearts-fill', 'poker-spades-fill',
    'piano-fill', 'piano-grand-fill',
  ]],
  ['其他', 'Others', [
    'key-fill', 'key-2-fill', 'door-fill', 'door-closed-fill', 'door-open-fill', 'door-lock-fill', 'door-lock-box-fill',
    'bell-fill', 'service-bell-fill',
    'lightbulb-fill', 'lightbulb-flash-fill', 'lightbulb-ai-fill',
    'graduation-cap-fill', 'book-shelf-fill',
    'leaf-fill', 'plant-fill', 'flower-fill', 'cactus-fill', 'seedling-fill', 'tree-fill',
    'handbag-fill', 'shirt-fill', 't-shirt-fill', 't-shirt-2-fill', 't-shirt-air-fill',
    'sofa-fill', 'armchair-fill', 'fridge-fill',
    'glasses-fill', 'glasses-2-fill', 'goggles-fill',
    'plug-fill', 'plug-2-fill', 'plug-3-fill', 'outlet-fill', 'outlet-2-fill',
    'candle-fill', 'weight-fill', 'tooth-fill', 'scales-fill', 'scales-2-fill', 'scales-3-fill',
    'umbrella-fill', 'infinity-fill', 'cross-fill', 'recycle-fill',
    'accessibility-fill', 'wheelchair-fill', 'police-badge-fill',
    'binoculars-fill', 'box-1-fill', 'box-2-fill', 'box-3-fill',
    'stairs-fill', 'reserved-fill', 'character-recognition-fill',
    'ai-generate-3d-fill',
  ]],
];

// Fallback stems that may not exist — they'll just show broken icon gracefully
function iconUrl(folder, stem) {
  return `/icons/${folder.replace(/ /g, '%20')}/${stem}.svg`;
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
  const defaultForm = { name: '', color: '#3B82F6', iconColor: '#ffffff', icon: 'System/apps-2-fill' };
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(defaultForm);
  const [activeTab, setActiveTab] = useState(ICON_CATEGORIES[0][0]);
  const [saving, setSaving] = useState(false);

  // resolve current icon display
  const currentIconFolder = formData.icon.includes('/') ? formData.icon.split('/')[0] : 'System';
  const currentIconStem = formData.icon.includes('/') ? formData.icon.split('/')[1] : formData.icon;
  const currentIconUrl = iconUrl(currentIconFolder, currentIconStem);

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await onUpdate(editingId, formData.name, formData.color, formData.icon, formData.iconColor);
      } else {
        await onAdd(formData.name, formData.color, formData.icon, formData.iconColor);
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
    setFormData({ name: g.name, color: g.color, iconColor: g.iconColor || '#ffffff', icon: g.icon });
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
                style={{ backgroundColor: formData.color, border: `2px solid ${formData.color}` }}
              >
                <div
                  className="w-6 h-6"
                  style={{
                    backgroundColor: formData.iconColor,
                    maskImage: `url(${currentIconUrl})`,
                    WebkitMaskImage: `url(${currentIconUrl})`,
                    maskSize: '100% 100%',
                    WebkitMaskSize: '100% 100%',
                  }}
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

            {/* Color pickers */}
            <div className="space-y-3">
              {/* Background color */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">标签背景色</p>
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
                  <label
                    title="自定义颜色"
                    className="w-7 h-7 rounded-full cursor-pointer transition-transform hover:scale-110 flex items-center justify-center border-2 border-dashed border-gray-300 hover:border-gray-400 overflow-hidden relative"
                    style={{ backgroundColor: !COLORS.find(c => c.hex === formData.color) ? formData.color : 'transparent' }}
                  >
                    {!COLORS.find(c => c.hex === formData.color)
                      ? <CheckIcon className="w-3.5 h-3.5 text-white drop-shadow" />
                      : <span className="text-gray-400 text-base leading-none">+</span>
                    }
                    <input type="color" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                  </label>
                </div>
              </div>

              {/* Icon color */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">图标颜色</p>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(({ hex, name }) => (
                    <button
                      key={hex}
                      title={name}
                      onClick={() => setFormData({ ...formData, iconColor: hex })}
                      className="w-7 h-7 rounded-full transition-transform hover:scale-110 relative flex items-center justify-center"
                      style={{
                        border: `3px solid ${hex}`,
                        backgroundColor: formData.iconColor === hex ? hex + '30' : 'transparent',
                        boxShadow: formData.iconColor === hex ? `0 0 0 1.5px ${hex}` : 'none',
                      }}
                    >
                      {formData.iconColor === hex && (
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: hex }} />
                      )}
                    </button>
                  ))}
                  <label
                    title="自定义颜色"
                    className="w-7 h-7 rounded-full cursor-pointer transition-transform hover:scale-110 flex items-center justify-center overflow-hidden relative"
                    style={{
                      border: `3px solid ${!COLORS.find(c => c.hex === formData.iconColor) ? formData.iconColor : '#D1D5DB'}`,
                      boxShadow: !COLORS.find(c => c.hex === formData.iconColor) ? `0 0 0 1.5px ${formData.iconColor}` : 'none',
                    }}
                  >
                    {!COLORS.find(c => c.hex === formData.iconColor)
                      ? <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: formData.iconColor }} />
                      : <span className="text-gray-400 text-base leading-none">+</span>
                    }
                    <input type="color" value={formData.iconColor} onChange={(e) => setFormData({ ...formData, iconColor: e.target.value })} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                  </label>
                </div>
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
                    className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${activeTab === label
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
                <div className="grid grid-cols-8 gap-1.5 max-h-48 overflow-y-auto p-1">
                  {activeCategory[2].map((stem) => {
                    const key = `${activeCategory[1]}/${stem}`;
                    const selected = formData.icon === key;
                    return (
                      <button
                        key={stem}
                        onClick={() => setFormData({ ...formData, icon: key })}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${selected
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
                        <div
                          className="w-5 h-5"
                          style={{
                            backgroundColor: selected ? formData.iconColor : '#9CA3AF',
                            maskImage: `url(${iconUrl(activeCategory[1], stem)})`,
                            WebkitMaskImage: `url(${iconUrl(activeCategory[1], stem)})`,
                            maskSize: '100% 100%',
                            WebkitMaskSize: '100% 100%',




                          }}
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
                  const iconStem = g.icon.includes('/') ? g.icon.split('/')[1] : g.icon;
                  return (
                    <div
                      key={g.id}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors ${editingId === g.id
                          ? 'border-blue-200 bg-blue-50'
                          : 'border-transparent hover:bg-gray-50'
                        }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Icon badge */}
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: g.color }}
                        >
                          <div
                            className="w-4 h-4"
                            style={{
                              backgroundColor: g.iconColor || '#ffffff',
                              maskImage: `url(${iconUrl(iconFolder, iconStem)})`,
                              WebkitMaskImage: `url(${iconUrl(iconFolder, iconStem)})`,
                              maskSize: '100% 100%',
                              WebkitMaskSize: '100% 100%',




                            }}
                          />
                        </div>
                        <span
                          className="text-sm font-medium truncate text-gray-800"
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
