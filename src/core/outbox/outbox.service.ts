import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { outboxEvents } from '../../database/schema/outbox.schema';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { Kafka } from 'kafkajs';

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);
  private readonly db;
  private readonly kafka?: Kafka;

  constructor(@Inject('PG_POOL') private readonly pool: Pool) {
    this.db = drizzle(pool);
    if (process.env.KAFKA_BROKERS) {
      this.kafka = new Kafka({ brokers: process.env.KAFKA_BROKERS.split(',') });
    }
  }

  async addEvent(event: {
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    payload: unknown;
  }) {
    await this.db.insert(outboxEvents).values(event);
  }

  async publishPending() {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `SELECT * FROM outbox_events WHERE published_at IS NULL ORDER BY created_at ASC LIMIT 100 FOR UPDATE SKIP LOCKED`
      );

      for (const row of rows) {
        if (this.kafka) {
          const producer = this.kafka.producer();
          await producer.connect();
          await producer.send({
            topic: `${row.aggregate_type}-${row.event_type}`,
            messages: [{ key: row.aggregate_id, value: JSON.stringify(row.payload) }],
          });
          await producer.disconnect();
        }
        await client.query('UPDATE outbox_events SET published_at = NOW() WHERE id = $1', [row.id]);
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      this.logger.error('Failed to publish outbox events', e as any);
    } finally {
      client.release();
    }
  }
}


