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
import { ExportService, ExportResult } from '../export.service'; 


class TranslateHttpLoaderMock implements TranslateLoader {
    getTranslation(lang: string): any {
        return of({
            'Main.NoEntities.Title': 'Brak encji',
            'Main.NoEntities.Description': 'Brak opisu',
            'Main.Alerts.SelectOne': 'Wybierz co najmniej jedną encję',
            'Main.Alerts.NoFieldsSelected': 'Nie wybrano pól do eksportu',
            'Main.Alerts.NoPreviewContent': 'Brak treści do wykonania akcji', 
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
            'Main.Alerts.SettingsNotReady': 'Ustawienia nie załadowane',
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

const MOCK_ENTITIES: Entity[] = [
    { id: '1', link: '/test/link/1', type: EntityType.PO_LINE, description: 'PO Line 1' },
    { id: '2', link: '/test/link/2', type: EntityType.PO_LINE, description: 'PO Line 2' },
];

const MOCK_EXPORT_RESULT: ExportResult = {
    fileContent: '# Testowy Eksport\nTłum: ISBN\n12345\n67890\n',
    exportFields: MOCK_SETTINGS.availableFields.filter(f => f.selected),
    count: 2,
};

const entitiesSubject = new Subject<Entity[]>();
const mockEventsService = {
    entities$: entitiesSubject.asObservable(),
};

const mockRestService = {
    call: jasmine.createSpy('call').and.returnValue(of({})),
};

const mockAlertService = {
    success: jasmine.createSpy('success'),
    error: jasmine.createSpy('error'),
    warn: jasmine.createSpy('warn'),
};

const mockCloudAppSettingsService = {
    get: () => of(MOCK_SETTINGS),
};

const mockExportService = {
    generateExport: jasmine.createSpy('generateExport').and.returnValue(of(MOCK_EXPORT_RESULT)),
    copyContent: jasmine.createSpy('copyContent'),
    downloadContent: jasmine.createSpy('downloadContent'),
};


describe('MainComponent', () => {
    let component: MainComponent;
    let fixture: ComponentFixture<MainComponent>;
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
                { provide: ExportService, useValue: mockExportService }, 
                TranslateService,
                { provide: ElementRef, useValue: { nativeElement: document.createElement('div') } },
            ],
            schemas: [NO_ERRORS_SCHEMA], 
        }).compileComponents();
    }));

    beforeEach(fakeAsync(() => {
        fixture = TestBed.createComponent(MainComponent);
        component = fixture.componentInstance;
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
        mockExportService.generateExport.calls.reset(); 
        mockExportService.copyContent.calls.reset();
        mockExportService.downloadContent.calls.reset(); 
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

    it('should call generateExport on onGenerateExport and set previewContent on success', fakeAsync(() => {
        // ARRANGE
        component.selectedEntities = MOCK_ENTITIES;
        component.exportFields = MOCK_SETTINGS.availableFields.filter(f => f.selected);
        mockExportService.generateExport.and.returnValue(of(MOCK_EXPORT_RESULT)); 

        // ACT
        component.onGenerateExport();
        flush(); 

        // ASSERT
        expect(mockExportService.generateExport).toHaveBeenCalledWith(
            MOCK_ENTITIES,
            component.exportFields, 
            MOCK_SETTINGS.customHeader 
        );
        expect(alertService.success).toHaveBeenCalledWith(translateService.instant('Main.Alerts.PreviewSuccess'));
        expect(component.previewContent).toBe(MOCK_EXPORT_RESULT.fileContent);
        expect(component.loading).toBeFalse();
    }));

    it('should alert if no entities are selected for export', () => {
        component.selectedEntities = [];
        component.exportFields = MOCK_SETTINGS.availableFields.filter(f => f.selected);
        component.onGenerateExport();
        expect(alertService.warn).toHaveBeenCalledWith(translateService.instant('Main.Alerts.SelectOne'));
        expect(mockExportService.generateExport).not.toHaveBeenCalled();
    });
    
    it('should alert if no fields are selected for export', () => {
        component.selectedEntities = MOCK_ENTITIES;
        component.exportFields = []; 
        component.onGenerateExport();
        expect(alertService.warn).toHaveBeenCalledWith(translateService.instant('Main.Alerts.NoFieldsSelected'));
        expect(mockExportService.generateExport).not.toHaveBeenCalled();
    });

    it('should alert on API failure during export generation', fakeAsync(() => {
        // ARRANGE
        component.selectedEntities = MOCK_ENTITIES;
        component.exportFields = MOCK_SETTINGS.availableFields.filter(f => f.selected);
        const apiError = new Error('API down error');
        mockExportService.generateExport.and.returnValue(throwError(() => apiError)); 

        // ACT
        component.onGenerateExport();
        flush(); 

        // ASSERT
        const expectedErrorMessage = translateService.instant('Main.Alerts.PreviewError') + ': ' + apiError.message;
        expect(alertService.error).toHaveBeenCalledWith(expectedErrorMessage);
        expect(component.loading).toBeFalse();
    }));

    it('should call ExportService.copyContent on copyToClipboard if content exists', () => {
        // ARRANGE
        component.previewContent = MOCK_EXPORT_RESULT.fileContent;

        // ACT
        component.copyToClipboard();

        // ASSERT
        expect(mockExportService.copyContent).toHaveBeenCalledWith(MOCK_EXPORT_RESULT.fileContent);
        expect(alertService.warn).not.toHaveBeenCalled(); 
    });
    
    it('should warn and NOT call ExportService.copyContent if previewContent is null', () => {
        // ARRANGE
        component.previewContent = null;

        // ACT
        component.copyToClipboard();

        // ASSERT
        expect(mockExportService.copyContent).not.toHaveBeenCalled();
        expect(alertService.warn).toHaveBeenCalledWith(translateService.instant('Main.Alerts.NoPreviewContent'));
    });

    it('should call ExportService.downloadContent on downloadFile if content exists', () => {
        // ARRANGE
        component.previewContent = MOCK_EXPORT_RESULT.fileContent;

        // ACT
        component.downloadFile();

        // ASSERT
        expect(mockExportService.downloadContent).toHaveBeenCalledWith(MOCK_EXPORT_RESULT.fileContent);
        expect(alertService.warn).not.toHaveBeenCalled();
    });
    
    it('should warn and NOT call ExportService.downloadContent if previewContent is null', () => {
        // ARRANGE
        component.previewContent = null;

        // ACT
        component.downloadFile();

        // ASSERT
        expect(mockExportService.downloadContent).not.toHaveBeenCalled();
        expect(alertService.warn).toHaveBeenCalledWith(translateService.instant('Main.Alerts.NoPreviewContent'));
    });

    it('should clear selection and preview content on clearSelection', () => {
        component.previewContent = 'Some content';
        component.clearSelection();
        expect(component.selectEntities.clear).toHaveBeenCalled();
        expect(component.previewContent).toBeNull();
    });
});