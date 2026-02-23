import { FileText } from 'lucide-react';
import { APP_BRAND } from '@/config/branding';
import styles from './brand-logo.module.css';

type BrandLogoProps = {
  showTagline?: boolean;
};

export default function BrandLogo({ showTagline = false }: BrandLogoProps) {
  return (
    <div className={styles.brand} aria-label={APP_BRAND.name}>
      <div className={styles.mark} aria-hidden="true">
        <FileText size={18} className={styles.glyph} />
      </div>
      <div className={styles.label}>
        <span className={styles.name}>{APP_BRAND.shortName}</span>
        {showTagline && <span className={styles.tagline}>{APP_BRAND.tagline}</span>}
      </div>
    </div>
  );
}
