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
      map((settings: AppSettings) => {
        
        const loadedSettings = (settings && settings.availableFields) 
            ? settings 
            : { ...DEFAULT_SETTINGS };
        
        if (!loadedSettings.customHeader) {
          loadedSettings.customHeader = DEFAULT_SETTINGS.customHeader;
        }

        if (!loadedSettings.availableFields) {
            loadedSettings.availableFields = [...DEFAULT_SETTINGS.availableFields];
        }

        const exportFields = loadedSettings.availableFields.filter((field: FieldConfig) => field.selected);

        return { 
            settings: loadedSettings, 
            exportFields: exportFields 
        } as ProcessedSettings;
      })
    );
  }
}

