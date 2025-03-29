import { NextResponse } from "next/server";

export async function POST() {
  try {
    // Create a response with success status
    const response = NextResponse.json({ success: true });
    
    // Delete the session cookie by setting it to expire immediately
    response.cookies.set({
      name: 'session',
      value: '',
      expires: new Date(0),
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Sign out error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sign out' },
      { status: 500 }
    );
  }
} 