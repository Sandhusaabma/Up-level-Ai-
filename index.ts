import { Article } from '../../types';
import { AI_TOOLS_ARTICLES } from './aiTools';
import { PRODUCTIVITY_ARTICLES } from './productivity';
import { AI_ARTICLES } from './ai';
import { TECHNOLOGY_ARTICLES } from './technology';
import { SOFTWARE_ARTICLES } from './software';
import { HOW_TO_ARTICLES } from './howTo';
import { REVIEWS_AND_COMPARISONS_ARTICLES } from './reviewsAndComparisons';

// Combine all 64 comprehensive articles
export const ALL_ARTICLES: Article[] = [
  ...AI_TOOLS_ARTICLES,
  ...PRODUCTIVITY_ARTICLES,
  ...AI_ARTICLES,
  ...TECHNOLOGY_ARTICLES,
  ...SOFTWARE_ARTICLES,
  ...HOW_TO_ARTICLES,
  ...REVIEWS_AND_COMPARISONS_ARTICLES
];

export const getAllArticles = (): Article[] => {
  return ALL_ARTICLES;
};

export const getArticleBySlug = (slug: string): Article | undefined => {
  return ALL_ARTICLES.find(a => a.slug === slug);
};

export const getArticlesByCategory = (categorySlug: string): Article[] => {
  if (categorySlug === 'news-trends') {
    // Return articles flagged with trends or latest updates
    return ALL_ARTICLES.filter(a => a.tags.includes('Trends') || a.categorySlug === 'artificial-intelligence').slice(0, 8);
  }
  return ALL_ARTICLES.filter(a => a.categorySlug === categorySlug);
};

export const getFeaturedArticles = (): Article[] => {
  return ALL_ARTICLES.filter(a => a.isFeatured).slice(0, 6);
};

export const getTrendingArticles = (): Article[] => {
  return ALL_ARTICLES.filter(a => a.isTrending).slice(0, 8);
};

export const getEditorsPicks = (): Article[] => {
  return ALL_ARTICLES.filter(a => a.isFeatured && !a.isTrending).concat(
    ALL_ARTICLES.filter(a => a.categorySlug === 'productivity' || a.categorySlug === 'how-to-guides')
  ).slice(0, 4);
};

export const getLatestArticles = (limit: number = 8): Article[] => {
  return [...ALL_ARTICLES].sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()).slice(0, limit);
};

export const getRelatedArticles = (currentSlug: string, count: number = 3): Article[] => {
  const current = getArticleBySlug(currentSlug);
  if (!current) return ALL_ARTICLES.slice(0, count);

  // Match by category or tags
  const matched = ALL_ARTICLES.filter(a => {
    if (a.slug === currentSlug) return false;
    const sameCat = a.categorySlug === current.categorySlug;
    const sharedTag = a.tags.some(t => current.tags.includes(t));
    return sameCat || sharedTag;
  });

  return matched.slice(0, count);
};

export const searchArticles = (query: string, categoryFilter?: string): Article[] => {
  const cleanQ = query.trim().toLowerCase();
  return ALL_ARTICLES.filter(article => {
    if (categoryFilter && categoryFilter !== 'all' && article.categorySlug !== categoryFilter) {
      return false;
    }
    if (!cleanQ) return true;

    const inTitle = article.title.toLowerCase().includes(cleanQ);
    const inExcerpt = article.excerpt.toLowerCase().includes(cleanQ);
    const inTags = article.tags.some(t => t.toLowerCase().includes(cleanQ));
    const inCategory = article.category.toLowerCase().includes(cleanQ);

    return inTitle || inExcerpt || inTags || inCategory;
  });
};
