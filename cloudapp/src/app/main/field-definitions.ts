declare function _(key: string): string;

import { FieldConfig } from '../models/settings';

export const AVAILABLE_FIELDS: FieldConfig[] = [
    { name: 'isbn', label: _('Fields.ISBN'), selected: true, customLabel: _('Fields.ISBN') },
    { name: 'title', label: _('Fields.Title'), selected: true, customLabel: _('Fields.Title') },
    { name: 'quantity', label: _('Fields.Quantity'), selected: true, customLabel: _('Fields.Quantity') },
    { name: 'poNumber', label: _('Fields.PONumber'), selected: false, customLabel: _('Fields.PONumber') },
    { name: 'author', label: _('Fields.Author'), selected: false, customLabel: _('Fields.Author') },
    { name: 'line_number', label: _('Fields.LineNumber'), selected: false, customLabel: _('Fields.LineNumber') },
    { name: 'owner', label: _('Fields.Owner'), selected: false, customLabel: _('Fields.Owner') },
    { name: 'vendor', label: _('Fields.Vendor'), selected: false, customLabel: _('Fields.Vendor') },
    { name: 'price', label: _('Fields.Price'), selected: false, customLabel: _('Fields.Price') },
    { name: 'fund', label: _('Fields.Fund'), selected: false, customLabel: _('Fields.Fund') },
    { name: 'created_date', label: _('Fields.CreatedDate'), selected: false, customLabel: _('Fields.CreatedDate') },
];