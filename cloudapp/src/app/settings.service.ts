import { Injectable } from '@angular/core';
import { CloudAppSettingsService } from '@exlibris/exl-cloudapp-angular-lib';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AppSettings, FieldConfig, ProcessedSettings } from './models/settings';
import { AVAILABLE_FIELDS } from './main/field-definitions';

const DEFAULT_SETTINGS: AppSettings = {
  availableFields: [...AVAILABLE_FIELDS], 
  customHeader: '# PO Line Export'
};

@Injectable({
  providedIn: 'root'
})
export class SettingsService {

  constructor(private cloudSettingsService: CloudAppSettingsService) { }


  getSettings(): Observable<ProcessedSettings> {
    
    return this.cloudSettingsService.get().pipe(
      // Poprawka: Dodano | null dla lepszego typowania, gdy .get() zwraca puste ustawienia
      map((settings: AppSettings | null) => {
        
        // --- POCZĄTEK POPRAWIONEJ LOGIKI ---
        // Ta logika naprawia błąd wykryty przez test

        // 1. Ustal bazowe ustawienia: użyj załadowanych (jeśli istnieją) lub domyślnych
        // Poprawka: Sprawdzamy, czy 'settings' istnieją i nie są pustym obiektem
        const loadedSettings = (settings && Object.keys(settings).length > 0)
            ? { ...settings } // Użyj kopii załadowanych ustawień
            : { ...DEFAULT_SETTINGS }; // Lub domyślnych, jeśli nic nie ma

        // 2. Zastosuj domyślne wartości dla *poszczególnych* brakujących pól
        // Ta logika jest teraz poprawnie stosowana do 'loadedSettings'
        if (!loadedSettings.customHeader) {
          loadedSettings.customHeader = DEFAULT_SETTINGS.customHeader;
        }

        if (!loadedSettings.availableFields) {
            loadedSettings.availableFields = [...DEFAULT_SETTINGS.availableFields];
        }
        
        // --- KONIEC POPRAWIONEJ LOGIKI ---

        const exportFields = loadedSettings.availableFields.filter((field: FieldConfig) => field.selected);

        return { 
            settings: loadedSettings, 
            exportFields: exportFields 
        } as ProcessedSettings;
      })
    );
  }
}

