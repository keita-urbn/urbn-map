import { useLocalSearchParams } from 'expo-router';
import InformationFeed from '../../components/InformationFeed';
import { INFO_CATEGORIES } from '../../lib/infoArticles';
export default function InfoCategoryScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const category = INFO_CATEGORIES.find(c => c.key === type);
  return category ? <InformationFeed initialCategory={category.key} contentInsets={{ paddingTop: 16, paddingBottom: 40 }} /> : null;
}
