import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
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
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
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
    marginTop: 40,
    fontSize: 10,
    color: '#666',
  },
});

/**
 * Props interface for the StoryBook component
 */
interface StoryBookProps {
  story: Story;  // The complete story data including pages and metadata
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
  const { title, description, pages, layoutType, storyType, ageRange, artStyle } = story;
  
  return (
    <Document title={title}>
      {/* Cover Page - Contains title, description, and metadata */}
      <Page size="A5" orientation="landscape" style={styles.page}>
        <View style={styles.coverPage}>
          {/* Story title */}
          <Text style={styles.title}>{title}</Text>
          
          {/* Story description */}
          <Text style={styles.description}>{description}</Text>
          
          {/* Story metadata - type, age range, and art style */}
          <Text style={styles.metaInfo}>
            {storyType.replace('_', ' ')} story for ages {ageRange} • {artStyle.replace('_', ' ')} style
          </Text>
          
          {/* Creation metadata - app name and date */}
          <Text style={styles.metaInfo}>
            Created with StoryWonder • {new Date(story.createdAt).toLocaleDateString()}
          </Text>
        </View>
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
