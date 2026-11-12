/**
 * Référentiel d'évaluation — inspiré du CISA Zero Trust Maturity Model v2.0 (avril 2023).
 *
 * Les descriptions sont une adaptation libre en français, reformulée pour un usage
 * en diagnostic. Les correspondances NIST CSF 2.0 et NIS2 (art. 21.2) sont
 * indicatives : elles aident à relier une action Zero Trust à une exigence
 * réglementaire, elles ne remplacent pas une analyse de conformité.
 *
 * effort : poids relatif de la charge de transformation (1 = faible, 3 = élevé).
 */

import { GUIDE } from './guide.js';

export const LEVELS = [
  { value: 1, name: 'Traditionnel', short: 'Trad.' },
  { value: 2, name: 'Initial', short: 'Init.' },
  { value: 3, name: 'Avancé', short: 'Av.' },
  { value: 4, name: 'Optimal', short: 'Opt.' },
];

export const NIS2_MEASURES = {
  a: "Politiques d'analyse des risques et de sécurité des SI",
  b: 'Gestion des incidents',
  c: 'Continuité d\'activité, sauvegardes et gestion de crise',
  d: "Sécurité de la chaîne d'approvisionnement",
  e: 'Sécurité de l\'acquisition, du développement et de la maintenance des SI',
  f: "Évaluation de l'efficacité des mesures",
  g: 'Cyberhygiène et formation',
  h: 'Cryptographie et chiffrement',
  i: 'Sécurité RH, contrôle d\'accès et gestion des actifs',
  j: 'MFA, authentification continue et communications sécurisées',
};

export const NIST_CSF = {
  'GV.PO': 'Gouvernance — Politique',
  'GV.OV': 'Gouvernance — Supervision',
  'GV.RR': 'Gouvernance — Rôles et responsabilités',
  'GV.SC': "Gouvernance — Risques de la chaîne d'approvisionnement",
  'ID.AM': 'Identifier — Gestion des actifs',
  'ID.RA': 'Identifier — Évaluation des risques',
  'PR.AA': 'Protéger — Identités, authentification et contrôle d\'accès',
  'PR.DS': 'Protéger — Sécurité des données',
  'PR.PS': 'Protéger — Sécurité des plateformes',
  'PR.IR': 'Protéger — Résilience des infrastructures',
  'DE.CM': 'Détecter — Surveillance continue',
  'DE.AE': 'Détecter — Analyse des événements',
  'RS.MA': 'Répondre — Gestion des incidents',
  'RS.MI': 'Répondre — Atténuation des incidents',
  'RC.RP': 'Rétablir — Exécution du plan de reprise',
};

