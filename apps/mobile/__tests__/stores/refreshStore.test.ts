import { useRefreshStore } from '../../stores/refreshStore';

describe('refreshStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useRefreshStore.setState({ lastTransactionUpdate: 0 });
  });

  it('should have initial state with lastTransactionUpdate as 0', () => {
    const state = useRefreshStore.getState();
    expect(state.lastTransactionUpdate).toBe(0);
  });

  it('should update lastTransactionUpdate when triggerRefresh is called', () => {
    const beforeTimestamp = Date.now();

    useRefreshStore.getState().triggerRefresh();

    const state = useRefreshStore.getState();
    expect(state.lastTransactionUpdate).toBeGreaterThanOrEqual(beforeTimestamp);
    expect(state.lastTransactionUpdate).toBeLessThanOrEqual(Date.now());
  });

  it('should update timestamp on each triggerRefresh call', async () => {
    useRefreshStore.getState().triggerRefresh();
    const firstTimestamp = useRefreshStore.getState().lastTransactionUpdate;

    // Wait a bit to ensure different timestamp
    await new Promise((resolve) => setTimeout(resolve, 10));

    useRefreshStore.getState().triggerRefresh();
    const secondTimestamp = useRefreshStore.getState().lastTransactionUpdate;

    expect(secondTimestamp).toBeGreaterThan(firstTimestamp);
  });
});
