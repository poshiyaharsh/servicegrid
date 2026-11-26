'use client';

import React from 'react';
import Link from 'next/link';
import type { Permission } from '@servicegrid/permissions';
import { useAuth } from '../../lib/auth-context';
import { BrandLogo } from '../branding/BrandLogo';

interface NavItem {
  label: string;
  href: string;
  permission?: Permission;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', href: '/' },
  { label: 'Customers', href: '/customers', permission: 'customers:read' },
  { label: 'Service Requests', href: '/service-requests', permission: 'work_orders:read' },
  { label: 'Work Orders', href: '/work-orders', permission: 'work_orders:read' },
  { label: 'Dispatch', href: '/dispatch', permission: 'work_orders:assign' },
  { label: 'Inventory', href: '/inventory', permission: 'inventory:read' },
  { label: 'Finance', href: '/finance', permission: 'finance:read' },
  { label: 'AMC', href: '/amc', permission: 'amc:read' },
  { label: 'Analytics', href: '/analytics', permission: 'analytics:read' },
  { label: 'Automation', href: '/automation', permission: 'org:manage' },
  { label: 'Settings', href: '/settings/billing', permission: 'org:manage' },
];

export interface SidebarProps {
  activeItem?: string;
  collapsed?: boolean;
}

export function Sidebar({ activeItem = 'Overview', collapsed = false }: SidebarProps) {
  const { user, can } = useAuth();
  const visibleItems = NAV_ITEMS.filter((item) => !item.permission || !user || can(item.permission));

  return (
    <aside
      aria-label="Primary navigation"
      className={`flex min-h-screen flex-col bg-[#0F172A] text-[#CBD5E1] ${
        collapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      <div className="flex h-[60px] items-center border-b border-[#1E293B] px-4">
        <BrandLogo variant={collapsed ? 'icon' : 'dark'} />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleItems.map((item) => {
          const isActive = item.label === activeItem;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-l-2 border-[#14B8A6] bg-[#1E293B] text-white'
                  : 'hover:bg-[#1E293B]/60 hover:text-white'
              }`}
            >
              {collapsed ? item.label.slice(0, 2).toUpperCase() : item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
