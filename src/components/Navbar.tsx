import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { 
  MapPin, 
  Smartphone, 
  Settings, 
  LogOut, 
  Menu,
  User,
  AppWindow,
  CalendarClock,
  Shield,
  UserCog
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { signOut, getCurrentUser } from '../lib/supabase';
import { isCurrentUserAdmin } from "@/lib/admin";
import { AdminOnly } from "@/components/AdminOnly";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });
    navigate("/login");
  };

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: <MapPin className="h-4 w-4 mr-2" /> },
    { path: "/geofences", label: "Geofences", icon: <MapPin className="h-4 w-4 mr-2" /> },
    { path: "/devices", label: "Devices", icon: <Smartphone className="h-4 w-4 mr-2" /> },
    { path: "/profiles", label: "Profiles", icon: <Settings className="h-4 w-4 mr-2" /> },
    { path: "/schedules", label: "Schedules", icon: <CalendarClock className="h-4 w-4 mr-2" /> },
    { path: "/app-catalog", label: "App Catalog", icon: <AppWindow className="h-4 w-4 mr-2" /> },
  ];

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await getCurrentUser();
        setUserEmail(user?.email || null);
        
        // Check if user is an admin
        if (user) {
          const adminStatus = await isCurrentUserAdmin();
          setIsAdmin(adminStatus);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };

    fetchUser();
  }, []);

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      
      if (error) {
        throw error;
      }
      
      toast({
        title: 'Signed out successfully',
        description: 'You have been logged out of your account.',
      });
      
      // Redirect to login page
      window.location.href = '/login';
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast({
        title: 'Sign out failed',
        description: error.message || 'An error occurred while signing out.',
        variant: 'destructive',
      });
    }
  };

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center px-4">
        <div className="flex items-center gap-2 mr-4">
          <span className="font-bold text-xl">
            MDM Geo
          </span>
        </div>

        {isMobile ? (
          <div className="flex items-center ml-auto">
            <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {navItems.map((item) => (
                  <DropdownMenuItem key={item.path} asChild>
                    <Link
                      to={item.path}
                      className="flex items-center"
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
                
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="flex items-center">
                      <UserCog className="h-4 w-4 mr-2" />
                      Admin
                    </Link>
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuItem className="text-red-500" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <>
            <nav className="flex-1 flex items-center ml-6 gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              
              {isAdmin && (
                <Link
                  to="/admin"
                  className={`flex items-center text-sm font-medium transition-colors ${
                    location.pathname === "/admin"
                      ? "text-primary"
                      : "text-amber-600 hover:text-amber-700"
                  }`}
                >
                  Admin
                </Link>
              )}
            </nav>

            <div className="flex items-center gap-4">
              {userEmail && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="rounded-full flex items-center gap-2">
                      <User className="h-5 w-5" />
                      <span className="hidden md:inline">{userEmail}</span>
                      {isAdmin && (
                        <span className="bg-amber-100 text-amber-800 rounded-full px-2 py-0.5 text-xs font-medium">
                          Admin
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel>
                      My Account
                      {isAdmin && (
                        <span className="ml-2 text-xs font-normal bg-amber-100 text-amber-800 rounded-full px-2 py-0.5">
                          Admin
                        </span>
                      )}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    
                    {isAdmin && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="flex items-center cursor-pointer">
                          <UserCog className="mr-2 h-4 w-4" />
                          <span>Admin Panel</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    
                    <DropdownMenuItem onClick={handleSignOut} className="text-red-600 cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
};

export default Navbar;
