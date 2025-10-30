import { Injectable } from '@angular/core';
import { Entity } from '@exlibris/exl-cloudapp-angular-lib';
import { FieldConfig } from '../models/settings';

@Injectable()
export class ValidationService { 

  constructor() { }


  validateExportParameters(
    entities: Entity[], 
    fields: FieldConfig[], 
    header: string | undefined
  ): string | null {
    
    if (entities.length === 0) {
      return 'Main.Alerts.SelectOne';
    }
    
    if (fields.length === 0) {
      return 'Main.Alerts.NoFieldsSelected';
    }

    if (!header) {
      return 'Main.Alerts.SettingsNotReady';
    }
    
    return null; 
  }


  validatePreviewContent(content: string | null): string | null {
    if (!content) {
      return 'Main.Alerts.NoPreviewContent';
    }
    return null; 
  }
}
