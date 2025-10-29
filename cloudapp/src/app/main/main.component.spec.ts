import { ComponentFixture, TestBed, fakeAsync, flush, waitForAsync } from '@angular/core/testing';
import { MainComponent } from './main.component';
import {
  CloudAppEventsService,
  CloudAppRestService,
  CloudAppSettingsService,
  AlertService,
  MaterialModule,
  Entity,
  HttpMethod,
  EntityType,
} from '@exlibris/exl-cloudapp-angular-lib';
import { TranslateModule, TranslateLoader, TranslateService } from '@ngx-translate/core';
import { of, Subject, throwError } from 'rxjs';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { SelectEntitiesComponent } from '@exlibris/eca-components';
import { ElementRef, NO_ERRORS_SCHEMA } from '@angular/core';


class TranslateHttpLoaderMock implements TranslateLoader {
  getTranslation(lang: string): any {
    return of({
      'Main.NoEntities.Title': 'Brak encji',
      'Main.NoEntities.Description': 'Brak opisu',
      'Main.Alerts.SelectOne': 'Wybierz co najmniej jedną encję',
      'Main.Alerts.NoFieldsSelected': 'Nie wybrano pól do eksportu',
      'Main.Alerts.PreviewSuccess': 'Podgląd sukces',
      'Main.Alerts.PreviewError': 'Błąd podglądu', 
      'Main.Alerts.CopySuccess': 'Skopiowano do schowka',
      'Main.Alerts.CopyError': 'Błąd kopiowania',
      'Main.Alerts.CopyPrepError': 'Błąd przygotowania do kopiowania',
      'Main.Alerts.DownloadSuccess': 'Pobieranie sukces',
      'Main.Alerts.DownloadError': 'Błąd pobierania',
      'Main.ExportFilename': 'export.txt',
      'Main.EntityList.TitleSelect': 'Wybierz encje',
      'Main.EntityList.TitleOptions': 'Wybrano encje',
      'Main.EntityList.Buttons.Preview': 'Podgląd',
      'Main.EntityList.Buttons.Copy': 'Kopiuj',
      'Main.EntityList.Buttons.Download': 'Pobierz',
      'Main.EntityList.SelectTitle': 'Lista encji',
      'Fields.ISBN': 'Tłum: ISBN',
      'Fields.Title': 'Tłum: Tytuł',
      'Fields.Quantity': 'Tłum: Ilość',
      'Fields.PONumber': 'Tłum: Numer PO',
    });
  }
}

const mockAvailableFields = [
  { name: 'isbn', label: 'ISBN Label', selected: true, customLabel: 'Fields.ISBN' },
  { name: 'title', label: 'Title Label', selected: true, customLabel: 'Fields.Title' },
  { name: 'quantity', label: 'Quantity Label', selected: true, customLabel: 'Fields.Quantity' },
  { name: 'poNumber', label: 'PONumber Label', selected: false, customLabel: 'Fields.PONumber' }, 
];

const MOCK_SETTINGS = {
  availableFields: mockAvailableFields,
  customHeader: '# Testowy Eksport',
};

const entitiesSubject = new Subject<Entity[]>();
const mockEventsService = {
  entities$: entitiesSubject.asObservable(),
};

const MOCK_PO_LINE_DATA = {
  resource_metadata: { isbn: '12345', title: 'Test Title', author: 'J. Kowalski' },
  po_number: 'PO123',
  line_number: '1',
  owner: { desc: 'Test Owner' },
  vendor: { desc: 'Test Vendor' },
  price: { sum: 100.5, amount: 100.5 },
  fund_ledger: { name: 'Test Fund' },
  location: [{ quantity: 1 }],
};

const mockRestService = {
  call: (request: any) => {
    if (request.url === '/test/link/1' && request.method === HttpMethod.GET) {
      return of(MOCK_PO_LINE_DATA);
    }
    if (request.url === '/test/link/2' && request.method === HttpMethod.GET) {
      return of({
        ...MOCK_PO_LINE_DATA,
        resource_metadata: { ...MOCK_PO_LINE_DATA.resource_metadata, isbn: '67890' },
        line_number: '2',
        location: [{ quantity: 2 }, { quantity: 3 }], 
        price: { amount: 50.0 },
      });
    }
    return of({});
  },
};

