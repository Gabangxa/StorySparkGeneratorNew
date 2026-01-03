import { ART_STYLES, type ArtStyle } from "@shared/schema";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ArtStyleCardProps {
  style: ArtStyle;
  selected: boolean;
  onClick: (style: ArtStyle) => void;
}

const artStyleConfig: Record<ArtStyle, { title: string; description: string; imageUrl: string }> = {
  anime: {
    title: "Anime/Manga",
    description: "Expressive characters with Japanese-inspired aesthetics",
    imageUrl: "/generated-images/c1d5fa25-5337-4e7a-aa60-1ac251676f9d.png"
  },
  watercolor: {
    title: "Watercolor",
    description: "Soft, dreamy illustrations with gentle colors",
    imageUrl: "/generated-images/d2f1dd7e-3fb5-4718-987b-7af0eec69a0a.png"
  },
  "3d_cartoon": {
    title: "3D Cartoon",
    description: "Modern, vibrant illustrations with depth",
    imageUrl: "/generated-images/07b5bfd8-a5f4-459b-87fb-05a8a29a02ac.png"
  },
  pixel_art: {
    title: "Pixel Art",
    description: "Retro-inspired digital illustrations",
    imageUrl: "/generated-images/1fcf1f05-e3bf-45e1-a2d3-9d28ccfdd0c4.png"
  },
  comic_book: {
    title: "Comic Book",
    description: "Bold, action-oriented illustrations with outlines",
    imageUrl: "/generated-images/7ad0de70-477e-4ed5-aa76-3abfdfea5fd5.png"
  },
  minimalist_caricature: {
    title: "Minimalist Caricature",
    description: "Simple, exaggerated features with clean lines",
    imageUrl: "/generated-images/e041c11b-723b-4e5b-86ac-58e404b19fd4.png"
  },
  line_art: {
    title: "Line Art",
    description: "Clean outlines and strokes without fills",
    imageUrl: "/generated-images/635f4922-ed46-403d-b8c3-c111cb335859.png"
  },
  stick_man: {
    title: "Stick Man Style",
    description: "Simple stick figure illustrations",
    imageUrl: "/generated-images/65804239-dd3b-4020-b9ae-9b7e29dea8a5.png"
  },
  gouache_texture: {
    title: "Gouache & Texture",
    description: "Rich, textured paint-like illustrations",
    imageUrl: "/generated-images/17b40cb6-6186-44dc-91b0-e22a862bea6d.png"
  }
};

export default function ArtStyleCard({ style, selected, onClick }: ArtStyleCardProps) {
  const config = artStyleConfig[style];
  
  return (
    <div 
      className={cn(
        "story-card bg-white border-2 rounded-xl overflow-hidden cursor-pointer",
        selected ? "border-[#FF6B6B]" : "border-gray-200 hover:border-[#FF6B6B]"
      )}
      onClick={() => onClick(style)}
    >
      <div className="h-48 overflow-hidden relative bg-gray-50 flex items-center justify-center p-4">
        <img 
          src={config.imageUrl}
          alt={`${config.title} style illustration`}
          className="w-full h-full object-contain"
        />
        {selected && (
          <div className="absolute top-2 right-2 bg-[#FF6B6B] text-white rounded-full w-8 h-8 flex items-center justify-center">
            <Check className="h-5 w-5" />
          </div>
        )}
      </div>
      <div className="p-4">
        <h4 className="font-bold">{config.title}</h4>
        <p className="text-sm text-gray-600">{config.description}</p>
      </div>
    </div>
  );
}
