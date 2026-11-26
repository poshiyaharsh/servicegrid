'use client';

import React from 'react';
import { Badge, Button } from '@servicegrid/ui';
import { useAuth } from '../../lib/auth-context';

export interface TopNavProps {
  title: string;
  branchName?: string;
}

export function TopNav({ title, branchName }: TopNavProps) {
  const { user, tenant, logout } = useAuth();

  return (
    <header className="flex h-[60px] items-center justify-between border-b border-[#E2E8F0] bg-white px-6">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold text-[#0F172A]">{title}</h1>
        <Badge tone="teal">{branchName ?? tenant?.name ?? 'Workspace'}</Badge>
      </div>
      <div className="flex items-center gap-4">
        {user && (
          <div className="hidden text-right sm:block">
            <p className="text-xs font-semibold text-[#0F172A]">{user.fullName}</p>
            <p className="text-[11px] text-[#64748B]">{user.roles.join(', ')}</p>
          </div>
        )}
        {user && (
          <Button variant="secondary" size="sm" onClick={() => void logout()}>
            Sign Out
          </Button>
        )}
      </div>
    </header>
  );
}
