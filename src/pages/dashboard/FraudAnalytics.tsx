import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, ShieldAlert, Smartphone, Globe, Activity, Network } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const FraudAnalytics = () => {
  const { t } = useTranslation('dashboard');
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState([]);
  const [ips, setIps] = useState([]);
  const [recentAssessments, setRecentAssessments] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Fetch recent risk assessments
      const { data: assessments } = await supabase
        .from('transaction_risk_assessments')
        .select('*, profiles(full_name, legal_name)')
        .order('created_at', { ascending: false })
        .limit(10);

      setRecentAssessments(assessments || []);

      // Fetch device fingerprints (aggregated)
      const { data: deviceData } = await supabase
        .from('device_fingerprints')
        .select('visitor_id, times_used, is_trusted, is_blocked, last_seen_at')
        .order('last_seen_at', { ascending: false })
        .limit(20);

      setDevices(deviceData || []);

      // Fetch IP addresses (aggregated)
      const { data: ipData } = await supabase
        .from('ip_addresses')
        .select('ip_address, times_used, is_vpn, is_blocked, country, city, last_seen_at')
        .order('last_seen_at', { ascending: false })
        .limit(20);

      setIps(ipData || []);

      setLoading(false);
    };

    fetchData();
  }, []);

  const handleBlockDevice = async (visitorId: string) => {
    await supabase.rpc('update_device_trust_status', {
      p_visitor_id: visitorId,
      p_is_blocked: true
    });
    window.location.reload();
  };

  const handleTrustDevice = async (visitorId: string) => {
    await supabase.rpc('update_device_trust_status', {
      p_visitor_id: visitorId,
      p_is_trusted: true
    });
    window.location.reload();
  };

  const handleBlockIp = async (ipAddress: string) => {
    await supabase.rpc('update_ip_block_status', {
      p_ip_address: ipAddress,
      p_is_blocked: true
    });
    window.location.reload();
  };

  if (loading) {
    return <div className="p-8"><Skeleton className="h-screen w-full" /></div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analyse Anti-Fraude</h1>
          <p className="text-muted-foreground">Surveillance et détection des activités suspectes</p>
        </div>
      </div>

      {/* Recent Risk Assessments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Évaluations de Risque Récentes
          </CardTitle>
          <CardDescription>Les 10 dernières analyses de transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Profil</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Décision</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentAssessments.map((assessment) => (
                <TableRow key={assessment.id}>
                  <TableCell>{new Date(assessment.created_at).toLocaleString('fr-CA')}</TableCell>
                  <TableCell>{assessment.profiles?.full_name || assessment.profiles?.legal_name || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant={assessment.risk_score >= 70 ? 'default' : assessment.risk_score >= 40 ? 'secondary' : 'destructive'}>
                      {assessment.risk_score}/100
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {assessment.decision === 'APPROVE' ? (
                      <Badge variant="default">Approuvée</Badge>
                    ) : (
                      <Badge variant="destructive">Bloquée</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Devices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Dispositifs Actifs
            </CardTitle>
            <CardDescription>Empreintes de dispositifs récemment utilisées</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Visiteur</TableHead>
                  <TableHead>Utilisations</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => (
                  <TableRow key={device.visitor_id}>
                    <TableCell className="font-mono text-xs">{device.visitor_id.substring(0, 12)}...</TableCell>
                    <TableCell>{device.times_used}</TableCell>
                    <TableCell>
                      {device.is_blocked ? (
                        <Badge variant="destructive">Bloqué</Badge>
                      ) : device.is_trusted ? (
                        <Badge variant="default">Confiance</Badge>
                      ) : (
                        <Badge variant="secondary">Normal</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!device.is_blocked && !device.is_trusted && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleTrustDevice(device.visitor_id)}>
                            Confiance
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleBlockDevice(device.visitor_id)}>
                            Bloquer
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* IPs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Adresses IP Actives
            </CardTitle>
            <CardDescription>IPs récemment utilisées pour des transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP</TableHead>
                  <TableHead>Localisation</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ips.map((ip) => (
                  <TableRow key={ip.ip_address}>
                    <TableCell className="font-mono text-xs">{ip.ip_address}</TableCell>
                    <TableCell>{ip.city ? `${ip.city}, ${ip.country}` : ip.country || 'N/A'}</TableCell>
                    <TableCell>
                      {ip.is_blocked ? (
                        <Badge variant="destructive">Bloquée</Badge>
                      ) : ip.is_vpn ? (
                        <Badge variant="secondary">VPN/Proxy</Badge>
                      ) : (
                        <Badge variant="default">Normal</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!ip.is_blocked && (
                        <Button size="sm" variant="destructive" onClick={() => handleBlockIp(ip.ip_address)}>
                          Bloquer
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FraudAnalytics;