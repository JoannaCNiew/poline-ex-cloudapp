import { TestBed } from '@angular/core/testing';
import { CloudAppSettingsService } from '@exlibris/exl-cloudapp-angular-lib';
import { of } from 'rxjs';
import { SettingsService } from './settings.service';
import { AppSettings, FieldConfig, ProcessedSettings } from './models/settings';
import { AVAILABLE_FIELDS } from './main/field-definitions'; 

// Tworzymy mockowe dane do testów
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
    // Tworzymy 'spy object' (szpiega) dla serwisu, który chcemy zaślepić
    // Będziemy kontrolować, co zwraca jego metoda .get()
    const spy = jasmine.createSpyObj('CloudAppSettingsService', ['get']);

    TestBed.configureTestingModule({
      providers: [
        SettingsService,
        // Zastępujemy prawdziwy CloudAppSettingsService naszą zaślepką
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
      // Aranżacja: .get() zwróci nasze mockowe ustawienia
      mockCloudSettingsService.get.and.returnValue(of(mockSettings));

      // Akcja
      service.getSettings().subscribe((result: ProcessedSettings) => {
        
        // Asercja
        // 1. Sprawdzamy, czy zwrócony obiekt 'settings' jest identyczny z mockowym
        expect(result.settings).toEqual(mockSettings);
        
        // 2. Sprawdzamy, czy 'exportFields' zostały poprawnie przefiltrowane (tylko selected: true)
        expect(result.exportFields.length).toBe(1);
        expect(result.exportFields[0].name).toBe('title');
        
        done(); // Kończymy test asynchroniczny
      });

      // Sprawdzamy, czy metoda .get() została wywołana
      expect(mockCloudSettingsService.get).toHaveBeenCalledTimes(1);
    });

    it('should return default settings when no settings are saved', (done: DoneFn) => {
      // Aranżacja: .get() zwróci null (symulacja braku ustawień)
      mockCloudSettingsService.get.and.returnValue(of(null));

      // Akcja
      service.getSettings().subscribe((result: ProcessedSettings) => {

        // Asercja
        // 1. Sprawdzamy, czy nagłówek jest domyślny
        expect(result.settings.customHeader).toBe('# PO Line Export');
        
        // 2. Sprawdzamy, czy pola są domyślne (importowane z AVAILABLE_FIELDS)
        expect(result.settings.availableFields).toEqual(AVAILABLE_FIELDS);
        
        // 3. Sprawdzamy, czy domyślne pola eksportu są poprawnie przefiltrowane
        const defaultExportFields = AVAILABLE_FIELDS.filter(f => f.selected);
        expect(result.exportFields).toEqual(defaultExportFields);
        
        done();
      });

      expect(mockCloudSettingsService.get).toHaveBeenCalledTimes(1);
    });

    it('should apply default customHeader if it is missing from saved settings', (done: DoneFn) => {
      // Aranżacja: Zwracamy ustawienia bez nagłówka
      // POPRAWKA: Usunięto typ ':AppSettings', aby uniknąć błędu TS
      const partialSettings = {
        availableFields: [mockField1],
        customHeader: undefined // lub null
      };
      // POPRAWKA: Dodano rzutowanie 'as any', aby usatysfakcjonować typowanie 'of()'
      mockCloudSettingsService.get.and.returnValue(of(partialSettings as any));

      // Akcja
      service.getSettings().subscribe((result: ProcessedSettings) => {
        
        // Asercja
        // 1. Nagłówek powinien być domyślny
        expect(result.settings.customHeader).toBe('# PO Line Export');
        // 2. Ale pola powinny być te zapisane
        expect(result.settings.availableFields).toEqual([mockField1]);
        
        done();
      });
    });

    it('should apply default availableFields if they are missing from saved settings', (done: DoneFn) => {
      // Aranżacja: Zwracamy ustawienia bez pól
      // POPRAWKA: Usunięto typ ':AppSettings', aby uniknąć błędu TS
      const partialSettings = {
        availableFields: undefined, // lub null
        customHeader: 'Tylko Nagłówek'
      };
      // POPRAWKA: Dodano rzutowanie 'as any', aby usatysfakcjonować typowanie 'of()'
      mockCloudSettingsService.get.and.returnValue(of(partialSettings as any));

      // Akcja
      service.getSettings().subscribe((result: ProcessedSettings) => {
        
        // Asercja
        // 1. Nagłówek powinien być ten zapisany
        expect(result.settings.customHeader).toBe('Tylko Nagłówek');
        // 2. Ale pola powinny być domyślne
        expect(result.settings.availableFields).toEqual(AVAILABLE_FIELDS);
        
        done();
      });
    });

  });
});

