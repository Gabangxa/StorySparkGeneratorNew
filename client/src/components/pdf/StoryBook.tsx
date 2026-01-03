import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { Story } from '@shared/schema';
import PDFStoryPage from './StoryPage';

/**
 * StyleSheet for the PDF storybook document
 * Defines the appearance of the cover page and layout
 */
const styles = StyleSheet.create({
  // Main page container style
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    position: 'relative',
  },
  // Cover page centered layout
  coverPage: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  // Story title on cover page
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  // Story description on cover page
  description: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: '80%',
  },
  // Metadata information at bottom of cover page
  metaInfo: {
    marginTop: 20,
    fontSize: 10,
    color: '#666',
  },
  // Cover image container
  coverImageContainer: {
    width: 200,
    height: 200,
    marginBottom: 30,
    borderRadius: 10,
    overflow: 'hidden',
  },
  // Cover image style
  coverImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  // Footer at bottom left of cover
  footer: {
    position: 'absolute',
    bottom: 15,
    left: 30,
    fontSize: 8,
    color: '#999',
  },
});

/**
 * Props interface for the StoryBook component
 */
interface StoryBookProps {
  story: Story;  // The complete story data including pages and metadata
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
 * Component that renders a complete storybook as a PDF document
 * This includes a cover page with story details and all story pages
 * with consistent layout based on the selected style
 *
 * @param story - Complete story data including pages, layout settings, and metadata
 */
export default function StoryBook({ story }: StoryBookProps) {
  // Extract all necessary props from the story object
  const { title, pages, layoutType, storyType, ageRange, artStyle } = story;
  
  // Get the first page image as cover image (with proxy for CORS)
  const rawCoverImageUrl = pages.length > 0 && pages[0].imageUrl ? pages[0].imageUrl : null;
  const coverImageUrl = rawCoverImageUrl ? getProxiedImageUrl(rawCoverImageUrl) : null;
  
  return (
    <Document title={title}>
      {/* Cover Page - Contains title, cover image, and metadata */}
      <Page size="A5" orientation="landscape" style={styles.page}>
        <View style={styles.coverPage}>
          {/* Story title */}
          <Text style={styles.title}>{title}</Text>
          
          {/* Cover image from first page */}
          {coverImageUrl && (
            <View style={styles.coverImageContainer}>
              <Image src={coverImageUrl} style={styles.coverImage} />
            </View>
          )}
          
          {/* Story metadata - type, age range, and art style */}
          <Text style={styles.metaInfo}>
            A {storyType.replace('_', ' ')} for ages {ageRange}
          </Text>
          
          <Text style={styles.metaInfo}>
            {artStyle.replace('_', ' ')} style
          </Text>
        </View>
        
        {/* Footer at bottom left */}
        <Text style={styles.footer}>created with StoryWonder</Text>
      </Page>
      
      {/* Map through and render all story pages with consistent layout */}
      {pages.map((page) => (
        <PDFStoryPage 
          key={page.pageNumber}                                  // Unique key for React
          page={page}                                            // Page data (text, image, etc.)
          layoutType={layoutType as 'side_by_side' | 'picture_top'} // Layout configuration 
          totalPages={pages.length}                              // Total page count for numbering
        />
      ))}
    </Document>
  );
}
