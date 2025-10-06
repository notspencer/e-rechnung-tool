/**
 * Event types for audit logging and analytics
 */

export type EventType =
    | 'invoice_received'
    | 'validation_completed'
    | 'invoice_archived'
    | 'manual_edit'
    | 'export_created'
    | 'invoice_viewed'
    | 'invoice_downloaded'
    | 'api_key_used';

export interface BaseEvent {
    id: string;
    tenantId: string;
    type: EventType;
    payload: Record<string, unknown>;
    userId?: string;
    createdAt: string;
}

export interface InvoiceReceivedEvent extends BaseEvent {
    type: 'invoice_received';
    payload: {
        invoiceId: string;
        invoiceType: string;
        format: string;
        source: string;
        senderEmail?: string;
    };
}

export interface ValidationCompletedEvent extends BaseEvent {
    type: 'validation_completed';
    payload: {
        invoiceId: string;
        status: string;
        errorCount: number;
        warningCount: number;
    };
}

export interface InvoiceArchivedEvent extends BaseEvent {
    type: 'invoice_archived';
    payload: {
        invoiceId: string;
        timeToArchiveSeconds: number;
    };
}

export interface ManualEditEvent extends BaseEvent {
    type: 'manual_edit';
    payload: {
        invoiceId: string;
        fieldsEdited: string[];
    };
}

export interface ExportCreatedEvent extends BaseEvent {
    type: 'export_created';
    payload: {
        exportId: string;
        invoiceCount: number;
        format: string;
    };
}

export interface InvoiceViewedEvent extends BaseEvent {
    type: 'invoice_viewed';
    payload: {
        invoiceId: string;
    };
}

export interface InvoiceDownloadedEvent extends BaseEvent {
    type: 'invoice_downloaded';
    payload: {
        invoiceId: string;
    };
}

export interface ApiKeyUsedEvent extends BaseEvent {
    type: 'api_key_used';
    payload: {
        apiKeyId: string;
        endpoint: string;
    };
}

export type Event =
    | InvoiceReceivedEvent
    | ValidationCompletedEvent
    | InvoiceArchivedEvent
    | ManualEditEvent
    | ExportCreatedEvent
    | InvoiceViewedEvent
    | InvoiceDownloadedEvent
    | ApiKeyUsedEvent;
