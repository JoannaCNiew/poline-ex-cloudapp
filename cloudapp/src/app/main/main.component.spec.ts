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

const mockRestService = jasmine.createSpyObj('CloudAppRestService', ['call']);
const mockAlertService = jasmine.createSpyObj('AlertService', ['success', 'warn', 'error']);

const entitiesSubject = new Subject<Entity[]>();
const mockEventsService = {
  entities$: entitiesSubject.asObservable(),
};

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

const MOCK_SETTINGS: ProcessedSettings = {
  settings: { availableFields: [], customHeader: '# Test Header' } as AppSettings,
  exportFields: [{ name: 'field1', label: 'Field 1', selected: true, customLabel: 'Custom 1' }] 
};
const mockSettingsService = {
  getSettings: jasmine.createSpy('getSettings').and.returnValue(of(MOCK_SETTINGS))
};

const mockExportService = jasmine.createSpyObj('ExportService', ['generateExport', 'copyContent', 'downloadContent']);
const mockDomService = jasmine.createSpyObj('DomService', ['updateSelectAllCheckboxLabel']);
const mockValidationService = jasmine.createSpyObj('ValidationService', ['validateExportParameters']);

const mockElementRef = {
  nativeElement: document.createElement('div')
};
const mockCd = jasmine.createSpyObj('ChangeDetectorRef', ['markForCheck']);

@Component({
  selector: 'eca-select-entities',
  template: ''
})
class MockSelectEntitiesComponent {
  clear = jasmine.createSpy('clear');
}

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<any> {
    return of({});
  }
}

const MOCK_ENTITIES: Entity[] = [
  { id: '1', link: 'link/1', type: EntityType.PO_LINE, description: 'PO 1' }
];
const MOCK_EXPORT_RESULT: ExportResult = {
  fileContent: 'test content',
  exportFields: [],
  count: 1
};


describe('MainComponent', () => {
  let component: MainComponent;
  let fixture: ComponentFixture<MainComponent>;

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
    
    alertSpy = TestBed.inject(AlertService) as jasmine.SpyObj<AlertService>;
    domServiceSpy = TestBed.inject(DomService) as jasmine.SpyObj<DomService>;
    settingsServiceSpy = TestBed.inject(SettingsService) as jasmine.SpyObj<SettingsService>;
    exportServiceSpy = TestBed.inject(ExportService) as jasmine.SpyObj<ExportService>;
    validationServiceSpy = TestBed.inject(ValidationService) as jasmine.SpyObj<ValidationService>;
    translateSpy = TestBed.inject(TranslateService) as jasmine.SpyObj<TranslateService>;
    
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
    
    validationServiceSpy.validateExportParameters.and.returnValue(null); 
    exportServiceSpy.generateExport.and.returnValue(of(MOCK_EXPORT_RESULT));
    exportServiceSpy.copyContent.and.returnValue(Promise.resolve()); 
    
    fixture.detectChanges(); 
    tick(500); 
    fixture.detectChanges();
    
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
    component.selectedEntities = MOCK_ENTITIES;
    component.previewContent = 'stary podgląd';

    entitiesSubject.next(MOCK_ENTITIES);
    tick(500); 

    expect(component.loading).toBe(false);
    expect(component.visibleEntities).toBe(MOCK_ENTITIES);
    expect(component.selectedEntities).toEqual([]); 
    expect(component.previewContent).toBeNull(); 
    expect(domServiceSpy.updateSelectAllCheckboxLabel).toHaveBeenCalled();
  }));

  it('should react to language changes', fakeAsync(() => {
    langChangeSubject.next({ lang: 'fr', translations: {} });
    tick(500); 

    expect(translateSpy.get).toHaveBeenCalled(); 
    expect(domServiceSpy.updateSelectAllCheckboxLabel).toHaveBeenCalled();
  }));

  it('should clear selection and preview', () => {
    component.previewContent = 'jakiś tekst';
    component.clearSelection();

    expect(component.selectEntities.clear).toHaveBeenCalled();
    expect(component.previewContent).toBeNull();
  });

  describe('onGenerateExport', () => {
    
    it('should show warn alert if validation fails', () => {
      validationServiceSpy.validateExportParameters.and.returnValue('TEST_ERROR_KEY');
      
      component.onGenerateExport();
      
      expect(alertSpy.warn).toHaveBeenCalledWith('TEST_ERROR_KEY');
      expect(component.loading).toBe(false);
      expect(exportServiceSpy.generateExport).not.toHaveBeenCalled();
    });

    it('should call exportService, show preview, and show success on valid export', fakeAsync(() => {
      component.selectedEntities = MOCK_ENTITIES; 
      
      component.onGenerateExport();
      
      
      expect(exportServiceSpy.generateExport).toHaveBeenCalledWith(
        component.selectedEntities, 
        component.exportFields, 
        MOCK_SETTINGS.settings.customHeader 
      );

      tick(); 

      expect(component.previewContent).toBe(MOCK_EXPORT_RESULT.fileContent);
      expect(alertSpy.success).toHaveBeenCalledWith('T:Main.Alerts.PreviewSuccess');
      expect(component.loading).toBe(false); 
    }));

    it('should show error alert if export fails', fakeAsync(() => {
      const error = new Error('Test export error');
      exportServiceSpy.generateExport.and.returnValue(throwError(() => error));
      component.selectedEntities = MOCK_ENTITIES;
      
      component.onGenerateExport();
      tick(); 

      expect(alertSpy.error).toHaveBeenCalledWith('T:Main.Alerts.PreviewError: Test export error');
      expect(component.previewContent).toBeNull();
      expect(component.loading).toBe(false);
    }));
  });

  describe('copyToClipboard', () => {
    
    it('should use existing preview content if available', fakeAsync(() => {
      component.previewContent = 'Istniejący podgląd';
      
      component.copyToClipboard();
      tick(); 

      expect(exportServiceSpy.copyContent).toHaveBeenCalledWith('Istniejący podgląd');
      expect(exportServiceSpy.generateExport).not.toHaveBeenCalled();
    }));

    it('should generate export and then copy if no preview exists', fakeAsync(() => {
      component.previewContent = null;
      component.selectedEntities = MOCK_ENTITIES;

      component.copyToClipboard();
      tick(); 

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
      tick(); 

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