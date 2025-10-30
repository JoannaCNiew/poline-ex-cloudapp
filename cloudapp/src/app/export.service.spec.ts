import { TestBed, fakeAsync, flush } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ExportService, ExportResult } from './export.service';
import {
    CloudAppRestService,
    EntityType,
    AlertService,
} from '@exlibris/exl-cloudapp-angular-lib';
import { TranslateModule, TranslateService, TranslateLoader } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { Entity } from '@exlibris/exl-cloudapp-angular-lib';
import { FieldConfig } from './models/settings';
import { HttpClient } from '@angular/common/http';


class TranslateHttpLoaderMock implements TranslateLoader {
    getTranslation(lang: string): any {
        return of({
            'Main.Alerts.CopySuccess': 'Tłum: Skopiowano',
            'Main.Alerts.CopyError': 'Tłum: Błąd kopiowania',
            'Main.Alerts.DownloadSuccess': 'Tłum: Pobieranie sukces',
            'Main.Alerts.NoPreviewContent': 'Tłum: Brak treści',
            'Main.ExportFilename': 'export.txt',
            'Fields.ISBN': 'Tłum: ISBN',
            'Fields.Quantity': 'Tłum: Ilość',
            'Fields.Title': 'Tłum: Tytuł',
            'Fields.Price': 'Cena',
            'Fields.Fund': 'Fundusz',
            'Fields.LineNumber': 'Nr Linii',
            'Fields.Owner': 'Właściciel',
        });
    }
}

const MOCK_ENTITIES: Entity[] = [
    { id: '1', link: '/alma/v1/po-lines/100', type: EntityType.PO_LINE, description: 'PO Line 1' },
    { id: '2', link: '/alma/v1/po-lines/200', type: EntityType.PO_LINE, description: 'PO Line 2' },
];

const MOCK_FIELDS_VALID: FieldConfig[] = [
    { name: 'isbn', label: 'ISBN Label', selected: true, customLabel: 'Fields.ISBN' },
    { name: 'quantity', label: 'Quantity Label', selected: true, customLabel: 'Fields.Quantity' },
    { name: 'title', label: 'Title Label', selected: true, customLabel: 'Fields.Title' },
];

const MOCK_PO_LINE_1 = {
    resource_metadata: { isbn: '12345', title: 'Tytuł 1' },
    po_number: 'PO100',
    number: 'L1', 
    owner: { desc: 'Owner A' },
    vendor: { desc: 'Vendor X' },
    price: { sum: 100.5, amount: 100.5 }, 
    fund_ledger: { name: 'Test Fund' }, 
    location: [{ quantity: 1 }],
};

const MOCK_PO_LINE_2 = {
    resource_metadata: { isbn: '67890', title: 'Tytuł 2' },
    po_number: 'PO200',
    number: 'L2', 
    owner: { desc: 'Owner B' },
    vendor: { desc: 'Vendor Y' },
    price: { sum: 50, amount: 50 },
    location: [{ quantity: 2 }, { quantity: 3 }], 
};

const mockRestService = {
    call: jasmine.createSpy('call') 
};

const mockAlertService = {
    success: jasmine.createSpy('success'),
    error: jasmine.createSpy('error'),
    warn: jasmine.createSpy('warn'),
};


