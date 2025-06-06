
'use client';
import Link from 'next/link';
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
  MapPin,
  Users,
  ClipboardList,
  CalendarDays,
  Bell,
  LogOut,
  Scissors,
  Store,
  PlusCircle,
  Shield,
  UserCircle as ProfileIcon, // Renamed to avoid conflict
} from 'lucide-react';
import { cn } from '@/lib/utils';
import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useAuth } from '@/contexts/AuthContext';

const Logo = () => (
  <div className="flex items-center gap-2 px-3 py-4">
    <Scissors className="h-8 w-8 text-primary" />
    <h1 className="text-2xl font-headline font-semibold text-foreground">LaPresh Beauty Salon</h1>
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

  const isActive = currentPath === href || (subItems && subItems.some(sub => currentPath === sub.href));
  const [isOpen, setIsOpen] = React.useState(isActive);

  // Filter subItems based on role
  const visibleSubItems = subItems?.filter(sub => !sub.roles || (userRole && sub.roles.includes(userRole)));

  if (visibleSubItems && visibleSubItems.length > 0) {
    return (
      <Accordion type="single" collapsible defaultValue={isActive ? label : undefined} className="w-full">
        <AccordionItem value={label} className="border-none">
          <AccordionTrigger
            className={cn(
              "flex w-full items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground",
              isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
            )}
            onClick={() => setIsOpen(!isOpen)}
          >
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              <span className="truncate font-body">{label}</span>
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
  { href: '/locations', icon: Store, label: 'Salon Locations', roles: ['admin'] },
  { href: '/hairdressers', icon: Users, label: 'Hairdressers', roles: ['admin'] },
  {
    href: '#', icon: ClipboardList, label: 'Bookings', roles: ['admin', 'hairdresser'],
    subItems: [
      { href: '/bookings/new', icon: PlusCircle, label: 'New Booking', roles: ['admin', 'hairdresser'] }, // Hairdressers might make bookings for themselves
      { href: '/bookings', icon: ClipboardList, label: 'View All Bookings', roles: ['admin'] },
      { href: '/bookings?view=mine', icon: ClipboardList, label: 'My Bookings', roles: ['hairdresser'] },
    ]
  },
  { href: '/calendar', icon: CalendarDays, label: 'Calendar View', roles: ['admin', 'hairdresser'] },
  { href: '/notifications', icon: Bell, label: 'Notifications', badge: '3', roles: ['admin'] },
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
