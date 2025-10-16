import { NextRequest, NextResponse } from 'next/server';
import { getClickUpOAuthURL, exchangeClickUpCode } from '@/lib/api/clickup';
import { saveCredentials } from '@/lib/db/supabase';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  // If no code, redirect to ClickUp OAuth
  if (!code) {
    const clientId = process.env.CLICKUP_CLIENT_ID!;
    const redirectUri = process.env.CLICKUP_REDIRECT_URI!;
    const authUrl = getClickUpOAuthURL(clientId, redirectUri);

    return NextResponse.redirect(authUrl);
  }

  // Exchange code for access token
  try {
    const clientId = process.env.CLICKUP_CLIENT_ID!;
    const clientSecret = process.env.CLICKUP_CLIENT_SECRET!;

    const { access_token } = await exchangeClickUpCode(code, clientId, clientSecret);

    // Get user ID from session or create new user
    // For now, using a placeholder - should integrate with Supabase Auth
    const userId = 'temp-user-id'; // TODO: Get from session

    // Save credentials
    await saveCredentials(userId, 'clickup', {
      accessToken: access_token,
    });

    // Redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard?clickup=connected', request.url));
  } catch (error: any) {
    console.error('ClickUp OAuth error:', error);
    return NextResponse.json(
      { error: 'Failed to authenticate with ClickUp', details: error.message },
      { status: 500 }
    );
  }
}
