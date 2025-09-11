import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { authorize } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

// HACK: The type for params is a Promise when using Next.js 15.5.2 with Turbopack.
// This is likely a bug and this workaround should be removed when the issue is fixed.
export async function GET(
  _request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  try {
    const params = await paramsPromise;
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    authorize(session, 'MANAGE_ROLES');

    const role = await prisma.role.findUnique({
      where: { id: params.id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    return NextResponse.json(role);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Not authorized')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error fetching role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
    try {
      const params = await paramsPromise;
      const session = await auth();
      if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      authorize(session, 'MANAGE_ROLES');

      const { name, permissionIds } = await request.json();

      const updatedRole = await prisma.$transaction(async (tx) => {
        const role = await tx.role.update({
          where: { id: params.id },
          data: { name },
        });

        await tx.permissionsOnRoles.deleteMany({
          where: { roleId: params.id },
        });

        if (permissionIds && permissionIds.length > 0) {
            await tx.permissionsOnRoles.createMany({
                data: permissionIds.map((permissionId: string) => ({
                    roleId: params.id,
                    permissionId,
                    assignedBy: session.user.id,
                })),
            });
        }

        return role;
      });

      return NextResponse.json(updatedRole);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Not authorized')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      console.error('Error updating role:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
