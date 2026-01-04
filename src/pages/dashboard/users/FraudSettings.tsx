import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, AlertTriangle } from 'lucide-react';

type FraudSettings = {
  amount: {
    low_value_threshold: number;
    high_value_threshold: number;
    absolute_max: number;
    high_value_no_baseline_penalty: number;
    below_mean_bonus: number;
  };
  zscore: {
    mild: number;
    high: number;
    extreme: number;
    weights: { mild: number; high: number; extreme: number };
  };
  geo: {
    impossible_speed_kmh: number;
    very_fast_speed_kmh: number;
    distance_min_km: number;
  };
  velocity: {
    burst_window_minutes: number;
    penalty_3: number;
    penalty_5: number;
  };
  decision: {
    block_threshold: number;
  };
  device: {
    blocked_penalty: number;
    trusted_bonus: number;
    recognized_bonus: number;
    new_device_penalty: number;
    low_confidence_threshold: number;
    low_confidence_penalty: number;
  };
  behavioral: {
    bot_penalty: number;
    no_mouse_penalty: number;
    short_time_ms: number;
    short_time_penalty: number;
    suspicious_pattern_weight: number;
    pan_fast_ms: number;
    pan_fast_penalty: number;
    paste_penalty: number;
  };
  ip: {
    blocked_penalty: number;
    vpn_proxy_tor_penalty: number;
    block_on_vpn: boolean;
  };
};

const defaultSettings: FraudSettings = {
  amount: {
    low_value_threshold: 25,
    high_value_threshold: 10000,
    absolute_max: 1000000,
    high_value_no_baseline_penalty: 30,
    below_mean_bonus: 5,
  },
  zscore: {
    mild: 1.5,
    high: 2.5,
    extreme: 3.5,
    weights: { mild: 20, high: 40, extreme: 80 },
  },
  geo: { impossible_speed_kmh: 900, very_fast_speed_kmh: 500, distance_min_km: 1 },
  velocity: { burst_window_minutes: 10, penalty_3: 20, penalty_5: 40 },
  decision: { block_threshold: 40 },
  device: {
    blocked_penalty: 100,
    trusted_bonus: 15,
    recognized_bonus: 10,
    new_device_penalty: 15,
    low_confidence_threshold: 0.5,
    low_confidence_penalty: 10,
  },
  behavioral: {
    bot_penalty: 60,
    no_mouse_penalty: 25,
    short_time_ms: 3000,
    short_time_penalty: 20,
    suspicious_pattern_weight: 5,
    pan_fast_ms: 1000,
    pan_fast_penalty: 15,
    paste_penalty: 20,
  },
  ip: { blocked_penalty: 100, vpn_proxy_tor_penalty: 30, block_on_vpn: false },
};

function deepMerge<T>(base: T, override?: Partial<T>): T {
  if (!override) return base;
  const out: any = Array.isArray(base) ? [...(base as any)] : { ...(base as any) };
  for (const key of Object.keys(override)) {
    const val = (override as any)[key];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      out[key] = deepMerge((base as any)[key], val);
    } else {
      out[key] = val;
    }
  }
  return out;
}

function computeChanges(prev: any, next: any, path: string[] = []): any {
  const changes: any = {};
  const keys = new Set([...Object.keys(prev || {}), ...Object.keys(next || {})]);
  for (const key of keys) {
    const p = prev?.[key];
    const n = next?.[key];
    const currPath = [...path, key];
    if (p && typeof p === 'object' && n && typeof n === 'object') {
      const sub = computeChanges(p, n, currPath);
      if (Object.keys(sub).length > 0) changes[key] = sub;
    } else if (JSON.stringify(p) !== JSON.stringify(n)) {
      changes[key] = { from: p, to: n, path: currPath.join('.') };
    }
  }
  return changes;
}

