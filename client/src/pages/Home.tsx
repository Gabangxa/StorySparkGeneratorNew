import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { BookOpen, Magic, Edit, Palette, Download, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#FF6B6B]/10 to-[#4ECDC4]/10 py-12 md:py-20">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="md:w-1/2 mb-10 md:mb-0">
              <h1 className="text-4xl md:text-5xl font-bold font-['Quicksand'] leading-tight mb-4">
                Create Magical Storybooks for Your Children
              </h1>
              <p className="text-lg md:text-xl mb-8">
                Generate beautifully illustrated stories based on your ideas. Perfect for bedtime reading and special memories.
              </p>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <Button 
                  asChild
                  className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white py-3 px-8 rounded-xl text-lg"
                >
                  <Link href="/create">Create a Story</Link>
                </Button>
                <Button 
                  variant="outline"
                  asChild
                  className="border-2 border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B]/5 py-3 px-8 rounded-xl text-lg"
                >
                  <Link href="/my-stories">See Examples</Link>
                </Button>
              </div>
            </div>
            <div className="md:w-1/2 flex justify-center">
              <div className="relative w-full max-w-md transform transition-transform duration-500 hover:rotate-[-3deg] hover:shadow-xl">
                <img 
                  src="https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=600"
                  alt="Open storybook with colorful illustrations" 
                  className="rounded-xl shadow-xl z-10 relative"
                />
                <div className="absolute -top-4 -right-4 bg-[#FFE66D] p-3 rounded-full shadow-lg z-20 transform rotate-12">
                  <Magic className="h-6 w-6 text-[#2D3436]" />
                </div>
                <div className="absolute -bottom-4 -left-4 bg-white p-3 rounded-xl shadow-lg z-20">
                  <p className="text-sm font-bold text-[#FF6B6B]">Ready in minutes!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 md:py-16 bg-gradient-to-b from-white to-[#FF6B6B]/5">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How StoryWonder Works</h2>
            <p className="text-lg max-w-2xl mx-auto">
              Our AI-powered platform creates personalized stories with beautiful illustrations in just 3 simple steps.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-white shadow-md">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-[#FF6B6B]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Edit className="text-[#FF6B6B] h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">1. Describe Your Story</h3>
                <p>Tell us your story idea. Include characters, setting, and any specific elements you want to include.</p>
              </CardContent>
            </Card>
            
            <Card className="bg-white shadow-md">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-[#4ECDC4]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Palette className="text-[#4ECDC4] h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">2. Choose Your Style</h3>
                <p>Select from various illustration styles and page layouts to match your story's theme and mood.</p>
              </CardContent>
            </Card>
            
            <Card className="bg-white shadow-md">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-[#FFE66D]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="text-[#FFE66D] h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">3. Create & Download</h3>
                <p>Our AI generates your unique storybook. Preview, make any adjustments, and download as a ready-to-print PDF.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Story Examples */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Story Examples</h2>
            <p className="text-lg max-w-2xl mx-auto">
              Browse through some of our favorite generated stories for inspiration.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Luna the Light Keeper",
                description: "A young girl discovers she can create and control light, helping her village during the darkest night of the year.",
                type: "Adventure",
                image: "https://images.unsplash.com/photo-1530325553241-4f6e7690cf36"
              },
              {
                title: "The Sharing Tree",
                description: "A magical tree in the forest teaches children the joy of sharing and how kindness grows when spread to others.",
                type: "Moral Lesson",
                image: "https://images.unsplash.com/photo-1560830889-7b9c0f3a3f0a"
              },
              {
                title: "Wigglebot's Silly Day",
                description: "A robot with wobbly legs has hilarious adventures as it tries to learn how to dance for the robot talent show.",
                type: "Fun Story",
                image: "https://images.unsplash.com/photo-1557672172-298e090bd0f1"
              }
            ].map((story, index) => (
              <Card key={index} className="story-card bg-white rounded-xl overflow-hidden shadow-lg">
                <div className="h-48 relative">
                  <img 
                    src={`${story.image}?auto=format&fit=crop&w=400`}
                    alt={`${story.title} storybook`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent text-white p-4">
                    <h3 className="font-bold text-lg">{story.title}</h3>
                  </div>
                </div>
                <CardContent className="p-4">
                  <p className="text-sm mb-4">{story.description}</p>
                  <div className="flex justify-between items-center">
                    <span className={`
                      text-xs px-3 py-1 rounded-full
                      ${story.type === 'Adventure' ? 'bg-[#FF6B6B]/10 text-[#FF6B6B]' : 
                      story.type === 'Moral Lesson' ? 'bg-[#4ECDC4]/10 text-[#4ECDC4]' : 
                      'bg-[#FFE66D]/20 text-[#FFE66D]'}
                    `}>
                      {story.type}
                    </span>
                    <Button variant="link" className="text-sm text-[#4ECDC4] font-bold p-0">
                      Read Preview
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-10">
            <Button asChild className="bg-[#4ECDC4] hover:bg-[#4ECDC4]/90 text-white py-3 px-8 rounded-xl">
              <Link href="/my-stories">
                See More Examples
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20 bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4]">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-3xl mx-auto text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Create Your Child's New Favorite Story?</h2>
            <p className="text-lg md:text-xl mb-8 opacity-90">
              Turn your ideas into beautifully illustrated storybooks in just minutes. Perfect for bedtime reading, special gifts, or educational purposes.
            </p>
            <Button asChild className="bg-white text-[#FF6B6B] hover:bg-white/90 font-bold py-4 px-10 rounded-xl text-lg shadow-lg">
              <Link href="/create">
                Start Creating Now
              </Link>
            </Button>
            <p className="mt-6 text-white/80">No subscription required. Create your first story for free!</p>
          </div>
        </div>
      </section>
    </div>
  );
}
