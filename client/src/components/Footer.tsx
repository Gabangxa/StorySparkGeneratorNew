import { BookOpen, Facebook, Twitter, Instagram, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Footer() {
  return (
    <footer className="bg-[#2D3436] text-white py-12">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center mb-4">
              <BookOpen className="text-[#FF6B6B] h-6 w-6 mr-2" />
              <h3 className="text-xl font-bold">StoryWonder</h3>
            </div>
            <p className="mb-4 text-gray-400">Creating magical stories for children around the world. One story at a time.</p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-[#FF6B6B] transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-[#FF6B6B] transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-[#FF6B6B] transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-bold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><a href="/" className="text-gray-400 hover:text-[#FF6B6B] transition-colors">Home</a></li>
              <li><a href="/create" className="text-gray-400 hover:text-[#FF6B6B] transition-colors">Create Story</a></li>
              <li><a href="/my-stories" className="text-gray-400 hover:text-[#FF6B6B] transition-colors">My Stories</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-bold mb-4">Support</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-[#FF6B6B] transition-colors">Help Center</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#FF6B6B] transition-colors">Contact Us</a></li>
              <li><a href="/privacy" className="text-gray-400 hover:text-[#FF6B6B] transition-colors" data-testid="link-privacy">Privacy Policy</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#FF6B6B] transition-colors">Terms of Service</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-bold mb-4">Stay Updated</h4>
            <p className="mb-4 text-gray-400">Subscribe to our newsletter for new features, tips, and special offers.</p>
            <div className="flex">
              <Input 
                type="email" 
                placeholder="Your email address" 
                className="bg-gray-700 text-white rounded-r-none focus:outline-none border-0"
              />
              <Button className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white rounded-l-none">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-500">
          <p>&copy; {new Date().getFullYear()} StoryWonder. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
