import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, padding: 40, color: '#1F2937' },
  header: { fontSize: 18, marginBottom: 20, textAlign: 'center', fontWeight: 'bold', color: '#111827' },
  subHeader: { fontSize: 11, textAlign: 'center', marginBottom: 18, color: '#374151' },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', backgroundColor: '#E5E7EB', padding: 6, marginBottom: 8, textTransform: 'uppercase' },
  row: { flexDirection: 'row', marginBottom: 6 },
  col: { flex: 1, paddingRight: 8 },
  table: { display: 'flex', width: 'auto', borderStyle: 'solid', borderWidth: 1, borderColor: '#D1D5DB' },
  tableRow: { flexDirection: 'row', borderBottomColor: '#D1D5DB', borderBottomWidth: 1 },
  tableColHeader: { backgroundColor: '#F9FAFB', fontWeight: 'bold', padding: 5 },
  tableCol: { padding: 5, borderRightColor: '#D1D5DB', borderRightWidth: 1 },
  col20: { width: '20%' },
  col30: { width: '30%' },
  col25: { width: '25%' },
  col15: { width: '15%' },
  col10: { width: '10%' },
  legal: { fontSize: 8.5, color: '#6B7280', lineHeight: 1.45 },
  bold: { fontWeight: 'bold' },
  value: { fontFamily: 'Helvetica', fontSize: 10 },
});

interface StatementPDFProps {
  institution?: any;
  profile?: any;
  account?: any;
  statement: any;
  transactions: any[];
  interestCharged: number;
}

export const StatementPDF = ({ institution, profile, account, statement, transactions, interestCharged }: StatementPDFProps) => {
  const fmtCAD = (n: number) => new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(n);
  const period = `Du ${new Date(statement.statement_period_start).toLocaleDateString('fr-CA')} au ${new Date(statement.statement_period_end).toLocaleDateString('fr-CA')}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>{institution?.name ?? 'Relevé de compte'}</Text>
        <Text style={styles.subHeader}>{period}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations</Text>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text><Text style={styles.bold}>Titulaire:</Text> {profile?.type === 'personal' ? (profile?.full_name ?? '') : (profile?.legal_name ?? '')}</Text>
              <Text><Text style={styles.bold}>Institution:</Text> {institution?.name ?? ''}</Text>
              {institution?.address && <Text><Text style={styles.bold}>Adresse:</Text> {institution.address}, {institution.city}, {institution.country}</Text>}
              {institution?.phone_number && <Text><Text style={styles.bold}>Téléphone:</Text> {institution.phone_number}</Text>}
            </View>
            <View style={styles.col}>
              <Text><Text style={styles.bold}>Compte:</Text> {account?.id}</Text>
              <Text><Text style={styles.bold}>Devise:</Text> {account?.currency ?? 'CAD'}</Text>
              <Text><Text style={styles.bold}>Taux achats:</Text> {(account?.interest_rate ?? 0).toFixed(2)}%</Text>
              <Text><Text style={styles.bold}>Taux avances de fonds:</Text> {(account?.cash_advance_rate ?? 0).toFixed(2)}%</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Résumé financier</Text>
          <View style={styles.row}>
            <View style={styles.col}><Text>Solde précédent: <Text style={styles.bold}>{fmtCAD(statement.opening_balance)}</Text></Text></View>
            <View style={styles.col}><Text>Nouveau solde: <Text style={styles.bold}>{fmtCAD(statement.closing_balance)}</Text></Text></View>
          </View>
          <View style={styles.row}>
            <View style={styles.col}><Text>Paiement minimum: <Text style={styles.bold}>{fmtCAD(statement.minimum_payment)}</Text></Text></View>
            <View style={styles.col}><Text>Date d’échéance: <Text style={styles.bold}>{new Date(statement.payment_due_date).toLocaleDateString('fr-CA')}</Text></Text></View>
          </View>
          <View style={styles.row}>
            <View style={styles.col}><Text>Intérêts facturés: <Text style={styles.bold}>{fmtCAD(interestCharged)}</Text></Text></View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transactions</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <View style={{...styles.tableCol, ...styles.col20, ...styles.tableColHeader}}><Text>Date</Text></View>
              <View style={{...styles.tableCol, ...styles.col30, ...styles.tableColHeader}}><Text>Description</Text></View>
              <View style={{...styles.tableCol, ...styles.col20, ...styles.tableColHeader}}><Text>Type</Text></View>
              <View style={{...styles.tableCol, ...styles.col15, ...styles.tableColHeader}}><Text>Devise</Text></View>
              <View style={{...styles.tableCol, ...styles.col15, ...styles.tableColHeader, borderRightWidth: 0}}><Text>Montant</Text></View>
            </View>
            {transactions.map((tx) => (
              <View style={styles.tableRow} key={tx.id}>
                <View style={{...styles.tableCol, ...styles.col20}}><Text>{new Date(tx.created_at).toLocaleDateString('fr-CA')}</Text></View>
                <View style={{...styles.tableCol, ...styles.col30}}><Text>{tx.description || ''}</Text></View>
                <View style={{...styles.tableCol, ...styles.col20}}><Text>{(tx.type || '').replace('_', ' ')}</Text></View>
                <View style={{...styles.tableCol, ...styles.col15}}><Text>{tx.currency || 'CAD'}</Text></View>
                <View style={{...styles.tableCol, ...styles.col15, borderRightWidth: 0}}><Text>{fmtCAD(tx.amount)}</Text></View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mentions légales (Québec / Canada)</Text>
          <Text style={styles.legal}>
            - Grâce de 21 jours: Aucun intérêt sur nouveaux achats si le solde est payé intégralement avant la fin de la période de grâce (minimum 21 jours).{"\n"}
            - Intérêts annuels: Les intérêts sur achats sont calculés au taux annuel indiqué après 21 jours; les avances de fonds portent intérêt dès le jour 1. Le calcul est effectué quotidiennement sur base de 365 jours.{"\n"}
            - Droits du consommateur: Les titulaires ont droit à des informations claires et à des recours en vertu des lois applicables, incluant la Loi sur la protection du consommateur (Québec) et la réglementation fédérale sur les cartes de crédit.{"\n"}
            - Litiges et fraudes: En cas d’opérations non autorisées, contactez immédiatement l’institution. Des politiques de responsabilité limitée peuvent s’appliquer selon les conditions de votre programme.{"\n"}
            - Résiliation et modifications: Les taux et frais peuvent changer conformément à votre convention de carte et aux lois en vigueur. Vous serez informé des modifications conformément aux exigences réglementaires.
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default StatementPDF;