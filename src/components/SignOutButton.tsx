"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

interface SignOutButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export default function SignOutButton({ className, children }: SignOutButtonProps) {
  return (
    <button 
      onClick={() => signOut({ callbackUrl: "/login" })}
      className={className}
    >
      {children ?? (
        <>
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </>
      )}
    </button>
  );
}
