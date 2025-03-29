import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { BookOpen, Menu, User } from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { name: "Home", path: "/" },
  { name: "My Stories", path: "/my-stories" },
  { name: "Create", path: "/create" }
];

export default function Header() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="w-full bg-white py-4 px-6 shadow-sm sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/">
          <a className="flex items-center">
            <BookOpen className="h-8 w-8 text-[#FF6B6B] mr-2" />
            <h1 className="text-2xl font-bold font-['Quicksand'] text-[#FF6B6B]">StoryWonder</h1>
          </a>
        </Link>
        
        <nav className={`${mobileMenuOpen ? "flex" : "hidden"} md:flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-6 
          absolute md:relative top-16 right-6 md:top-0 md:right-0 bg-white p-4 md:p-0 rounded-xl md:rounded-none shadow-lg md:shadow-none z-50`}>
          {NAV_ITEMS.map((item) => (
            <Link key={item.path} href={item.path}>
              <a className={`font-medium transition-colors hover:text-[#FF6B6B] ${location === item.path ? "text-[#FF6B6B]" : "text-gray-800"}`}>
                {item.name}
              </a>
            </Link>
          ))}
        </nav>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="h-6 w-6 text-gray-800" />
          </Button>
          
          <Button className="hidden md:flex bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white items-center">
            <User className="mr-2 h-4 w-4" />
            <span>Sign In</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
