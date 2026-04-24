import React from 'react';

/**
 * 统一的 SVG 图标组件
 * @param {string} path - 图标路径，格式：'System/lock-fill'
 * @param {string} className - Tailwind CSS 类名，支持颜色类如 'text-blue-600'
 */
const Icon = ({ path, className = "w-5 h-5" }) => {
  // 提取颜色类
  const colorMatch = className.match(/text-(\w+-\d+)/);
  const hasTextColor = colorMatch !== null;

  if (hasTextColor) {
    // 如果有 text-* 颜色类，使用 mask-image 技术
    const colorClass = colorMatch[0];
    const sizeClasses = className.replace(/text-\w+-\d+/g, '').trim();

    return (
      <div
        className={`${sizeClasses} ${colorClass}`}
        style={{
          maskImage: `url(/icons/${path}.svg)`,
          WebkitMaskImage: `url(/icons/${path}.svg)`,
          maskSize: 'contain',
          WebkitMaskSize: 'contain',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
          maskPosition: 'center',
          WebkitMaskPosition: 'center',
          backgroundColor: 'currentColor',
        }}
      />
    );
  }

  // 没有颜色类，直接显示图标（黑色）
  return (
    <img
      src={`/icons/${path}.svg`}
      alt=""
      className={className}
    />
  );
};

export default Icon;
