'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  CalendarDays,
  Bell,
  LogOut,
  Store,
  PlusCircle,
  UserCircle as ProfileIcon, // Renamed to avoid conflict
  Settings2, // Icon for services
  Contact, // Icon for Clients
  Shield, // Icon for Admins
} from 'lucide-react';
import { cn } from '@/lib/utils';
import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useAuth } from '@/contexts/AuthContext';
import type { User } from '@/lib/types';


const Logo = () => (
  <div className="flex items-center justify-center p-2">
     <Image src="/logo.png" alt="LaPresh Beauty Logo" width={180} height={45} priority />
  </div>
);


interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  badge?: string;
  subItems?: NavItemProps[];
  roles?: Array<'admin' | 'hairdresser'>; // Roles that can see this item
}

const NavItem: React.FC<NavItemProps & { currentPath: string; userRole: User['role'] | undefined }> = ({ href, icon: Icon, label, badge, currentPath, subItems, roles, userRole }) => {
  if (roles && userRole && !roles.includes(userRole)) {
    return null; // Don't render if user role not allowed
  }

  const isActive = currentPath === href || (subItems && subItems.some(sub => currentPath.startsWith(sub.href))); // Use startsWith for parent active state
  const [isOpen, setIsOpen] = React.useState(isActive);

  React.useEffect(() => {
    setIsOpen(isActive);
  }, [isActive]);


  // Filter subItems based on role
  const visibleSubItems = subItems?.filter(sub => !sub.roles || (userRole && sub.roles.includes(userRole)));

  if (visibleSubItems && visibleSubItems.length > 0) {
    return (
      <Accordion type="single" collapsible defaultValue={isActive ? label : undefined} className="w-full">
        <AccordionItem value={label} className="border-none">
          <AccordionTrigger
            className={cn(
              "flex w-full items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground font-body",
              isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
            )}
            onClick={() => setIsOpen(!isOpen)}
          >
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              <span className="truncate">{label}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="ml-4 mt-1 space-y-1 border-l border-sidebar-border pl-4 data-[state=closed]:animate-none data-[state=open]:animate-none">
            {visibleSubItems.map(subItem => (
              <NavItem key={subItem.href} {...subItem} currentPath={currentPath} userRole={userRole} />
            ))}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  }

  return (
    <SidebarMenuItem>
      <Link href={href} legacyBehavior passHref>
        <SidebarMenuButton
          className={cn(
            "font-body",
            isActive && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
          )}
          isActive={isActive}
          tooltip={{ children: label, className: "font-body" }}
        >
          <Icon className="h-5 w-5" />
          <span className="truncate">{label}</span>
          {badge && <SidebarMenuBadge>{badge}</SidebarMenuBadge>}
        </SidebarMenuButton>
      </Link>
    </SidebarMenuItem>
  );
};


const navItems: NavItemProps[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'hairdresser'] },
  { href: '/calendar', icon: CalendarDays, label: "Today's Schedule", roles: ['hairdresser'] },
  { href: '/bookings', icon: ClipboardList, label: "Today's Bookings", roles: ['hairdresser'] },
  { href: '/calendar', icon: CalendarDays, label: 'Calendar', roles: ['admin'] },
  { href: '/bookings', icon: ClipboardList, label: 'Bookings', roles: ['admin'] },
  { href: '/clients', icon: Contact, label: 'Clients', roles: ['admin'] },
  
  // Admin-only management section
  {
    href: '#', icon: Settings2, label: 'Manage', roles: ['admin'],
    subItems: [
      { href: '/locations', icon: Store, label: 'Salons', roles: ['admin'] },
      { href: '/hairdressers', icon: Users, label: 'Hairdressers', roles: ['admin'] },
      { href: '/services', icon: Settings2, label: 'Services', roles: ['admin'] },
      { href: '/admins', icon: Shield, label: 'Admins', roles: ['admin'] },
      { href: '/notifications', icon: Bell, label: 'Notifications', roles: ['admin'] },
    ]
  },
];


export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) return null; // Or a loading skeleton

  return (
    <Sidebar collapsible="icon" variant="sidebar" side="left" className="border-r">
      <SidebarHeader className="p-0">
        <Logo />
      </SidebarHeader>
      <Separator className="mb-2 bg-sidebar-border" />
      <SidebarContent className="p-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <NavItem key={item.href + (item.label)} {...item} currentPath={pathname} userRole={user.role} />
          ))}
        </SidebarMenu>
      </SidebarContent>
      <Separator className="my-2 bg-sidebar-border" />
      <SidebarFooter className="p-2">
        <SidebarMenu>
           <NavItem href="/profile" icon={ProfileIcon} label="My Profile" currentPath={pathname} userRole={user.role} />
           <SidebarMenuItem>
             <SidebarMenuButton onClick={logout} className="font-body w-full" tooltip={{ children: "Logout", className: "font-body"}}>
                <LogOut className="h-5 w-5" />
                <span className="truncate">Logout</span>
             </SidebarMenuButton>
           </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
