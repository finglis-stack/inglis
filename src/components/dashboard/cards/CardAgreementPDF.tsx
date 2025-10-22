import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { TFunction } from 'i18next';

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, padding: 40, color: '#1F2937' },
  header: { fontSize: 16, marginBottom: 25, textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase', color: '#111827' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', backgroundColor: '#E5E7EB', padding: 6, marginBottom: 8, textTransform: 'uppercase' },
  table: { display: 'flex', width: 'auto', borderStyle: 'solid', borderWidth: 1, borderColor: '#D1D5DB' },
  tableRow: { flexDirection: 'row', borderBottomColor: '#D1D5DB', borderBottomWidth: 1 },
  tableColHeader: { backgroundColor: '#F9FAFB', fontWeight: 'bold', padding: 5 },
  tableCol: { padding: 5, borderRightColor: '#D1D5DB', borderRightWidth: 1 },
  col25: { width: '25%' },
  col50: { width: '50%' },
  col75: { width: '75%' },
  text: { marginBottom: 5, lineHeight: 1.5 },
  subText: { fontSize: 9, color: '#6B7280', marginTop: 4 },
  bold: { fontWeight: 'bold' },
  validationSection: { marginTop: 40, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#374151', textAlign: 'center' },
  validationTitle: { fontSize: 11, fontWeight: 'bold', marginBottom: 5 },
  validationCode: { fontSize: 24, fontWeight: 'bold', letterSpacing: 8, color: '#111827', marginTop: 5 },
});

interface CardAgreementPDFProps {
  t: TFunction;
  program: any;
  institution: any;
  validationCode: string;
  interestRate?: string;
  cashAdvanceRate?: string;
}

export const CardAgreementPDF = ({ t, program, institution, validationCode, interestRate, cashAdvanceRate }: CardAgreementPDFProps) => {
  const isCredit = program.card_type === 'credit';
  const feeModel = program.fee_model;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>{t('newCard.pdf.title', { institutionName: institution.name })}</Text>

        {isCredit && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('newCard.pdf.interestRates')}</Text>
            <View style={styles.table}>
              <View style={styles.tableRow}>
                <View style={{...styles.tableCol, ...styles.col25, ...styles.tableColHeader}}><Text>{t('newCard.pdf.rateType')}</Text></View>
                <View style={{...styles.tableCol, ...styles.col25, ...styles.tableColHeader}}><Text>{t('newCard.pdf.purchases')}</Text></View>
                <View style={{...styles.tableCol, ...styles.col50, ...styles.tableColHeader, borderRightWidth: 0}}><Text>{t('newCard.pdf.cashAdvances')}</Text></View>
              </View>
              <View style={styles.tableRow}>
                <View style={{...styles.tableCol, ...styles.col25}}><Text style={styles.bold}>{t('newCard.pdf.regularRate')}</Text></View>
                <View style={{...styles.tableCol, ...styles.col25}}><Text>{interestRate ? `${parseFloat(interestRate).toFixed(2).replace('.', ',')} %` : 'N/A'}</Text></View>
                <View style={{...styles.tableCol, ...styles.col50, borderRightWidth: 0}}><Text>{cashAdvanceRate ? `${parseFloat(cashAdvanceRate).toFixed(2).replace('.', ',')} %` : 'N/A'}</Text></View>
              </View>
            </View>
            <Text style={styles.subText}>{t('newCard.pdf.ratesDisclaimer')}</Text>
          </View>
        )}

        {isCredit && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('newCard.pdf.gracePeriod')}</Text>
            <Text style={styles.text}>{t('newCard.pdf.gracePeriodDesc', { days: program.grace_period || 21 })}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('newCard.pdf.annualFees')}</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <View style={{...styles.tableCol, ...styles.col50, ...styles.tableColHeader}}><Text>{t('newCard.pdf.card')}</Text></View>
              <View style={{...styles.tableCol, ...styles.col50, ...styles.tableColHeader, borderRightWidth: 0}}><Text>{t('newCard.pdf.annualFee')}</Text></View>
            </View>
            <View style={styles.tableRow}>
              <View style={{...styles.tableCol, ...styles.col50}}><Text>{program.program_name}</Text></View>
              <View style={{...styles.tableCol, ...styles.col50, borderRightWidth: 0}}>
                {feeModel === 'none' && <Text>0,00 $</Text>}
                {feeModel === 'annual_user' && <Text>{t('newCard.pdf.annualFeeUser')}</Text>}
                {feeModel === 'custom' && <Text>{program.issuance_fee ? `${program.issuance_fee.toFixed(2)} $` : '0,00 $'}</Text>}
                {feeModel === 'per_transaction_user' && <Text>{t('newCard.pdf.noAnnualFee')}</Text>}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('newCard.pdf.otherFees')}</Text>
          <Text style={styles.text}><Text style={styles.bold}>{t('newCard.pdf.transactionFee')}:</Text> {feeModel === 'per_transaction_user' ? t('newCard.pdf.transactionFeeDescUser') : t('newCard.pdf.noDirectFee')}</Text>
        </View>

        <View style={styles.validationSection}>
          <Text style={styles.validationTitle}>{t('newCard.pdf.validationPrompt')}</Text>
          <Text>{t('newCard.pdf.validationInstructions')}</Text>
          <Text style={styles.validationCode}>{validationCode}</Text>
        </View>
      </Page>
    </Document>
  );
};