import { TestBed, fakeAsync, flush } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ExportService } from './export.service';
import {
    CloudAppRestService,
    CloudAppConfigService,
    EntityType,
    HttpMethod,
} from '@exlibris/exl-cloudapp-angular-lib';
import { of, throwError } from 'rxjs';
import { AVAILABLE_FIELDS } from './main/field-definitions';
import { Entity } from '@exlibris/exl-cloudapp-angular-lib';
import { AppSettings } from './models/settings';

const MOCK_ENTITIES: Entity[] = [
    { id: '1', link: '/alma/v1/po-lines/100', type: EntityType.PO_LINE, description: 'PO Line 1' },
    { id: '2', link: '/alma/v1/po-lines/200', type: EntityType.PO_LINE, description: 'PO Line 2' },
];

const MOCK_SETTINGS_VALID: AppSettings = {
    availableFields: [
        { name: 'isbn', label: 'ISBN Label', selected: true, customLabel: 'Tłum: ISBN' },
        { name: 'quantity', label: 'Quantity Label', selected: true, customLabel: 'Tłum: Ilość' },
        { name: 'poNumber', label: 'PONumber Label', selected: false, customLabel: 'Tłum: Numer PO' },
    ],
    customHeader: '# Testowy Eksport'
};

const MOCK_SETTINGS_NO_FIELDS: AppSettings = {
    availableFields: [
        { name: 'isbn', label: 'ISBN Label', selected: false, customLabel: 'Tłum: ISBN' },
    ],
    customHeader: '# Testowy Eksport'
};

const MOCK_SETTINGS_EMPTY_HEADER: AppSettings = {
    availableFields: MOCK_SETTINGS_VALID.availableFields,
    customHeader: '' 
};

const MOCK_PO_LINE_1 = {
    resource_metadata: { isbn: '12345', title: 'Tytuł 1' },
    po_number: 'PO100',
    number: 'L1', 
    owner: { desc: 'Owner A' },
    vendor: { desc: 'Vendor X' },
    price: { sum: 100.5, currency: { value: 'USD' } },
    fund_distribution: [{ fund_code: { value: 'FUNDA' } }],
    location: [{ quantity: 1 }],
};

const MOCK_PO_LINE_2 = {
    resource_metadata: { isbn: '67890', title: 'Tytuł 2' },
    po_number: 'PO200',
    number: 'L2', 
    owner: { desc: 'Owner B' },
    vendor: { desc: 'Vendor Y' },
    price: { sum: 50, currency: { value: 'PLN' } },
    fund_distribution: [{ fund_code: { value: 'FUNDB' } }],
    location: [{ quantity: 2 }, { quantity: 3 }], 
};

const mockRestService = {
    call: jasmine.createSpy('call').and.callFake((request: any) => {
        if (request.url.includes('po-lines/100')) {
            return of(MOCK_PO_LINE_1);
        }
        if (request.url.includes('po-lines/200')) {
            return of(MOCK_PO_LINE_2);
        }
        return of({});
    })
};

const mockConfigService = {
    get: jasmine.createSpy('get')
};

(ExportService as any).AVAILABLE_FIELDS = AVAILABLE_FIELDS;


