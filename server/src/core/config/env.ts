import * as dotenv from 'dotenv';
import { EnvSchema, EnvConfig, SENSITIVE_KEYS } from './env.schema';
import { ZodError } from 'zod';

// Load .env file into process.env before validation
dotenv.config();

let parsedConfig: EnvConfig;

try {
  parsedConfig = EnvSchema.parse(process.env);
} catch (error) {
  if (error instanceof ZodError) {
    console.error('\n❌ ----------------------------------------------------');
    console.error('❌ ENVIRONMENT VARIABLES VALIDATION FAILED (FAIL-FAST)');
    console.error('❌ ----------------------------------------------------\n');
    
    error.errors.forEach((e) => {
      console.error(`   👉 Field : ${e.path.join('.')}`);
      console.error(`   💬 Error : ${e.message}\n`);
    });
    
    console.error('🚨 The application will now terminate to prevent unstable states.\n');
    process.exit(1);
  }
  
  // If it's not a ZodError, rethrow
  throw error;
}

/**
 * Prints a secure environment fingerprint and Application Banner on successful boot.
 * Redacts any keys marked as sensitive.
 */
function printEnvironmentFingerprint(config: EnvConfig) {
  if (config.NODE_ENV === 'test' && config.LOG_LEVEL === 'silent') {
    return; // Do not pollute test runner outputs
  }

  console.log('\n======================================================');
  console.log('                 LMS ENTERPRISE SERVER                  ');
  console.log('======================================================');
  console.log(` Version       : v${config.APP_VERSION}`);
  console.log(` Config Vol    : ${config.CONFIG_VERSION}`);
  console.log(` Environment   : ${config.NODE_ENV.toUpperCase()}`);
  console.log(` Database      : PostgreSQL ✓`);
  console.log(` Cache / Queue : ${config.QUEUE_DRIVER} ✓`);
  console.log(` Storage       : ${config.STORAGE_PROVIDER}`);
  console.log(` Observability : ${config.ENABLE_METRICS ? 'Enabled' : 'Disabled'}`);
  console.log(` Profiling     : ${config.ENABLE_PROFILING ? 'Enabled' : 'Disabled'}`);
  console.log('======================================================\n');
  
  console.log('🔒 --- Secure Variables Map --- 🔒');
  
  for (const [key, value] of Object.entries(config)) {
    if (SENSITIVE_KEYS.includes(key as keyof EnvConfig)) {
      console.log(`   ${key.padEnd(20)} : ******** (REDACTED)`);
    }
  }
  
  console.log('🔒 ------------------------------ 🔒\n');
}

// Print the fingerprint during bootstrap
printEnvironmentFingerprint(parsedConfig);

/**
 * The only exported interface for environment variables.
 * DO NOT use process.env directly in Domain/Service layers.
 */
export const env = parsedConfig;
