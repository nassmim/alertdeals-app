/**
 * Known spelling divergences between listing platforms and our reference
 * data (seeded from Leboncoin, brands in uppercase). Keys and values are
 * compared through `normalizeKey` (accents/case/punctuation-insensitive), so
 * only "different words" aliases need to be listed here.
 *
 * Grow this list from the admin alerts sent when a non-Leboncoin run creates
 * new brands/models.
 */
export const BRAND_ALIASES: Record<string, string> = {
  VW: "VOLKSWAGEN",
  MERCEDES: "MERCEDES-BENZ",
  "MERCEDES BENZ": "MERCEDES-BENZ",
  "MERCEDES-AMG": "MERCEDES-BENZ",
  "MERCEDES AMG": "MERCEDES-BENZ",
  "DS AUTOMOBILES": "DS",
  "LAND ROVER": "LAND-ROVER",
  "LANDROVER": "LAND-ROVER",
  "RANGE ROVER": "LAND-ROVER",
  "ALFA": "ALFA ROMEO",
  "ROLLS ROYCE": "ROLLS-ROYCE",
  MG: "MG/MG MOTOR",
  "MG MOTOR": "MG/MG MOTOR",
  "LYNK & CO": "LYNK&CO",
  "LYNK AND CO": "LYNK&CO",
  "CITROËN": "CITROEN",
  "ŠKODA": "SKODA",
  "MINI (BMW)": "MINI",
  "SMART (MERCEDES)": "SMART",
  "ASTON-MARTIN": "ASTON MARTIN",
  "AUSTIN-HEALEY": "AUSTIN HEALEY",
  "DELOREAN": "DE LOREAN",
  "GM": "GENERAL MOTORS",
  "TESLA MOTORS": "TESLA",
};

/**
 * Model aliases, scoped by canonical brand name. Same normalisation rules.
 * Mostly German-market naming (AutoScout24) vs French naming (Leboncoin).
 */
export const MODEL_ALIASES: Record<string, Record<string, string>> = {
  "MERCEDES-BENZ": {
    "A-KLASSE": "Classe A",
    "A CLASS": "Classe A",
    "B-KLASSE": "Classe B",
    "B CLASS": "Classe B",
    "C-KLASSE": "Classe C",
    "C CLASS": "Classe C",
    "E-KLASSE": "Classe E",
    "E CLASS": "Classe E",
    "S-KLASSE": "Classe S",
    "S CLASS": "Classe S",
    "G-KLASSE": "Classe G",
    "G CLASS": "Classe G",
    "V-KLASSE": "Classe V",
    "V CLASS": "Classe V",
    "CLA": "CLA",
    "CLS": "CLS",
  },
  BMW: {
    "1ER": "Serie 1",
    "1 SERIES": "Serie 1",
    "SERIE 1": "Serie 1",
    "SÉRIE 1": "Serie 1",
    "2ER": "Serie 2",
    "2 SERIES": "Serie 2",
    "3ER": "Serie 3",
    "3 SERIES": "Serie 3",
    "4ER": "Serie 4",
    "4 SERIES": "Serie 4",
    "5ER": "Serie 5",
    "5 SERIES": "Serie 5",
    "6ER": "Serie 6",
    "6 SERIES": "Serie 6",
    "7ER": "Serie 7",
    "7 SERIES": "Serie 7",
    "8ER": "Serie 8",
    "8 SERIES": "Serie 8",
  },
  VOLKSWAGEN: {
    "GOLF VII": "Golf",
    "GOLF VIII": "Golf",
    "POLO VI": "Polo",
    "T-ROC": "T-Roc",
    "T-CROSS": "T-Cross",
    "ID.3": "ID.3",
    "ID.4": "ID.4",
  },
  "LAND-ROVER": {
    "RANGE ROVER EVOQUE": "Range Rover Evoque",
    "RANGE ROVER SPORT": "Range Rover Sport",
    "RANGE ROVER VELAR": "Range Rover Velar",
    "DISCOVERY SPORT": "Discovery Sport",
  },
};
