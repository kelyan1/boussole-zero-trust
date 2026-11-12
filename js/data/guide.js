/**
 * Guide d'entretien : pour chaque fonction, l'enjeu Zero Trust, les questions à poser
 * en atelier et les prérequis (fonctions à faire progresser avant celle-ci).
 *
 * requires : une marche vers le niveau N d'une fonction ne peut pas être planifiée
 * avant la marche de chacun de ses prérequis vers un niveau inférieur ou égal à N.
 */
export const GUIDE = {
  'id-authn': {
    why: "Le vol d'identifiants reste la première porte d'entrée des attaquants. En Zero Trust, l'identité remplace le réseau comme périmètre : elle doit être prouvée solidement, et pas seulement à la connexion.",
    questions: [
      'Quelle part des utilisateurs et des applications est protégée par du MFA ? Existe-t-il des exceptions (comptes de service, prestataires, applications anciennes) ?',
      "Quels facteurs sont autorisés (SMS, application, clé FIDO2, biométrie) ? Les administrateurs ont-ils un MFA résistant à l'hameçonnage ?",
      "L'authentification peut-elle être redemandée en cours de session, avant une opération sensible ?",
    ],
    requires: [],
  },
  'id-stores': {
    why: "Des annuaires dispersés multiplient les comptes orphelins et empêchent une décision d'accès cohérente. Un fournisseur d'identité central, ou une fédération, est le socle des autres capacités.",
    questions: [
      "Combien d'annuaires ou de sources d'identité coexistent ? Qui en est responsable ?",
      "Existe-t-il un fournisseur d'identité central ou une fédération ? Quelle part des applications, y compris SaaS, y est raccordée ?",
      'Les arrivées, mobilités et départs sont-ils automatisés depuis le SIRH ? En combien de temps un départ coupe-t-il tous les accès ?',
    ],
    requires: [],
  },
  'id-risk': {
    why: "Un identifiant valide ne suffit pas : une connexion depuis un pays inhabituel, ou juste après une fuite de mots de passe, doit être traitée différemment. Le niveau de risque alimente la décision d'accès.",
    questions: [
      "Des règles d'accès conditionnel existent-elles (pays, horaires, terminal) ? Sont-elles statiques ou fondées sur un score de risque ?",
      'Détectez-vous les identifiants compromis et les connexions impossibles ? Que se passe-t-il dans ce cas ?',
      'Les comportements anormaux des utilisateurs sont-ils analysés (UEBA) ?',
    ],
    requires: ['id-stores'],
  },
  'id-access': {
    why: "Les comptes à privilèges sont la cible prioritaire des attaquants. Le moindre privilège limite ce qu'un compte compromis permet de faire.",
    questions: [
      'Combien de comptes à privilèges existent ? Sont-ils nominatifs ? Une solution PAM ou un bastion est-il en place ?',
      'À quelle fréquence les droits sont-ils revus, et qui valide la revue ?',
      "Les droits d'administration peuvent-ils être accordés temporairement (juste-à-temps) plutôt que de façon permanente ?",
    ],
    requires: ['id-stores'],
  },
  'dv-compliance': {
    why: "Un terminal mal configuré ou non corrigé peut servir de point d'entrée, même entre les mains d'un utilisateur légitime. Sa conformité doit être connue et vérifiée.",
    questions: [
      'Quelle part du parc (postes, mobiles, serveurs) est gérée par un outil MDM ou UEM ?',
      'Les configurations de sécurité de référence (durcissement, chiffrement du disque) sont-elles définies et contrôlées ?',
      "Quel est le délai d'application des correctifs critiques ? Les écarts sont-ils corrigés automatiquement ?",
    ],
    requires: ['dv-assets'],
  },
  'dv-assets': {
    why: "On ne protège pas ce que l'on ne connaît pas. L'inventaire est le prérequis de la conformité, de la segmentation et de la supervision.",
    questions: [
      "Disposez-vous d'un inventaire à jour des équipements ? Comment est-il alimenté ?",
      'Les équipements inconnus qui se connectent au réseau sont-ils détectés, voire bloqués ?',
      "Les exigences de sécurité sont-elles intégrées aux achats et à l'évaluation des fournisseurs ?",
    ],
    requires: [],
  },
  'dv-access': {
    why: "En Zero Trust, l'accès dépend du couple utilisateur et terminal. Un utilisateur légitime sur un poste compromis ne doit pas obtenir le même accès.",
    questions: [
      "L'état du terminal est-il vérifié avant d'accorder l'accès (terminal géré, à jour, EDR actif) ?",
      'Comment sont traités les terminaux personnels et ceux des prestataires ?',
      'Un terminal qui devient non conforme perd-il ses accès en cours ?',
    ],
    requires: ['dv-compliance'],
  },
  'dv-threat': {
    why: "L'EDR détecte et bloque les comportements malveillants sur les terminaux. C'est aussi l'une des principales sources de signaux pour le SOC.",
    questions: [
      'Quelle part du parc est couverte par un EDR, en mode blocage ou en simple détection ?',
      'Les alertes EDR sont-elles analysées par un SOC ? Dans quel délai ?',
      "La réponse (isolement d'un poste, arrêt d'un processus) est-elle manuelle ou automatisée ?",
    ],
    requires: [],
  },
  'nw-segmentation': {
    why: "Dans un réseau plat, un attaquant qui compromet un poste peut atteindre tout le SI. La segmentation limite les déplacements latéraux et la propagation d'un rançongiciel.",
    questions: [
      'Comment le réseau interne est-il découpé ? La bureautique peut-elle joindre directement les serveurs de production ?',
      'Les systèmes critiques sont-ils isolés ? Une micro-segmentation est-elle déployée ou étudiée ?',
      'Sur quelle connaissance des flux applicatifs les règles de segmentation reposent-elles ?',
    ],
    requires: ['dv-assets', 'nw-traffic'],
  },
  'nw-traffic': {
    why: 'Des règles de filtrage jamais revues finissent par tout autoriser. Connaître les flux légitimes permet de bloquer tout le reste.',
    questions: [
      'Les flux applicatifs sont-ils cartographiés et documentés ?',
      'Les règles de pare-feu sont-elles recertifiées régulièrement ? Combien de règles trop larges subsistent ?',
      'Les règles peuvent-elles être adaptées automatiquement selon le risque ?',
    ],
    requires: [],
  },
  'nw-encryption': {
    why: 'Le Zero Trust part du principe que le réseau interne peut être observé par un attaquant : les flux doivent être chiffrés, y compris en interne.',
    questions: [
      'Les flux internes (entre serveurs, vers les bases de données) sont-ils chiffrés, ou seulement les flux exposés à internet ?',
      'Comment les certificats sont-ils gérés (inventaire, renouvellement) ? Une expiration imprévue a-t-elle déjà causé un incident ?',
      'Les protocoles obsolètes (TLS 1.0 et 1.1) sont-ils interdits ?',
    ],
    requires: [],
  },
  'nw-resilience': {
    why: "Les briques Zero Trust (proxy d'accès, fournisseur d'identité) deviennent des points de passage obligés : leur indisponibilité bloquerait toute l'activité.",
    questions: [
      'Les exigences de disponibilité des applications critiques sont-elles formalisées ?',
      "Les composants d'accès (VPN, proxy, fournisseur d'identité) sont-ils redondés ?",
      'Les plans de secours réseau sont-ils testés régulièrement ?',
    ],
    requires: [],
  },
  'ap-access': {
    why: "Chaque application doit décider de l'accès selon le contexte (qui, depuis quel terminal, pour quelle action), au lieu de faire confiance au simple fait d'être sur le réseau interne.",
    questions: [
      "Les applications délèguent-elles l'authentification à un fournisseur d'identité central (SSO) ?",
      'Les autorisations reposent-elles sur des rôles statiques ou sur le contexte (terminal, localisation, sensibilité) ?',
      'Une vérification renforcée peut-elle être exigée pour une opération sensible, comme une modification de droits ?',
    ],
    requires: ['id-stores'],
  },
  'ap-threat': {
    why: 'Les applications exposées sont attaquées en permanence. Les protections doivent couvrir aussi les API et les abus de la logique métier.',
    questions: [
      'Les applications exposées sont-elles protégées par un WAF ? Les API sont-elles inventoriées et protégées ?',
      'Les applications produisent-elles des journaux de sécurité exploitables par le SOC ?',
      "Des protections à l'exécution (RASP) ou de détection d'abus métier sont-elles utilisées ?",
    ],
    requires: [],
  },
  'ap-exposure': {
    why: "Le VPN donne souvent accès à tout le réseau interne. L'accès Zero Trust (ZTNA) publie chaque application individuellement, après vérification de l'utilisateur et du terminal.",
    questions: [
      'Comment les utilisateurs distants accèdent-ils aux applications internes (VPN, proxy, ZTNA) ?',
      'Le VPN donne-t-il accès à tout le réseau ou seulement à certaines applications ?',
      'Une solution ZTNA ou SASE est-elle déployée ou étudiée ? Sur quel périmètre ?',
    ],
    requires: ['id-authn', 'dv-access'],
  },
  'ap-devsecops': {
    why: 'Une chaîne de développement compromise permet de pousser du code malveillant en production. Elle doit être protégée comme la production elle-même.',
    questions: [
      'Les environnements de développement, de test et de production sont-ils séparés ?',
      'Les déploiements passent-ils par une chaîne CI/CD contrôlée ? Qui peut modifier la production directement ?',
      "Les secrets (mots de passe, clés d'API) sont-ils stockés dans un coffre plutôt que dans le code ?",
    ],
    requires: [],
  },
  'ap-testing': {
    why: 'Corriger une vulnérabilité avant la mise en production coûte bien moins cher que de la corriger après une attaque.',
    questions: [
      'Des analyses de code (SAST) et des tests dynamiques (DAST) sont-ils intégrés à la chaîne de développement ?',
      "À quelle fréquence les applications critiques font-elles l'objet d'un test d'intrusion ?",
      'Les dépendances open source sont-elles analysées (SCA) ?',
    ],
    requires: ['ap-devsecops'],
  },
  'dt-inventory': {
    why: "Le but final du Zero Trust est de protéger les données. Encore faut-il savoir où elles se trouvent.",
    questions: [
      'Savez-vous où sont stockées vos données sensibles (applications, partages de fichiers, SaaS, cloud) ?',
      'Un outil de prévention des fuites (DLP) est-il en place ? Sur quels canaux (messagerie, web, postes) ?',
      'Les exfiltrations suspectes sont-elles détectées ou bloquées ?',
    ],
    requires: [],
  },
  'dt-classification': {
    why: 'La classification permet de proportionner les protections : une note interne ne se protège pas comme un fichier de données clients.',
    questions: [
      'Une politique de classification existe-t-elle ? Combien de niveaux comporte-t-elle ?',
      'Les documents et données sont-ils étiquetés, manuellement ou automatiquement ?',
      'Les étiquettes déclenchent-elles des protections (chiffrement, blocage du partage externe) ?',
    ],
    requires: ['dt-inventory'],
  },
  'dt-availability': {
    why: "Face aux rançongiciels, des sauvegardes isolées et testées conditionnent la survie de l'activité.",
    questions: [
      'Les sauvegardes sont-elles isolées du réseau principal, ou immuables ?',
      'Les restaurations sont-elles testées ? Quand pour la dernière fois ?',
      'Les objectifs de reprise (RTO, RPO) sont-ils définis pour les données critiques ?',
    ],
    requires: [],
  },
  'dt-access': {
    why: "Les droits sur les données s'accumulent avec le temps. Le moindre privilège réduit l'impact d'un compte compromis.",
    questions: [
      'Qui a accès aux données sensibles ? Ces droits sont-ils revus ?',
      'Les accès tiennent-ils compte de la classification et du contexte (terminal, localisation) ?',
      'Les accès aux données sensibles sont-ils journalisés et surveillés ?',
    ],
    requires: ['dt-classification', 'id-access'],
  },
  'dt-encryption': {
    why: 'Le chiffrement rend les données inexploitables en cas de vol, à condition que les clés soient bien protégées.',
    questions: [
      'Les données sensibles sont-elles chiffrées au repos (bases, sauvegardes, cloud) ?',
      'Où les clés sont-elles conservées (KMS, HSM) ? Qui y a accès et comment sont-elles renouvelées ?',
      "Disposez-vous d'un inventaire des algorithmes utilisés pour anticiper la cryptographie post-quantique ?",
    ],
    requires: ['dt-classification'],
  },
  'cc-visibility': {
    why: 'Le Zero Trust produit énormément de signaux (identités, terminaux, flux). Sans collecte ni corrélation, la détection et les décisions d\'accès restent aveugles.',
    questions: [
      'Quelles sources de journaux sont centralisées dans un SIEM (annuaire, pare-feu, EDR, cloud, applications) ?',
      'Un SOC analyse-t-il les alertes ? Interne ou externalisé, 24h/24 ?',
      'Les cas de détection sont-ils documentés et rattachés à MITRE ATT&CK ?',
    ],
    requires: [],
  },
  'cc-automation': {
    why: "La vitesse de réponse fait la différence : isoler un poste en quelques minutes plutôt qu'en quelques heures limite la propagation.",
    questions: [
      'Les scénarios de réponse aux incidents (playbooks) sont-ils formalisés ?',
      "Certaines réponses sont-elles automatisées (isolement d'un poste, blocage d'un compte) ? Avec quel outil ?",
      'Le provisionnement des accès et des configurations est-il automatisé ?',
    ],
    requires: ['cc-visibility'],
  },
  'cc-governance': {
    why: 'Le Zero Trust est un programme pluriannuel et transverse. Sans sponsor, feuille de route ni pilotage, les projets restent isolés.',
    questions: [
      'Une stratégie Zero Trust est-elle formalisée et portée par un sponsor de la direction ?',
      'Existe-t-il une instance de pilotage (comité, indicateurs, budget dédié) ?',
      'Les politiques de sécurité intègrent-elles les principes Zero Trust (moindre privilège, vérification explicite) ?',
    ],
    requires: [],
  },
};
