import { useTranslation } from "react-i18next";

export const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="py-6 border-t">
      <div className="container px-4 md:px-6 flex flex-col md:flex-row items-center justify-between text-sm text-muted-foreground">
        <p>{t('footer.copyright')}</p>
        <div className="flex gap-4 mt-4 md:mt-0">
          <a href="#" className="hover:text-foreground">{t('footer.terms')}</a>
          <a href="#" className="hover:text-foreground">{t('footer.privacy')}</a>
        </div>
      </div>
    </footer>
  );
};