const FraudSettingsPage = () => {
  const { id } = useParams();
  const { t } = useTranslation('dashboard');
  const [settings, setSettings] = useState<FraudSettings>(defaultSettings);
  const [original, setOriginal] = useState<FraudSettings | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<'success' | 'error'>('success');
  const [loading, setLoading] = useState(true);

  const sections = useMemo(() => [
    { key: 'amount', label: 'Montants' },
    { key: 'zscore', label: 'Analyse statistique (Z‑score)' },
    { key: 'geo', label: 'Vélocité géographique (Haversine)' },
    { key: 'velocity', label: 'Rafale de transactions' },
    { key: 'decision', label: 'Seuil de blocage' },
    { key: 'device', label: 'Empreinte appareil' },
    { key: 'behavioral', label: 'Comportement' },
    { key: 'ip', label: 'IP / VPN / Proxy / Tor' },
  ], []);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      const { data } = await supabase
        .from('fraud_preferences')
        .select('settings')
        .eq('profile_id', id)
        .maybeSingle();
      const merged = deepMerge(defaultSettings, data?.settings || {});
      setSettings(merged);
      setOriginal(merged);
      setLoading(false);
    };
    load();
  }, [id]);

  const save = async () => {
    if (!id) return;
    setAlertMsg(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté.');

      // Upsert preferences
      const { data: existing } = await supabase
        .from('fraud_preferences')
        .select('id')
        .eq('profile_id', id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('fraud_preferences')
          .update({ settings, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('fraud_preferences')
          .insert({ profile_id: id, settings });
      }

      // Logs des changements
      const changes = computeChanges(original || {}, settings);
      await supabase
        .from('fraud_preference_logs')
        .insert({
          profile_id: id,
          user_id: user.id,
          changes,
        });

      setOriginal(settings);
      setAlertType('success');
      setAlertMsg('Paramètres enregistrés avec succès.');
    } catch (e: any) {
      setAlertType('error');
      setAlertMsg(e.message || 'Échec de l’enregistrement.');
    }
  };

  const setNested = (path: string, value: any) => {
    setSettings(prev => {
      const parts = path.split('.');
      const next: any = JSON.parse(JSON.stringify(prev));
      let obj = next;
      for (let i = 0; i < parts.length - 1; i++) {
        obj = obj[parts[i]];
      }
      obj[parts[parts.length - 1]] = value;
      return next;
    });
  };

  if (loading) return <div className="p-6">Chargement...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Personnalisation anti‑fraude</h1>
      <p className="text-muted-foreground">Définissez des seuils sûrs par défaut ou ajustez finement par profil. Chaque modification est journalisée.</p>

      {alertMsg && (
        <Alert className={
          alertType === 'success'
            ? "bg-green-50 text-green-700 border-green-200 [&>svg]:text-green-700"
            : "bg-red-50 text-red-700 border-red-200 [&>svg]:text-red-700"
        }>
          {alertType === 'success' ? <Info className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <AlertTitle>{alertType === 'success' ? 'Succès' : 'Erreur'}</AlertTitle>
          <AlertDescription>{alertMsg}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Montants */}
        <Card className="p-4 space-y-3">
          <h2 className="font-medium">Montants</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Plancher faible valeur (tolérance)</Label>
              <Input type="number" value={settings.amount.low_value_threshold}
                onChange={(e) => setNested('amount.low_value_threshold', Number(e.target.value))} />
            </div>
            <div>
              <Label>Plafond sans baseline</Label>
              <Input type="number" value={settings.amount.high_value_threshold}
                onChange={(e) => setNested('amount.high_value_threshold', Number(e.target.value))} />
            </div>
            <div>
              <Label>Pénalité sans baseline</Label>
              <Input type="number" value={settings.amount.high_value_no_baseline_penalty}
                onChange={(e) => setNested('amount.high_value_no_baseline_penalty', Number(e.target.value))} />
            </div>
            <div>
              <Label>Plafond absolu (blocage dur)</Label>
              <Input type="number" value={settings.amount.absolute_max}
                onChange={(e) => setNested('amount.absolute_max', Number(e.target.value))} />
            </div>
            <div>
              <Label>Bonus sous la moyenne</Label>
              <Input type="number" value={settings.amount.below_mean_bonus}
                onChange={(e) => setNested('amount.below_mean_bonus', Number(e.target.value))} />
            </div>
          </div>
        </Card>

        {/* Z-score */}
        <Card className="p-4 space-y-3">
          <h2 className="font-medium">Z‑score</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Seuil léger</Label>
              <Input type="number" step="0.1" value={settings.zscore.mild}
                onChange={(e) => setNested('zscore.mild', Number(e.target.value))} />
            </div>
            <div>
              <Label>Pénalité légère</Label>
              <Input type="number" value={settings.zscore.weights.mild}
                onChange={(e) => setNested('zscore.weights.mild', Number(e.target.value))} />
            </div>
            <div>
              <Label>Seuil élevé</Label>
              <Input type="number" step="0.1" value={settings.zscore.high}
                onChange={(e) => setNested('zscore.high', Number(e.target.value))} />
            </div>
            <div>
              <Label>Pénalité élevée</Label>
              <Input type="number" value={settings.zscore.weights.high}
                onChange={(e) => setNested('zscore.weights.high', Number(e.target.value))} />
            </div>
            <div>
              <Label>Seuil extrême</Label>
              <Input type="number" step="0.1" value={settings.zscore.extreme}
                onChange={(e) => setNested('zscore.extreme', Number(e.target.value))} />
            </div>
            <div>
              <Label>Pénalité extrême</Label>
              <Input type="number" value={settings.zscore.weights.extreme}
                onChange={(e) => setNested('zscore.weights.extreme', Number(e.target.value))} />
            </div>
          </div>
        </Card>

        {/* Géovélocité */}
        <Card className="p-4 space-y-3">
          <h2 className="font-medium">Vélocité géographique</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Distance min. (km)</Label>
              <Input type="number" value={settings.geo.distance_min_km}
                onChange={(e) => setNested('geo.distance_min_km', Number(e.target.value))} />
            </div>
            <div>
              <Label>Vitesse impossible (km/h)</Label>
              <Input type="number" value={settings.geo.impossible_speed_kmh}
                onChange={(e) => setNested('geo.impossible_speed_kmh', Number(e.target.value))} />
            </div>
            <div>
              <Label>Vitesse très rapide (km/h)</Label>
              <Input type="number" value={settings.geo.very_fast_speed_kmh}
                onChange={(e) => setNested('geo.very_fast_speed_kmh', Number(e.target.value))} />
            </div>
          </div>
        </Card>

        {/* Rafale */}
        <Card className="p-4 space-y-3">
          <h2 className="font-medium">Rafale de transactions</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Fenêtre (min)</Label>
              <Input type="number" value={settings.velocity.burst_window_minutes}
                onChange={(e) => setNested('velocity.burst_window_minutes', Number(e.target.value))} />
            </div>
            <div>
              <Label>Pénalité à 3 req.</Label>
              <Input type="number" value={settings.velocity.penalty_3}
                onChange={(e) => setNested('velocity.penalty_3', Number(e.target.value))} />
            </div>
            <div>
              <Label>Pénalité à 5 req.</Label>
              <Input type="number" value={settings.velocity.penalty_5}
                onChange={(e) => setNested('velocity.penalty_5', Number(e.target.value))} />
            </div>
          </div>
        </Card>

        {/* Décision */}
        <Card className="p-4 space-y-3">
          <h2 className="font-medium">Seuil de blocage</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Score minimal (BLOCK si en‑dessous)</Label>
              <Input type="number" value={settings.decision.block_threshold}
                onChange={(e) => setNested('decision.block_threshold', Number(e.target.value))} />
            </div>
          </div>
        </Card>

        {/* Appareil */}
        <Card className="p-4 space-y-3">
          <h2 className="font-medium">Empreinte appareil</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Pénalité appareil bloqué</Label>
              <Input type="number" value={settings.device.blocked_penalty}
                onChange={(e) => setNested('device.blocked_penalty', Number(e.target.value))} />
            </div>
            <div>
              <Label>Bonus appareil de confiance</Label>
              <Input type="number" value={settings.device.trusted_bonus}
                onChange={(e) => setNested('device.trusted_bonus', Number(e.target.value))} />
            </div>
            <div>
              <Label>Bonus appareil reconnu</Label>
              <Input type="number" value={settings.device.recognized_bonus}
                onChange={(e) => setNested('device.recognized_bonus', Number(e.target.value))} />
            </div>
            <div>
              <Label>Pénalité nouvel appareil</Label>
              <Input type="number" value={settings.device.new_device_penalty}
                onChange={(e) => setNested('device.new_device_penalty', Number(e.target.value))} />
            </div>
            <div>
              <Label>Seuil confiance faible</Label>
              <Input type="number" step="0.1" value={settings.device.low_confidence_threshold}
                onChange={(e) => setNested('device.low_confidence_threshold', Number(e.target.value))} />
            </div>
            <div>
              <Label>Pénalité confiance faible</Label>
              <Input type="number" value={settings.device.low_confidence_penalty}
                onChange={(e) => setNested('device.low_confidence_penalty', Number(e.target.value))} />
            </div>
          </div>
        </Card>

        {/* Comportement */}
        <Card className="p-4 space-y-3">
          <h2 className="font-medium">Comportement</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Pénalité bot</Label>
              <Input type="number" value={settings.behavioral.bot_penalty}
                onChange={(e) => setNested('behavioral.bot_penalty', Number(e.target.value))} />
            </div>
            <div>
              <Label>Pénalité sans mouvements</Label>
              <Input type="number" value={settings.behavioral.no_mouse_penalty}
                onChange={(e) => setNested('behavioral.no_mouse_penalty', Number(e.target.value))} />
            </div>
            <div>
              <Label>Temps court (ms)</Label>
              <Input type="number" value={settings.behavioral.short_time_ms}
                onChange={(e) => setNested('behavioral.short_time_ms', Number(e.target.value))} />
            </div>
            <div>
              <Label>Pénalité temps court</Label>
              <Input type="number" value={settings.behavioral.short_time_penalty}
                onChange={(e) => setNested('behavioral.short_time_penalty', Number(e.target.value))} />
            </div>
            <div>
              <Label>Poids pattern suspect</Label>
              <Input type="number" value={settings.behavioral.suspicious_pattern_weight}
                onChange={(e) => setNested('behavioral.suspicious_pattern_weight', Number(e.target.value))} />
            </div>
            <div>
              <Label>Seuil PAN rapide (ms)</Label>
              <Input type="number" value={settings.behavioral.pan_fast_ms}
                onChange={(e) => setNested('behavioral.pan_fast_ms', Number(e.target.value))} />
            </div>
            <div>
              <Label>Pénalité PAN rapide</Label>
              <Input type="number" value={settings.behavioral.pan_fast_penalty}
                onChange={(e) => setNested('behavioral.pan_fast_penalty', Number(e.target.value))} />
            </div>
            <div>
              <Label>Pénalité copier‑coller</Label>
              <Input type="number" value={settings.behavioral.paste_penalty}
                onChange={(e) => setNested('behavioral.paste_penalty', Number(e.target.value))} />
            </div>
          </div>
        </Card>

        {/* IP */}
        <Card className="p-4 space-y-3">
          <h2 className="font-medium">IP / VPN / Proxy / Tor</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Pénalité IP bloquée</Label>
              <Input type="number" value={settings.ip.blocked_penalty}
                onChange={(e) => setNested('ip.blocked_penalty', Number(e.target.value))} />
            </div>
            <div>
              <Label>Pénalité VPN/Proxy/Tor</Label>
              <Input type="number" value={settings.ip.vpn_proxy_tor_penalty}
                onChange={(e) => setNested('ip.vpn_proxy_tor_penalty', Number(e.target.value))} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={settings.ip.block_on_vpn}
                onCheckedChange={(val) => setNested('ip.block_on_vpn', val)} />
              <Label>Blocage strict si VPN/Proxy/Tor</Label>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={() => setSettings(original || defaultSettings)}>Réinitialiser</Button>
        <Button onClick={save}>Enregistrer</Button>
      </div>
    </div>
  );
};

export default FraudSettingsPage;