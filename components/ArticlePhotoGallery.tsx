import { useCallback, useState } from 'react';
import type { ArticleImage } from '../lib/articleContent';
import { ArticleMedia } from './ArticleContent';
import { HorizontalPhotoGallery } from './ShopPhotoGallery';
export default function ArticlePhotoGallery({ images }: { images: ArticleImage[] }) {
  const [failed, setFailed] = useState<string[]>([]);
  const onFailure = useCallback((image: ArticleImage) => setFailed(previous => previous.includes(image.path) ? previous : [...previous, image.path]), []);
  return <HorizontalPhotoGallery items={images.filter(i => !failed.includes(i.path))} itemKey={image => image.path} renderPhoto={image => <ArticleMedia image={image} portrait onFailure={onFailure} />} />;
}
