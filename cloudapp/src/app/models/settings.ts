import { AVAILABLE_FIELDS } from '../main/field-definitions';

// Definicja pojedynczego pola w ustawieniach
export interface FieldConfig {
    name: string;
    label: string;
    selected: boolean;
    customLabel: string;
}

// Główny obiekt zapisywany w CloudAppSettings
export interface AppSettings {
    availableFields: FieldConfig[];
    customHeader: string; // NOWA WŁAŚCIWOŚĆ: Nagłówek pliku
}

// Klasa do inicjalizacji z wartościami domyślnymi
export class Settings implements AppSettings {
    availableFields: FieldConfig[] = [...AVAILABLE_FIELDS];
    customHeader: string = '# PO Line Export'; // Domyślna wartość nagłówka
}