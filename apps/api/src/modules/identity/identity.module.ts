import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/security/jwt-auth.guard';
import { PermissionsGuard } from '../../common/security/permissions.guard';
import { AuthController } from '../auth/auth.controller';
import { AuthService } from '../auth/auth.service';
import { BranchesController } from '../branches/branches.controller';
import { BranchesService } from '../branches/branches.service';
import { OrganizationsController } from '../organizations/organizations.controller';
import { OrganizationsService } from '../organizations/organizations.service';
import { UsersController } from '../users/users.controller';
import { UsersService } from '../users/users.service';
import { IDENTITY_STORE } from './identity.store';
import { PrismaIdentityStore } from './prisma-identity.store';

@Module({
  controllers: [
    AuthController,
    OrganizationsController,
    BranchesController,
    UsersController,
  ],
  providers: [
    { provide: IDENTITY_STORE, useClass: PrismaIdentityStore },
    AuthService,
    OrganizationsService,
    BranchesService,
    UsersService,
    JwtAuthGuard,
    PermissionsGuard,
  ],
  exports: [IDENTITY_STORE, AuthService, JwtAuthGuard, PermissionsGuard],
})
export class IdentityModule {}
