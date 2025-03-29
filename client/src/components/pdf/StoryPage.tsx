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
  },
  pictureTopPage: {
    flexDirection: 'column',
    height: '100%',
  },
  imageContainer: {
    flex: 1,
    margin: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    objectFit: 'cover',
    width: '100%',
    height: '100%',
  },
  textContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  text: {
    fontFamily: 'Helvetica',
    fontSize: 14,
    lineHeight: 1.5,
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
  if (layoutType === 'side_by_side') {
    return (
      <Page size="A5" orientation="landscape" style={styles.page}>
        <View style={styles.sideByPage}>
          <View style={styles.imageContainer}>
            <Image src={page.imageUrl} style={styles.image} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.text}>{page.text}</Text>
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
            <Image src={page.imageUrl} style={styles.image} />
          </View>
          <View style={[styles.textContainer, { flex: 2 }]}>
            <Text style={styles.text}>{page.text}</Text>
          </View>
        </View>
        <Text style={styles.pageNumber}>
          {page.pageNumber} of {totalPages}
        </Text>
      </Page>
    );
  }
}
