import { useQuery } from "@tanstack/react-query";
import { Story } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Eye, Download, Trash2, Plus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function MyStories() {
  const [storyToDelete, setStoryToDelete] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: stories, isLoading, isError } = useQuery<Story[]>({
    queryKey: ["/api/stories"],
  });

  const { mutate: deleteStory } = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/stories/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Story deleted",
        description: "The story has been removed from your library"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stories"] });
      setStoryToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Failed to delete story",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleDeleteConfirm = () => {
    if (storyToDelete !== null) {
      deleteStory(storyToDelete);
    }
  };

  const getStoryTypeColor = (type: string) => {
    switch (type) {
      case "adventure":
        return "bg-[#FF6B6B]/10 text-[#FF6B6B]";
      case "moral_lesson":
        return "bg-[#4ECDC4]/10 text-[#4ECDC4]";
      case "fun_story":
        return "bg-[#FFE66D]/20 text-[#FFE66D]";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Format story type for display
  const formatStoryType = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const renderSkeletons = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <div className="h-40 bg-gray-200">
            <Skeleton className="h-full w-full" />
          </div>
          <CardContent className="p-4">
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-5/6 mb-4" />
            <div className="flex justify-between">
              <Skeleton className="h-8 w-20" />
              <div className="flex space-x-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderContent = () => {
    if (isLoading) return renderSkeletons();
    
    if (isError) return (
      <div className="text-center py-12">
        <p className="text-red-500">Error loading your stories. Please try again later.</p>
      </div>
    );
    
    if (stories?.length === 0) return (
      <div className="text-center py-12">
        <h3 className="text-xl font-bold mb-4">You don't have any stories yet</h3>
        <p className="mb-6">Create your first story to see it in your library.</p>
        <Button asChild className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90">
          <Link href="/create">
            <Plus className="mr-2 h-4 w-4" /> Create Your First Story
          </Link>
        </Button>
      </div>
    );
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stories?.map((story) => (
          <Card key={story.id} className="overflow-hidden story-card">
            <div 
              className="h-40 bg-gray-100 flex items-center justify-center overflow-hidden"
              style={{
                backgroundImage: story.pages[0]?.imageUrl ? `url(${story.pages[0]?.imageUrl})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              {!story.pages[0]?.imageUrl && (
                <p className="text-gray-400">No preview available</p>
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60"></div>
              <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                <h3 className="font-bold text-lg truncate">{story.title}</h3>
              </div>
            </div>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-2 line-clamp-2 h-10">
                {story.description}
              </p>
              <div className="flex justify-between items-center">
                <span className={`text-xs px-3 py-1 rounded-full ${getStoryTypeColor(story.storyType)}`}>
                  {formatStoryType(story.storyType)}
                </span>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(story.createdAt), { addSuffix: true })}
                </span>
              </div>
              <div className="flex justify-between items-center mt-4">
                <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">
                  Ages {story.ageRange}
                </span>
                <div className="flex space-x-1">
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 text-gray-500 hover:text-[#4ECDC4]"
                    asChild
                  >
                    <Link href={`/stories/${story.id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 text-gray-500 hover:text-[#FF6B6B]"
                    onClick={() => setStoryToDelete(story.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10">
          <div>
            <h2 className="text-3xl font-bold mb-2">My Stories</h2>
            <p className="text-gray-600">Your collection of generated storybooks</p>
          </div>
          <Button asChild className="mt-4 md:mt-0 bg-[#FF6B6B] hover:bg-[#FF6B6B]/90">
            <Link href="/create">
              <Plus className="mr-2 h-4 w-4" /> Create New Story
            </Link>
          </Button>
        </div>
        
        {renderContent()}
      </div>

      <AlertDialog open={storyToDelete !== null} onOpenChange={(open) => !open && setStoryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this story from your library. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-500 hover:bg-red-600 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
