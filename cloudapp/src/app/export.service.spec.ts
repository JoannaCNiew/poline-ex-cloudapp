import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import {
  CloudAppRestService,
  AlertService,
  Entity,
  EntityType,
  HttpMethod
} from '@exlibris/exl-cloudapp-angular-lib';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { ExportService } from './export.service';
import { FieldConfig } from './models/settings';


const MOCK_ENTITIES: Entity[] = [
  { id: '1', link: 'po_line/1', type: EntityType.PO_LINE, description: 'PO 1' },
  { id: '2', link: 'po_line/2', type: EntityType.PO_LINE, description: 'PO 2' }
];

const MOCK_FIELDS: FieldConfig[] = [
  { name: 'poNumber', label: 'PO', selected: true, customLabel: 'Fields.PONumber' },
  { name: 'title', label: 'Tytuł', selected: true, customLabel: 'Tytuł' },
  { name: 'quantity', label: 'Ilość', selected: true, customLabel: 'Ilość' },
  { name: 'fund', label: 'Fundusz', selected: true, customLabel: 'Fundusz' }
];

const MOCK_POLINE_RESPONSE_1 = {
  po_number: 'PO-123',
  resource_metadata: { title: 'Książka 1' },
  location: [ { quantity: 2 }, { quantity: 3 } ],
  fund_distribution: [
    { fund_code: { value: 'FUND_A' } },
    { fund_code: { value: 'FUND_B' } }
  ]
};
const MOCK_POLINE_RESPONSE_2 = {
  po_number: 'PO-456',
  resource_metadata: { title: 'Książka 2' },
  location: [ { quantity: 1 } ],
  fund_distribution: [ { fund_code: { value: 'FUND_C' } } ]
};

const MOCK_CUSTOM_HEADER = '# Mój Nagłówek';


