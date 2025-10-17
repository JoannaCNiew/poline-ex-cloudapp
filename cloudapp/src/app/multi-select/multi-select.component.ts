import { Component, OnInit, ViewChild } from '@angular/core';
import { Entity } from '@exlibris/exl-cloudapp-angular-lib';
import { AppService } from '../app.service';
import { SelectEntitiesComponent } from '@exlibris/eca-components'; 

@Component({
  selector: 'app-multi-select',
  templateUrl: './multi-select.component.html',
  styleUrls: ['./multi-select.component.scss']
})
export class MultiSelectComponent implements OnInit {
  
  @ViewChild('selectEntities') selectEntities!: SelectEntitiesComponent;

  count: number = 0;
  
  constructor(
    private appService: AppService,
  ) { }

  ngOnInit() {
    this.appService.setTitle('Multi-select Test');
  }

  selectedEntities = new Array<Entity>();
}
