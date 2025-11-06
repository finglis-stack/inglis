import React from "react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Menu, CreditCard, ShieldCheck, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface HeaderProps {
  isTransparent?: boolean;
}

const solutionComponents: { title: string; href: string; description: string, icon: React.ReactNode }[] = [
  {
    title: "Émission de Cartes",
    href: "/card-issuance",
    description: "Lancez des programmes de cartes de crédit, débit et prépayées en marque blanche.",
    icon: <CreditCard className="h-5 w-5" />
  },
  {
    title: "Prévention de la Fraude",
    href: "/fraud-prevention",
    description: "Protégez vos transactions avec notre système d'analyse comportementale et de risque en temps réel.",
    icon: <ShieldCheck className="h-5 w-5" />
  },
  {
    title: "Bureau de Crédit",
    href: "/credit-bureau",
    description: "Gérez le consentement et le partage de données avec les agences d'évaluation du crédit.",
    icon: <FileText className="h-5 w-5" />
  },
];

export const Header = ({ isTransparent = false }: HeaderProps) => {
  const { t } = useTranslation('landing');

  const navLinks = [
    { href: "/pricing", label: t('header.pricing') },
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
            className={cn("h-10", isTransparent && "brightness-0 invert")}
          />
        </Link>
        <nav className="hidden md:flex gap-2 text-sm font-medium items-center">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger className={cn("bg-transparent", isTransparent ? "text-gray-200 hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white" : "text-gray-300 hover:bg-neutral-800 hover:text-white focus:bg-neutral-800 focus:text-white")}>
                  {t('header.solution')}
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] ">
                    {solutionComponents.map((component) => (
                      <ListItem
                        key={component.title}
                        title={component.title}
                        href={component.href}
                        icon={component.icon}
                      >
                        {component.description}
                      </ListItem>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
              {navLinks.map(link => (
                <NavigationMenuItem key={link.label}>
                  <Link to={link.href}>
                    <NavigationMenuLink className={cn(navigationMenuTriggerStyle(), "bg-transparent", isTransparent ? "text-gray-200 hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white" : "text-gray-300 hover:bg-neutral-800 hover:text-white focus:bg-neutral-800 focus:text-white")}>
                      {link.label}
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2">
            <Button 
              variant="outline" 
              className={cn(
                "transition-colors",
                isTransparent 
                  ? "bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white" 
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
              <nav className="grid gap-2 text-lg font-medium mt-8">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1" className="border-b-0">
                    <AccordionTrigger className="hover:no-underline text-lg font-medium hover:text-white transition-colors py-2">{t('header.solution')}</AccordionTrigger>
                    <AccordionContent className="pl-4">
                      <div className="grid gap-4 mt-2">
                        {solutionComponents.map(component => (
                          <SheetClose asChild key={component.title}>
                            <Link to={component.href} className="flex items-center gap-3 text-base text-gray-400 hover:text-white transition-colors">
                              {component.icon} {component.title}
                            </Link>
                          </SheetClose>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                {navLinks.map(link => (
                  <SheetClose asChild key={link.label}>
                    <Link to={link.href} className="py-2 hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </SheetClose>
                ))}
              </nav>
              <div className="mt-8 space-y-4">
                <SheetClose asChild>
                  <Button variant="outline" className="w-full bg-transparent border-neutral-700 text-gray-300 hover:bg-neutral-800 hover:text-white" asChild>
                    <Link to="/login">{t('header.login')}</Link>
                  </Button>
                </SheetClose>
                <SheetClose asChild>
                  <Button className="w-full bg-white text-black hover:bg-gray-200" asChild>
                    <Link to="/onboarding/welcome">{t('header.becomePartner')}</Link>
                  </Button>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a"> & { icon: React.ReactNode }
>(({ className, title, children, icon, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className
          )}
          {...props}
        >
          <div className="flex items-center gap-2 text-sm font-medium leading-none">
            {icon} {title}
          </div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  )
})
ListItem.displayName = "ListItem"