import { useTranslation } from "react-i18next";
import { Twitter, Linkedin, Github } from "lucide-react";

export const Footer = () => {
  const { t } = useTranslation('landing');

  return (
    <footer className="py-8 bg-neutral-950 text-neutral-400">
      <div className="container px-4 md:px-6 flex flex-col md:flex-row items-center justify-between">
        <p className="text-sm">&copy; {new Date().getFullYear()} Inglis Dominion. {t('footer.copyright').split('.').slice(1).join('.')}</p>
        <div className="flex gap-4 mt-4 md:mt-0 items-center">
          <a href="#" className="text-sm hover:text-white transition-colors">{t('footer.terms')}</a>
          <a href="#" className="text-sm hover:text-white transition-colors">{t('footer.privacy')}</a>
          <div className="flex gap-2 pl-4 border-l border-neutral-700">
            <a href="#" className="hover:text-white transition-colors"><Twitter className="h-5 w-5" /></a>
            <a href="#" className="hover:text-white transition-colors"><Linkedin className="h-5 w-5" /></a>
            <a href="#" className="hover:text-white transition-colors"><Github className="h-5 w-5" /></a>
          </div>
        </div>
      </div>
    </footer>
  );
};