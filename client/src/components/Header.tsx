import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { BookOpen, Menu, User, Zap, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";

const NAV_ITEMS = [
  { name: "Home", path: "/" },
  { name: "My Stories", path: "/my-stories" },
  { name: "Create", path: "/create" }
];

export default function Header() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user: authUser, isLoading: authLoading, logout } = useAuth();

  // Fetch credits only when authenticated
  const { data: creditsData } = useQuery<{ credits: number; userId: string; username?: string }>({
    queryKey: ["/api/user/credits"],
    enabled: !!authUser,
    retry: false
  });

  return (
    <header className="w-full bg-white py-4 px-6 shadow-sm sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <Link href="/">
            <div className="flex items-center cursor-pointer">
              <BookOpen className="h-8 w-8 text-[#FF6B6B] mr-2" />
              <h1 className="text-2xl font-bold font-['Quicksand'] text-[#FF6B6B]">StoryWonder</h1>
            </div>
          </Link>
        </div>
        
        <nav className={`${mobileMenuOpen ? "flex" : "hidden"} md:flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-6 
          absolute md:relative top-16 right-6 md:top-0 md:right-0 bg-white p-4 md:p-0 rounded-xl md:rounded-none shadow-lg md:shadow-none z-50`}>
          {NAV_ITEMS.map((item) => (
            <div key={item.path} className="flex">
              <Link href={item.path}>
                <span className={`font-medium transition-colors hover:text-[#FF6B6B] cursor-pointer ${location === item.path ? "text-[#FF6B6B]" : "text-gray-800"}`}>
                  {item.name}
                </span>
              </Link>
            </div>
          ))}
        </nav>
        
        <div className="flex items-center space-x-3">
          {creditsData && (
            <div 
              className="hidden md:flex items-center bg-yellow-50 px-3 py-1.5 rounded-full border border-yellow-200 mr-2"
              data-testid="credits-badge"
            >
              <Zap className="h-4 w-4 text-yellow-500 mr-1.5" fill="currentColor" />
              <span className="font-bold text-yellow-700 text-sm">{creditsData.credits} Credits</span>
            </div>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="h-6 w-6 text-gray-800" />
          </Button>
          
          {authLoading ? (
            <span className="text-gray-400 text-sm hidden md:block">Loading...</span>
          ) : authUser ? (
            <div className="hidden md:flex items-center space-x-2">
              <div className="flex items-center">
                {authUser.profileImageUrl ? (
                  <img 
                    src={authUser.profileImageUrl} 
                    alt="Profile" 
                    className="h-8 w-8 rounded-full mr-2"
                  />
                ) : (
                  <User className="mr-2 h-4 w-4" />
                )}
                <span className="text-sm font-medium">{authUser.firstName || authUser.email || 'User'}</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => logout()}
                className="text-gray-500 hover:text-gray-700"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <a href="/api/login">
              <Button className="hidden md:flex bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white items-center">
                <User className="mr-2 h-4 w-4" />
                <span>Sign In</span>
              </Button>
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
