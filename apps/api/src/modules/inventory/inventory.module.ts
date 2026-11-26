import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { INVENTORY_STORE } from './inventory.store';
import { PrismaInventoryStore } from './prisma-inventory.store';
import { SuppliersController } from './suppliers.controller';

@Module({
  imports: [IdentityModule],
  controllers: [InventoryController, SuppliersController],
  providers: [{ provide: INVENTORY_STORE, useClass: PrismaInventoryStore }, InventoryService],
  exports: [INVENTORY_STORE, InventoryService],
})
export class InventoryModule {}
