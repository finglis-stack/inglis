import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Usb, CheckCircle, AlertTriangle, Loader2, Zap } from 'lucide-react';
import { SmartCardManager, prepareCardData } from '@/utils/smartCardDriver';
import { showError, showSuccess } from '@/utils/toast';

interface PhysicalCardEncoderProps {
  cardData: {
    cardNumber: string;
    holderName: string;
    expiryDate: string;
  };
  onSuccess?: () => void;
}

export const PhysicalCardEncoder = ({ cardData, onSuccess }: PhysicalCardEncoderProps) => {
  const [manager] = useState(() => new SmartCardManager());
  const [status, setStatus] = useState<'idle' | 'connected' | 'writing' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const handleConnect = async () => {
    addLog("Recherche de lecteurs USB...");
    const connected = await manager.connect();
    if (connected) {
      setStatus('connected');
      addLog("Lecteur connecté avec succès.");
      showSuccess("Lecteur de carte connecté.");
    } else {
      setStatus('error');
      addLog("Échec de la connexion. Vérifiez le pilote Zadig.");
      showError("Impossible de se connecter au lecteur.");
    }
  };

  const handleBurn = async () => {
    if (status !== 'connected') return;
    
    setStatus('writing');
    setProgress(10);
    addLog("Démarrage de l'encodage...");

    try {
      // 1. Vérification du code de sécurité (PSC)
      addLog("Vérification du code PSC (FF FF FF)...");
      // Note: Pour une vraie prod, on ne ferait pas ça en boucle pour éviter de bloquer la carte si le code est mauvais
      const pscValid = await manager.verifyPsc();
      
      if (!pscValid) {
        throw new Error("Code PSC invalide ou carte verrouillée.");
      }
      setProgress(30);
      addLog("Code PSC valide. Accès mémoire autorisé.");

      // 2. Préparation des données
      const dataBytes = prepareCardData(cardData.cardNumber, cardData.holderName, cardData.expiryDate);
      addLog(`Écriture de ${dataBytes.length} octets de données...`);

      // 3. Écriture (Adresse 32 pour éviter la zone système 0-31)
      const writeSuccess = await manager.writeData(32, dataBytes);
      
      if (!writeSuccess) {
        throw new Error("Échec de l'écriture mémoire.");
      }
      
      setProgress(100);
      setStatus('success');
      addLog("Données écrites avec succès !");
      showSuccess("Carte encodée physiquement !");
      
      if (onSuccess) onSuccess();

    } catch (error) {
      console.error(error);
      setStatus('error');
      addLog(`ERREUR: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      showError("Erreur lors de l'encodage.");
    }
  };

  useEffect(() => {
    return () => {
      manager.disconnect();
    };
  }, [manager]);

  return (
    <Card className="border-2 border-blue-100 bg-blue-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Usb className="h-5 w-5" />
          Encodeur de Carte Physique (SLE4442)
        </CardTitle>
        <CardDescription>
          Ce module utilise WebUSB pour écrire les données directement sur la puce.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Status Display */}
        <div className="flex items-center justify-between bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              status === 'idle' ? 'bg-gray-300' :
              status === 'connected' ? 'bg-blue-500' :
              status === 'writing' ? 'bg-yellow-500 animate-pulse' :
              status === 'success' ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span className="font-medium">
              {status === 'idle' && "Lecteur en attente"}
              {status === 'connected' && "Prêt à graver"}
              {status === 'writing' && "Écriture en cours..."}
              {status === 'success' && "Terminé"}
              {status === 'error' && "Erreur"}
            </span>
          </div>
          
          {status === 'idle' || status === 'error' ? (
            <Button size="sm" onClick={handleConnect}>Connecter le lecteur</Button>
          ) : status === 'connected' ? (
            <Button size="sm" onClick={handleBurn} className="bg-blue-600 hover:bg-blue-700">
              <Zap className="w-4 h-4 mr-2" />
              Graver les données
            </Button>
          ) : null}
        </div>

        {status === 'writing' && <Progress value={progress} className="h-2" />}

        {status === 'success' && (
          <Alert className="bg-green-100 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle>Succès</AlertTitle>
            <AlertDescription>
              La carte a été encodée. Vous pouvez maintenant la retirer.
            </AlertDescription>
          </Alert>
        )}

        <div className="bg-black/90 text-green-400 font-mono text-xs p-3 rounded-md h-32 overflow-y-auto">
          {logs.length === 0 ? <span className="opacity-50"> En attente d'actions...</span> : logs.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
        </div>

      </CardContent>
    </Card>
  );
};