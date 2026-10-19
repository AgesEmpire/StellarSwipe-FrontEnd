/**
 * @jest-environment jsdom
 *
 * Tests for the append-only audit trail (#949)
 *
 * Acceptance criteria:
 *  - Entries capture actor, action, target reference, timestamp, correlation ID
 *  - Secrets and signatures are excluded
 *  - Sensitive operations create entries and reads do not
 */

import {
  AUDIT_ACTIONS,
  AUDIT_TRAIL_STORAGE_KEY,
  getAuditEntries,
  getAuditEntriesByAction,
  newCorrelationId,
  recordAuditEntry,
  resetAuditTrail,
  sanitizeAuditMetadata,
} from '@/services/auditTrail';
import { useWalletStore } from '@/store/useWalletStore';
import { useWebhookStore } from '@/store/useWebhookStore';
import { tradeExecutionService } from '@/services/tradeExecutionService';

beforeEach(() => {
  resetAuditTrail();
  useWalletStore.setState({ publicKey: null, isConnected: false, network: 'TESTNET' });
  useWebhookStore.setState({ webhooks: [] });
});

describe('audit entry shape', () => {
  it('captures actor, action, target, timestamp and correlation ID', () => {
    const entry = recordAuditEntry({
      actor: 'GABC123',
      action: AUDIT_ACTIONS.WALLET_CONNECTED,
      target: 'GABC123',
      correlationId: 'corr-1',
      metadata: { network: 'TESTNET' },
    });

    expect(entry.actor).toBe('GABC123');
    expect(entry.action).toBe('wallet.connected');
    expect(entry.target).toBe('GABC123');
    expect(entry.correlationId).toBe('corr-1');
    expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
    expect(entry.metadata).toEqual({ network: 'TESTNET' });
  });

  it('generates a correlation ID when none is supplied', () => {
    const entry = recordAuditEntry({ action: 'test.action', target: 't1' });
    expect(entry.correlationId).toMatch(/\S/);
    expect(entry.actor).toBe('system'); // sensible default
  });

  it('generates unique correlation IDs and entry IDs', () => {
    expect(newCorrelationId()).not.toBe(newCorrelationId());
    const a = recordAuditEntry({ action: 'x', target: 't' });
    const b = recordAuditEntry({ action: 'x', target: 't' });
    expect(a.id).not.toBe(b.id);
  });

  it('freezes entries so they cannot be modified', () => {
    const entry = recordAuditEntry({ action: 'x', target: 't' });
    expect(Object.isFrozen(entry)).toBe(true);
    try {
      (entry as { action: string }).action = 'tampered'; // throws in strict mode
    } catch {
      /* expected in strict-mode modules */
    }
    expect(entry.action).toBe('x');
  });
});

describe('append-only behaviour', () => {
  it('appends entries in order and never mutates existing ones', () => {
    const first = recordAuditEntry({ action: 'a.one', target: 't1' });
    const second = recordAuditEntry({ action: 'a.two', target: 't2' });
    const entries = getAuditEntries();
    expect(entries).toHaveLength(2);
    expect(entries[0].id).toBe(first.id);
    expect(entries[1].id).toBe(second.id);
  });

  it('returns a copy from getAuditEntries so the trail cannot be mutated via reads', () => {
    recordAuditEntry({ action: 'a.one', target: 't1' });
    const entries = getAuditEntries() as unknown as Array<{ action: string }>;
    entries.push({ action: 'injected' });
    try {
      entries[0].action = 'tampered'; // throws in strict mode (entry is frozen)
    } catch {
      /* expected */
    }
    expect(getAuditEntries()).toHaveLength(1);
    expect(getAuditEntries()[0].action).toBe('a.one');
  });

  it('filters by action without creating entries', () => {
    recordAuditEntry({ action: AUDIT_ACTIONS.WALLET_CONNECTED, target: 'G1' });
    recordAuditEntry({ action: AUDIT_ACTIONS.TRADE_EXECUTED, target: 'trade1' });
    expect(getAuditEntriesByAction(AUDIT_ACTIONS.WALLET_CONNECTED)).toHaveLength(1);
    expect(getAuditEntries()).toHaveLength(2);
  });
});

