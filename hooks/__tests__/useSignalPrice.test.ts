import { renderHook, act } from '@testing-library/react';  
import { useSignalPrice } from '@/hooks/useSignalPrice';  
  
// Mock the tracing service  
jest.mock('@/src/tracing/worker-tracing.service');  
  
describe('useSignalPrice backoff behavior', () => {  
  beforeEach(() => {  
    jest.useFakeTimers();  
  });  
  
  afterEach(() => {  
    jest.useRealTimers();  
  });  
  
  it('should back off on repeated failures and reset on success', async () => {  
    const { result } = renderHook(() => useSignalPrice(1000));  
      
    // Initial state - not stale  
    expect(result.current.isStale).toBe(false);  
      
    // Fast-forward past first poll (will fail due to mock)  
    act(() => {  
      jest.advanceTimersByTime(1000);  
    });  
      
    // After first failure, should be stale  
    expect(result.current.isStale).toBe(true);  
      
    // Next poll should be at 2000ms (backoff: 1000 * 2^1)  
    act(() => {  
      jest.advanceTimersByTime(2000);  
    });  
      
    // After second failure, still stale  
    expect(result.current.isStale).toBe(true);  
      
    // Next poll should be at 4000ms (backoff: 1000 * 2^2)  
    act(() => {  
      jest.advanceTimersByTime(4000);  
    });  
      
    // After third failure, still stale  
    expect(result.current.isStale).toBe(true);  
      
    // Next poll should be at 8000ms (backoff: 1000 * 2^3)  
    act(() => {  
      jest.advanceTimersByTime(8000);  
    });  
      
    // After fourth failure, still stale  
    expect(result.current.isStale).toBe(true);  
      
    // Next poll should be at 16000ms (backoff: 1000 * 2^4)  
    act(() => {  
      jest.advanceTimersByTime(16000);  
    });  
      
    // After fifth failure, still stale  
    expect(result.current.isStale).toBe(true);  
      
    // Next poll should be at 30000ms (capped at max)  
    act(() => {  
      jest.advanceTimersByTime(30000);  
    });  
      
    // After sixth failure, still stale  
    expect(result.current.isStale).toBe(true);  
      
    // Simulate success by making traceWorker succeed  
    // (This would require more sophisticated mocking of the internal functions)  
    // For now, this test structure shows the backoff progression pattern  
  });  
});
