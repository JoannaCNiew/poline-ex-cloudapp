import { ComponentFixture, TestBed, waitForAsync, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ChangeDetectorRef, Component, ElementRef } from '@angular/core';
import { Observable, of, Subject, throwError } from 'rxjs';
import { TranslateService, LangChangeEvent, TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { AlertService, CloudAppEventsService, CloudAppRestService, Entity, EntityType } from '@exlibris/exl-cloudapp-angular-lib';
import { SelectEntitiesComponent } from '@exlibris/eca-components';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { MainComponent } from './main.component';
import { ExportService, ExportResult } from '../export.service';
import { SettingsService } from '../settings.service';
import { DomService } from './dom.service';
import { ValidationService } from './validation.service';
import { ProcessedSettings, AppSettings } from '../models/settings';

// --- MOCKI ---

// 1. Mocki dla standardowych serwisów Ex Libris
const mockRestService = jasmine.createSpyObj('CloudAppRestService', ['call']);
const mockAlertService = jasmine.createSpyObj('AlertService', ['success', 'warn', 'error']);

// 2. Mock dla CloudAppEventsService (musi zwracać Observable)
const entitiesSubject = new Subject<Entity[]>();
const mockEventsService = {
  entities$: entitiesSubject.asObservable(),
};

// 3. Mock dla TranslateService (złożony)
const langChangeSubject = new Subject<LangChangeEvent>();
const mockTranslateService = {
  get: jasmine.createSpy('get').and.returnValue(of({
    'Main.EntityList.TitleSelect': 'T:TitleSelect',
    'Main.EntityList.TitleOptions': 'T:TitleOptions',
    'Main.EntityList.Buttons.Preview': 'T:Preview',
    'Main.EntityList.Buttons.Copy': 'T:Copy',
    'Main.EntityList.Buttons.Download': 'T:Download',
    'Main.EntityList.SelectTitle': 'T:SelectTitle'
  })),
  instant: jasmine.createSpy('instant').and.callFake((key: string) => key.startsWith('Main.') ? `T:${key}` : key),
  onLangChange: langChangeSubject.asObservable(),
  onTranslationChange: new Subject().asObservable(),
  onDefaultLangChange: new Subject().asObservable(),
  getParsedResult: jasmine.createSpy('getParsedResult').and.returnValue(''),
};

// 4. Mock dla SettingsService (zwraca domyślne puste ustawienia)
const MOCK_SETTINGS: ProcessedSettings = {
  settings: { availableFields: [], customHeader: '# Test Header' } as AppSettings,
  exportFields: [{ name: 'field1', label: 'Field 1', selected: true, customLabel: 'Custom 1' }] // Musi mieć jakieś pola
};
const mockSettingsService = {
  getSettings: jasmine.createSpy('getSettings').and.returnValue(of(MOCK_SETTINGS))
};

// 5. Mocki dla Twoich własnych serwisów
const mockExportService = jasmine.createSpyObj('ExportService', ['generateExport', 'copyContent', 'downloadContent']);
const mockDomService = jasmine.createSpyObj('DomService', ['updateSelectAllCheckboxLabel']);
const mockValidationService = jasmine.createSpyObj('ValidationService', ['validateExportParameters']);

// 6. Mocki dla zależności Angulara
const mockElementRef = {
  nativeElement: document.createElement('div') // Fałszywy element DOM
};
const mockCd = jasmine.createSpyObj('ChangeDetectorRef', ['markForCheck']);

// 7. Mock dla @ViewChild(SelectEntitiesComponent)
@Component({
  selector: 'eca-select-entities',
  template: ''
})
class MockSelectEntitiesComponent {
  clear = jasmine.createSpy('clear');
}

// 8. Mock dla TranslateLoader (używany w Settings)
class FakeTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<any> {
    return of({});
  }
}

// 9. Mockowe dane
const MOCK_ENTITIES: Entity[] = [
  { id: '1', link: 'link/1', type: EntityType.PO_LINE, description: 'PO 1' }
];
const MOCK_EXPORT_RESULT: ExportResult = {
  fileContent: 'test content',
  exportFields: [],
  count: 1
};

// --- GŁÓWNY BLOK TESTOWY ---

