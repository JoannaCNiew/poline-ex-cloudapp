import { FieldConfig } from '../models/settings';

export const AVAILABLE_FIELDS: FieldConfig[] = [
    { name: 'isbn', label: 'ISBN', selected: true, customLabel: 'ISBN' },
    { name: 'title', label: 'Title', selected: true, customLabel: 'Title' },
    { name: 'quantity', label: 'Quantity', selected: true, customLabel: 'Quantity' },
    { name: 'poNumber', label: 'PO Number', selected: false, customLabel: 'PO Number' },
    { name: 'author', label: 'Author', selected: false, customLabel: 'Author' },
    { name: 'line_number', label: 'Line Number', selected: false, customLabel: 'Line Number' },
    { name: 'owner', label: 'Owner', selected: false, customLabel: 'Owner' },
    { name: 'vendor', label: 'Vendor', selected: false, customLabel: 'Vendor' },
    { name: 'price', label: 'Price', selected: false, customLabel: 'Price' },
    { name: 'fund', label: 'Fund', selected: false, customLabel: 'Fund' },
];
