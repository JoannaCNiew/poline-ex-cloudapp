import { AVAILABLE_FIELDS } from '../main/field-definitions';

export interface FieldConfig {
    name: string;
    label: string;
    selected: boolean;
    customLabel: string;
}

export interface AppSettings {
    availableFields: FieldConfig[];
    customHeader: string;
}

export interface ProcessedSettings {
    settings: AppSettings;
    exportFields: FieldConfig[];
}


export class Settings implements AppSettings {
    availableFields: FieldConfig[] = [...AVAILABLE_FIELDS];
    customHeader: string = '# PO Line Export';
}
