/**
 * Vitest globalSetup - brings the practice database up for the test run.
 *
 * Runs once per `npm test`, before any test file (and before setupFiles /
 * server/test/setup.ts). It only starts the server process; it deliberately
 * does NOT decide which database the tests talk to. That remains the job of
 * the safety guard in server/test/setup.ts, which reads .env.test and refuses
 * to run if it matches production. Starting a server and choosing a target
 * are kept separate on purpose - this file must never be able to widen what
 * the guard allows.
 *
 * If a cluster is already running (someone ran `npm run db:test:start` in
 * another terminal), it is reused and left running on teardown.
 */
import { CLUSTER, isListening, startCluster, stopCluster } from '../../scripts/test-db.js';

let startedByUs = false;

export async function setup(): Promise<void> {
  if (await isListening()) {
    console.log(`[practice-db] reusing cluster already running on port ${CLUSTER.port}`);
    return;
  }

  ({ startedByUs } = await startCluster());
  console.log(`[practice-db] started on port ${CLUSTER.port} for this test run`);
}

export async function teardown(): Promise<void> {
  if (!startedByUs) return;

  try {
    stopCluster();
    console.log('[practice-db] stopped.');
  } catch (error) {
    // Never fail the run over teardown - the tests have already finished.
    console.warn(`[practice-db] could not stop cleanly: ${String(error)}`);
  }
}
