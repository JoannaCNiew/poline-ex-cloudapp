import { ComponentFixture, TestBed, waitForAsync, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ChangeDetectorRef, Component, ElementRef } from '@angular/core';
import { Observable, of, Subject } from 'rxjs';
import { TranslateService, LangChangeEvent, TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { AlertService, CloudAppEventsService, CloudAppRestService, Entity } from '@exlibris/exl-cloudapp-angular-lib';
import { SelectEntitiesComponent } from '@exlibris/eca-components';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { MainComponent } from './main.component';
import { ExportService } from '../export.service';
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
    // Zwracamy puste obiekty dla `loadTranslations`
    'Main.EntityList.TitleSelect': 'T:TitleSelect',
    'Main.EntityList.TitleOptions': 'T:TitleOptions',
    'Main.EntityList.Buttons.Preview': 'T:Preview',
    'Main.EntityList.Buttons.Copy': 'T:Copy',
    'Main.EntityList.Buttons.Download': 'T:Download',
    'Main.EntityList.SelectTitle': 'T:SelectTitle'
  })),
  instant: jasmine.createSpy('instant').and.callFake((key: string) => key), // Zwraca klucz
  onLangChange: langChangeSubject.asObservable(),
  
  // ★★★ POPRAWKA: TranslateDirective potrzebuje tych obserwabli ★★★
  onTranslationChange: new Subject().asObservable(),
  onDefaultLangChange: new Subject().asObservable()
};

// 4. Mock dla SettingsService (zwraca domyślne puste ustawienia)
const mockSettings: ProcessedSettings = {
  settings: { availableFields: [], customHeader: '# Test Header' } as AppSettings,
  exportFields: []
};
const mockSettingsService = {
  getSettings: jasmine.createSpy('getSettings').and.returnValue(of(mockSettings))
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
// Musimy stworzyć fałszywy komponent, który ma te same metody
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

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      // Deklarujemy MainComponent ORAZ nasz fałszywy komponent
      declarations: [ MainComponent, MockSelectEntitiesComponent ],
      imports: [
        HttpClientTestingModule, // Dla HttpClient w konstruktorze
        NoopAnimationsModule, // Dla 'setTimeout' w kodzie
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
        })
      ],
      providers: [
        // Zastępujemy wszystkie serwisy ich mockami
        { provide: CloudAppRestService, useValue: mockRestService },
        { provide: CloudAppEventsService, useValue: mockEventsService },
        { provide: AlertService, useValue: mockAlertService },
        { provide: TranslateService, useValue: mockTranslateService },
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: ExportService, useValue: mockExportService },
        
        // Zastępujemy zależności Angulara
        { provide: ElementRef, useValue: mockElementRef },
        { provide: ChangeDetectorRef, useValue: mockCd },

        // WAŻNE: Serwisy z 'providers' komponentu muszą być dostarczone tutaj
        // (ponieważ zastępujemy metadane komponentu)
        { provide: DomService, useValue: mockDomService },
        { provide: ValidationService, useValue: mockValidationService },
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MainComponent);
    component = fixture.componentInstance;

    // Pobieramy referencje do wstrzykniętych mocków
    alertSpy = TestBed.inject(AlertService) as jasmine.SpyObj<AlertService>;
    domServiceSpy = TestBed.inject(DomService) as jasmine.SpyObj<DomService>;
    settingsServiceSpy = TestBed.inject(SettingsService) as jasmine.SpyObj<SettingsService>;
    exportServiceSpy = TestBed.inject(ExportService) as jasmine.SpyObj<ExportService>;
    validationServiceSpy = TestBed.inject(ValidationService) as jasmine.SpyObj<ValidationService>;

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
    mockTranslateService.get.calls.reset();
  });

  it('should create', fakeAsync(() => {
    fixture.detectChanges(); // To uruchamia ngOnInit
    tick(500); // Przeskakujemy 'setTimeout' i 'async' w ngOnInit
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(settingsServiceSpy.getSettings).toHaveBeenCalled();
    expect(mockTranslateService.get).toHaveBeenCalled();
  }));

});