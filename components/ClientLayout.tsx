"use client";

import Link from "next/link";
import Image from "next/image";
import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase/client";
import { toast } from "sonner";

interface ClientLayoutProps {
  children: ReactNode;
  user: any;
}

const ClientLayout = ({ children, user }: ClientLayoutProps) => {
  const router = useRouter();

  const handleSignOut = () => {
    toast.custom((toastData) => (
      <div className="flex flex-col gap-4 p-4 bg-dark-200 rounded-lg shadow-lg">
        <p className="text-light-100">Are you sure you want to sign out?</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => toast.dismiss(toastData)}
            className="px-4 py-2 text-sm text-light-100 hover:bg-dark-300 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              toast.dismiss(toastData);
              try {
                // Sign out from Firebase
                await signOut(auth);
                
                // Clear session cookie
                const response = await fetch('/api/auth/signout', {
                  method: 'POST',
                  credentials: 'include',
                });

                if (!response.ok) {
                  throw new Error('Failed to sign out');
                }

                toast.success("Signed out successfully");
                
                // Use window.location for a hard redirect
                window.location.href = '/sign-in';
              } catch (error) {
                console.error("Error signing out:", error);
                toast.error("Failed to sign out");
              }
            }}
            className="px-4 py-2 text-sm bg-primary-200 text-dark-100 rounded-md hover:bg-primary-200/80 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    ), {
      duration: Infinity,
    });
  };

  return (
    <div className="root-layout">
      <nav className="flex justify-between items-center w-full">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="MockMate Logo" width={38} height={32} />
          <h2 className="text-primary-100">PrepWise</h2>
        </Link>

        {user && (
          <div className="relative group">
            <button className="flex items-center gap-2">
              <Image
                src={user.profileURL ?? "/user-avatar.png"}
                alt="Profile"
                width={40}
                height={40}
                className="rounded-full object-cover w-10 h-10"
              />
            </button>

            <div className="absolute right-0 mt-2 w-48 py-2 bg-dark-200 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div className="px-4 py-2 text-sm text-gray-200">
                {user.name}
              </div>
              <div className="border-t border-dark-300"></div>
              <Link
                href="/settings"
                className="block px-4 py-2 text-sm text-gray-200 hover:bg-dark-300 transition-colors"
              >
                Settings
              </Link>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-dark-300 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </nav>

      {children}
    </div>
  );
};

export default ClientLayout; 