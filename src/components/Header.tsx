import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useTranslation } from "react-i18next";

export const Header = () => {
  const { t } = useTranslation();

  return (
    <header className="bg-neutral-950 sticky top-0 z-50 border-b border-neutral-800">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <a href="#" className="flex items-center">
          <img src="/logo.png" alt="Inglis Dominium Logo" className="h-10" />
        </a>
        <nav className="hidden md:flex gap-6 text-sm font-medium items-center">
          <a href="#features" className="text-gray-300 hover:text-white transition-colors">
            {t('header.solution')}
          </a>
          <a href="#how-it-works" className="text-gray-300 hover:text-white transition-colors">
            {t('header.process')}
          </a>
          <a href="#testimonials" className="text-gray-300 hover:text-white transition-colors">
            {t('header.partners')}
          </a>
        </nav>
        <div className="flex items-center gap-4">
          <Button>{t('header.becomePartner')}</Button>
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
};