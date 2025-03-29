import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { Story } from '@shared/schema';
import PDFStoryPage from './StoryPage';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
  },
  coverPage: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: '80%',
  },
  metaInfo: {
    marginTop: 40,
    fontSize: 10,
    color: '#666',
  },
});

interface StoryBookProps {
  story: Story;
}

export default function StoryBook({ story }: StoryBookProps) {
  const { title, description, pages, layoutType, storyType, ageRange, artStyle } = story;
  
  return (
    <Document title={title}>
      {/* Cover Page */}
      <Page size="A5" orientation="landscape" style={styles.page}>
        <View style={styles.coverPage}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
          <Text style={styles.metaInfo}>
            {storyType.replace('_', ' ')} story for ages {ageRange} • {artStyle.replace('_', ' ')} style
          </Text>
          <Text style={styles.metaInfo}>
            Created with StoryWonder • {new Date(story.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </Page>
      
      {/* Story Pages */}
      {pages.map((page) => (
        <PDFStoryPage 
          key={page.pageNumber} 
          page={page} 
          layoutType={layoutType as 'side_by_side' | 'picture_top'} 
          totalPages={pages.length}
        />
      ))}
    </Document>
  );
}
