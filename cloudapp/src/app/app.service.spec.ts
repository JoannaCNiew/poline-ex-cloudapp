import { TestBed } from '@angular/core/testing';
import { AppService } from './app.service';
import { InitService } from '@exlibris/exl-cloudapp-angular-lib';

const mockInitService = jasmine.createSpyObj('InitService', ['doSomething']);

describe('AppService', () => {
  let service: AppService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AppService,
        { provide: InitService, useValue: mockInitService }
      ]
    });
    service = TestBed.inject(AppService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have a default title "App title"', (done: DoneFn) => {
    service.getTitle().subscribe(title => {
      expect(title).toBe('App title');
      done();
    });
  });

  it('should set and get a new title', (done: DoneFn) => {
    const newTitle = 'New Test Title';
    
    service.setTitle(newTitle);

    service.getTitle().subscribe(title => {
      expect(title).toBe(newTitle);
      done();
    });
  });

  it('should emit the latest title to a new subscriber (BehaviorSubject test)', (done: DoneFn) => {
    const firstTitle = 'First';
    const secondTitle = 'Second';

    service.setTitle(firstTitle);
    service.setTitle(secondTitle);

    service.getTitle().subscribe(title => {
      expect(title).toBe(secondTitle);
      done();
    });
  });
});
