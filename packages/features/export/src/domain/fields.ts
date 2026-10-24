export const EXPORTABLE_FIELDS = [
  { key: 'bookingId', label: 'Booking ID' },
  { key: 'startTime', label: 'Start Time' },
  { key: 'endTime', label: 'End Time' },
  { key: 'service', label: 'Service' },
  { key: 'staff', label: 'Staff' },
  { key: 'customerName', label: 'Customer Name' },
  { key: 'customerEmail', label: 'Customer Email' },
  { key: 'customerPhone', label: 'Customer Phone' },
  { key: 'status', label: 'Status' },
  { key: 'source', label: 'Source' },
  { key: 'price', label: 'Price' },
  { key: 'currency', label: 'Currency' },
  { key: 'paymentStatus', label: 'Payment Status' },
  { key: 'createdAt', label: 'Booked On' },
] as const;

export type FieldKey = (typeof EXPORTABLE_FIELDS)[number]['key'];
