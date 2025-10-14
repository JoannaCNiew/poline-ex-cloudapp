import { AVAILABLE_FIELDS } from '../main/field-definitions'; // <-- KLUCZOWY BRAKUJĄCY IMPORT

// Definicja pojedynczego pola w ustawieniach
export interface FieldConfig {
    name: string; // Klucz do mapowania danych z API (np. 'isbn')
    label: string; // Pełna nazwa pola (do wyświetlenia w ustawieniach)
    selected: boolean; // Czy pole jest wybrane do eksportu
    customLabel: string; // Nazwa kolumny, którą nadał użytkownik
}

// Główny obiekt zapisywany w CloudAppSettings
export interface AppSettings {
    availableFields: FieldConfig[];
}

// Klasa do inicjalizacji (teraz działa poprawnie)
export class Settings implements AppSettings {
    // Linia 16 jest teraz poprawna dzięki importowi
    availableFields: FieldConfig[] = [...AVAILABLE_FIELDS];
}
