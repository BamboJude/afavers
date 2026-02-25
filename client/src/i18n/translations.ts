export type Lang = 'en' | 'de';

export const translations: Record<Lang, Record<string, string>> = {
  en: {
    // Navigation
    dashboard: 'Dashboard',
    jobs: 'Jobs',
    englishJobs: 'English Jobs',
    allJobs: 'All Jobs',
    allJobsDesc: 'Browse every fetched job — no filters applied',
    kanban: 'Applications Board',
    settings: 'Settings',
    logout: 'Logout',

    // Tabs / Status
    new: 'New',
    saved: 'Saved',
    applied: 'Applied',
    interviewing: 'Interviewing',
    offered: 'Offered',
    rejected: 'Rejected',
    all: 'All',

    // Jobs page
    searchPlaceholder: 'Search by title, company or location...',
    allSources: 'All sources',
    newestFirst: 'Newest first',
    recentlyAdded: 'Recently added',
    postedDate: 'Posted date',
    titleAZ: 'Title A–Z',
    companyAZ: 'Company A–Z',
    loadingJobs: 'Loading jobs...',
    noJobsFound: 'No jobs found',
    allCaughtUp: 'All caught up!',
    posted: 'Posted',
    deadline: 'Deadline',
    save: 'Save',
    hide: 'Hide',
    saveJob: 'Save this job',
    hideJob: 'Hide this job',
    prev: 'Prev',
    next: 'Next',
    page: 'Page',
    of: 'of',

    // Dashboard
    unreviewedJobs: 'Unreviewed jobs',
    reviewNow: 'Review now →',
    addedToday: 'added today',
    totalJobs: 'Total Jobs',
    fetchJobs: 'Fetch Jobs',
    fetchNow: 'Fetch Now',
    fetching: 'Fetching...',
    autoFetchNote: 'Auto-runs every 2 hours. Trigger manually anytime.',
    browseJobs: 'Browse & Triage Jobs',
    browseJobsDesc: 'new jobs waiting — save or dismiss with one click',
    applicationsBoard: 'Applications Board',
    applicationsBoardDesc: 'tracked — drag between stages',
    applicationPipeline: 'Application Pipeline',
    fetchComplete: 'new jobs added',
    fetchFailed: 'Fetch failed. Try again.',

    // English Jobs page
    englishJobsTitle: 'English Jobs',
    englishJobsDesc: 'Jobs posted in English — international & expat-friendly roles',
    backToJobs: '← All Jobs',
    noEnglishJobs: 'No English jobs found',
    noEnglishJobsHint: 'Fetch jobs and they will be detected automatically.',

    // Settings
    saveSettings: 'Save Settings',
    settingsSaved: 'Settings saved',
    keywords: 'Job Keywords',
    locations: 'Locations',

    // Kanban
    trackNewJobs: '+ Track New Jobs',
    jobsTracked: 'jobs being tracked',
    noJobsTracked: 'No jobs tracked yet',
    noJobsTrackedHint: 'Go to Jobs and save jobs you\'re interested in to track them here',
    browseJobs2: 'Browse Jobs →',

    // Auth
    signIn: 'Sign In',
    createAccount: 'Create Account',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
  },

  de: {
    // Navigation
    dashboard: 'Dashboard',
    jobs: 'Stellen',
    englishJobs: 'Englische Stellen',
    allJobs: 'Alle Stellen',
    allJobsDesc: 'Alle abgerufenen Stellen — ohne Filter',
    kanban: 'Bewerbungsboard',
    settings: 'Einstellungen',
    logout: 'Abmelden',

    // Tabs / Status
    new: 'Neu',
    saved: 'Gespeichert',
    applied: 'Beworben',
    interviewing: 'Im Gespräch',
    offered: 'Angebot',
    rejected: 'Abgelehnt',
    all: 'Alle',

    // Jobs page
    searchPlaceholder: 'Suche nach Titel, Unternehmen oder Ort...',
    allSources: 'Alle Quellen',
    newestFirst: 'Neueste zuerst',
    recentlyAdded: 'Zuletzt hinzugefügt',
    postedDate: 'Datum der Ausschreibung',
    titleAZ: 'Titel A–Z',
    companyAZ: 'Unternehmen A–Z',
    loadingJobs: 'Stellen werden geladen...',
    noJobsFound: 'Keine Stellen gefunden',
    allCaughtUp: 'Alles erledigt!',
    posted: 'Veröffentlicht',
    deadline: 'Frist',
    save: 'Speichern',
    hide: 'Ausblenden',
    saveJob: 'Stelle speichern',
    hideJob: 'Stelle ausblenden',
    prev: 'Zurück',
    next: 'Weiter',
    page: 'Seite',
    of: 'von',

    // Dashboard
    unreviewedJobs: 'Ungeprüfte Stellen',
    reviewNow: 'Jetzt prüfen →',
    addedToday: 'heute hinzugefügt',
    totalJobs: 'Stellen gesamt',
    fetchJobs: 'Stellen abrufen',
    fetchNow: 'Jetzt abrufen',
    fetching: 'Wird abgerufen...',
    autoFetchNote: 'Automatisch alle 2 Stunden. Manuell jederzeit auslösbar.',
    browseJobs: 'Stellen durchsuchen',
    browseJobsDesc: 'neue Stellen — mit einem Klick speichern oder ablehnen',
    applicationsBoard: 'Bewerbungsboard',
    applicationsBoardDesc: 'verfolgt — zwischen Phasen ziehen',
    applicationPipeline: 'Bewerbungspipeline',
    fetchComplete: 'neue Stellen hinzugefügt',
    fetchFailed: 'Abruf fehlgeschlagen. Erneut versuchen.',

    // English Jobs page
    englishJobsTitle: 'Englische Stellen',
    englishJobsDesc: 'Auf Englisch ausgeschriebene Stellen — international & expat-freundlich',
    backToJobs: '← Alle Stellen',
    noEnglishJobs: 'Keine englischen Stellen gefunden',
    noEnglishJobsHint: 'Stellen abrufen — sie werden automatisch erkannt.',

    // Settings
    saveSettings: 'Einstellungen speichern',
    settingsSaved: 'Einstellungen gespeichert',
    keywords: 'Suchbegriffe',
    locations: 'Standorte',

    // Kanban
    trackNewJobs: '+ Neue Stellen verfolgen',
    jobsTracked: 'Stellen werden verfolgt',
    noJobsTracked: 'Noch keine Stellen verfolgt',
    noJobsTrackedHint: 'Gehe zu Stellen und speichere interessante Angebote, um sie hier zu verfolgen',
    browseJobs2: 'Stellen durchsuchen →',

    // Auth
    signIn: 'Anmelden',
    createAccount: 'Konto erstellen',
    email: 'E-Mail',
    password: 'Passwort',
    confirmPassword: 'Passwort bestätigen',
  },
};
