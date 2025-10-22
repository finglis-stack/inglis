import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

export const Header = () => {
  const { t } = useTranslation('landing');

  const navLinks = [
    { href: "/#features", label: t('header.solution') },
    { href: "/card-structure", label: t('header.process') },
    { href: "/#testimonials", label: t('header.partners') },
  ];

  return (
    <header className="bg-neutral-950 sticky top-0 z-50 border-b border-neutral-800">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link to="/" className="flex items-center">
          <img src="/logo.png" alt="Inglis Dominium Logo" className="h-10" />
        </Link>
        <nav className="hidden md:flex gap-6 text-sm font-medium items-center">
          {navLinks.map(link => (
            <Link key={link.label} to={link.href} className="text-gray-300 hover:text-white transition-colors">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2">
            <Button variant="outline" className="bg-transparent border-neutral-700 text-gray-300 hover:bg-neutral-800 hover:text-white" asChild>
              <Link to="/login">{t('header.login')}</Link>
            </Button>
            <Button className="bg-neutral-800 text-gray-300 hover:bg-neutral-700" asChild>
              <Link to="/onboarding/welcome">{t('header.becomePartner')}</Link>
            </Button>
          </div>
          <div className="text-gray-300 [&_button]:hover:bg-neutral-700 [&_button]:hover:text-white">
            <LanguageSwitcher />
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden text-gray-300 hover:bg-neutral-800 hover:text-white">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Ouvrir le menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-neutral-950 text-gray-300 border-neutral-800">
              <nav className="grid gap-6 text-lg font-medium mt-8">
                {navLinks.map(link => (
                  <Link key={link.label} to={link.href} className="hover:text-white transition-colors">
                    {link.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-8 space-y-4">
                <Button variant="outline" className="w-full bg-transparent border-neutral-700 text-gray-300 hover:bg-neutral-800 hover:text-white" asChild>
                  <Link to="/login">{t('header.login')}</Link>
                </Button>
                <Button className="w-full bg-neutral-800 text-gray-300 hover:bg-neutral-700" asChild>
                  <Link to="/onboarding/welcome">{t('header.becomePartner')}</Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};