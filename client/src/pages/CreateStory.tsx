import { useState } from "react";
import { useLocation } from "wouter";
import { 
  AGE_RANGES, AgeRange, ART_STYLES, ArtStyle, LAYOUT_TYPES, LayoutType, 
  STORY_TYPES, StoryType, storyFormSchema, StoryFormData, StoryEntityWithAppearances 
} from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft, ArrowRight, Loader2, WandSparkles, 
  Users, MapPin, Package2, Eye, BookOpen 
} from "lucide-react";
import StoryTypeCard from "@/components/StoryTypeCard";
import ArtStyleCard from "@/components/ArtStyleCard";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Step = 1 | 2 | 3;

export default function CreateStory() {
  const [step, setStep] = useState<Step>(1);
  const [previewData, setPreviewData] = useState<{
    pages: Array<{ text: string; imagePrompt: string; entities: string[] }>;
    entities: StoryEntityWithAppearances[];
  } | null>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(storyFormSchema),
    defaultValues: {
      title: "",
      description: "",
      storyType: "fun_story" as StoryType,
      ageRange: "6-8" as AgeRange,
      artStyle: "anime" as ArtStyle,
      layoutType: "side_by_side" as LayoutType
    }
  });

  const { mutate: createStory, isPending } = useMutation({
    mutationFn: async (data: StoryFormData) => {
      const response = await apiRequest("POST", "/api/stories", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Story created successfully!",
        description: "Your story has been generated and saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stories"] });
      navigate(`/stories/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: "Failed to create story",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  });

  const onSubmit = () => {
    createStory(form.getValues());
  };

  const { mutate: previewStory, isPending: isPreviewLoading } = useMutation({
    mutationFn: async (data: StoryFormData) => {
      const response = await apiRequest("POST", "/api/preview", data);
      return response.json();
    },
    onSuccess: (data) => {
      setPreviewData(data);
    },
    onError: (error) => {
      toast({
        title: "Failed to preview story",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  });

  const nextStep = () => {
    if (step === 1) {
      const { title, description, storyType, ageRange } = form.getValues();
      
      if (!title || !description || !storyType || !ageRange) {
        form.trigger(["title", "description", "storyType", "ageRange"]);
        return;
      }
      
      setStep(2);
    } else if (step === 2) {
      const { artStyle, layoutType } = form.getValues();
      
      if (!artStyle || !layoutType) {
        form.trigger(["artStyle", "layoutType"]);
        return;
      }
      
      setStep(3);
      // Generate a preview when moving to step 3
      previewStory(form.getValues());
    }
  };

  const prevStep = () => {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  };

  const renderStepIndicator = () => (
    <div className="flex flex-wrap mb-8 border-b pb-4">
      <div className="flex items-center mb-4 md:mb-0 mr-6">
        <div className={`${step === 1 ? "bg-[#FF6B6B]" : step > 1 ? "bg-gray-300" : "bg-gray-200"} text-white rounded-full w-8 h-8 flex items-center justify-center mr-2`}>
          {step > 1 ? "✓" : "1"}
        </div>
        <span className={step === 1 ? "font-bold" : step > 1 ? "text-gray-500" : ""}>Describe</span>
      </div>
      
      <div className="flex items-center mb-4 md:mb-0 mr-6">
        <div className={`${step === 2 ? "bg-[#FF6B6B]" : step > 2 ? "bg-gray-300" : "bg-gray-200"} ${step === 2 ? "text-white" : "text-dark"} rounded-full w-8 h-8 flex items-center justify-center mr-2`}>
          {step > 2 ? "✓" : "2"}
        </div>
        <span className={step === 2 ? "font-bold" : ""}>Customize</span>
      </div>
      
      <div className="flex items-center mb-4 md:mb-0">
        <div className={`${step === 3 ? "bg-[#FF6B6B]" : "bg-gray-200"} ${step === 3 ? "text-white" : "text-dark"} rounded-full w-8 h-8 flex items-center justify-center mr-2`}>
          3
        </div>
        <span className={step === 3 ? "font-bold" : ""}>Generate</span>
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="mb-10">
      <h3 className="text-2xl font-bold mb-6">Tell Us About Your Story</h3>
      
      <Form {...form}>
        <form className="space-y-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold">Story Title</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g. 'The Magical Forest Adventure'"
                    className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-[#FF6B6B]"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold">Story Description</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Describe your story idea in detail. Include characters, setting, and any specific plot points you'd like to include..."
                    className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-[#FF6B6B]"
                    rows={4}
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="storyType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold block mb-3">Story Type</FormLabel>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {STORY_TYPES.map((type) => (
                    <StoryTypeCard
                      key={type}
                      value={type}
                      selected={field.value === type}
                      onClick={(value) => field.onChange(value)}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="ageRange"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold block mb-3">Age Range</FormLabel>
                <div className="flex flex-wrap gap-3">
                  {AGE_RANGES.map((range) => (
                    <Button
                      key={range}
                      type="button"
                      variant="outline"
                      className={`px-4 py-2 border-2 rounded-full transition-colors ${
                        field.value === range 
                          ? "border-[#FF6B6B] bg-[#FF6B6B]/5" 
                          : "border-gray-200 hover:border-[#FF6B6B]"
                      }`}
                      onClick={() => field.onChange(range)}
                    >
                      {range} years
                    </Button>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
      
      <div className="flex justify-end mt-8">
        <Button 
          onClick={nextStep}
          className="bg-[#4ECDC4] hover:bg-[#4ECDC4]/90 text-white font-bold py-3 px-8 rounded-xl"
        >
          Next: Customize Style
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="mb-10">
      <h3 className="text-2xl font-bold mb-6">Choose Art Style</h3>
      
      <Form {...form}>
        <form className="space-y-8">
          <FormField
            control={form.control}
            name="artStyle"
            render={({ field }) => (
              <FormItem>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {ART_STYLES.map((style) => (
                    <ArtStyleCard
                      key={style}
                      style={style}
                      selected={field.value === style}
                      onClick={(value) => field.onChange(value)}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="layoutType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-2xl font-bold block mb-6">Page Layout</FormLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* Side by Side Layout */}
                  <div 
                    className={`story-card bg-white border-2 ${field.value === 'side_by_side' ? 'border-[#FF6B6B]' : 'border-gray-200 hover:border-[#FF6B6B]'} rounded-xl overflow-hidden cursor-pointer`}
                    onClick={() => field.onChange('side_by_side')}
                  >
                    <div className="aspect-video bg-gray-100 flex items-center justify-center">
                      <div className="w-4/5 aspect-[4/3] bg-white shadow-md flex">
                        <div className="w-1/2 bg-[#FF6B6B]/10 flex items-center justify-center">
                          <div className="text-[#FF6B6B] text-3xl">🖼️</div>
                        </div>
                        <div className="w-1/2 p-3 flex items-center">
                          <div className="space-y-2">
                            <div className="h-2 bg-gray-200 rounded-full w-full"></div>
                            <div className="h-2 bg-gray-200 rounded-full w-full"></div>
                            <div className="h-2 bg-gray-200 rounded-full w-3/4"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <h4 className="font-bold">Side by Side</h4>
                      <p className="text-sm text-gray-600">Illustrations next to text for easy reading</p>
                    </div>
                  </div>
                  
                  {/* Picture Top Layout */}
                  <div 
                    className={`story-card bg-white border-2 ${field.value === 'picture_top' ? 'border-[#FF6B6B]' : 'border-gray-200 hover:border-[#FF6B6B]'} rounded-xl overflow-hidden cursor-pointer`}
                    onClick={() => field.onChange('picture_top')}
                  >
                    <div className="aspect-video bg-gray-100 flex items-center justify-center">
                      <div className="w-4/5 aspect-[4/3] bg-white shadow-md flex flex-col">
                        <div className="h-3/5 bg-[#4ECDC4]/10 flex items-center justify-center">
                          <div className="text-[#4ECDC4] text-3xl">🖼️</div>
                        </div>
                        <div className="h-2/5 p-3">
                          <div className="space-y-2">
                            <div className="h-2 bg-gray-200 rounded-full w-full"></div>
                            <div className="h-2 bg-gray-200 rounded-full w-full"></div>
                            <div className="h-2 bg-gray-200 rounded-full w-3/4"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <h4 className="font-bold">Picture Top</h4>
                      <p className="text-sm text-gray-600">Large illustrations with text below</p>
                    </div>
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
      
      <div className="flex justify-between mt-8">
        <Button 
          variant="outline"
          onClick={prevStep}
          className="border-2 border-gray-300 text-gray-600 font-bold py-3 px-8 rounded-xl hover:bg-gray-100"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Back
        </Button>
        
        <Button 
          onClick={nextStep}
          className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white font-bold py-3 px-8 rounded-xl"
        >
          Generate My Story
          <WandSparkles className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );

  // Helper function to get icon for entity type
  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'character':
        return <Users className="h-4 w-4" />;
      case 'location':
        return <MapPin className="h-4 w-4" />;
      case 'object':
        return <Package2 className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const renderPreviewSection = () => {
    if (isPreviewLoading) {
      return (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#4ECDC4]" />
          <p className="text-lg">Analyzing your story and identifying key elements...</p>
        </div>
      );
    }

    if (!previewData) {
      return null;
    }

    return (
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6 mb-8">
        <h4 className="text-xl font-bold mb-4 flex items-center">
          <Eye className="mr-2 h-5 w-5 text-[#4ECDC4]" />
          Story Elements Preview
        </h4>
        
        <Tabs defaultValue="characters" className="mb-4">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="characters" className="flex items-center">
              <Users className="mr-2 h-4 w-4" /> Characters
            </TabsTrigger>
            <TabsTrigger value="locations" className="flex items-center">
              <MapPin className="mr-2 h-4 w-4" /> Locations
            </TabsTrigger>
            <TabsTrigger value="objects" className="flex items-center">
              <Package2 className="mr-2 h-4 w-4" /> Objects
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="characters" className="space-y-4">
            {previewData.entities
              .filter(entity => entity.type === 'character')
              .map(entity => (
                <div key={entity.id} className="bg-[#F9F9F9] rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-bold text-lg">{entity.name}</h5>
                      <p className="text-gray-600 text-sm">{entity.description}</p>
                    </div>
                    <Badge className="bg-[#FF6B6B]">
                      Appears in {entity.appearsInPages.length} {entity.appearsInPages.length === 1 ? 'page' : 'pages'}
                    </Badge>
                  </div>
                  
                  {entity.appearsInPages.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600 mb-1">Appears on pages:</p>
                      <div className="flex flex-wrap gap-1">
                        {entity.appearsInPages.map(pageNum => (
                          <span key={`${entity.id}-p${pageNum}`} className="bg-[#4ECDC4]/20 text-[#4ECDC4] text-xs font-medium px-2 py-1 rounded-full">
                            Page {pageNum}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            {previewData.entities.filter(entity => entity.type === 'character').length === 0 && (
              <p className="text-center py-8 text-gray-500">No characters identified in your story.</p>
            )}
          </TabsContent>
          
          <TabsContent value="locations" className="space-y-4">
            {previewData.entities
              .filter(entity => entity.type === 'location')
              .map(entity => (
                <div key={entity.id} className="bg-[#F9F9F9] rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-bold text-lg">{entity.name}</h5>
                      <p className="text-gray-600 text-sm">{entity.description}</p>
                    </div>
                    <Badge className="bg-[#4ECDC4]">
                      Appears in {entity.appearsInPages.length} {entity.appearsInPages.length === 1 ? 'page' : 'pages'}
                    </Badge>
                  </div>
                  
                  {entity.appearsInPages.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600 mb-1">Appears on pages:</p>
                      <div className="flex flex-wrap gap-1">
                        {entity.appearsInPages.map(pageNum => (
                          <span key={`${entity.id}-p${pageNum}`} className="bg-[#4ECDC4]/20 text-[#4ECDC4] text-xs font-medium px-2 py-1 rounded-full">
                            Page {pageNum}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            {previewData.entities.filter(entity => entity.type === 'location').length === 0 && (
              <p className="text-center py-8 text-gray-500">No locations identified in your story.</p>
            )}
          </TabsContent>
          
          <TabsContent value="objects" className="space-y-4">
            {previewData.entities
              .filter(entity => entity.type === 'object')
              .map(entity => (
                <div key={entity.id} className="bg-[#F9F9F9] rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-bold text-lg">{entity.name}</h5>
                      <p className="text-gray-600 text-sm">{entity.description}</p>
                    </div>
                    <Badge className="bg-[#FFE66D] text-gray-800">
                      Appears in {entity.appearsInPages.length} {entity.appearsInPages.length === 1 ? 'page' : 'pages'}
                    </Badge>
                  </div>
                  
                  {entity.appearsInPages.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600 mb-1">Appears on pages:</p>
                      <div className="flex flex-wrap gap-1">
                        {entity.appearsInPages.map(pageNum => (
                          <span key={`${entity.id}-p${pageNum}`} className="bg-[#4ECDC4]/20 text-[#4ECDC4] text-xs font-medium px-2 py-1 rounded-full">
                            Page {pageNum}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            {previewData.entities.filter(entity => entity.type === 'object').length === 0 && (
              <p className="text-center py-8 text-gray-500">No objects identified in your story.</p>
            )}
          </TabsContent>
        </Tabs>
        
        <div className="bg-[#F9F9F9]/50 p-4 rounded-lg border border-dashed border-gray-300">
          <div className="flex items-center mb-2">
            <BookOpen className="mr-2 h-5 w-5 text-[#4ECDC4]" />
            <h5 className="font-bold">Visual Consistency Feature</h5>
          </div>
          <p className="text-sm text-gray-600">
            Your story will maintain visual consistency for all characters, locations, and objects
            across every illustration, ensuring a cohesive and professional storybook experience.
          </p>
        </div>
      </div>
    );
  };

  const renderStep3 = () => (
    <div className="mb-10">
      <h3 className="text-2xl font-bold mb-6">Generate Your Story</h3>
      
      <div className="bg-[#F9F9F9] rounded-xl p-8 mb-8">
        <h4 className="text-xl font-bold mb-4">Story Summary</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-gray-600 mb-2">Title</p>
            <p className="font-bold text-lg">{form.getValues("title")}</p>
          </div>
          
          <div>
            <p className="text-gray-600 mb-2">Story Type</p>
            <p className="font-bold">{form.getValues("storyType").replace("_", " ")}</p>
          </div>
          
          <div>
            <p className="text-gray-600 mb-2">Age Range</p>
            <p className="font-bold">{form.getValues("ageRange")} years</p>
          </div>
          
          <div>
            <p className="text-gray-600 mb-2">Art Style</p>
            <p className="font-bold">{form.getValues("artStyle").replace("_", " ")}</p>
          </div>
          
          <div className="md:col-span-2">
            <p className="text-gray-600 mb-2">Description</p>
            <p>{form.getValues("description")}</p>
          </div>
        </div>
      </div>

      {renderPreviewSection()}
      
      <div className="text-center p-6 bg-white rounded-xl border-2 border-[#FFE66D]/50 mb-8">
        <p className="mb-4 text-lg">
          When you click "Create My Storybook", our AI will generate your story with custom illustrations. This process takes about 1-2 minutes.
        </p>
        <p className="text-[#FF6B6B] font-bold">
          Your storybook will be ready to view and download as a PDF!
        </p>
      </div>
      
      <div className="flex justify-between">
        <Button 
          variant="outline"
          onClick={prevStep}
          className="border-2 border-gray-300 text-gray-600 font-bold py-3 px-8 rounded-xl hover:bg-gray-100"
          disabled={isPending}
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Back
        </Button>
        
        <Button 
          onClick={onSubmit}
          disabled={isPending}
          className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white font-bold py-3 px-8 rounded-xl"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Creating Your Storybook...
            </>
          ) : (
            <>
              Create My Storybook
              <WandSparkles className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Create Your Story</h2>
          <p className="text-lg max-w-2xl mx-auto">
            Input your story idea, choose a style, and watch the magic happen. Perfect for parents, teachers, and storytellers of all kinds.
          </p>
        </div>
        
        <Card className="bg-white rounded-xl shadow-lg">
          <CardContent className="p-6 md:p-10">
            {renderStepIndicator()}
            
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
