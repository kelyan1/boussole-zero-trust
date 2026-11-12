/**
 * Jeu de données de démonstration — organisation entièrement fictive.
 * Format [niveau actuel, niveau cible, note, initiative existante].
 */
import { SCHEMA } from '../engine.js';

const answers = {
  'id-authn': [2, 3, 'MFA par OTP déployé pour tous ; FIDO2 limité aux administrateurs.', 'planned'],
  'id-stores': [2, 3, 'AD sur site synchronisé avec un IdP cloud ; deux annuaires métiers isolés.'],
  'id-risk': [1, 3, "Aucune règle d'accès conditionnel basée sur le risque."],
  'id-access': [1, 3, 'Comptes à privilèges permanents ; pas de bastion. Dernière revue des droits : il y a 2 ans.'],
  'dv-compliance': [2, 3, 'MDM sur les mobiles uniquement ; extension aux postes de travail en cours.', 'running'],
  'dv-assets': [2, 3, 'Inventaire CMDB mis à jour manuellement.'],
  'dv-access': [1, 3, ''],
  'dv-threat': [3, 4, 'EDR sur 95 % du parc, supervisé par le SOC externalisé.'],
  'nw-segmentation': [1, 3, 'Réseau interne peu segmenté : la production et la bureautique communiquent librement.', 'adapt'],
  'nw-traffic': [1, 2, 'Règles pare-feu jamais recertifiées.'],
  'nw-encryption': [2, 3, ''],
  'nw-resilience': [2, 3, ''],
  'ap-access': [2, 3, ''],
  'ap-threat': [2, 3, 'WAF devant les applications exposées à internet uniquement.'],
  'ap-exposure': [1, 3, 'Accès distant par VPN donnant accès à tout le réseau interne.'],
  'ap-devsecops': [2, 3, ''],
  'ap-testing': [2, 3, 'Test d\'intrusion annuel ; pas de SAST dans la chaîne CI.'],
  'dt-inventory': [1, 2, ''],
  'dt-classification': [1, 3, 'Politique de classification rédigée mais non appliquée.'],
  'dt-availability': [3, 3, 'Sauvegardes immuables testées chaque trimestre.'],
  'dt-access': [2, 3, ''],
  'dt-encryption': [2, 3, ''],
  'cc-visibility': [2, 3, 'SIEM alimenté par l\'AD et les pare-feu ; cloud et applications non collectés.', 'adapt'],
  'cc-automation': [1, 2, ''],
  'cc-governance': [2, 4, 'Programme Zero Trust sponsorisé par le RSSI ; pas encore de comité de pilotage.'],
};

export const DEMO_STATE = {
  schema: SCHEMA,
  context: {
    organisation: 'Groupe Exemple (fictif)',
    secteur: 'Services financiers',
    perimetre: 'SI groupe — France',
    evaluateur: 'Équipe Cyber Strategy',
    date: new Date().toISOString().slice(0, 10),
    taille: 'eti',
    tjm: 850,
  },
  weights: { identity: 3, devices: 2, networks: 2, applications: 2, data: 3, crosscutting: 2 },
  answers: Object.fromEntries(
    Object.entries(answers).map(([id, [current, target, note, initiative = 'none']]) => [id, { current, target, note, initiative }]),
  ),
};
