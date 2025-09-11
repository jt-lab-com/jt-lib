import { globals } from '../../core/globals';
import { log, trace } from '../../core/log';

const testMessages = [];

export function testLog(message: string, isOk: boolean, context = {}) {
  const status = isOk ? '✅ ' : '❌ ';
  trace('testLog', status + message, context, true);
  testMessages.push({ message, isOk, context });
}

export function testReport(testName: string) {
  let isFiled = false;
  let lastMessage = '';
  for (const msg of testMessages) {
    if (!msg.isOk) {
      isFiled = true;
      lastMessage = msg.message;
      break;
    }
    lastMessage = msg.message;
  }

  globals.report.optimizedSetValue('testName', testName);
  globals.report.optimizedSetValue('test', lastMessage);
  globals.report.optimizedSetValue('status', isFiled ? 'failed' : '✅ passed');
}

export function stopTests() {
  globals.script.forceStop('Test finished');
}
