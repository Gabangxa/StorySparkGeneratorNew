import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Story } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, Download, AlertCircle, Book, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";
import StoryBook from "@/components/pdf/StoryBook";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function ViewStory() {
  const { id } = useParams<{ id: string }>();
  const storyId = parseInt(id);
  const { toast } = useToast();
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  // Fetch the story
  const { data: story, isLoading, isError } = useQuery<Story>({
    queryKey: [`/api/stories/${storyId}`],
    enabled: !isNaN(storyId),
  });

  // Format story type for display
  const formatStoryType = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Render loading skeletons
  const renderLoadingSkeleton = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="mb-6">
            <Skeleton className="h-8 w-72 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-5/6 mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <Separator className="my-6" />
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
          <Separator className="my-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-60 w-full" />
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-5/6" />
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render error state
  const renderError = () => (
    <Card className="text-center py-12">
      <CardContent>
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">Error Loading Story</h3>
        <p className="text-gray-600 mb-6">We couldn't load this story. It may not exist or there was a problem with your connection.</p>
        <Button asChild>
          <Link href="/my-stories">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Stories
          </Link>
        </Button>
      </CardContent>
    </Card>
  );

  if (isLoading) return <div className="container mx-auto px-6 py-8">{renderLoadingSkeleton()}</div>;
  if (isError || !story) return <div className="container mx-auto px-6 py-8">{renderError()}</div>;

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
        <div className="flex items-center mb-4 md:mb-0">
          <Button variant="ghost" asChild className="mr-4 p-0 h-auto">
            <Link href="/my-stories">
              <ChevronLeft className="h-5 w-5 mr-1" />
              Back to Stories
            </Link>
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold">{story.title}</h1>
        </div>
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            onClick={() => setShowPdfPreview(!showPdfPreview)}
            className="border-2 border-[#4ECDC4] text-[#4ECDC4] hover:bg-[#4ECDC4]/5"
          >
            <Book className="mr-2 h-4 w-4" />
            {showPdfPreview ? "Hide PDF Preview" : "View PDF"}
          </Button>
          
          <PDFDownloadLink 
            document={<StoryBook story={story} />} 
            fileName={`${story.title.replace(/\s+/g, '_')}.pdf`}
            className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-[#FF6B6B] text-white hover:bg-[#FF6B6B]/90 h-10 px-4 py-2`}
          >
            {({ loading, error }) => {
              if (loading) return 'Loading document...';
              if (error) {
                return (
                  <>
                    <AlertCircle className="mr-2 h-4 w-4" /> Error
                  </>
                );
              }
              return (
                <>
                  <Download className="mr-2 h-4 w-4" /> Download PDF
                </>
              );
            }}
          </PDFDownloadLink>
        </div>
      </div>

      {showPdfPreview ? (
        <div className="w-full h-[calc(100vh-200px)] mb-8 border border-gray-200 rounded-lg overflow-hidden">
          <PDFViewer width="100%" height="100%" style={{ border: 'none' }}>
            <StoryBook story={story} />
          </PDFViewer>
        </div>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-3">Story Description</h2>
              <p className="text-gray-700">{story.description}</p>
            </div>
            
            <Separator className="my-6" />
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Story Type</h3>
                <p className="font-medium">{formatStoryType(story.storyType)}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Age Range</h3>
                <p className="font-medium">{story.ageRange} years</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Art Style</h3>
                <p className="font-medium">{formatStoryType(story.artStyle)}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Layout</h3>
                <p className="font-medium">{story.layoutType === 'side_by_side' ? 'Side by Side' : 'Picture Top'}</p>
              </div>
            </div>
            
            <Separator className="my-6" />
            
            <h2 className="text-xl font-bold mb-4">Story Pages</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {story.pages.map((page) => (
                <Card key={page.pageNumber} className="overflow-hidden">
                  <div className="aspect-video bg-gray-100 relative overflow-hidden">
                    <img 
                      src={page.imageUrl} 
                      alt={`Page ${page.pageNumber} illustration`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-white/80 rounded-full w-8 h-8 flex items-center justify-center text-gray-800 font-bold">
                      {page.pageNumber}
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <p className="text-sm">{page.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
