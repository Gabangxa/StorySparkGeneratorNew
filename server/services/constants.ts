
// Detailed art style descriptions for distinctive visual outputs
export const ART_STYLE_DESCRIPTIONS: Record<string, string> = {
  anime: `Japanese anime style with:
- Large expressive eyes with detailed highlights and reflections
- Soft, smooth skin shading with cel-shaded shadows
- Vibrant, saturated colors with high contrast
- Clean, bold outlines with varying line weights
- Dynamic poses and exaggerated expressions
- Simplified but elegant backgrounds with soft gradients
- Hair rendered with flowing strands and glossy highlights
- Characters with slim proportions and pointed chins`,

  watercolor: `Traditional watercolor painting style with:
- Soft, wet-on-wet blending with visible paint bleeds
- Translucent, layered washes of color
- Subtle color variations within areas (granulation)
- Soft, undefined edges that fade into white paper
- Gentle brushstrokes visible in texture
- Muted, pastel color palette with organic tones
- Loose, sketchy linework or no outlines
- White spaces left for highlights (paper showing through)
- Dreamy, ethereal atmosphere`,

  "3d_cartoon": `Pixar/Disney-style 3D animated look with:
- Smooth, rounded forms with subsurface scattering on skin
- Exaggerated proportions (large heads, big eyes)
- Soft ambient occlusion and global illumination
- Rich, saturated colors with subtle gradients
- Clean, polished surfaces with subtle texture
- Expressive, squash-and-stretch style poses
- Soft shadows and rim lighting
- Stylized but realistic materials
- Warm, inviting lighting like animated films`,

  pixel_art: `Retro pixel art style with:
- Limited color palette (8-16 colors maximum)
- Clear individual pixels visible (no anti-aliasing)
- Dithering patterns for shading and gradients
- Bold, simple shapes defined by pixel placement
- Nostalgic 16-bit video game aesthetic
- Black or dark outlines around characters
- Flat colors with minimal shading
- Chunky, blocky character designs
- Simple backgrounds with repeating tile patterns`,

  comic_book: `Classic comic book illustration style with:
- Bold, confident black ink outlines
- Ben-Day dots or halftone patterns for shading
- Flat, solid color fills with limited palette
- Dynamic action poses and dramatic angles
- Speed lines and motion effects
- Strong shadows with hard edges
- Expressive, exaggerated facial features
- Panel-ready composition with clear focal points
- Pop art influence with bold primary colors`,

  minimalist_caricature: `Minimalist caricature style with:
- Simple, clean lines with minimal detail
- Exaggerated facial features and proportions
- Bold, confident single-weight outlines
- Large heads with simplified body shapes
- Flat colors with no gradients or shading
- Distinctive, memorable character silhouettes
- Playful, whimsical expressions
- Minimal background elements
- Focus on key identifying features`,

  line_art: `Pure line art illustration style with:
- Clean, precise ink lines as the primary element
- No color fills, only outlines and strokes
- Varying line weights for depth and emphasis
- Cross-hatching or stippling for shading
- White background with black lines
- Elegant, detailed linework
- Professional illustration quality
- Clear, readable compositions
- Artistic pen and ink aesthetic`,

  stick_man: `Simple stick figure illustration style with:
- Basic stick figure representations of people
- Circle heads with simple dot eyes and curved smile
- Single lines for arms, legs, and body
- Very simple, child-like drawing style
- Minimal detail, maximum clarity
- Basic shapes for objects and backgrounds
- Black lines on white background
- Playful, accessible aesthetic
- Easy to understand visual storytelling`,

  gouache_texture: `Gouache and textured painting style with:
- Rich, opaque paint with visible brushwork
- Layered textures and impasto effects
- Matte, velvety finish characteristic of gouache
- Bold, saturated colors with depth
- Visible brush strokes adding character
- Paper or canvas texture showing through
- Traditional illustration book quality
- Warm, cozy feeling with organic textures
- Hand-painted, artisanal appearance`
};

export function getArtStyleDescription(style: string): string {
    const normalizedStyle = style.toLowerCase().replace(/\s+/g, '_');
    return ART_STYLE_DESCRIPTIONS[normalizedStyle] || `${style} illustration style with bright, child-friendly colors`;
}

export function getColorModeDescription(colorMode: string): string {
    if (colorMode === 'monochrome') {
        return `IMPORTANT: Create this illustration in BLACK AND WHITE / MONOCHROME only. 
Use only grayscale values - pure black, pure white, and shades of gray.
No color whatsoever. Think classic black and white book illustrations.`;
    }
    return ''; // Color mode doesn't need extra description
}
