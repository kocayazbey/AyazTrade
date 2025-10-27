import React from 'react';
import './AyuSidebar.css';

interface SidebarItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  badge?: string | number;
  children?: SidebarItem[];
}

interface AyuSidebarProps {
  items: SidebarItem[];
  activeKey?: string;
  onItemClick?: (key: string, item: SidebarItem) => void;
  className?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  logo?: React.ReactNode;
  user?: {
    name: string;
    avatar?: string;
    role?: string;
  };
}

const AyuSidebar: React.FC<AyuSidebarProps> = ({
  items,
  activeKey,
  onItemClick,
  className = '',
  collapsed = false,
  onToggleCollapse,
  logo,
  user,
}) => {
  const baseClasses = 'ayu-sidebar';
  const collapsedClasses = collapsed ? 'ayu-sidebar--collapsed' : '';

  const sidebarClasses = [
    baseClasses,
    collapsedClasses,
    className,
  ].filter(Boolean).join(' ');

  const handleItemClick = (item: SidebarItem) => {
    if (item.onClick) {
      item.onClick();
    } else if (onItemClick) {
      onItemClick(item.key, item);
    }
  };

  const renderSidebarItem = (item: SidebarItem) => {
    const isActive = activeKey === item.key;
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.key} className="ayu-sidebar__item-group">
        <div
          className={`ayu-sidebar__item ${isActive ? 'ayu-sidebar__item--active' : ''}`}
          onClick={() => handleItemClick(item)}
        >
          {item.icon && (
            <span className="ayu-sidebar__item-icon">
              {item.icon}
            </span>
          )}
          
          {!collapsed && (
            <span className="ayu-sidebar__item-label">
              {item.label}
            </span>
          )}
          
          {item.badge && !collapsed && (
            <span className="ayu-sidebar__item-badge">
              {item.badge}
            </span>
          )}
        </div>
        
        {hasChildren && !collapsed && (
          <div className="ayu-sidebar__submenu">
            {item.children!.map((child) => (
              <div
                key={child.key}
                className={`ayu-sidebar__subitem ${activeKey === child.key ? 'ayu-sidebar__subitem--active' : ''}`}
                onClick={() => handleItemClick(child)}
              >
                {child.icon && (
                  <span className="ayu-sidebar__subitem-icon">
                    {child.icon}
                  </span>
                )}
                <span className="ayu-sidebar__subitem-label">
                  {child.label}
                </span>
                {child.badge && (
                  <span className="ayu-sidebar__subitem-badge">
                    {child.badge}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={sidebarClasses}>
      {/* Header */}
      <div className="ayu-sidebar__header">
        {logo && (
          <div className="ayu-sidebar__logo">
            {logo}
          </div>
        )}
        
        {onToggleCollapse && (
          <button
            className="ayu-sidebar__toggle"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d={collapsed ? "M6 4L10 8L6 12" : "M10 4L6 8L10 12"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="ayu-sidebar__nav">
        {items.map(renderSidebarItem)}
      </nav>

      {/* User Section */}
      {user && !collapsed && (
        <div className="ayu-sidebar__user">
          <div className="ayu-sidebar__user-info">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="ayu-sidebar__user-avatar"
              />
            ) : (
              <div className="ayu-sidebar__user-avatar-placeholder">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            
            <div className="ayu-sidebar__user-details">
              <div className="ayu-sidebar__user-name">{user.name}</div>
              {user.role && (
                <div className="ayu-sidebar__user-role">{user.role}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AyuSidebar;
