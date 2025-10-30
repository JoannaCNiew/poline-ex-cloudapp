import { TestBed } from '@angular/core/testing';
import { ValidationService } from './validation.service';
import { Entity, EntityType } from '@exlibris/exl-cloudapp-angular-lib'; // <-- POPRAWKA: Zaimportowano EntityType
import { FieldConfig } from '../models/settings';

describe('ValidationService', () => {
  let service: ValidationService;

  // Przykładowe dane mockowe
  const mockEntities: Entity[] = [
    { 
      id: '1', 
      link: 'link1', 
      description: 'Test Entity', 
      type: EntityType.PO_LINE // <-- POPRAWKA: Użyto enuma EntityType
    }
  ];
  
  const mockFields: FieldConfig[] = [
    { name: 'title', label: 'Title', selected: true, customLabel: 'Title' }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ValidationService]
    });
    service = TestBed.inject(ValidationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('validateExportParameters', () => {
    
    it('should return null if all parameters are valid', () => {
      const result = service.validateExportParameters(mockEntities, mockFields, 'My Header');
      expect(result).toBeNull();
    });

    it('should return "Main.Alerts.SelectOne" if entities array is empty', () => {
      const result = service.validateExportParameters([], mockFields, 'My Header');
      expect(result).toBe('Main.Alerts.SelectOne');
    });

    it('should return "Main.Alerts.NoFieldsSelected" if fields array is empty', () => {
      const result = service.validateExportParameters(mockEntities, [], 'My Header');
      expect(result).toBe('Main.Alerts.NoFieldsSelected');
    });

    it('should return "Main.Alerts.SettingsNotReady" if header is undefined', () => {
      const result = service.validateExportParameters(mockEntities, mockFields, undefined);
      expect(result).toBe('Main.Alerts.SettingsNotReady');
    });

    it('should return "Main.Alerts.SettingsNotReady" if header is null', () => {
      // Zakładając, że `!header` ma również przechwycić `null`
      const result = service.validateExportParameters(mockEntities, mockFields, null as any);
      expect(result).toBe('Main.Alerts.SettingsNotReady');
    });

  });

  describe('validatePreviewContent', () => {

    it('should return null if content is a non-empty string', () => {
      const result = service.validatePreviewContent('Some preview content');
      expect(result).toBeNull();
    });

    it('should return "Main.Alerts.NoPreviewContent" if content is null', () => {
      const result = service.validatePreviewContent(null);
      expect(result).toBe('Main.Alerts.NoPreviewContent');
    });

    it('should return "Main.Alerts.NoPreviewContent" if content is an empty string', () => {
      const result = service.validatePreviewContent('');
      expect(result).toBe('Main.Alerts.NoPreviewContent');
    });

    it('should return "Main.Alerts.NoPreviewContent" if content is undefined', () => {
      const result = service.validatePreviewContent(undefined as any);
      expect(result).toBe('Main.Alerts.NoPreviewContent');
    });

  });

});

