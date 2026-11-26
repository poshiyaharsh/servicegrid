import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { DispatchController } from './dispatch.controller';
import { DispatchService } from './dispatch.service';
import { DISPATCH_STORE } from './dispatch.store';
import { PrismaDispatchStore } from './prisma-dispatch.store';
import { TechniciansController } from './technicians.controller';

@Module({
  imports: [IdentityModule],
  controllers: [DispatchController, TechniciansController],
  providers: [{ provide: DISPATCH_STORE, useClass: PrismaDispatchStore }, DispatchService],
  exports: [DISPATCH_STORE, DispatchService],
})
export class DispatchModule {}
