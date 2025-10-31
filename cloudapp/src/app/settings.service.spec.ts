import { TestBed } from '@angular/core/testing';
import { CloudAppSettingsService } from '@exlibris/exl-cloudapp-angular-lib';
import { of } from 'rxjs';
import { SettingsService } from './settings.service';
import { AppSettings, FieldConfig, ProcessedSettings } from './models/settings';
import { AVAILABLE_FIELDS } from './main/field-definitions'; 

const mockField1: FieldConfig = { name: 'title', label: 'Tytuł', selected: true, customLabel: 'Tytuł PL' };
const mockField2: FieldConfig = { name: 'isbn', label: 'ISBN', selected: false, customLabel: 'ISBN PL' };

const mockSettings: AppSettings = {
  availableFields: [mockField1, mockField2],
  customHeader: 'Testowy Nagłówek'
};

describe('SettingsService', () => {
  let service: SettingsService;
  let mockCloudSettingsService: jasmine.SpyObj<CloudAppSettingsService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('CloudAppSettingsService', ['get']);

    TestBed.configureTestingModule({
      providers: [
        SettingsService,
        { provide: CloudAppSettingsService, useValue: spy }
      ]
    });

    service = TestBed.inject(SettingsService);
    mockCloudSettingsService = TestBed.inject(CloudAppSettingsService) as jasmine.SpyObj<CloudAppSettingsService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getSettings', () => {
    
    it('should return processed settings and filter exportFields when settings exist', (done: DoneFn) => {
      mockCloudSettingsService.get.and.returnValue(of(mockSettings));

      service.getSettings().subscribe((result: ProcessedSettings) => {
        
        expect(result.settings).toEqual(mockSettings);
        
        expect(result.exportFields.length).toBe(1);
        expect(result.exportFields[0].name).toBe('title');
        
        done(); 
      });

      expect(mockCloudSettingsService.get).toHaveBeenCalledTimes(1);
    });

    it('should return default settings when no settings are saved', (done: DoneFn) => {
      mockCloudSettingsService.get.and.returnValue(of(null));

      service.getSettings().subscribe((result: ProcessedSettings) => {

        expect(result.settings.customHeader).toBe('# PO Line Export');
        
        expect(result.settings.availableFields).toEqual(AVAILABLE_FIELDS);
        
        const defaultExportFields = AVAILABLE_FIELDS.filter(f => f.selected);
        expect(result.exportFields).toEqual(defaultExportFields);
        
        done();
      });

      expect(mockCloudSettingsService.get).toHaveBeenCalledTimes(1);
    });

    it('should apply default customHeader if it is missing from saved settings', (done: DoneFn) => {
      const partialSettings = {
        availableFields: [mockField1],
        customHeader: undefined 
      };
      mockCloudSettingsService.get.and.returnValue(of(partialSettings as any));

      service.getSettings().subscribe((result: ProcessedSettings) => {
        
        expect(result.settings.customHeader).toBe('# PO Line Export');
        expect(result.settings.availableFields).toEqual([mockField1]);
        
        done();
      });
    });

    it('should apply default availableFields if they are missing from saved settings', (done: DoneFn) => {
      const partialSettings = {
        availableFields: undefined, 
        customHeader: 'Tylko Nagłówek'
      };
      mockCloudSettingsService.get.and.returnValue(of(partialSettings as any));

      service.getSettings().subscribe((result: ProcessedSettings) => {
        
        expect(result.settings.customHeader).toBe('Tylko Nagłówek');
        expect(result.settings.availableFields).toEqual(AVAILABLE_FIELDS);
        
        done();
      });
    });

  });
});

