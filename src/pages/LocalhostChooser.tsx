import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, BarChart, FileText } from 'lucide-react';

interface LocalhostChooserProps {
  onChoose: (app: 'main' | 'q12x' | 'apply') => void;
}

const LocalhostChooser: React.FC<LocalhostChooserProps> = ({ onChoose }) => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold">Sélecteur d'Application</h1>
        <p className="text-muted-foreground mt-2">Choisissez l'application à lancer en environnement local.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-8 max-w-6xl w-full">
        <Card 
          className="flex flex-col text-center items-center p-8 bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
          onClick={() => onChoose('main')}
        >
          <CardHeader className="p-0 items-center">
            <div className="bg-primary/10 rounded-full p-4 mb-6 inline-flex">
              <Building className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-2xl">Inglis Dominion</CardTitle>
            <CardDescription className="mt-2">Plateforme de gestion pour institutions financières.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 mt-auto pt-8 w-full">
            <Button className="w-full group-hover:bg-primary group-hover:text-primary-foreground" variant="outline">Lancer</Button>
          </CardContent>
        </Card>

        <Card 
          className="flex flex-col text-center items-center p-8 bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
          onClick={() => onChoose('q12x')}
        >
          <CardHeader className="p-0 items-center">
            <div className="bg-indigo-100 rounded-full p-4 mb-6 inline-flex">
              <BarChart className="h-10 w-10 text-indigo-600" />
            </div>
            <CardTitle className="text-2xl">Q12x</CardTitle>
            <CardDescription className="mt-2">Tableau de bord pour les marchands.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 mt-auto pt-8 w-full">
            <Button className="w-full group-hover:bg-indigo-600 group-hover:text-white" variant="outline">Lancer</Button>
          </CardContent>
        </Card>
        
        <Card 
          className="flex flex-col text-center items-center p-8 bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
          onClick={() => onChoose('apply')}
        >
          <CardHeader className="p-0 items-center">
            <div className="bg-green-100 rounded-full p-4 mb-6 inline-flex">
              <FileText className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Formulaire d'Intégration</CardTitle>
            <CardDescription className="mt-2">Page publique pour l'intégration de nouveaux clients.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 mt-auto pt-8 w-full">
            <Button className="w-full group-hover:bg-green-600 group-hover:text-white" variant="outline">Lancer</Button>
          </CardContent>
        </Card>
      </div>
       <p className="text-xs text-gray-400 mt-8">
        Pour changer d'application, effacez la clé 'dyad-app-choice' dans le Local Storage de votre navigateur.
      </p>
    </div>
  );
};

export default LocalhostChooser;