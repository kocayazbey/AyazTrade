export const QUEUE_NAMES = {
  email: 'email',
  sms: 'sms',
  webhook: 'webhook',
  indexing: 'indexing',
  payments: 'payments',
  dlq: 'dlq',
} as const;

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];

export const JOB_NAMES = {
  sendEmail: 'sendEmail',
  sendSms: 'sendSms',
  deliverWebhook: 'deliverWebhook',
  indexDocument: 'indexDocument',
  processPayment: 'processPayment',
  deadLetter: 'deadLetter',
  retryDlq: 'retryDlq',
} as const;

export type JobName = typeof JOB_NAMES[keyof typeof JOB_NAMES];