const mockAlertService = {
  success: jasmine.createSpy('success'),
  error: jasmine.createSpy('error'),
  warn: jasmine.createSpy('warn'),
};

const mockCloudAppSettingsService = {
  get: () => of(MOCK_SETTINGS),
};

const MOCK_ENTITIES: Entity[] = [
  { id: '1', link: '/test/link/1', type: EntityType.PO_LINE, description: 'PO Line 1' },
  { id: '2', link: '/test/link/2', type: EntityType.PO_LINE, description: 'PO Line 2' },
];


describe('MainComponent', () => {
  let component: MainComponent;
  let fixture: ComponentFixture<MainComponent>;
  let restService: CloudAppRestService;
  let translateService: TranslateService;
  let alertService: typeof mockAlertService; 

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        MaterialModule,
        HttpClientModule,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useClass: TranslateHttpLoaderMock,
            deps: [HttpClient],
          },
        }),
      ],
      declarations: [MainComponent, SelectEntitiesComponent],
      providers: [
        { provide: CloudAppEventsService, useValue: mockEventsService },
        { provide: CloudAppRestService, useValue: mockRestService },
        { provide: AlertService, useValue: mockAlertService }, 
        { provide: CloudAppSettingsService, useValue: mockCloudAppSettingsService },
        TranslateService,
        { provide: ElementRef, useValue: { nativeElement: document.createElement('div') } },
      ],
      schemas: [NO_ERRORS_SCHEMA], 
    }).compileComponents();
  }));

  beforeEach(fakeAsync(() => {
    fixture = TestBed.createComponent(MainComponent);
    component = fixture.componentInstance;
    restService = TestBed.inject(CloudAppRestService);
    translateService = TestBed.inject(TranslateService);
    
    alertService = TestBed.inject(AlertService) as any as typeof mockAlertService; 

    translateService.use('en').subscribe();
    flush(); 
    
    fixture.detectChanges(); 
    flush(); 
    fixture.detectChanges(); 

    component.selectEntities = { clear: jasmine.createSpy('clear') } as unknown as SelectEntitiesComponent;

    alertService.success.calls.reset();
    alertService.error.calls.reset();
    alertService.warn.calls.reset();
    
    expect(component.translationsLoaded).toBeTrue();
  }));

  it('should create and initialize properties and translations', () => {
    expect(component).toBeTruthy();
    expect(component.visibleEntities).toEqual([]);
    expect(component.exportFields.length).toBe(3); 
    expect(component.titleSelectText).toBe(translateService.instant('Main.EntityList.TitleSelect')); 
  });

  it('should update visibleEntities and clear selectedEntities on new entities$', fakeAsync(() => {
    entitiesSubject.next(MOCK_ENTITIES);
    flush(); 

    expect(component.loading).toBeFalse();
    expect(component.visibleEntities).toEqual(MOCK_ENTITIES);
    expect(component.selectedEntities).toEqual([]);
    expect(component.previewContent).toBeNull();
  }));

  it('should show welcome message when no entities are present', fakeAsync(() => {
    entitiesSubject.next([]);
    fixture.detectChanges(); 
    flush(); 
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain(translateService.instant('Main.NoEntities.Title')); 
  }));
  
  it('should generate content for selected entities and fields', fakeAsync(() => {
    component.selectedEntities = MOCK_ENTITIES;
    component.exportFields = [
        { name: 'isbn', label: 'ISBN Label', selected: true, customLabel: 'Fields.ISBN' },
        { name: 'quantity', label: 'Quantity Label', selected: true, customLabel: 'Fields.Quantity' },
    ];
    spyOn(restService, 'call').and.callThrough(); 

    let generatedContent: string | undefined;
    component['getExportContent']().subscribe(content => generatedContent = content);
    flush(); 

    const expectedContent = 
      '# Testowy Eksport\n' +
      `${translateService.instant('Fields.ISBN')}\t${translateService.instant('Fields.Quantity')}\n` +
      '12345\t1\n' +
      '67890\t5\n';

    expect(generatedContent).toBe(expectedContent);
    expect(component.loading).toBeFalse();
  }));

  it('should alert if no entities are selected for export', fakeAsync(() => {
    component.selectedEntities = [];
    component['getExportContent']().subscribe();
    flush();

    expect(alertService.warn).toHaveBeenCalledWith(translateService.instant('Main.Alerts.SelectOne'));
  }));
  
  it('should alert if no fields are selected for export', fakeAsync(() => {
    component.selectedEntities = MOCK_ENTITIES;
    component.exportFields = []; 
    component['getExportContent']().subscribe();
    flush();

    expect(alertService.warn).toHaveBeenCalledWith(translateService.instant('Main.Alerts.NoFieldsSelected'));
  }));

  it('should call alert.error on REST API failure', fakeAsync(() => {
    spyOn(restService, 'call').and.returnValue(throwError(() => new Error('API Error')));

    component.selectedEntities = MOCK_ENTITIES;
    component.exportFields = mockAvailableFields.filter(f => f.selected); 
    component.onGenerateExport();
    flush(); 

    const expectedErrorMessage = translateService.instant('Main.Alerts.PreviewError') + 'API Error';
    expect(alertService.error).toHaveBeenCalledWith(expectedErrorMessage);
    
    expect(component.loading).toBeFalse();
  }));


  it('should set previewContent and show success alert on onGenerateExport success', fakeAsync(() => {
    spyOn(restService, 'call').and.callThrough();

    component.selectedEntities = MOCK_ENTITIES;
    component.exportFields = mockAvailableFields.filter(f => f.selected);
    component.onGenerateExport();
    flush(); 

    expect(alertService.success).toHaveBeenCalledWith(translateService.instant('Main.Alerts.PreviewSuccess'));
    expect(component.previewContent).not.toBeNull();
  }));

  it('should call document.execCommand(\'copy\') on copyToClipboard success', fakeAsync(() => {
    const mockTextArea = { value: '', style: {}, focus: () => {}, select: () => {} };
    spyOn(document, 'createElement').and.returnValue(mockTextArea as unknown as HTMLTextAreaElement);
    
    spyOn(document.body, 'appendChild').and.callFake((node) => { return node; }); 
    spyOn(document.body, 'removeChild');
    
    const execCommandSpy = spyOn(document, 'execCommand').and.returnValue(true);
    spyOn(restService, 'call').and.callThrough();

    component.selectedEntities = MOCK_ENTITIES;
    component.exportFields = mockAvailableFields.filter(f => f.selected);

    component.copyToClipboard();
    flush(); 

    expect(execCommandSpy).toHaveBeenCalledWith('copy');
    expect(alertService.success).toHaveBeenCalledWith(translateService.instant('Main.Alerts.CopySuccess'));
  }));
  
  it('should create and click a download link on downloadFile success', fakeAsync(() => {
    const mockURL = 'blob:test';
    const mockBlob = {} as Blob;
    
    const mockAnchor = { href: '', download: '', click: jasmine.createSpy('click') };
    
    spyOn(restService, 'call').and.callThrough();
    spyOn(window, 'Blob').and.returnValue(mockBlob);
    spyOn(URL, 'createObjectURL').and.returnValue(mockURL);
    spyOn(URL, 'revokeObjectURL');
    
    spyOn(document, 'createElement').and.returnValue(mockAnchor as unknown as HTMLAnchorElement);
    spyOn(document.body, 'appendChild').and.callFake((node) => { return node; }); 
    spyOn(document.body, 'removeChild');

    component.selectedEntities = MOCK_ENTITIES;
    component.exportFields = mockAvailableFields.filter(f => f.selected);

    component.downloadFile();
    flush();

    expect(mockAnchor.download).toBe(translateService.instant('Main.ExportFilename'));
    expect(mockAnchor.click).toHaveBeenCalled();
    expect(alertService.success).toHaveBeenCalledWith(translateService.instant('Main.Alerts.DownloadSuccess'));
  }));
});