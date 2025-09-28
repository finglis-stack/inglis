export const Footer = () => {
  return (
    <footer className="py-6 border-t">
      <div className="container px-4 md:px-6 flex flex-col md:flex-row items-center justify-between text-sm text-muted-foreground">
        <p>© 2024 Inglis Dominium. Tous droits réservés.</p>
        <div className="flex gap-4 mt-4 md:mt-0">
          <a href="#" className="hover:text-foreground">Termes de service</a>
          <a href="#" className="hover:text-foreground">Politique de confidentialité</a>
        </div>
      </div>
    </footer>
  );
};