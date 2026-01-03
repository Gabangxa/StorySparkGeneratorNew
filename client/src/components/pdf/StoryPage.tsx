import React from 'react';
import { Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { StoryPage as StoryPageType } from '@shared/schema';

/**
 * Styles for the PDF story page components
 * These styles define the layout and appearance of the storybook pages
 */
const styles = StyleSheet.create({
  // Main page container
  page: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 10,
    position: 'relative',
  },
  // Style for side-by-side layout (image left, text right)
  sideByPage: {
    flexDirection: 'row',
    height: '100%',
    width: '100%',
  },
  // Style for picture-top layout (image top, text bottom)
  pictureTopPage: {
    flexDirection: 'column',
    height: '100%',
    width: '100%',
  },
  // Container for the story illustration
  imageContainer: {
    flex: 1,
    margin: 10,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  // Style for the actual image
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  // Placeholder shown when image fails to load
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Text shown in placeholder
  placeholderText: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
  },
  // Container for the story text (picture-top layout)
  textContainer: {
    flex: 1,
    padding: 15,
    justifyContent: 'center',
  },
  // Container for the story text (side-by-side layout)
  textContainerSideBySide: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 25,
    justifyContent: 'center',
  },
  // Style for the story text
  text: {
    fontFamily: 'Helvetica',
    fontSize: 14,
    lineHeight: 1.6,
  },
  // Style for the page number indicator - centered at bottom
  pageNumber: {
    position: 'absolute',
    fontSize: 10,
    bottom: 15,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#666',
  },
});

/**
 * Props interface for the PDF story page component
 */
interface PDFStoryPageProps {
  page: StoryPageType;                             // Story page data
  layoutType: 'side_by_side' | 'picture_top';      // Layout style
  totalPages: number;                              // Total number of pages in the book
}

/**
 * Helper function to get a proxied image URL
 * This converts external URLs to use our proxy route
 * to avoid CORS and cross-origin issues with PDF rendering
 */
function getProxiedImageUrl(url: string): string {
  // If already a relative URL, use as is
  if (url.startsWith('/')) {
    return url;
  }
  
  // Otherwise, use our image proxy
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

/**
 * Component for rendering a single page in the PDF storybook
 * Supports two layout types: side-by-side and picture-top
 * 
 * @param page - The story page data including text and image URL
 * @param layoutType - The layout style to use for this page
 * @param totalPages - Total number of pages in the book for pagination
 */
export default function PDFStoryPage({ page, layoutType, totalPages }: PDFStoryPageProps) {
  /**
   * Helper function to format story text with proper paragraph spacing
   * Splits text by paragraph breaks and wraps each in a Text component
   * 
   * @param text - Raw story text with paragraph breaks
   * @returns Array of Text components, one per paragraph
   */
  const formatText = (text: string) => {
    // Split by double newlines or paragraph breaks
    return text.split(/\n\n|\r\n\r\n/).map((paragraph, i) => (
      <Text key={i} style={{ marginBottom: 10 }}>
        {paragraph}
      </Text>
    ));
  };

  // Process the image URL to use our proxy if it's an external URL
  const imageUrl = page.imageUrl ? getProxiedImageUrl(page.imageUrl) : null;

  // Render page with side-by-side layout (image on left, text on right)
  if (layoutType === 'side_by_side') {
    return (
      <Page size="A5" orientation="landscape" style={styles.page}>
        <View style={styles.sideByPage}>
          {/* Image container (left side) */}
          <View style={styles.imageContainer}>
            {imageUrl ? (
              // Display the image through our proxy
              <Image src={imageUrl} style={styles.image} cache={true} />
            ) : (
              // Show a placeholder if image is not available
              <View style={styles.placeholderImage}>
                <Text style={styles.placeholderText}>Image not available</Text>
              </View>
            )}
          </View>
          {/* Text container (right side) */}
          <View style={styles.textContainerSideBySide}>
            {formatText(page.text)}
          </View>
        </View>
        {/* Page number indicator - centered at bottom */}
        <Text style={styles.pageNumber}>{page.pageNumber}</Text>
      </Page>
    );
  } else {
    // Render page with picture-top layout (image on top, text below)
    return (
      <Page size="A5" orientation="landscape" style={styles.page}>
        <View style={styles.pictureTopPage}>
          {/* Image container (top) - larger proportion for the image */}
          <View style={[styles.imageContainer, { flex: 3 }]}>
            {imageUrl ? (
              // Display the image through our proxy
              <Image src={imageUrl} style={styles.image} cache={true} />
            ) : (
              // Show a placeholder if image is not available
              <View style={styles.placeholderImage}>
                <Text style={styles.placeholderText}>Image not available</Text>
              </View>
            )}
          </View>
          {/* Text container (bottom) - smaller proportion for the text */}
          <View style={[styles.textContainer, { flex: 2 }]}>
            {formatText(page.text)}
          </View>
        </View>
        {/* Page number indicator - centered at bottom */}
        <Text style={styles.pageNumber}>{page.pageNumber}</Text>
      </Page>
    );
  }
}
