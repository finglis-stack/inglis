import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const languages = [
  { code: "fr", name: "FR", country: "CA" },
  { code: "en", name: "EN", country: "CA" },
];

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const currentLanguage = languages.find((l) => i18n.language.startsWith(l.code)) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="text-white hover:bg-neutral-800 hover:text-white">
          <img src={`/flags/${currentLanguage.country.toLowerCase()}.png`} alt={currentLanguage.country} className="w-5 h-auto mr-2" />
          {currentLanguage.name}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {languages.map((lang) => (
          <DropdownMenuItem key={lang.code} onSelect={() => changeLanguage(lang.code)}>
            <img src={`/flags/${lang.country.toLowerCase()}.png`} alt={lang.country} className="w-5 h-auto mr-2" />
            {lang.name} ({lang.country})
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};