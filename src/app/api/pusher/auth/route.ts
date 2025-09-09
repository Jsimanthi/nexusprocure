import { pusherServer } from '@/lib/pusher';
import { auth } from '@/lib/auth-server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const data = await req.text();
  const [socketId, channelName] = data
    .split('&')
    .map((str) => str.split('=')[1]);

  // Check if the user is trying to subscribe to their own channel
  const expectedChannelName = `private-user-${session.user.id}`;
  if (channelName !== expectedChannelName) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const userInfo = {
    user_id: session.user.id,
    user_info: {
      name: session.user.name,
      email: session.user.email,
    },
  };

  try {
    const authResponse = pusherServer.authorizeChannel(socketId, channelName, userInfo);
    return NextResponse.json(authResponse);
  } catch (error) {
    console.error("Pusher auth error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