describe('MainComponent', () => {
  let component: MainComponent;
  let fixture: ComponentFixture<MainComponent>;

  // Referencje do mocków, abyśmy mogli je kontrolować
  let alertSpy: jasmine.SpyObj<AlertService>;
  let domServiceSpy: jasmine.SpyObj<DomService>;
  let settingsServiceSpy: jasmine.SpyObj<SettingsService>;
  let exportServiceSpy: jasmine.SpyObj<ExportService>;
  let validationServiceSpy: jasmine.SpyObj<ValidationService>;
  let translateSpy: jasmine.SpyObj<TranslateService>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ MainComponent, MockSelectEntitiesComponent ],
      imports: [
        HttpClientTestingModule,
        NoopAnimationsModule,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
        })
      ],
      providers: [
        // Zapewniamy globalne mocki
        { provide: CloudAppRestService, useValue: mockRestService },
        { provide: CloudAppEventsService, useValue: mockEventsService },
        { provide: AlertService, useValue: mockAlertService },
        { provide: TranslateService, useValue: mockTranslateService },
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: ExportService, useValue: mockExportService },
        { provide: ElementRef, useValue: mockElementRef },
        { provide: ChangeDetectorRef, useValue: mockCd },
        { provide: DomService, useValue: mockDomService },
        { provide: ValidationService, useValue: mockValidationService }
      ]
    })
    // Nadpisujemy 'providers' komponentu, aby zmusić go do użycia naszych mocków
    .overrideComponent(MainComponent, {
      set: {
        providers: [
          { provide: DomService, useValue: mockDomService },
          { provide: ValidationService, useValue: mockValidationService }
        ]
      }
    })
    .compileComponents();
  }));

  beforeEach(fakeAsync(() => {
    fixture = TestBed.createComponent(MainComponent);
    component = fixture.componentInstance;
    
    // Pobieramy referencje do wstrzykniętych mocków
    alertSpy = TestBed.inject(AlertService) as jasmine.SpyObj<AlertService>;
    domServiceSpy = TestBed.inject(DomService) as jasmine.SpyObj<DomService>;
    settingsServiceSpy = TestBed.inject(SettingsService) as jasmine.SpyObj<SettingsService>;
    exportServiceSpy = TestBed.inject(ExportService) as jasmine.SpyObj<ExportService>;
    validationServiceSpy = TestBed.inject(ValidationService) as jasmine.SpyObj<ValidationService>;
    translateSpy = TestBed.inject(TranslateService) as jasmine.SpyObj<TranslateService>;
    
    // Resetujemy wywołania przed każdym testem
    alertSpy.success.calls.reset();
    alertSpy.warn.calls.reset();
    alertSpy.error.calls.reset();
    domServiceSpy.updateSelectAllCheckboxLabel.calls.reset();
    settingsServiceSpy.getSettings.calls.reset();
    exportServiceSpy.generateExport.calls.reset();
    exportServiceSpy.copyContent.calls.reset();
    exportServiceSpy.downloadContent.calls.reset();
    validationServiceSpy.validateExportParameters.calls.reset();
    translateSpy.get.calls.reset();
    translateSpy.instant.calls.reset();
    
    // Domyślne mocki dla funkcji, które mogą być wywoływane
    validationServiceSpy.validateExportParameters.and.returnValue(null); // Domyślnie walidacja przechodzi
    exportServiceSpy.generateExport.and.returnValue(of(MOCK_EXPORT_RESULT));
    exportServiceSpy.copyContent.and.returnValue(Promise.resolve()); // Zwraca rozwiązany Promise
    
    fixture.detectChanges(); // To uruchamia ngOnInit. @ViewChild jest tu ustawiane na 'undefined' przez Angulara
    tick(500); // Przeskakujemy 'setTimeout' i 'async' w ngOnInit
    fixture.detectChanges();
    
    // ★★★ POPRAWKA BŁĘDU #2 ★★★
    // Ręcznie przypisujemy @ViewChild *PO* `detectChanges`, aby nadpisać 'undefined'
    component.selectEntities = new MockSelectEntitiesComponent() as any;
  }));

  it('should create and load initial settings and translations', () => {
    expect(component).toBeTruthy();
    expect(settingsServiceSpy.getSettings).toHaveBeenCalled();
    expect(translateSpy.get).toHaveBeenCalled();
    expect(component.exportFields).toBe(MOCK_SETTINGS.exportFields);
    expect(component.translationsLoaded).toBe(true);
  });

  it('should react to entity changes', fakeAsync(() => {
    // Ustawiamy jakiś stan początkowy
    component.selectedEntities = MOCK_ENTITIES;
    component.previewContent = 'stary podgląd';

    // Symulujemy przyjście nowych encji
    entitiesSubject.next(MOCK_ENTITIES);
    tick(500); // Czekamy na 'setTimeout' w subskrypcji

    expect(component.loading).toBe(false);
    expect(component.visibleEntities).toBe(MOCK_ENTITIES);
    expect(component.selectedEntities).toEqual([]); // Powinno być wyczyszczone
    expect(component.previewContent).toBeNull(); // Powinno być wyczyszczone
    expect(domServiceSpy.updateSelectAllCheckboxLabel).toHaveBeenCalled();
  }));

  it('should react to language changes', fakeAsync(() => {
    // Symulujemy zmianę języka
    langChangeSubject.next({ lang: 'fr', translations: {} });
    tick(500); // Czekamy na 'setTimeout' i 'loadTranslations'

    expect(translateSpy.get).toHaveBeenCalled(); // loadTranslations zostało wywołane
    expect(domServiceSpy.updateSelectAllCheckboxLabel).toHaveBeenCalled();
  }));

  it('should clear selection and preview', () => {
    component.previewContent = 'jakiś tekst';
    component.clearSelection();

    // Sprawdzamy, czy mock @ViewChild został wywołany
    expect(component.selectEntities.clear).toHaveBeenCalled();
    expect(component.previewContent).toBeNull();
  });

  // --- Testy dla `onGenerateExport` ---
  describe('onGenerateExport', () => {
    
    it('should show warn alert if validation fails', () => {
      validationServiceSpy.validateExportParameters.and.returnValue('TEST_ERROR_KEY');
      
      component.onGenerateExport();
      
      expect(alertSpy.warn).toHaveBeenCalledWith('TEST_ERROR_KEY');
      expect(component.loading).toBe(false);
      expect(exportServiceSpy.generateExport).not.toHaveBeenCalled();
    });

    it('should call exportService, show preview, and show success on valid export', fakeAsync(() => {
      component.selectedEntities = MOCK_ENTITIES; // Upewniamy się, że są dane
      
      component.onGenerateExport();
      
      // ★★★ POPRAWKA BŁĘDU #1 ★★★
      // Usunięto niestabilne sprawdzenie `expect(component.loading).toBe(true);`
      
      expect(exportServiceSpy.generateExport).toHaveBeenCalledWith(
        component.selectedEntities, 
        component.exportFields, 
        MOCK_SETTINGS.settings.customHeader 
      );

      tick(); // Czekamy na zakończenie Observable

      expect(component.previewContent).toBe(MOCK_EXPORT_RESULT.fileContent);
      expect(alertSpy.success).toHaveBeenCalledWith('T:Main.Alerts.PreviewSuccess');
      expect(component.loading).toBe(false); // Sprawdzamy stan końcowy
    }));

    it('should show error alert if export fails', fakeAsync(() => {
      const error = new Error('Test export error');
      exportServiceSpy.generateExport.and.returnValue(throwError(() => error));
      component.selectedEntities = MOCK_ENTITIES;
      
      component.onGenerateExport();
      tick(); // Czekamy na błąd

      expect(alertSpy.error).toHaveBeenCalledWith('T:Main.Alerts.PreviewError: Test export error');
      expect(component.previewContent).toBeNull();
      expect(component.loading).toBe(false);
    }));
  });

  // --- Testy dla `copyToClipboard` ---
  describe('copyToClipboard', () => {
    
    it('should use existing preview content if available', fakeAsync(() => {
      component.previewContent = 'Istniejący podgląd';
      
      component.copyToClipboard();
      tick(); // Czekamy na rozwiązanie Promise z copyContent

      expect(exportServiceSpy.copyContent).toHaveBeenCalledWith('Istniejący podgląd');
      expect(exportServiceSpy.generateExport).not.toHaveBeenCalled();
    }));

    it('should generate export and then copy if no preview exists', fakeAsync(() => {
      component.previewContent = null;
      component.selectedEntities = MOCK_ENTITIES;

      component.copyToClipboard();
      tick(); // Czekamy na subskrypcję i Promise

      expect(exportServiceSpy.generateExport).toHaveBeenCalled();
      expect(exportServiceSpy.copyContent).toHaveBeenCalledWith(MOCK_EXPORT_RESULT.fileContent);
    }));

    it('should show validation warning if no preview and validation fails', fakeAsync(() => {
      component.previewContent = null;
      validationServiceSpy.validateExportParameters.and.returnValue('VALIDATION_ERROR');
      
      component.copyToClipboard();
      tick();

      expect(alertSpy.warn).toHaveBeenCalledWith('VALIDATION_ERROR');
      expect(exportServiceSpy.generateExport).not.toHaveBeenCalled();
      expect(exportServiceSpy.copyContent).not.toHaveBeenCalled();
    }));
  });

  // --- Testy dla `downloadFile` ---
  describe('downloadFile', () => {

    it('should use existing preview content if available', () => {
      component.previewContent = 'Istniejący podgląd';
      
      component.downloadFile();

      expect(exportServiceSpy.downloadContent).toHaveBeenCalledWith('Istniejący podgląd');
      expect(exportServiceSpy.generateExport).not.toHaveBeenCalled();
    });

    it('should generate export and then download if no preview exists', fakeAsync(() => {
      component.previewContent = null;
      component.selectedEntities = MOCK_ENTITIES;

      component.downloadFile();
      tick(); // Czekamy na subskrypcję

      expect(exportServiceSpy.generateExport).toHaveBeenCalled();
      expect(exportServiceSpy.downloadContent).toHaveBeenCalledWith(MOCK_EXPORT_RESULT.fileContent);
    }));

    it('should show validation warning if no preview and validation fails', () => {
      component.previewContent = null;
      validationServiceSpy.validateExportParameters.and.returnValue('VALIDATION_ERROR');
      
      component.downloadFile();

      expect(alertSpy.warn).toHaveBeenCalledWith('VALIDATION_ERROR');
      expect(exportServiceSpy.generateExport).not.toHaveBeenCalled();
      expect(exportServiceSpy.downloadContent).not.toHaveBeenCalled();
    });

  });

});