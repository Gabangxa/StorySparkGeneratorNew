import React from 'react';
import { Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { StoryPage as StoryPageType } from '@shared/schema';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 10,
  },
  sideByPage: {
    flexDirection: 'row',
    height: '100%',
    width: '100%',
  },
  pictureTopPage: {
    flexDirection: 'column',
    height: '100%',
    width: '100%',
  },
  imageContainer: {
    flex: 1,
    margin: 10,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
  },
  textContainer: {
    flex: 1,
    padding: 15,
    justifyContent: 'center',
  },
  textContainerSideBySide: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 25,
    justifyContent: 'center',
  },
  text: {
    fontFamily: 'Helvetica',
    fontSize: 14,
    lineHeight: 1.6,
  },
  pageNumber: {
    position: 'absolute',
    fontSize: 12,
    bottom: 20,
    right: 20,
    textAlign: 'center',
    color: '#666',
  },
});

interface PDFStoryPageProps {
  page: StoryPageType;
  layoutType: 'side_by_side' | 'picture_top';
  totalPages: number;
}

export default function PDFStoryPage({ page, layoutType, totalPages }: PDFStoryPageProps) {
  // Function to format paragraph text with proper spacing
  const formatText = (text: string) => {
    // Split by double newlines or paragraph breaks
    return text.split(/\n\n|\r\n\r\n/).map((paragraph, i) => (
      <Text key={i} style={{ marginBottom: 10 }}>
        {paragraph}
      </Text>
    ));
  };

  if (layoutType === 'side_by_side') {
    return (
      <Page size="A5" orientation="landscape" style={styles.page}>
        <View style={styles.sideByPage}>
          <View style={styles.imageContainer}>
            {page.imageUrl ? (
              <Image src={page.imageUrl} style={styles.image} cache={false} />
            ) : (
              <View style={styles.placeholderImage}>
                <Text style={styles.placeholderText}>Image not available</Text>
              </View>
            )}
          </View>
          <View style={styles.textContainerSideBySide}>
            {formatText(page.text)}
          </View>
        </View>
        <Text style={styles.pageNumber}>
          {page.pageNumber} of {totalPages}
        </Text>
      </Page>
    );
  } else {
    return (
      <Page size="A5" orientation="landscape" style={styles.page}>
        <View style={styles.pictureTopPage}>
          <View style={[styles.imageContainer, { flex: 3 }]}>
            {page.imageUrl ? (
              <Image src={page.imageUrl} style={styles.image} cache={false} />
            ) : (
              <View style={styles.placeholderImage}>
                <Text style={styles.placeholderText}>Image not available</Text>
              </View>
            )}
          </View>
          <View style={[styles.textContainer, { flex: 2 }]}>
            {formatText(page.text)}
          </View>
        </View>
        <Text style={styles.pageNumber}>
          {page.pageNumber} of {totalPages}
        </Text>
      </Page>
    );
  }
}
