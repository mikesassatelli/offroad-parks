"use client";

import { Building2, LogOut, Settings, User } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface UserMenuProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string | null;
  };
  onSignOut: () => void;
}

export function UserMenu({ user, onSignOut }: UserMenuProps) {
  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
  // Beta testers get read-only admin access — surface the Admin Panel link,
  // but not operator tooling.
  const canViewAdmin = isAdmin || user.role === "BETA_TESTER";
  const showPrivilegedSection = canViewAdmin || user.role === "OPERATOR";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <User className="w-4 h-4" />
          <span className="hidden sm:inline">{user.name || "Account"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5 text-sm">
          <div className="font-medium">{user.name}</div>
          <div className="text-xs text-muted-foreground">{user.email}</div>
        </div>
        {showPrivilegedSection && (
          <>
            <DropdownMenuSeparator />
            {canViewAdmin && (
              <DropdownMenuItem asChild>
                <Link href="/admin" className="cursor-pointer">
                  <Settings className="w-4 h-4 mr-2" />
                  Admin Panel
                </Link>
              </DropdownMenuItem>
            )}
            {user.role !== "BETA_TESTER" && (
              <DropdownMenuItem asChild>
                <Link href="/operator" className="cursor-pointer">
                  <Building2 className="w-4 h-4 mr-2" />
                  Manage Parks
                </Link>
              </DropdownMenuItem>
            )}
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut} className="cursor-pointer">
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
