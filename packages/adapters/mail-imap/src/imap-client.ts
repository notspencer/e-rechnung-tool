/**
 * IMAP email fetcher implementation
 */

import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import type { MailProvider, EmailMessage, EmailAttachment } from '@e-rechnung/core';

export interface ImapConfig {
    host: string;
    port: number;
    user: string;
    password: string;
    tls: boolean;
    mailbox?: string;
}

export class ImapMailProvider implements MailProvider {
    private config: ImapConfig;

    constructor(config: ImapConfig) {
        this.config = config;
    }

    async fetchUnread(params: {
        tenantId: string;
        since?: Date;
    }): Promise<EmailMessage[]> {
        const { tenantId, since } = params;

        const client = new ImapFlow({
            host: this.config.host,
            port: this.config.port,
            auth: {
                user: this.config.user,
                pass: this.config.password,
            },
            secure: this.config.tls,
            logger: false, // Disable logging for production
        });

        try {
            await client.connect();

            const mailbox = this.config.mailbox || 'INBOX';
            await client.mailboxOpen(mailbox);

            // Search for unread messages
            const searchCriteria = since
                ? { since: since, seen: false }
                : { seen: false };

            const messages = await client.search(searchCriteria);

            const emailMessages: EmailMessage[] = [];

            for (const messageId of messages) {
                try {
                    const message = await client.download(messageId, { uid: true });
                    if (!message) continue;

                    const parsed = await simpleParser(message);
                    const emailMessage = await this.parseEmailMessage(parsed, messageId);

                    if (emailMessage) {
                        emailMessages.push(emailMessage);
                    }
                } catch (error) {
                    console.warn(`Failed to parse message ${messageId}:`, error);
                    continue;
                }
            }

            return emailMessages;
        } finally {
            await client.logout();
        }
    }

    async markAsRead(params: {
        tenantId: string;
        messageId: string;
    }): Promise<void> {
        const { messageId } = params;

        const client = new ImapFlow({
            host: this.config.host,
            port: this.config.port,
            auth: {
                user: this.config.user,
                pass: this.config.password,
            },
            secure: this.config.tls,
            logger: false,
        });

        try {
            await client.connect();

            const mailbox = this.config.mailbox || 'INBOX';
            await client.mailboxOpen(mailbox);

            // Mark message as seen
            await client.messageFlagsAdd(messageId, ['\\Seen'], { uid: true });
        } finally {
            await client.logout();
        }
    }

    private async parseEmailMessage(parsed: any, messageId: string): Promise<EmailMessage | null> {
        try {
            // Extract attachments
            const attachments: EmailAttachment[] = [];

            if (parsed.attachments) {
                for (const attachment of parsed.attachments) {
                    // Only process XML, PDF, and ZIP files
                    const contentType = attachment.contentType || '';
                    const filename = attachment.filename || 'unknown';

                    if (this.isValidAttachmentType(contentType, filename)) {
                        attachments.push({
                            filename,
                            contentType,
                            size: attachment.size || 0,
                            data: attachment.content,
                        });
                    }
                }
            }

            // Skip emails without valid attachments
            if (attachments.length === 0) {
                return null;
            }

            return {
                id: messageId,
                from: parsed.from?.text || '',
                to: this.extractToAddresses(parsed),
                subject: parsed.subject || '',
                receivedAt: parsed.date || new Date(),
                attachments,
            };
        } catch (error) {
            console.warn(`Failed to parse email message ${messageId}:`, error);
            return null;
        }
    }

    private extractToAddresses(parsed: any): string[] {
        const addresses: string[] = [];

        if (parsed.to) {
            if (Array.isArray(parsed.to)) {
                addresses.push(...parsed.to.map((addr: any) => addr.address || addr.text || ''));
            } else {
                addresses.push(parsed.to.address || parsed.to.text || '');
            }
        }

        if (parsed.cc) {
            if (Array.isArray(parsed.cc)) {
                addresses.push(...parsed.cc.map((addr: any) => addr.address || addr.text || ''));
            } else {
                addresses.push(parsed.cc.address || parsed.cc.text || '');
            }
        }

        if (parsed.bcc) {
            if (Array.isArray(parsed.bcc)) {
                addresses.push(...parsed.bcc.map((addr: any) => addr.address || addr.text || ''));
            } else {
                addresses.push(parsed.bcc.address || parsed.bcc.text || '');
            }
        }

        return addresses.filter(addr => addr.trim() !== '');
    }

    private isValidAttachmentType(contentType: string, filename: string): boolean {
        const validTypes = [
            'application/xml',
            'text/xml',
            'application/pdf',
            'application/zip',
            'application/x-zip-compressed',
        ];

        const validExtensions = ['.xml', '.pdf', '.zip'];

        // Check content type
        if (validTypes.some(type => contentType.toLowerCase().includes(type))) {
            return true;
        }

        // Check file extension
        const lowerFilename = filename.toLowerCase();
        if (validExtensions.some(ext => lowerFilename.endsWith(ext))) {
            return true;
        }

        return false;
    }
}
