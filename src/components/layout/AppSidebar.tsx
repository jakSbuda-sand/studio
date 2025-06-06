
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
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  LayoutDashboard,
  MapPin,
  Users,
  ClipboardList,
  CalendarDays,
  Bell,
  Settings,
  LogOut,
  Scissors,
  Store,
  PlusCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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
}

const NavItem: React.FC<NavItemProps & { currentPath: string }> = ({ href, icon: Icon, label, badge, currentPath, subItems }) => {
  const isActive = currentPath === href || (subItems && subItems.some(sub => currentPath === sub.href));
  const [isOpen, setIsOpen] = React.useState(isActive);

  if (subItems) {
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
            {/* No explicit chevron from AccordionTrigger, already has one */}
          </AccordionTrigger>
          <AccordionContent className="ml-4 mt-1 space-y-1 border-l border-sidebar-border pl-4 data-[state=closed]:animate-none data-[state=open]:animate-none">
            {subItems.map(subItem => (
              <NavItem key={subItem.href} {...subItem} currentPath={currentPath} />
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
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/locations', icon: Store, label: 'Salon Locations' },
  { href: '/hairdressers', icon: Users, label: 'Hairdressers' },
  {
    href: '/bookings', icon: ClipboardList, label: 'Bookings',
    subItems: [
      { href: '/bookings/new', icon: PlusCircle, label: 'New Booking' },
      { href: '/bookings', icon: ClipboardList, label: 'View Bookings' },
    ]
  },
  { href: '/calendar', icon: CalendarDays, label: 'Calendar View' },
  { href: '/notifications', icon: Bell, label: 'Notifications', badge: '3' },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" variant="sidebar" side="left" className="border-r">
      <SidebarHeader className="p-0">
        <Logo />
      </SidebarHeader>
      <Separator className="mb-2 bg-sidebar-border" />
      <SidebarContent className="p-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <NavItem key={item.href} {...item} currentPath={pathname} />
          ))}
        </SidebarMenu>
      </SidebarContent>
      <Separator className="my-2 bg-sidebar-border" />
      <SidebarFooter className="p-2">
        <SidebarMenu>
           <NavItem href="/profile" icon={Users} label="My Profile" currentPath={pathname} />
           <NavItem href="#" icon={LogOut} label="Logout" currentPath={pathname} />
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
