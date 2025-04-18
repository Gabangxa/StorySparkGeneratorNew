import { ART_STYLES, type ArtStyle } from "@shared/schema";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Import SVG assets from the assets directory
import {
  animeStyleImage,
  watercolorStyleImage,
  cartoon3dStyleImage,
  pixelArtStyleImage,
  comicBookStyleImage
} from "@/assets";

interface ArtStyleCardProps {
  style: ArtStyle;
  selected: boolean;
  onClick: (style: ArtStyle) => void;
}

const artStyleConfig = {
  anime: {
    title: "Anime/Manga",
    description: "Expressive characters with Japanese-inspired aesthetics",
    imageUrl: animeStyleImage
  },
  watercolor: {
    title: "Watercolor",
    description: "Soft, dreamy illustrations with gentle colors",
    imageUrl: watercolorStyleImage
  },
  "3d_cartoon": {
    title: "3D Cartoon",
    description: "Modern, vibrant illustrations with depth",
    imageUrl: cartoon3dStyleImage
  },
  pixel_art: {
    title: "Pixel Art",
    description: "Retro-inspired digital illustrations",
    imageUrl: pixelArtStyleImage
  },
  comic_book: {
    title: "Comic Book",
    description: "Bold, action-oriented illustrations with outlines",
    imageUrl: comicBookStyleImage
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
