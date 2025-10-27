// OpenTelemetry placeholder - packages not installed
// To enable OpenTelemetry tracing, install required packages:
// npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
// npm install @opentelemetry/exporter-trace-otlp-http @opentelemetry/resources
// npm install @opentelemetry/semantic-conventions

const serviceName = process.env.OTEL_SERVICE_NAME || 'ayaztrade-backend';

export async function startOtel() {
  try {
    // Placeholder - OpenTelemetry packages not installed
    console.log(`[otel] OpenTelemetry disabled - packages not installed for ${serviceName}`);
  } catch (err) {
    console.error('[otel] Error with OpenTelemetry placeholder', err);
  }
}

export async function shutdownOtel() {
  try {
    console.log('[otel] OpenTelemetry shutdown - disabled');
  } catch (err) {
    console.error('[otel] Error with OpenTelemetry shutdown', err);
  }
}


