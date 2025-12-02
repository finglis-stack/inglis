import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Usb, CheckCircle, AlertTriangle, Loader2, Zap, PlayCircle } from 'lucide-react';
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
  const [status, setStatus] = useState<'idle' | 'connected' | 'writing' | 'success' | 'error' | 'simulating'>('idle');
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [isBlocked, setIsBlocked] = useState(false);

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const handleConnect = async () => {
    addLog("Connexion au lecteur USB...");
    try {
      const connected = await manager.connect();
      if (connected) {
        setStatus('connected');
        addLog("Lecteur connecté et prêt.");
        setIsBlocked(false);
      }
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      // Détection spécifique du blocage Chrome
      if (err.message && (err.message.includes("SecurityError") || err.message.includes("protected"))) {
        addLog("ERREUR CRITIQUE: Le navigateur bloque l'accès à ce lecteur (Classe 0x0B protégée).");
        addLog("Astuce: Utilisez le mode Simulation pour la démo.");
        setIsBlocked(true);
      } else {
        addLog(`Erreur: ${err.message}`);
        showError("Connexion échouée.");
      }
    }
  };

  const simulateBurn = async () => {
    setStatus('simulating');
    addLog("--- DÉMARRAGE SIMULATION ---");
    
    const steps = [
      { pct: 10, msg: "Mise sous tension de la carte..." },
      { pct: 30, msg: "Vérification ATR: 3B 04 A2 13 10 91" },
      { pct: 50, msg: "Envoi code PSC (FFFFFF)... OK" },
      { pct: 70, msg: `Écriture données (0x32): ${cardData.cardNumber.substring(0, 8)}...` },
      { pct: 90, msg: "Vérification checksum... OK" },
      { pct: 100, msg: "Carte éjectée." }
    ];

    for (const step of steps) {
      await new Promise(r => setTimeout(r, 800)); // Délai réaliste
      setProgress(step.pct);
      addLog(step.msg);
    }

    setStatus('success');
    showSuccess("Simulation: Carte encodée avec succès !");
    if (onSuccess) onSuccess();
  };

  const handleBurn = async () => {
    if (status === 'simulating') return;
    if (status !== 'connected') {
      // Si on n'est pas connecté, on tente la simulation si on est bloqué, ou on se connecte
      if (isBlocked) return simulateBurn();
      return;
    }
    
    setStatus('writing');
    setProgress(5);
    addLog("Initialisation écriture réelle...");

    try {
      addLog("Authentification PSC...");
      const pscValid = await manager.verifyPsc();
      if (!pscValid) throw new Error("Code PIN carte invalide (Carte verrouillée ?)");
      
      setProgress(30);
      addLog("PSC Valide. Écriture en mémoire...");

      const dataBytes = prepareCardData(cardData.cardNumber, cardData.holderName, cardData.expiryDate);
      // Adresse 32 (0x20) pour SLE4442
      const writeValid = await manager.writeData(32, dataBytes);

      if (!writeValid) throw new Error("Erreur lors de l'écriture I2C.");

      setProgress(100);
      setStatus('success');
      addLog(`Succès ! ${dataBytes.length} octets écrits.`);
      showSuccess("Carte physique encodée !");
      if (onSuccess) onSuccess();

    } catch (error: any) {
      setStatus('error');
      addLog(`Erreur écriture: ${error.message}`);
    }
  };

  useEffect(() => {
    return () => { manager.disconnect(); };
  }, [manager]);

  return (
    <Card className="border-2 border-blue-100 bg-blue-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Usb className="h-5 w-5" />
          Encodeur SLE4442 (USB)
        </CardTitle>
        <CardDescription>
          Gestionnaire de périphérique pour l'écriture sur puce sécurisée.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        <div className="bg-white p-4 rounded-lg border shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
               <div className={`w-3 h-3 rounded-full ${
                 status === 'success' ? 'bg-green-500' : 
                 (status === 'writing' || status === 'simulating') ? 'bg-yellow-400 animate-pulse' : 
                 status === 'connected' ? 'bg-blue-500' : 'bg-gray-300'
               }`} />
               <span className="font-medium text-sm">
                 {status === 'idle' && "En attente"}
                 {status === 'connected' && "Lecteur prêt"}
                 {(status === 'writing' || status === 'simulating') && "Encodage..."}
                 {status === 'success' && "Terminé"}
                 {status === 'error' && "Erreur"}
               </span>
            </div>

            {/* Boutons d'action */}
            <div className="flex gap-2">
              {status === 'idle' || status === 'error' ? (
                <>
                  <Button size="sm" onClick={handleConnect} disabled={isBlocked}>
                    {isBlocked ? "Accès Bloqué" : "Connecter USB"}
                  </Button>
                  {isBlocked && (
                    <Button size="sm" variant="secondary" onClick={simulateBurn}>
                      <PlayCircle className="w-4 h-4 mr-2" />
                      Mode Simulation
                    </Button>
                  )}
                </>
              ) : (status === 'connected') ? (
                <Button size="sm" onClick={handleBurn} className="bg-blue-600 hover:bg-blue-700">
                  <Zap className="w-4 h-4 mr-2" /> Graver
                </Button>
              ) : null}
            </div>
          </div>

          {/* Barre de progression */}
          {(status === 'writing' || status === 'simulating' || status === 'success') && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progression</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Message d'erreur bloquante */}
          {isBlocked && (
            <Alert variant="destructive" className="py-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="text-sm">Navigateur incompatible</AlertTitle>
              <AlertDescription className="text-xs">
                Chrome bloque l'accès direct à ce type de lecteur. Utilisez le mode <strong>Simulation</strong> pour continuer la démonstration.
              </AlertDescription>
            </Alert>
          )}

          {/* Logs console */}
          <div className="bg-black rounded-md p-3 h-32 overflow-y-auto font-mono text-xs text-green-400 border border-gray-800 shadow-inner">
             {logs.length === 0 && <span className="opacity-50">Ready...</span>}
             {logs.map((log, i) => (
               <div key={i} className="break-all">{log}</div>
             ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};