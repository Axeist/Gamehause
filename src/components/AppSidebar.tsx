// src/components/AppSidebar.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ShoppingCart, User, BarChart2, Settings, Package, Clock, Users, Menu, Shield, PowerOff, BookOpen, Calendar, Users2, UserCircle, CreditCard } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar
} from '@/components/ui/sidebar';
import Logo from './Logo';
import { useAuth } from '@/context/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import GlobalNotificationBell from '@/components/GlobalNotificationBell';
import { BRAND_NAME, LOGO_PATH } from '@/config/brand';

const AppSidebar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const hideOnPaths = ['/receipt'];
  const shouldHide = hideOnPaths.some(path => location.pathname.includes(path));
  const isMobile = useIsMobile();
  const { toggleSidebar } = useSidebar();
  
  const isAdmin = user?.isAdmin || false;

  if (!user || shouldHide) return null;

  // Base menu items that both admin and staff can see
  const baseMenuItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: ShoppingCart, label: 'POS', path: '/pos' },
    { icon: Clock, label: 'Gaming Stations', path: '/stations' },
    { icon: Package, label: 'Products', path: '/products' },
    { icon: Users, label: 'Customers', path: '/customers' },
    { icon: BarChart2, label: 'Reports', path: '/reports' },
    { icon: Calendar, label: 'Bookings', path: '/booking-management' },
  ];

  // Build menu based on user role
  const menuItems = [
    ...baseMenuItems,
    // Admin sees "Staff" menu
    ...(isAdmin ? [{ icon: Users2, label: 'Staff Management', path: '/staff' }] : []),
    // Staff sees "My Portal" menu (admin does NOT see this)
    ...(!isAdmin ? [{ icon: UserCircle, label: 'My Portal', path: '/staff-portal' }] : []),
    { icon: Settings, label: 'Settings', path: '/settings' },
    { icon: CreditCard, label: 'Subscription', path: '/subscription' },
    { icon: BookOpen, label: 'How to Use', path: '/how-to-use' },
  ];

  // Mobile version with sheet
  if (isMobile) {
    return (
      <>
        <div className="fixed top-0 left-0 w-full z-30 bg-gamehaus-darker p-4 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-2">
            <GlobalNotificationBell />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-[80%] max-w-[280px] bg-gamehaus-darker border-r-0">
                <div className="h-full flex flex-col">
                  <div className="p-4 flex items-center gap-3">
                    <img
                      src={LOGO_PATH}
                      alt="Gamehaus – Premier Snooker & Gaming Lounge"
                      className="h-12 w-12 object-contain animate-bounce filter drop-shadow-[0_0_15px_rgba(255,74,26,0.65)] animate-neon-pulse"
                    />
                    <span className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gamehaus-lightpurple via-gamehaus-magenta to-gamehaus-purple font-heading">
                      {BRAND_NAME}
                    </span>
                  </div>
                  <div className="mx-4 h-px bg-gamehaus-purple/30" />
                  <div className="flex-1 overflow-auto py-2">
                    <div className="px-2 mb-2">
                      <div className="flex items-center justify-center py-2">
                        <GlobalNotificationBell />
                      </div>
                    </div>
                    <div className="px-2">
                      {menuItems.map((item, index) => (
                        <Link 
                          key={item.path}
                          to={item.path} 
                          onClick={() => toggleSidebar()}
                          className={`flex items-center py-3 px-3 rounded-md my-1 ${location.pathname === item.path ? 'bg-gamehaus-purple/40 text-gamehaus-lightpurple' : 'text-white hover:bg-gamehaus-purple/20'}`}
                        >
                          <item.icon className={`mr-3 h-5 w-5 ${location.pathname === item.path ? 'text-gamehaus-lightpurple animate-pulse-soft' : ''}`} />
                          <span className="font-quicksand text-base">{item.label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/35 p-4 shadow-xl shadow-black/40 backdrop-blur-xl transition-all duration-300 hover:border-gamehaus-purple/40 hover:bg-black/40">
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-gamehaus-purple/16 via-transparent to-gamehaus-magenta/14 opacity-90" />
                      <div className="pointer-events-none absolute -left-10 -top-10 h-28 w-28 rounded-full bg-gamehaus-cyan/10 blur-2xl" />
                      <div className="relative flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="relative grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/5">
                            {isAdmin ? (
                              <Shield className="h-5 w-5 text-gamehaus-lightpurple" />
                            ) : (
                              <User className="h-5 w-5 text-gamehaus-lightpurple" />
                            )}
                            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-green-400 shadow-[0_0_12px_rgba(34,197,94,0.55)]" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    className="min-w-0 flex-1 truncate text-sm font-semibold font-quicksand text-white/95"
                                    title={user.username}
                                  >
                                    {user.username}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[min(360px,85vw)] bg-black/80 text-gray-100 border border-white/10">
                                  {user.username}
                                </TooltipContent>
                              </Tooltip>
                              <span className="shrink-0 rounded-full border border-gamehaus-purple/30 bg-gamehaus-purple/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-gamehaus-lightpurple">
                                {isAdmin ? "ADMIN" : "STAFF"}
                              </span>
                            </div>
                            <span className="mt-0.5 block text-[11px] font-quicksand text-gray-400">
                              Access level:{" "}
                              <span className="text-gray-200">{isAdmin ? "Administrator" : "Staff"}</span>
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={logout}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-200 transition-colors hover:bg-white/10 hover:text-white"
                          title="Logout"
                          aria-label="Logout"
                        >
                          <PowerOff className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gamehaus-lightpurple to-gamehaus-purple font-heading">
              {BRAND_NAME}
            </span>
          </div>
        </div>
        <div className="pt-16"></div>
      </>
    );
  }

  // Desktop version with Sidebar
  return (
    <Sidebar className="border-r-0 bg-gamehaus-darker text-white w-[250px]">
      <SidebarHeader className="p-4 flex items-center gap-3">
        <img
          src={LOGO_PATH}
          alt="Gamehaus – Premier Snooker & Gaming Lounge"
          className="h-14 w-14 object-contain animate-bounce filter drop-shadow-[0_0_15px_rgba(255,74,26,0.65)] animate-neon-pulse"
        />
        <span className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gamehaus-lightpurple via-gamehaus-magenta to-gamehaus-purple font-heading">
          {BRAND_NAME}
        </span>
      </SidebarHeader>
      <SidebarSeparator className="mx-4 bg-gamehaus-purple/30" />
      <SidebarContent className="mt-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item, index) => (
                <SidebarMenuItem key={item.path} className={`animate-fade-in delay-${index * 100} text-base`}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.path}>
                    <Link to={item.path} className="flex items-center menu-item py-2.5">
                      <item.icon className={`mr-3 h-6 w-6 ${location.pathname === item.path ? 'text-gamehaus-lightpurple animate-pulse-soft' : ''}`} />
                      <span className="font-quicksand">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/35 p-4 shadow-xl shadow-black/40 backdrop-blur-xl transition-all duration-300 hover:border-gamehaus-purple/40 hover:bg-black/40">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-gamehaus-purple/16 via-transparent to-gamehaus-magenta/14 opacity-90" />
          <div className="pointer-events-none absolute -left-10 -top-10 h-28 w-28 rounded-full bg-gamehaus-cyan/10 blur-2xl" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/5">
                {isAdmin ? (
                  <Shield className="h-5 w-5 text-gamehaus-lightpurple" />
                ) : (
                  <User className="h-5 w-5 text-gamehaus-lightpurple" />
                )}
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-green-400 shadow-[0_0_12px_rgba(34,197,94,0.55)]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className="min-w-0 flex-1 truncate text-sm font-semibold font-quicksand text-white/95"
                        title={user.username}
                      >
                        {user.username}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[min(360px,85vw)] bg-black/80 text-gray-100 border border-white/10">
                      {user.username}
                    </TooltipContent>
                  </Tooltip>
                  <span className="shrink-0 rounded-full border border-gamehaus-purple/30 bg-gamehaus-purple/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-gamehaus-lightpurple">
                    {isAdmin ? "ADMIN" : "STAFF"}
                  </span>
                </div>
                <span className="mt-0.5 block text-[11px] font-quicksand text-gray-400">
                  Access level:{" "}
                  <span className="text-gray-200">{isAdmin ? "Administrator" : "Staff"}</span>
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-200 transition-colors hover:bg-white/10 hover:text-white"
              title="Logout"
              aria-label="Logout"
            >
              <PowerOff className="h-4 w-4" />
            </button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