describe('ExportService', () => {
  let service: ExportService;
  let mockRestService: jasmine.SpyObj<CloudAppRestService>;
  let mockAlertService: jasmine.SpyObj<AlertService>;
  let mockTranslateService: jasmine.SpyObj<TranslateService>;

  let mockClipboard: { writeText: jasmine.Spy };
  let originalClipboard: any; 
  
  let mockAnchor: any; 
  let mockTextArea: any; 

  let appendChildSpy: jasmine.Spy;
  let removeChildSpy: jasmine.Spy;
  let createElementSpy: jasmine.Spy;

  beforeEach(() => {
    mockRestService = jasmine.createSpyObj('CloudAppRestService', ['call']);
    mockAlertService = jasmine.createSpyObj('AlertService', ['success', 'warn', 'error']);
    mockTranslateService = jasmine.createSpyObj('TranslateService', ['instant']);

    mockClipboard = { writeText: jasmine.createSpy('writeText').and.resolveTo(undefined) };
    originalClipboard = (navigator as any).clipboard;
    Object.defineProperty(navigator, 'clipboard', {
      value: mockClipboard,
      writable: true,
      configurable: true
    });

    
    mockAnchor = {
      href: '',
      download: '',
      click: jasmine.createSpy('click')
    };
    
    mockTextArea = {
      value: '',
      style: { position: '', opacity: '' }, 
      focus: jasmine.createSpy('focus'),
      select: jasmine.createSpy('select')
    };

    createElementSpy = spyOn(document, 'createElement').and.callFake((tagName: string) => {
      if (tagName.toLowerCase() === 'a') {
        return mockAnchor;
      }
      if (tagName.toLowerCase() === 'textarea') {
        return mockTextArea;
      }
      return document.createElement(tagName); 
    });

    appendChildSpy = spyOn(document.body, 'appendChild').and.callFake((node) => node);
    removeChildSpy = spyOn(document.body, 'removeChild').and.callFake((node) => node);

    spyOn(URL, 'createObjectURL').and.returnValue('blob:http://fake-url');
    spyOn(URL, 'revokeObjectURL');

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ExportService,
        { provide: CloudAppRestService, useValue: mockRestService },
        { provide: AlertService, useValue: mockAlertService },
        { provide: TranslateService, useValue: mockTranslateService }
      ]
    });

    service = TestBed.inject(ExportService);

    mockTranslateService.instant.and.callFake(key => `T:${key}`);
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      writable: true,
      configurable: true
    });
    appendChildSpy.and.callThrough();
    removeChildSpy.and.callThrough();
    createElementSpy.and.callThrough();

    mockRestService.call.calls.reset();
    mockAlertService.success.calls.reset();
    mockAlertService.warn.calls.reset();
    mockAlertService.error.calls.reset();
    mockTranslateService.instant.calls.reset();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('generateExport', () => {
    
    beforeEach(() => {
      mockRestService.call
        .withArgs({ url: MOCK_ENTITIES[0].link, method: HttpMethod.GET }).and.returnValue(of(MOCK_POLINE_RESPONSE_1))
        .withArgs({ url: MOCK_ENTITIES[1].link, method: HttpMethod.GET }).and.returnValue(of(MOCK_POLINE_RESPONSE_2));
      
      mockTranslateService.instant
        .withArgs('Fields.PONumber').and.returnValue('Nr Zlecenia')
        .withArgs('Main.ExportFilename').and.returnValue('export.txt');
    });

    it('should call restService for each entity and generate correct file content', (done: DoneFn) => {
      service.generateExport(MOCK_ENTITIES, MOCK_FIELDS, MOCK_CUSTOM_HEADER).subscribe(result => {
        
        expect(mockRestService.call).toHaveBeenCalledTimes(2);
        const expectedHeaders = 'Nr Zlecenia\tTytuł\tIlość\tFundusz';
        const expectedRow1 = 'PO-123\tKsiążka 1\t5\tFUND_A; FUND_B';
        const expectedRow2 = 'PO-456\tKsiążka 2\t1\tFUND_C';
        
        const expectedContent =
          `${MOCK_CUSTOM_HEADER}\n` +
          `${expectedHeaders}\n` +
          `${expectedRow1}\n` +
          `${expectedRow2}\n`;

        expect(result.fileContent).toBe(expectedContent);
        done();
      });
    });

  });

  describe('copyContent (async)', () => {

    it('should call navigator.clipboard.writeText and alert.success when content is provided', async () => {
      const content = 'Test content';
      await service.copyContent(content);

      expect(mockClipboard.writeText).toHaveBeenCalledWith(content);
      expect(mockAlertService.success).toHaveBeenCalledWith('T:Main.Alerts.CopySuccess');
      expect(mockAlertService.error).not.toHaveBeenCalled();
    });

    it('should call alert.warn and reject promise when content is empty', async () => {
      await expectAsync(service.copyContent('')).toBeRejectedWithError('No content to copy.');
      
      expect(mockAlertService.warn).toHaveBeenCalledWith('T:Main.Alerts.NoPreviewContent');
      expect(mockClipboard.writeText).not.toHaveBeenCalled();
      expect(mockAlertService.success).not.toHaveBeenCalled();
    });

    it('should call alert.error and throw when clipboard.writeText fails', async () => {
      const error = new Error('Clipboard failed');
      mockClipboard.writeText.and.rejectWith(error); 

      await expectAsync(service.copyContent('Test content')).toBeRejectedWith(error);
      
      expect(mockClipboard.writeText).toHaveBeenCalledWith('Test content');
      expect(mockAlertService.error).toHaveBeenCalledWith('T:Main.Alerts.CopyError');
      expect(mockAlertService.success).not.toHaveBeenCalled();
    });

    it('should use legacyCopy if clipboard API is not available', async () => {
      Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
      
      const execCommandSpy = spyOn(document, 'execCommand').and.returnValue(true);

      await service.copyContent('Legacy Test');

      expect(createElementSpy).toHaveBeenCalledWith('textarea');
      expect(appendChildSpy).toHaveBeenCalledWith(mockTextArea);
      
      expect(mockTextArea.value).toBe('Legacy Test'); 

      expect(mockTextArea.focus).toHaveBeenCalled();
      expect(mockTextArea.select).toHaveBeenCalled();
      expect(execCommandSpy).toHaveBeenCalledWith('copy');
      expect(removeChildSpy).toHaveBeenCalledWith(mockTextArea);

      expect(mockAlertService.success).toHaveBeenCalledWith('T:Main.Alerts.CopySuccess');
    });
  });

  describe('downloadContent', () => {

    it('should call alert.warn if content is empty', () => {
      service.downloadContent('');
      expect(mockAlertService.warn).toHaveBeenCalledWith('T:Main.Alerts.NoPreviewContent');
      expect(createElementSpy).not.toHaveBeenCalledWith('a');
    });

    it('should create and click an anchor element to download the file', () => {
      const content = 'Test content';
      service.downloadContent(content);

      expect(mockAlertService.warn).not.toHaveBeenCalled();
      
      expect(createElementSpy).toHaveBeenCalledWith('a');
      
      expect(mockAnchor.href).toBe('blob:http://fake-url');
      expect(mockAnchor.download).toBe('T:Main.ExportFilename');
      
      expect(appendChildSpy).toHaveBeenCalledWith(mockAnchor); 
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalledWith(mockAnchor); 

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://fake-url');

      expect(mockAlertService.success).toHaveBeenCalledWith('T:Main.Alerts.DownloadSuccess');
    });

  });

});