
'use client';

import React, { useState, useEffect } from 'react';
import { m } from 'framer-motion';
import { Logo } from '@/components/logo';
import { useUser } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CircleUser, Settings, LifeBuoy, LogOut, Moon } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/firebase';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTheme } from 'next-themes';
import { Skeleton } from '../ui/skeleton';

export const Header: React.FC = () => {
    const { user, isUserLoading } = useUser();
    const { theme, setTheme } = useTheme();
    const auth = useAuth();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);
    
    const handleLogout = () => {
        if (auth) {
            auth.signOut();
        }
    };

    const renderUserMenu = () => {
        if (!mounted || isUserLoading) {
            return <Skeleton className="size-9 rounded-full" />;
        }

        if (user) {
            return (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="flex items-center gap-3 cursor-pointer p-2 rounded-md hover:bg-accent transition-colors">
                      <div className="relative">
                        <Avatar className="size-9">
                          <AvatarImage
                            src={
                              user.photoURL ||
                              `https://picsum.photos/seed/${user.uid}/100/100`
                            }
                          />
                          <AvatarFallback>
                            {user.displayName?.charAt(0) || user.email?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-background bg-green-500 size-3" />
                      </div>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end">
                    <DropdownMenuLabel>{user.displayName || "My Account"}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <Link href="/profile">
                      <DropdownMenuItem>
                        <CircleUser className="mr-2" />
                        <span>Profile</span>
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/settings">
                      <DropdownMenuItem>
                        <Settings className="mr-2" />
                        <span>Settings</span>
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/support">
                      <DropdownMenuItem>
                        <LifeBuoy className="mr-2" />
                        <span>Support</span>
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <div className="flex items-center justify-between w-full">
                            <Label htmlFor="dark-mode-toggle" className="flex items-center gap-2 font-normal cursor-pointer">
                                <Moon />
                                <span>Dark Mode</span>
                            </Label>
                            <Switch
                                id="dark-mode-toggle"
                                checked={theme === 'dark'}
                                onCheckedChange={(checked) => {
                                    setTheme(checked ? 'dark' : 'light')
                                }}
                            />
                        </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            );
        }

        return null; // Render nothing if not loading and no user
    }

    return (
        <header className="flex items-center justify-between p-4 border-b border-border/50">
            <m.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Logo size="sm" />
            </m.div>
            
            <m.div
                 initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
            >
                {renderUserMenu()}
            </m.div>
        </header>
    );
};
