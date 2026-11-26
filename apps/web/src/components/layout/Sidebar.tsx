import React from 'react';
import { BrandLogo } from '../branding/BrandLogo';

const NAV_ITEMS = [
  'Overview',
  'Customers',
  'Service Requests',
  'Work Orders',
  'Dispatch',
  'Technicians',
  'Inventory',
  'Assets',
  'Finance',
  'AMC',
  'Analytics',
  'Automation',
  'Settings',
] as const;

export interface SidebarProps {
  activeItem?: string;
  collapsed?: boolean;
}

export function Sidebar({ activeItem = 'Overview', collapsed = false }: SidebarProps) {
  return (
    <aside
      aria-label="Primary navigation"
      className={`flex h-screen flex-col bg-[#0F172A] text-[#CBD5E1] ${
        collapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      <div className="flex h-[60px] items-center border-b border-[#1E293B] px-4">
        <BrandLogo variant={collapsed ? 'icon' : 'dark'} />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive = item === activeItem;
          return (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
              className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-l-2 border-[#14B8A6] bg-[#1E293B] text-white'
                  : 'hover:bg-[#1E293B]/60 hover:text-white'
              }`}
            >
              {collapsed ? item.slice(0, 2).toUpperCase() : item}
            </a>
          );
        })}
      </nav>
    </aside>
  );
}