describe('ExportService', () => {
    let service: ExportService;
    let restService: CloudAppRestService;
    let configService: typeof mockConfigService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [
                ExportService,
                { provide: CloudAppRestService, useValue: mockRestService },
                { provide: CloudAppConfigService, useValue: mockConfigService },
            ]
        });

        service = TestBed.inject(ExportService);
        restService = TestBed.inject(CloudAppRestService);
        
        configService = TestBed.inject(CloudAppConfigService) as any as typeof mockConfigService;
        
        mockRestService.call.calls.reset();
        mockConfigService.get.calls.reset();
        
        mockRestService.call.and.callFake((request: any) => {
            if (request.url.includes('po-lines/100')) return of(MOCK_PO_LINE_1);
            if (request.url.includes('po-lines/200')) return of(MOCK_PO_LINE_2);
            return of({});
        });
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });


    it('should generate file content for selected entities and fields', fakeAsync(() => {
        configService.get.and.returnValue(of(MOCK_SETTINGS_VALID));
        
        let result: any;
        service.generateExport(MOCK_ENTITIES).subscribe(res => result = res);
        flush();

        expect(configService.get).toHaveBeenCalledTimes(1);
        expect(restService.call).toHaveBeenCalledTimes(2);
        
        const expectedContent = 
            `# Eksport PO Line\n` + 
            `Tłum: ISBN\tTłum: Ilość\n` + 
            `12345\t1\n` +     
            `67890\t5\n`;     
            
        expect(result.fileContent).toBe(expectedContent);
        expect(result.count).toBe(2);
    }));
    
    it('should use default fields if settings service returns an error', fakeAsync(() => {
        configService.get.and.returnValue(throwError(() => new Error('Config load error')));
        
        let result: any;
        service.generateExport(MOCK_ENTITIES).subscribe(res => result = res);
        flush();

        expect(restService.call).toHaveBeenCalledTimes(2);
        
        const expectedHeader = '# Eksport PO Line';
        expect(result.fileContent).toContain(expectedHeader);
    }));

    it('should throw an error if no fields are selected for export', fakeAsync(() => {
        configService.get.and.returnValue(of(MOCK_SETTINGS_NO_FIELDS));
        
        let error: any;
        service.generateExport(MOCK_ENTITIES).subscribe({
            error: err => error = err
        });
        flush();

        expect(error).toBeDefined();
        expect(error.message).toContain('Nie wybrano żadnych pól do eksportu. Sprawdź Ustawienia.');
        expect(restService.call).not.toHaveBeenCalled();
    }));
    
    it('should throw an error if Alma REST API calls fail', fakeAsync(() => {
        configService.get.and.returnValue(of(MOCK_SETTINGS_VALID));
        mockRestService.call.and.returnValue(throwError(() => new Error('API down')));
        
        let error: any;
        service.generateExport(MOCK_ENTITIES).subscribe({
            error: err => error = err
        });
        flush();

        expect(error).toBeDefined();
        expect(error.message).toContain('Błąd API Alma podczas pobierania szczegółów PO Line: API down');
        
        expect(restService.call).toHaveBeenCalled(); 
    }));
    
    it('should use services\' default header if custom header is undefined in settings', fakeAsync(() => {
        configService.get.and.returnValue(of(MOCK_SETTINGS_EMPTY_HEADER)); 
        
        let result: any;
        service.generateExport(MOCK_ENTITIES).subscribe(res => result = res);
        flush();

        const expectedHeader = '# Eksport PO Line';
        expect(result.fileContent).toContain(expectedHeader);
    }));


    it('should correctly handle fields with complex logic (price and fund)', fakeAsync(() => {
        const settings: AppSettings = {
            availableFields: [
                { name: 'price', label: 'Price', selected: true, customLabel: 'Cena' },
                { name: 'fund', label: 'Fund', selected: true, customLabel: 'Fundusz' },
                { name: 'line_number', label: 'Line Number', selected: true, customLabel: 'Nr Linii' }, // Zmienione tylko w nazwie wyświetlanej, nazwa techniczna jest 'line_number' (które pobiera 'number')
                { name: 'owner', label: 'Owner', selected: true, customLabel: 'Właściciel' },
            ],
            customHeader: '# Test Ceny i Funduszy'
        };
        configService.get.and.returnValue(of(settings));
        
        let result: any;
        service.generateExport(MOCK_ENTITIES).subscribe(res => result = res);
        flush();
        
        const expectedContent = 
            `# Eksport PO Line\n` + 
            `Cena\tFundusz\tNr Linii\tWłaściciel\n` + 
            `100.5 USD\tFUNDA\tL1\tOwner A\n` +     
            `50 PLN\tFUNDB\tL2\tOwner B\n`;        
            
        expect(result.fileContent).toBe(expectedContent);
    }));
});