describe('secret and signature exclusion', () => {
  it('excludes secret-like keys from metadata', () => {
    const entry = recordAuditEntry({
      action: 'webhook.created',
      target: 'wh_1',
      metadata: {
        url: 'https://example.com/hook',
        secret: 'super-secret-value',
        signature: 'aabbcc',
        apiKey: 'key-123',
        password: 'pw',
        privateKey: ' StellarPrivateKey ',
        authorization: 'Bearer xyz',
      },
    });

    expect(entry.metadata).toEqual({ url: 'https://example.com/hook' });
    const serialized = JSON.stringify(entry);
    expect(serialized).not.toContain('super-secret-value');
    expect(serialized).not.toContain('aabbcc');
    expect(serialized).not.toContain('key-123');
  });

  it('excludes secrets nested in objects and arrays', () => {
    const entry = recordAuditEntry({
      action: 'test.action',
      target: 't',
      metadata: {
        webhook: { id: 'wh_1', secret: 'nested-secret' },
        items: [{ id: 1, token: 'tok-1' }],
      },
    });

    const serialized = JSON.stringify(entry);
    expect(serialized).not.toContain('nested-secret');
    expect(serialized).not.toContain('tok-1');
    expect(entry.metadata).toEqual({
      webhook: { id: 'wh_1' },
      items: [{ id: 1 }],
    });
  });

  it('sanitizeAuditMetadata drops matching keys at any level', () => {
    expect(sanitizeAuditMetadata({ a: 1, backupCodes: ['1', '2'] })).toEqual({ a: 1 });
  });
});

describe('reads do not create entries', () => {
  it('reading the trail does not append', () => {
    getAuditEntries();
    getAuditEntriesByAction('anything');
    expect(getAuditEntries()).toHaveLength(0);
  });

  it('read-only trade service calls (rates, balances) do not append', async () => {
    await tradeExecutionService.getExchangeRate('XLM/USDC');
    await tradeExecutionService.getBalance('GABC', 'XLM');
    tradeExecutionService.getEstimate(1);
    expect(getAuditEntries()).toHaveLength(0);
  });
});

describe('sensitive operations create entries', () => {
  it('wallet connect and disconnect append entries', () => {
    useWalletStore.getState().setPublicKey('GABC123');
    useWalletStore.getState().setConnected(true);
    expect(getAuditEntriesByAction(AUDIT_ACTIONS.WALLET_CONNECTED)).toHaveLength(1);

    useWalletStore.getState().disconnect();
    const disconnected = getAuditEntriesByAction(AUDIT_ACTIONS.WALLET_DISCONNECTED);
    expect(disconnected).toHaveLength(1);
    expect(disconnected[0].target).toBe('GABC123');
    expect(getAuditEntries()).toHaveLength(2);
  });

  it('setting the same key twice does not duplicate connect entries', () => {
    useWalletStore.getState().setPublicKey('GABC123');
    useWalletStore.getState().setPublicKey('GABC123');
    expect(getAuditEntriesByAction(AUDIT_ACTIONS.WALLET_CONNECTED)).toHaveLength(1);
  });

  it('webhook registration and removal append entries without the secret', () => {
    const webhook = useWebhookStore.getState().addWebhook('https://example.com/hook', ['trade_execution']);

    const created = getAuditEntriesByAction(AUDIT_ACTIONS.WEBHOOK_CREATED);
    expect(created).toHaveLength(1);
    expect(created[0].target).toBe(webhook.id);
    expect(JSON.stringify(created[0])).not.toContain(webhook.secret);

    useWebhookStore.getState().removeWebhook(webhook.id);
    const deleted = getAuditEntriesByAction(AUDIT_ACTIONS.WEBHOOK_DELETED);
    expect(deleted).toHaveLength(1);
    expect(deleted[0].target).toBe(webhook.id);
    expect(JSON.stringify(getAuditEntries())).not.toContain(webhook.secret);
  });

  it('trade execution appends an entry with actor, target and outcome', async () => {
    useWalletStore.getState().setPublicKey('GTRADER1');
    const result = await tradeExecutionService.enqueue({
      id: 'trade_1',
      signalId: 'sig_1',
      asset: 'XLM/USDC',
      direction: 'BUY',
      amount: 100,
      slippageTolerance: 1,
    });

    const trades = getAuditEntriesByAction(AUDIT_ACTIONS.TRADE_EXECUTED);
    expect(trades).toHaveLength(1);
    expect(trades[0].actor).toBe('GTRADER1');
    expect(trades[0].target).toBe('trade_1');
    expect(trades[0].metadata).toMatchObject({
      signalId: 'sig_1',
      asset: 'XLM/USDC',
      direction: 'BUY',
      amount: 100,
      success: result.success,
    });
    expect(result.auditEntry?.id).toBe(trades[0].id);
  });

  it('persists entries to localStorage when available', () => {
    recordAuditEntry({ action: 'a.one', target: 't1' });
    const raw = window.localStorage.getItem(AUDIT_TRAIL_STORAGE_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toHaveLength(1);
  });
});