describe('ExportService', () => {
    let service: ExportService;
    let restService: CloudAppRestService;
    let alertService: typeof mockAlertService;
    let translateService: TranslateService;

    const TEST_HEADER = '# Testowy Eksport Nagłówek';

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                HttpClientTestingModule,
                TranslateModule.forRoot({
                    loader: {
                        provide: TranslateLoader,
                        useClass: TranslateHttpLoaderMock,
                        deps: [HttpClient],
                    },
                }),
            ],
            providers: [
                ExportService,
                { provide: CloudAppRestService, useValue: mockRestService },
                { provide: AlertService, useValue: mockAlertService },
                TranslateService,
            ]
        });

        service = TestBed.inject(ExportService);
        restService = TestBed.inject(CloudAppRestService);
        alertService = TestBed.inject(AlertService) as any as typeof mockAlertService;
        translateService = TestBed.inject(TranslateService);

        mockRestService.call.calls.reset();
        alertService.success.calls.reset();
        alertService.error.calls.reset();
        alertService.warn.calls.reset();
        
        // Ustawianie domyślnego zachowania dla mockRestService.call w każdym teście
        mockRestService.call.and.callFake((request: any) => {
            if (request.url.includes('po-lines/100')) return of(MOCK_PO_LINE_1);
            if (request.url.includes('po-lines/200')) return of(MOCK_PO_LINE_2);
            return of({});
        });
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should generate file content for selected entities and fields, respecting order and custom header', fakeAsync(() => {
        // ARRANGE
        translateService.use('en').subscribe();
        flush();
        
        const testFields: FieldConfig[] = [
            { name: 'quantity', label: 'Quantity Label', selected: true, customLabel: 'Fields.Quantity' },
            { name: 'isbn', label: 'ISBN Label', selected: true, customLabel: 'Fields.ISBN' },
        ];
        
        let result: ExportResult | undefined;
        
        service.generateExport(MOCK_ENTITIES, testFields, TEST_HEADER).subscribe(res => result = res);
        flush();

        // ASSERT
        const expectedHeaderLine = `${TEST_HEADER}\n${translateService.instant('Fields.Quantity')}\t${translateService.instant('Fields.ISBN')}\n`; 
        
        expect(result!.fileContent).toMatch(new RegExp(`^${expectedHeaderLine.replace(/[\/\\^$*+?.()|[\]{}]/g, '\\$&')}`));
        
        expect(result!.fileContent).toContain('1\t12345'); 
        expect(result!.fileContent).toContain('5\t67890');

        expect(mockRestService.call).toHaveBeenCalledTimes(2);
    }));

    // TEST POPRAWIONY: Weryfikacja całego opakowanego błędu
    it('should throw an error if Alma REST API calls fail', fakeAsync(() => {
        // ARRANGE
        // Celowe ustawienie mocka, aby zwracał błąd
        mockRestService.call.and.returnValue(throwError(() => new Error('API down')));
        const testHeader = '# Testowy Nagłówek';
        
        let error: any;
        
        service.generateExport(MOCK_ENTITIES, MOCK_FIELDS_VALID, testHeader).subscribe({
            error: err => error = err
        });
        flush();

        // ASSERT
        expect(error).toBeDefined();
        // Oczekujemy, że błąd będzie zawierał CAŁY, opakowany komunikat z serwisu
        expect(error.message).toContain('Błąd API Alma podczas pobierania szczegółów PO Line: API down'); 
        expect(restService.call).toHaveBeenCalled(); 
    }));
    
    it('should correctly handle fields with complex logic (price, fund, quantity)', fakeAsync(() => {
        // ARRANGE
        translateService.use('en').subscribe();
        flush();
        const testFields: FieldConfig[] = [
            { name: 'price', label: 'Price', selected: true, customLabel: 'Fields.Price' },
            { name: 'fund', label: 'Fund', selected: true, customLabel: 'Fields.Fund' },
            { name: 'line_number', label: 'Line Number', selected: true, customLabel: 'Fields.LineNumber' },
            { name: 'owner', label: 'Owner', selected: true, customLabel: 'Fields.Owner' },
            { name: 'quantity', label: 'Quantity', selected: true, customLabel: 'Fields.Quantity' },
        ];
        const testHeader = '# Test Ceny i Funduszy';
        
        let result: any;
        service.generateExport(MOCK_ENTITIES, testFields, testHeader).subscribe(res => result = res);
        flush();
        
        const expectedContent = 
            `# Test Ceny i Funduszy\n` + 
            `Cena\tFundusz\tNr Linii\tWłaściciel\tTłum: Ilość\n` + 
            `100.5\tTest Fund\tL1\tOwner A\t1\n` +     
            `50\t\tL2\tOwner B\t5\n`; 
            
        expect(result.fileContent).toBe(expectedContent);
    }));

    it('should copy content to clipboard and show success alert on success', fakeAsync(() => {
        // ARRANGE
        const mockContent = 'Test content to copy';
        const mockTextArea = { value: '', style: {}, focus: () => {}, select: () => {} };
        spyOn(document, 'createElement').and.returnValue(mockTextArea as unknown as HTMLTextAreaElement);
        spyOn(document.body, 'appendChild').and.callFake((node) => { return node; }); 
        spyOn(document.body, 'removeChild');
        const execCommandSpy = spyOn(document, 'execCommand').and.returnValue(true);

        // ACT
        service.copyContent(mockContent);
        flush();

        // ASSERT
        expect(execCommandSpy).toHaveBeenCalledWith('copy');
        expect(mockTextArea.value).toBe(mockContent);
        expect(alertService.success).toHaveBeenCalledWith(translateService.instant('Main.Alerts.CopySuccess'));
        expect(document.body.removeChild).toHaveBeenCalled();
    }));

    it('should show error alert if document.execCommand(\'copy\') fails', fakeAsync(() => {
        // ARRANGE
        spyOn(document, 'createElement').and.returnValue({ value: '', style: {}, focus: () => {}, select: () => {} } as unknown as HTMLTextAreaElement);
        spyOn(document, 'execCommand').and.returnValue(false);
        spyOn(document.body, 'appendChild'); 
        spyOn(document.body, 'removeChild');

        // ACT
        service.copyContent('Fail content');
        flush();

        // ASSERT
        expect(alertService.error).toHaveBeenCalledWith(translateService.instant('Main.Alerts.CopyError'));
    }));

    it('should create and click a download link on downloadFile success', fakeAsync(() => {
        // ARRANGE
        const mockContent = 'Download content';
        const mockURL = 'blob:test';
        const mockAnchor = { href: '', download: '', click: jasmine.createSpy('click') };
        
        spyOn(window, 'Blob').and.returnValue({} as Blob);
        spyOn(URL, 'createObjectURL').and.returnValue(mockURL);
        spyOn(URL, 'revokeObjectURL');
        
        spyOn(document, 'createElement').and.returnValue(mockAnchor as unknown as HTMLAnchorElement);
        spyOn(document.body, 'appendChild').and.callFake((node) => { return node; }); 
        spyOn(document.body, 'removeChild');

        // ACT
        service.downloadContent(mockContent);
        flush();

        // ASSERT
        expect(mockAnchor.download).toBe(translateService.instant('Main.ExportFilename'));
        expect(mockAnchor.click).toHaveBeenCalled();
        expect(alertService.success).toHaveBeenCalledWith(translateService.instant('Main.Alerts.DownloadSuccess'));
        expect(URL.revokeObjectURL).toHaveBeenCalledWith(mockURL);
    }));

    it('should warn if copyContent is called with empty content', () => {
        // ACT
        service.copyContent('');
        // ASSERT
        expect(alertService.warn).toHaveBeenCalledWith(translateService.instant('Main.Alerts.NoPreviewContent'));
        expect(alertService.success).not.toHaveBeenCalled();
    });

    it('should warn if downloadContent is called with empty content', () => {
        // ACT
        service.downloadContent('');
        // ASSERT
        expect(alertService.warn).toHaveBeenCalledWith(translateService.instant('Main.Alerts.NoPreviewContent'));
        expect(alertService.success).not.toHaveBeenCalled();
    });
});