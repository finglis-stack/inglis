import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Usb, CheckCircle, AlertTriangle, Loader2, Zap, RefreshCw, HardDrive } from 'lucide-react';
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
  const [status, setStatus] = useState<'idle' | 'checking' | 'connected' | 'writing' | 'success' | 'error'>('idle');
  const [readerName, setReaderName] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const checkBridgeConnection = async () => {
    setStatus('checking');
    setErrorMsg(null);
    addLog("Recherche du service local (Bridge)...");
    
    try {
      // On tente de contacter le script Python
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const res = await fetch('http://localhost:5000/status', { 
        signal: controller.signal 
      }).catch(() => null);
      
      clearTimeout(timeoutId);

      if (res && res.ok) {
        const data = await res.json();
        if (data.ready) {
          setStatus('connected');
          setReaderName(data.reader);
          addLog(`Service connecté. Lecteur détecté: ${data.reader}`);
        } else {
          setStatus('error');
          setErrorMsg("Le service tourne, mais aucun lecteur n'est branché.");
          addLog("Service OK, mais lecteur absent.");
        }
      } else {
        throw new Error("Service injoignable");
      }
    } catch (e) {
      setStatus('error');
      setErrorMsg("Impossible de contacter le script local. Assurez-vous d'avoir lancé 'python local-bridge/bridge.py'.");
      addLog("Échec connexion au service local.");
    }
  };

  const handleBurn = async () => {
    if (status !== 'connected') return;
    
    setStatus('writing');
    setProgress(10);
    addLog("Envoi des données au service local...");

    try {
      const res = await fetch('http://localhost:5000/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardData)
      });

      setProgress(60);

      const result = await res.json();

      if (result.success) {
        setProgress(100);
        setStatus('success');
        addLog("SUCCÈS: Données écrites sur la puce.");
        showSuccess("Carte physique encodée avec succès !");
        if (onSuccess) onSuccess();
      } else {
        throw new Error(result.error || "Erreur inconnue du lecteur");
      }

    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message);
      addLog(`ERREUR D'ÉCRITURE: ${err.message}`);
    }
  };

  // Auto-check au montage
  useEffect(() => {
    checkBridgeConnection();
  }, []);

  return (
    <Card className="border-2 border-blue-100 bg-blue-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <HardDrive className="h-5 w-5" />
          Encodeur Physique (Via Pont Local)
        </CardTitle>
        <CardDescription>
          Connexion au lecteur PC/SC via le service Python local.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        <div className="bg-white p-4 rounded-lg border shadow-sm space-y-4">
          
          {/* Status Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
               <div className={`w-3 h-3 rounded-full ${
                 status === 'success' ? 'bg-green-500' : 
                 status === 'writing' ? 'bg-yellow-400 animate-pulse' : 
                 status === 'connected' ? 'bg-blue-500' : 'bg-red-500'
               }`} />
               <div className="flex flex-col">
                 <span className="font-medium text-sm">
                   {status === 'checking' && "Recherche du service..."}
                   {status === 'connected' && "Prêt à graver"}
                   {status === 'writing' && "Écriture en cours..."}
                   {status === 'success' && "Terminé"}
                   {status === 'error' && "Service déconnecté"}
                 </span>
                 {readerName && status === 'connected' && (
                   <span className="text-xs text-muted-foreground">{readerName}</span>
                 )}
               </div>
            </div>

            <div className="flex gap-2">
              {status === 'error' || status === 'idle' ? (
                <Button size="sm" variant="outline" onClick={checkBridgeConnection}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Réessayer
                </Button>
              ) : (
                <Button size="sm" onClick={handleBurn} disabled={status !== 'connected'} className="bg-blue-600 hover:bg-blue-700">
                  <Zap className="w-4 h-4 mr-2" /> Encoder
                </Button>
              )}
            </div>
          </div>

          {/* Error Message */}
          {status === 'error' && errorMsg && (
            <Alert variant="destructive" className="py-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="text-sm">Connexion échouée</AlertTitle>
              <AlertDescription className="text-xs mt-1">
                {errorMsg}
                <div className="mt-2 p-2 bg-black/10 rounded font-mono">
                  1. Ouvrez un terminal<br/>
                  2. Installez les dépendances: <span className="select-all font-bold">pip install flask flask-cors pyscard</span><br/>
                  3. Lancez le script: <span className="select-all font-bold">python local-bridge/bridge.py</span>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Progress Bar */}
          {(status === 'writing' || status === 'success') && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progression</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Logs */}
          <div className="bg-black rounded-md p-3 h-32 overflow-y-auto font-mono text-xs text-green-400 border border-gray-800 shadow-inner">
             {logs.length === 0 && <span className="opacity-50">En attente du service local...</span>}
             {logs.map((log, i) => (
               <div key={i} className="break-all">{log}</div>
             ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};