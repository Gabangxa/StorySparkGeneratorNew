import { STORY_TYPES, type StoryType } from "@shared/schema";
import { Compass, Heart, SmilePlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StoryTypeCardProps {
  value: StoryType;
  selected: boolean;
  onClick: (type: StoryType) => void;
}

const storyTypeConfig = {
  adventure: {
    icon: Compass,
    title: "Adventure",
    description: "Exciting journeys and discoveries",
    bgColor: "bg-[#FF6B6B]/10",
    iconColor: "text-[#FF6B6B]"
  },
  moral_lesson: {
    icon: Heart,
    title: "Moral Lesson",
    description: "Stories with values and lessons",
    bgColor: "bg-[#4ECDC4]/10",
    iconColor: "text-[#4ECDC4]"
  },
  fun_story: {
    icon: SmilePlus,
    title: "Fun Story",
    description: "Humorous and entertaining tales",
    bgColor: "bg-[#FFE66D]/20",
    iconColor: "text-[#FFE66D]"
  }
};

export default function StoryTypeCard({ value, selected, onClick }: StoryTypeCardProps) {
  const config = storyTypeConfig[value];
  const IconComponent = config.icon;
  
  return (
    <div 
      className={cn(
        "story-card bg-white border-2 rounded-xl p-4 cursor-pointer transition-all",
        selected ? "border-[#FF6B6B]" : "border-gray-200 hover:border-[#FF6B6B]"
      )}
      onClick={() => onClick(value)}
    >
      <div className="flex items-start mb-3">
        <div className={`${config.bgColor} p-2 rounded-full mr-3`}>
          <IconComponent className={`${config.iconColor} h-5 w-5`} />
        </div>
        <div>
          <h4 className="font-bold">{config.title}</h4>
          <p className="text-sm text-gray-600">{config.description}</p>
        </div>
      </div>
    </div>
  );
}
