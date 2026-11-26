import React from 'react';
import { Button, Card, Input } from '@servicegrid/ui';
import { BrandLogo } from '../../../components/branding/BrandLogo';

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <BrandLogo variant="primary" />
          <p className="mt-2 text-sm text-[#475569]">
            Create your organization workspace on FieldSutra
          </p>
        </div>
        <Card>
          <form className="space-y-4">
            <Input label="Business Name" name="organizationName" placeholder="CoolAir Services Pvt. Ltd." required />
            <Input label="Full Name" name="fullName" placeholder="Rajesh Sharma" required />
            <Input label="Work Email" name="email" type="email" placeholder="rajesh@coolair.in" required />
            <Input label="Password" name="password" type="password" placeholder="Minimum 10 characters" required />
            <Button type="submit" className="w-full">
              Create Workspace
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
