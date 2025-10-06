/**
 * Mail provider interface for email ingestion
 */

export interface MailProvider {
    /**
     * Fetch unread emails from configured mailbox
     */
    fetchUnread(params: {
        tenantId: string;
        since?: Date;
    }): Promise<EmailMessage[]>;

    /**
     * Mark an email as processed
     */
    markAsRead(params: {
        tenantId: string;
        messageId: string;
    }): Promise<void>;
}

export interface EmailMessage {
    id: string;
    from: string;
    to: string[];
    subject: string;
    receivedAt: Date;
    attachments: EmailAttachment[];
}

export interface EmailAttachment {
    filename: string;
    contentType: string;
    size: number;
    data: Buffer;
}
