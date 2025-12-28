
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
- Pop art influence with bold primary colors`
};

export function getArtStyleDescription(style: string): string {
    const normalizedStyle = style.toLowerCase().replace(/\s+/g, '_');
    return ART_STYLE_DESCRIPTIONS[normalizedStyle] || `${style} illustration style with bright, child-friendly colors`;
}
