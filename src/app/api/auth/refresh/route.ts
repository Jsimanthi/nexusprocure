import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json();

    if (!refreshToken) {
      return new NextResponse('Refresh token is required', { status: 400 });
    }

    // Find the refresh token in the database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      return new NextResponse('Invalid or expired refresh token', { status: 401 });
    }

    // Verify the token hash
    const isValid = await bcrypt.compare(refreshToken, storedToken.token);
    if (!isValid) {
      return new NextResponse('Invalid refresh token', { status: 401 });
    }

    // Generate new JWT
    const newToken = jwt.sign(
      { id: storedToken.userId },
      process.env.NEXTAUTH_SECRET!,
      { expiresIn: '15m' }
    );

    // Generate new refresh token
    const newRefreshToken = crypto.randomBytes(32).toString('hex');
    const hashedNewRefreshToken = await bcrypt.hash(newRefreshToken, 10);
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Update the refresh token in the database
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: {
        token: hashedNewRefreshToken,
        expiresAt: newExpiresAt,
      },
    });

    return NextResponse.json({
      token: newToken,
      refreshToken: newRefreshToken,
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}