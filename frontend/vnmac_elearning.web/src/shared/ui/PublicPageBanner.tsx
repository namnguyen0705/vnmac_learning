export function PublicPageBanner({ title, description }: { title: string; description: string }) {
  return <section className="public-page-banner"><div className="public-page-banner-inner"><p className="intro-eyebrow">DỰ ÁN RAPPORT</p><h1>{title}</h1><p className="public-page-banner-description">{description}</p></div></section>;
}
