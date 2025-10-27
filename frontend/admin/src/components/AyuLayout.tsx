import React, { useState } from 'react';
import AyuSidebar from './AyuSidebar';
import './AyuLayout.css';

interface AyuLayoutProps {
  children: React.ReactNode;
  sidebarItems?: Array<{
    key: string;
    label: string;
    icon?: React.ReactNode;
    href?: string;
    onClick?: () => void;
    badge?: string | number;
    children?: Array<{
      key: string;
      label: string;
      icon?: React.ReactNode;
      href?: string;
      onClick?: () => void;
      badge?: string | number;
    }>;
  }>;
  activeSidebarKey?: string;
  onSidebarItemClick?: (key: string, item: any) => void;
  user?: {
    name: string;
    avatar?: string;
    role?: string;
  };
  header?: React.ReactNode;
  className?: string;
}

const AyuLayout: React.FC<AyuLayoutProps> = ({
  children,
  sidebarItems = [],
  activeSidebarKey,
  onSidebarItemClick,
  user,
  header,
  className = '',
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const layoutClasses = [
    'ayu-layout',
    sidebarCollapsed ? 'ayu-layout--sidebar-collapsed' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={layoutClasses}>
      {/* Sidebar */}
      <AyuSidebar
        items={sidebarItems}
        activeKey={activeSidebarKey}
        onItemClick={onSidebarItemClick}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        user={user}
      />

      {/* Main Content */}
      <div className="ayu-layout__main">
        {/* Header */}
        {header && (
          <div className="ayu-layout__header">
            {header}
          </div>
        )}

        {/* Content */}
        <div className="ayu-layout__content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AyuLayout;
