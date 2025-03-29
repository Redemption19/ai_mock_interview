"use server";

import { auth, db } from "@/firebase/admin";
import { cookies } from "next/headers";

// Session duration (1 week)
const SESSION_DURATION = 60 * 60 * 24 * 7;

// Set session cookie
export async function setSessionCookie(idToken: string) {
  const cookieStore = await cookies();

  // Create session cookie
  const sessionCookie = await auth.createSessionCookie(idToken, {
    expiresIn: SESSION_DURATION * 1000, // milliseconds
  });

  // Set cookie in the browser
  cookieStore.set("session", sessionCookie, {
    maxAge: SESSION_DURATION,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
  });
}

export async function signUp(params: SignUpParams) {
  const { 
    uid, 
    name, 
    email, 
    profileURL, 
    resumeURL, 
    resumeText, 
    vapiFileId 
  } = params;

  try {
    const userRecord = await db.collection("users").doc(uid).get();
    if (userRecord.exists) {
      return {
        success: false,
        message: "User already exists. Please sign in.",
      };
    }

    await db.collection("users").doc(uid).set({
      name,
      email,
      profileURL: profileURL || null,
      resumeURL: resumeURL || null,
      resumeText: resumeText || null,
      vapiFileId: vapiFileId || null,
      createdAt: new Date().toISOString(),
    });

    return {
      success: true,
      message: "Account created successfully. Please sign in.",
    };
  } catch (error: any) {
    console.error("Error creating user:", error);
    return {
      success: false,
      message: "Failed to create account. Please try again.",
    };
  }
}

export async function signIn(params: SignInParams): Promise<AuthResponse> {
  try {
    const { email, idToken } = params;
    
    // Verify the Firebase token
    const decodedToken = await auth.verifyIdToken(idToken);
    
    // Set a session cookie
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });
    
    const cookieStore = await cookies();
    cookieStore.set({
      name: 'session',
      value: sessionCookie,
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });

    return {
      success: true,
      message: "Signed in successfully",
    };
  } catch (error) {
    console.error("Sign in error:", error);
    return {
      success: false,
      message: "Failed to sign in. Please try again.",
    };
  }
}

// Sign out user by clearing the session cookie
export async function signOut() {
  const cookieStore = await cookies();

  cookieStore.delete("session");
}

// Get current user from session cookie
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('session');
    
    if (!session?.value) {
      return null;
    }

    // Verify the session cookie
    const decodedClaims = await auth.verifySessionCookie(session.value, true);
    
    // Get user data from Firestore
    const userDoc = await db.collection('users').doc(decodedClaims.uid).get();
    
    if (!userDoc.exists) {
      return null;
    }

    return {
      id: userDoc.id,
      ...userDoc.data(),
    } as User;
  } catch (error) {
    console.error("Get current user error:", error);
    return null;
  }
}

// Check if user is authenticated
export async function isAuthenticated() {
  const user = await getCurrentUser();
  return !!user;
}

export async function updateUserProfile(params: {
  uid: string;
  name: string;
  email: string;
  profileURL?: string;
  resumeURL?: string;
  resumeText?: string;
}): Promise<AuthResponse> {
  try {
    const { uid, ...updateData } = params;

    await db.collection("users").doc(uid).update({
      ...updateData,
      updatedAt: new Date().toISOString(),
    });

    return {
      success: true,
      message: "Profile updated successfully",
    };
  } catch (error) {
    console.error("Update error:", error);
    return {
      success: false,
      message: "Failed to update profile",
    };
  }
}
