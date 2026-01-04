"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { UploadCloud, DownloadCloud, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  SelectLabel,
  SelectGroup,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

type ExportFrequency = 'minute' | 'hour' | 'day' | 'week' | 'month';

interface CreditSyncHeaderProps {
  isPushing: boolean;
  onPush: () => void;
  autoExportEnabled: boolean;
  autoExportFrequency: ExportFrequency;
  onToggleAutoExport: (enabled: boolean) => void;
  onChangeFrequency: (freq: ExportFrequency) => void;
  isRequesting: boolean;
  onRequestReport: () => void;
  disabled?: boolean;
}

const CreditSyncHeader: React.FC<CreditSyncHeaderProps> = ({
  isPushing,
  onPush,
  autoExportEnabled,
  autoExportFrequency,
  onToggleAutoExport,
  onChangeFrequency,
  isRequesting,
  onRequestReport,
  disabled = false,
}) => {
  const { t } = useTranslation('dashboard');

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Gestion du dossier de crédit</h2>
          <p className="text-sm text-muted-foreground">
            Poussez les données du compte vers le bureau de crédit ou configurez l’export automatique.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Select
              value={autoExportFrequency}
              onValueChange={(val: ExportFrequency) => onChangeFrequency(val)}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Fréquence" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Fréquence d’export</SelectLabel>
                  <SelectItem value="minute">Minute</SelectItem>
                  <SelectItem value="hour">Heure</SelectItem>
                  <SelectItem value="day">Jour</SelectItem>
                  <SelectItem value="week">Semaine</SelectItem>
                  <SelectItem value="month">Mois</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Switch
                checked={autoExportEnabled}
                onCheckedChange={(checked) => onToggleAutoExport(checked)}
              />
              <span className="text-sm text-muted-foreground">Export automatique</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button
          onClick={onPush}
          disabled={isPushing || disabled}
          className={cn("w-full sm:w-auto")}
        >
          {isPushing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <UploadCloud className="mr-2 h-4 w-4" />
          )}
          {t('userProfile.pushToCreditBureau')}
        </Button>

        <Button
          variant="outline"
          onClick={onRequestReport}
          disabled={isRequesting || disabled}
          className={cn("w-full sm:w-auto")}
        >
          {isRequesting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <DownloadCloud className="mr-2 h-4 w-4" />
          )}
          {t('userProfile.requestCreditReport')}
        </Button>
      </div>
    </div>
  );
};

export default CreditSyncHeader;