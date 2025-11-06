import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  isTransparent?: boolean;
}

export const Header = ({ isTransparent = false }: HeaderProps) => {
  const { t } = useTranslation('landing');

  const navLinks = [
    { href: "/#features", label: t('header.solution') },
    { href: "/card-structure", label: t('header.process') },
    { href: "/#testimonials", label: t('header.partners') },
  ];

  return (
    <header className={cn(
      "top-0 z-50 w-full transition-colors duration-300",
      isTransparent
        ? "absolute bg-transparent border-transparent"
        : "sticky border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-sm"
    )}>
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link to="/" className="flex items-center">
          <img 
            src="/logo.png" 
            alt="Inglis Dominion Logo" 
            className={cn("h-10", isTransparent && "brightness-0 invert(1)")}
          />
        </Link>
        <nav className="hidden md:flex gap-6 text-sm font-medium items-center">
          {navLinks.map(link => (
            <Link key={link.label} to={link.href} className={cn("transition-colors", isTransparent ? "text-gray-200 hover:text-white" : "text-gray-300 hover:text-white")}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2">
            <Button 
              variant="outline" 
              className={cn(
                "transition-colors",
                isTransparent 
                  ? "bg-white/10 border-white/20 text-white hover:bg-white/20" 
                  : "bg-transparent border-neutral-700 text-gray-300 hover:bg-neutral-800 hover:text-white"
              )} 
              asChild
            >
              <Link to="/login">{t('header.login')}</Link>
            </Button>
            <Button className="bg-white text-black hover:bg-gray-200" asChild>
              <Link to="/onboarding/welcome">{t('header.becomePartner')}</Link>
            </Button>
          </div>
          <div className={cn(isTransparent ? "text-gray-200 [&_button]:hover:bg-white/10 [&_button]:hover:text-white" : "text-gray-300 [&_button]:hover:bg-neutral-700 [&_button]:hover:text-white")}>
            <LanguageSwitcher />
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn(
                  "md:hidden",
                  isTransparent ? "text-gray-200 hover:bg-white/10 hover:text-white" : "text-gray-300 hover:bg-neutral-800 hover:text-white"
                )}
              >
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
                <Button className="w-full bg-white text-black hover:bg-gray-200" asChild>
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