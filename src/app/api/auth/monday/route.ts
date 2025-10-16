import { NextRequest, NextResponse } from 'next/server';
import { getMondayOAuthURL, exchangeMondayCode } from '@/lib/api/monday';
import { saveCredentials } from '@/lib/db/supabase';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  // If no code, redirect to Monday OAuth
  if (!code) {
    const clientId = process.env.MONDAY_CLIENT_ID!;
    const redirectUri = process.env.MONDAY_REDIRECT_URI!;
    const authUrl = getMondayOAuthURL(clientId, redirectUri);

    return NextResponse.redirect(authUrl);
  }

  // Exchange code for access token
  try {
    const clientId = process.env.MONDAY_CLIENT_ID!;
    const clientSecret = process.env.MONDAY_CLIENT_SECRET!;
    const redirectUri = process.env.MONDAY_REDIRECT_URI!;

    const { access_token } = await exchangeMondayCode(code, clientId, clientSecret, redirectUri);

    // Get user ID from session
    const userId = 'temp-user-id'; // TODO: Get from session

    // Save credentials
    await saveCredentials(userId, 'monday', {
      accessToken: access_token,
    });

    // Redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard?monday=connected', request.url));
  } catch (error: any) {
    console.error('Monday OAuth error:', error);
    return NextResponse.json(
      { error: 'Failed to authenticate with Monday', details: error.message },
      { status: 500 }
    );
  }
}

// POST endpoint for direct API token
export async function POST(request: NextRequest) {
  try {
    const { apiToken } = await request.json();

    if (!apiToken) {
      return NextResponse.json({ error: 'API token is required' }, { status: 400 });
    }

    const userId = 'temp-user-id'; // TODO: Get from session

    // Save credentials
    await saveCredentials(userId, 'monday', {
      accessToken: apiToken,
    });

    return NextResponse.json({ success: true, message: 'Monday credentials saved' });
  } catch (error: any) {
    console.error('Monday token save error:', error);
    return NextResponse.json(
      { error: 'Failed to save Monday credentials', details: error.message },
      { status: 500 }
    );
  }
}
