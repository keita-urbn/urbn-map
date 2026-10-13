import { collection, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { ARTICLE_SOURCES, mapInfoArticle, type InfoArticle } from '../lib/infoArticles';
export function useInfoArticles() {
  const [sources, setSources] = useState<Record<string, InfoArticle[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    const unsubscribes = ARTICLE_SOURCES.map(source => onSnapshot(collection(db, source), snapshot => {
      setSources(previous => ({ ...previous, [source]: snapshot.docs.map(d => mapInfoArticle(d.id, source, d.data(), false)) }));
      setErrors(previous => ({ ...previous, [source]: '' }));
    }, () => { setErrors(previous => ({ ...previous, [source]: '記事を読み込めませんでした' })); }));
    return () => unsubscribes.forEach(unsubscribe => unsubscribe());
  }, []);
  return { articles: Object.values(sources).flat(), loading: ARTICLE_SOURCES.some(source => !sources[source] && !errors[source]), error: Object.values(errors).find(Boolean) ?? '' };
}
