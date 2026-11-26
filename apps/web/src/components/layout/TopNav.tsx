import React from 'react';
import { Badge } from '@servicegrid/ui';

export interface TopNavProps {
  title: string;
  branchName?: string;
}

export function TopNav({ title, branchName = 'Main Branch' }: TopNavProps) {
  return (
    <header className="flex h-[60px] items-center justify-between border-b border-[#E2E8F0] bg-white px-6">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold text-[#0F172A]">{title}</h1>
        <Badge tone="teal">{branchName}</Badge>
      </div>
      <div className="text-xs font-medium text-[#64748B]">FieldSutra Workspace</div>
    </header>
  );
}