export const PILLARS = [
  {
    id: 'identity',
    name: 'Identités',
    description:
      "Utilisateurs, comptes de service et entités non humaines : comment ils sont authentifiés, gérés et autorisés.",
    functions: [
      {
        id: 'id-authn',
        name: 'Authentification',
        description: "Vérification de l'identité d'une entité avant et pendant l'accès.",
        effort: 2,
        nist: ['PR.AA'],
        nis2: ['j', 'i'],
        levels: [
          "Mot de passe seul ou MFA basique (SMS, OTP). L'identité n'est vérifiée qu'à l'ouverture de session.",
          'MFA généralisé, le mot de passe restant un des facteurs. Prise en compte de quelques attributs de contexte (localisation, activité).',
          "MFA résistant à l'hameçonnage (FIDO2/passkeys, carte à puce) pour la majorité des accès ; début du sans mot de passe.",
          "Authentification continue et résistante à l'hameçonnage : l'identité est réévaluée tout au long de la session, pas seulement à la connexion.",
        ],
      },
      {
        id: 'id-stores',
        name: "Référentiels d'identités",
        description: 'Annuaires et sources faisant autorité pour les identités (AD, Entra ID, IdP, LDAP).',
        effort: 3,
        nist: ['PR.AA'],
        nis2: ['i'],
        levels: [
          'Annuaires multiples, en silo, gérés localement et sans synchronisation.',
          "Début de consolidation : coexistence d'annuaires sur site et cloud avec une intégration limitée.",
          'Référentiels consolidés et fédérés de manière sécurisée entre le sur site et le cloud (fournisseur d\'identité central).',
          'Gestion unifiée et sécurisée des identités sur tous les environnements, y compris partenaires et prestataires, avec cycle de vie automatisé.',
        ],
      },
      {
        id: 'id-risk',
        name: 'Évaluation des risques',
        description: "Capacité à estimer le niveau de risque d'une identité pour adapter la décision d'accès.",
        effort: 3,
        nist: ['PR.AA', 'DE.CM'],
        nis2: ['i', 'a'],
        levels: [
          "Pas ou peu d'évaluation du risque lié aux identités.",
          'Évaluation manuelle et règles statiques (listes de pays bloqués, horaires).',
          "Analyses automatisées et règles dynamiques (connexion impossible, identifiants compromis) qui influencent l'accès.",
          'Évaluation continue et en temps réel, analyse comportementale (UEBA) et apprentissage automatique.',
        ],
      },
      {
        id: 'id-access',
        name: 'Gestion des accès',
        description: 'Attribution, revue et retrait des droits, en particulier des privilèges.',
        effort: 2,
        nist: ['PR.AA'],
        nis2: ['i'],
        levels: [
          'Droits permanents, y compris pour les comptes à privilèges ; revues rares ou inexistantes.',
          'Revues périodiques des droits et expiration automatique de certains accès.',
          'Accès privilégiés juste-à-temps et juste-assez (JIT/JEA) via un bastion ou une solution PAM.',
          'Moindre privilège dynamique et automatisé pour toutes les identités, adapté au besoin réel et au risque.',
        ],
      },
    ],
  },
  {
    id: 'devices',
    name: 'Terminaux',
    description:
      "Postes, mobiles, serveurs, objets connectés : inventaire, conformité et protection de tout équipement qui accède aux ressources.",
    functions: [
      {
        id: 'dv-compliance',
        name: 'Conformité et application des politiques',
        description: 'Vérification de la configuration des terminaux et application des politiques de sécurité.',
        effort: 2,
        nist: ['PR.PS', 'DE.CM'],
        nis2: ['e', 'g'],
        levels: [
          'Visibilité limitée sur la conformité des terminaux ; application manuelle des politiques.',
          'Collecte des configurations et vulnérabilités des terminaux ; correction encore largement manuelle.',
          'Contrôle de conformité automatisé (MDM/UEM) sur la majorité du parc, vérifié lors de l\'accès.',
          'Surveillance continue de la posture sur tout le cycle de vie, avec remédiation automatique.',
        ],
      },
      {
        id: 'dv-assets',
        name: "Actifs et chaîne d'approvisionnement",
        description: 'Inventaire des équipements et maîtrise des risques fournisseurs.',
        effort: 2,
        nist: ['ID.AM', 'GV.SC'],
        nis2: ['i', 'd'],
        levels: [
          "Pas d'inventaire fiable ; risques fournisseurs non pris en compte.",
          'Inventaire des équipements physiques et virtuels ; politiques d\'achat intégrant des critères de sécurité.',
          'Inventaire automatisé, y compris équipements personnels autorisés ; détection des écarts avec l\'inventaire.',
          'Inventaire en temps réel et gestion des risques fournisseurs intégrée à tout le cycle de vie ; blocage des équipements inconnus.',
        ],
      },
      {
        id: 'dv-access',
        name: 'Accès aux ressources selon le terminal',
        description: "Prise en compte de l'état du terminal dans la décision d'accès.",
        effort: 2,
        nist: ['PR.AA'],
        nis2: ['i'],
        levels: [
          "L'état du terminal n'est pas pris en compte pour accorder un accès.",
          "Quelques caractéristiques (terminal enregistré, géré) conditionnent l'accès initial.",
          "La posture vérifiée du terminal (chiffrement, correctifs, EDR actif) conditionne l'accès initial.",
          "Accès réévalué en continu selon l'analyse en temps réel du risque du terminal.",
        ],
      },
      {
        id: 'dv-threat',
        name: 'Protection contre les menaces',
        description: 'Antivirus, EDR/XDR et protections déployées sur les terminaux.',
        effort: 2,
        nist: ['DE.CM', 'PR.PS'],
        nis2: ['b', 'g'],
        levels: [
          'Protections déployées manuellement sur une partie du parc.',
          'Déploiement et mise à jour automatisés des protections (EDR) sur une partie du parc.',
          'Solution centralisée (EDR/XDR) couvrant la majorité des terminaux, supervisée.',
          'XDR couvrant tous les terminaux, intégré aux politiques d\'accès et à la réponse automatisée.',
        ],
      },
    ],
  },
  {
    id: 'networks',
    name: 'Réseaux',
    description:
      'Flux internes et externes : segmentation, gestion du trafic, chiffrement et résilience.',
    functions: [
      {
        id: 'nw-segmentation',
        name: 'Segmentation',
        description: 'Cloisonnement des réseaux et des charges de travail pour limiter les déplacements latéraux.',
        effort: 3,
        nist: ['PR.IR'],
        nis2: ['a', 'e'],
        levels: [
          'Réseau plat protégé par un périmètre ; interconnexions statiques et larges.',
          'Isolement des systèmes critiques ; premières règles fondées sur les flux applicatifs.',
          'Extension de l\'isolement et micro-segmentation des charges de travail critiques.',
          "Micro-segmentation généralisée fondée sur l'identité et le besoin applicatif, avec micro-périmètres dynamiques.",
        ],
      },
      {
        id: 'nw-traffic',
        name: 'Gestion du trafic',
        description: 'Définition et ajustement des règles de filtrage selon les besoins applicatifs.',
        effort: 2,
        nist: ['PR.IR', 'DE.CM'],
        nis2: ['e'],
        levels: [
          'Règles statiques gérées manuellement, rarement revues.',
          'Cartographie des flux et profils de trafic par application.',
          'Règles ajustées régulièrement selon les profils de risque des applications.',
          'Règles adaptées automatiquement et en continu selon le besoin et le risque.',
        ],
      },
      {
        id: 'nw-encryption',
        name: 'Chiffrement du trafic',
        description: 'Protection des flux internes et externes et gestion des clés et certificats.',
        effort: 2,
        nist: ['PR.DS'],
        nis2: ['h', 'j'],
        levels: [
          'Peu de flux chiffrés ; clés et certificats gérés manuellement.',
          'Chiffrement des flux externes et début des flux internes ; politique de gestion des clés.',
          'Chiffrement de tous les flux internes et externes (TLS 1.2+) ; gestion centralisée des certificats.',
          'Chiffrement généralisé avec rotation automatique des clés et crypto-agilité (préparation post-quantique).',
        ],
      },
      {
        id: 'nw-resilience',
        name: 'Résilience',
        description: 'Capacité du réseau à maintenir la disponibilité des services.',
        effort: 2,
        nist: ['PR.IR', 'RC.RP'],
        nis2: ['c'],
        levels: [
          'Disponibilité gérée au cas par cas, sans exigence formalisée.',
          'Exigences de résilience définies pour les applications critiques.',
          'Redondance et configurations de résilience pour la majorité des applications.',
          'Résilience globale qui s\'adapte dynamiquement aux besoins de disponibilité.',
        ],
      },
    ],
  },
  {
    id: 'applications',
    name: 'Applications',
    description:
      'Applications et charges de travail, sur site ou cloud : accès, protection, exposition et cycle de développement.',
    functions: [
      {
        id: 'ap-access',
        name: 'Accès applicatif',
        description: "Autorisation des utilisateurs et des services à accéder aux applications.",
        effort: 2,
        nist: ['PR.AA'],
        nis2: ['i'],
        levels: [
          "Autorisation à la connexion uniquement, sur des attributs statiques (rôle, groupe).",
          "Autorisation contextuelle (identité, terminal) avec expiration des sessions.",
          "Autorisation automatisée intégrant le contexte (localisation, comportement, sensibilité).",
          "Autorisation continue, réévaluée en temps réel selon le risque.",
        ],
      },
      {
        id: 'ap-threat',
        name: 'Protection contre les menaces',
        description: 'WAF, protection des API et défenses intégrées aux applications.',
        effort: 2,
        nist: ['PR.PS', 'DE.CM'],
        nis2: ['e'],
        levels: [
          'Protections limitées et peu intégrées aux applications.',
          'Protections (WAF, protection des API) sur les applications critiques.',
          "Protections sur toutes les applications, y compris contre les menaces propres à la logique métier.",
          'Protections avancées avec analyse comportementale en temps réel, intégrées à tous les flux applicatifs.',
        ],
      },
      {
        id: 'ap-exposure',
        name: 'Exposition des applications',
        description: "Mode d'accès aux applications : VPN, proxy d'accès, ZTNA.",
        effort: 3,
        nist: ['PR.AA', 'PR.IR'],
        nis2: ['i', 'j'],
        levels: [
          "Applications accessibles uniquement via le réseau interne ou un VPN donnant un accès large.",
          "Quelques applications critiques accessibles via un accès Zero Trust (ZTNA, proxy d'accès).",
          'La majorité des applications accessibles via un accès Zero Trust.',
          "Toutes les applications accessibles directement et de façon sécurisée, sans VPN ni confiance implicite au réseau.",
        ],
      },
      {
        id: 'ap-devsecops',
        name: 'Développement et déploiement sécurisés',
        description: 'Séparation des environnements, chaîne CI/CD et accès à la production.',
        effort: 3,
        nist: ['PR.PS'],
        nis2: ['e'],
        levels: [
          'Environnements de développement, test et production peu séparés ; déploiements manuels.',
          'Environnements distincts ; développement et déploiement en partie automatisés.',
          'Chaîne CI/CD sécurisée ; accès à la production restreint et tracé.',
          'Infrastructure immuable, déploiements entièrement automatisés, aucun accès humain direct à la production.',
        ],
      },
      {
        id: 'ap-testing',
        name: 'Tests de sécurité',
        description: 'Tests de code, tests dynamiques, tests d\'intrusion.',
        effort: 2,
        nist: ['ID.RA', 'PR.PS'],
        nis2: ['e', 'f'],
        levels: [
          'Tests principalement manuels et ponctuels avant mise en production.',
          'Analyse statique et dynamique (SAST/DAST) avant déploiement.',
          "Tests intégrés à la chaîne CI/CD et tests d'intrusion réguliers.",
          'Tests continus sur tout le cycle de vie, y compris en production (bug bounty, analyse des dépendances).',
        ],
      },
    ],
  },
  {
    id: 'data',
    name: 'Données',
    description:
      'Données structurées et non structurées : inventaire, classification, disponibilité, accès et chiffrement.',
    functions: [
      {
        id: 'dt-inventory',
        name: 'Inventaire des données',
        description: 'Connaissance des données détenues et protection contre leur fuite.',
        effort: 2,
        nist: ['ID.AM', 'PR.DS'],
        nis2: ['i'],
        levels: [
          'Inventaire manuel, partiel ou inexistant.',
          "Début d'inventaire automatisé ; prévention des fuites (DLP) basique.",
          'Inventaire automatisé couvrant la majorité des données ; DLP sur les principaux canaux.',
          "Inventaire continu de toutes les données ; DLP bloquant automatiquement les exfiltrations suspectes.",
        ],
      },
      {
        id: 'dt-classification',
        name: 'Classification',
        description: 'Étiquetage des données selon leur sensibilité.',
        effort: 2,
        nist: ['ID.AM'],
        nis2: ['a', 'i'],
        levels: [
          'Classification ponctuelle, sans politique commune.',
          'Politique de classification définie ; étiquetage manuel.',
          'Étiquetage en partie automatisé et cohérent entre les environnements.',
          'Classification automatisée, fine et appliquée à toutes les données.',
        ],
      },
      {
        id: 'dt-availability',
        name: 'Disponibilité',
        description: 'Sauvegardes et accès aux données en cas d\'incident.',
        effort: 2,
        nist: ['PR.DS', 'RC.RP'],
        nis2: ['c'],
        levels: [
          'Sauvegardes ponctuelles, restauration rarement testée.',
          'Sauvegardes redondantes et haute disponibilité pour une partie des données.',
          'Sauvegardes redondantes, isolées et testées ; disponibilité assurée pour la majorité des données.',
          'Mécanismes dynamiques garantissant la disponibilité optimale de toutes les données, y compris historiques.',
        ],
      },
      {
        id: 'dt-access',
        name: 'Accès aux données',
        description: 'Contrôle de qui peut lire, modifier ou partager une donnée.',
        effort: 3,
        nist: ['PR.AA', 'PR.DS'],
        nis2: ['i'],
        levels: [
          "Droits d'accès statiques, souvent trop larges.",
          'Moindre privilège appliqué et revues périodiques des droits.',
          "Contrôles automatisés selon l'identité, les attributs et le contexte.",
          'Accès dynamiques juste-à-temps, réévalués en continu selon le risque.',
        ],
      },
      {
        id: 'dt-encryption',
        name: 'Chiffrement des données',
        description: 'Chiffrement au repos, en transit et en usage ; gestion des clés.',
        effort: 2,
        nist: ['PR.DS'],
        nis2: ['h'],
        levels: [
          'Chiffrement minimal ; clés gérées manuellement.',
          'Chiffrement au repos et en transit sur une partie des environnements ; politique de gestion des clés.',
          'Chiffrement de toutes les données au repos et en transit ; gestion centralisée des clés (KMS, HSM).',
          'Chiffrement étendu aux données en usage quand c\'est pertinent ; crypto-agilité et gestion automatisée des clés.',
        ],
      },
    ],
  },
  {
    id: 'crosscutting',
    name: 'Capacités transverses',
    description:
      'Capacités communes à tous les piliers : supervision, automatisation et gouvernance du Zero Trust.',
    functions: [
      {
        id: 'cc-visibility',
        name: 'Visibilité et analyse',
        description: 'Collecte, centralisation et analyse des journaux et événements de sécurité.',
        effort: 3,
        nist: ['DE.CM', 'DE.AE'],
        nis2: ['b', 'f'],
        levels: [
          'Journaux collectés manuellement ou localement ; analyse limitée.',
          'Collecte automatisée de certaines sources et centralisation partielle (SIEM).',
          'Collecte et corrélation automatisées sur la majorité des sources, supervision par un SOC.',
          'Visibilité complète, analyse comportementale et détection en temps réel sur tous les piliers.',
        ],
      },
      {
        id: 'cc-automation',
        name: 'Automatisation et orchestration',
        description: 'Automatisation des politiques et de la réponse aux incidents.',
        effort: 3,
        nist: ['RS.MA', 'RS.MI'],
        nis2: ['b'],
        levels: [
          'Processus et réponse aux incidents manuels.',
          "Premières automatisations (provisionnement, isolement d'un poste).",
          'Orchestration automatisée (SOAR) des politiques et de la réponse sur la majorité des environnements.',
          "Orchestration dynamique sur l'ensemble du cycle de vie, avec réponse automatique adaptée au risque.",
        ],
      },
      {
        id: 'cc-governance',
        name: 'Gouvernance',
        description: 'Politiques, pilotage et responsabilités du programme Zero Trust.',
        effort: 1,
        nist: ['GV.PO', 'GV.OV', 'GV.RR'],
        nis2: ['a', 'f'],
        levels: [
          "Politiques définies et appliquées manuellement ; pas de stratégie Zero Trust formalisée.",
          'Stratégie Zero Trust définie avec un sponsor ; politiques en partie appliquées automatiquement.',
          'Politiques appliquées de manière cohérente et automatisée ; comité de pilotage et indicateurs suivis.',
          'Gouvernance automatisée, politiques dynamiques et amélioration continue mesurée.',
        ],
      },
    ],
  },
];

// Rattache à chaque fonction son enjeu, ses questions d'entretien et ses prérequis.
for (const pillar of PILLARS) {
  for (const fn of pillar.functions) Object.assign(fn, GUIDE[fn.id] ?? { why: '', questions: [], requires: [] });
}

export const MODEL_INFO = {
  name: 'CISA Zero Trust Maturity Model',
  version: '2.0',
  url: 'https://www.cisa.gov/zero-trust-maturity-model',
};
