import { BadRequestException } from '@nestjs/common';
import type { WorkOrderStatus } from '@servicegrid/types';

export const ALLOWED_TRANSITIONS: Record<WorkOrderStatus, readonly WorkOrderStatus[]> = {
  NEW: ['PENDING', 'SCHEDULED', 'ASSIGNED', 'CANCELLED'],
  PENDING: ['SCHEDULED', 'ASSIGNED', 'CANCELLED'],
  SCHEDULED: ['ASSIGNED', 'EN_ROUTE', 'ON_HOLD', 'CANCELLED'],
  ASSIGNED: ['EN_ROUTE', 'IN_PROGRESS', 'ON_HOLD', 'CANCELLED'],
  EN_ROUTE: ['IN_PROGRESS', 'ON_HOLD', 'CANCELLED'],
  IN_PROGRESS: ['ON_HOLD', 'COMPLETED', 'CANCELLED'],
  ON_HOLD: ['SCHEDULED', 'ASSIGNED', 'IN_PROGRESS', 'CANCELLED'],
  COMPLETED: ['PENDING', 'IN_PROGRESS'],
  CANCELLED: ['PENDING'],
};

export function assertValidTransition(from: WorkOrderStatus, to: WorkOrderStatus): void {
  if (from === to) return;
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed?.includes(to)) {
    throw new BadRequestException(`Invalid work order status transition: ${from} -> ${to}`);
  }
}
