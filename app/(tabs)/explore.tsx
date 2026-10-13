import InformationFeed from '../../components/InformationFeed';
import { useTabContentInsets } from '../../hooks/useTabContentInsets';
export default function ExploreScreen() {
  return <InformationFeed contentInsets={useTabContentInsets()} />;
}
